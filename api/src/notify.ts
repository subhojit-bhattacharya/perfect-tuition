/**
 * Telegram notification delivery and its state machine (#7 §5).
 *
 * The enquiry write is the commitment; the notification is best-effort. The
 * parent gets their 201 the moment the row is durable, and notification latency
 * never sits on the response path — which matters because #6 puts a 4-second
 * client timeout on that request.
 *
 * The state lives in `notification_status`, not in `notified_at`. That split is
 * the fix for the bug this design nearly shipped: #6 suppresses the second
 * notification for a duplicate inside 10 minutes, so a NULL `notified_at` would
 * have meant both "Telegram is broken" and "deliberately not sent", and the
 * alert watching it would have cried wolf on every duplicate — on the one alert
 * whose entire job is to mean "Telegram is broken".
 *
 *   pending    → nothing has been attempted yet
 *   sent       → Telegram confirmed ok:true; `notified_at` is set
 *   suppressed → a correct outcome, not a fault. Never alerts, never retries.
 *   failed     → attempted and not delivered. Alerts, and is retried for 24h.
 */

import type { Db, EnquiryRow } from "./db.js";
import { NOT_WITHDRAWN } from "./db.js";
import { formatEnquiry, formatOperatorAlert } from "./telegram/format.js";
import type { TelegramClient } from "./telegram/client.js";
import type { Logger } from "./logger.js";

const IMMEDIATE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;
/** Past this age the in-process loop stops trying; the alert takes over. */
const RETRY_CEILING_HOURS = 24;
/** How long a notification may sit undelivered before the Operator hears about it. */
const STUCK_AFTER_MINUTES = 60;

export type NotifyOptions = { retryDelayMs?: number; logger?: Logger };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/**
 * Attempt delivery of one enquiry, with a short immediate retry burst.
 *
 * Callers must not await this on the request path.
 */
export async function notifyEnquiry(
  db: Db,
  telegram: TelegramClient,
  id: number,
  opts: NotifyOptions = {},
): Promise<void> {
  const delay = opts.retryDelayMs ?? RETRY_DELAY_MS;

  const row = db
    .prepare(`SELECT * FROM enquiry WHERE id = ? AND ${NOT_WITHDRAWN}`)
    .get(id) as EnquiryRow | undefined;

  // Withdrawn rows are invisible to every read path and are never contacted
  // (#8 §7), which includes never being notified about.
  if (row === undefined) return;

  const html = formatEnquiry(row);

  for (let attempt = 1; attempt <= IMMEDIATE_ATTEMPTS; attempt++) {
    const result = await telegram.sendToOwner(html);
    bumpAttempts(db, id);

    if (result.ok) {
      db.prepare(
        `UPDATE enquiry SET notification_status = 'sent', notified_at = ? WHERE id = ?`,
      ).run(new Date().toISOString(), id);
      opts.logger?.log({ event: "notify.sent", enquiry_id: id, attempts: attempt });
      return;
    }

    db.prepare(`UPDATE enquiry SET notification_status = 'failed' WHERE id = ?`).run(id);

    if (!result.retryable) {
      opts.logger?.log({
        event: "notify.failed",
        enquiry_id: id,
        attempts: attempt,
        detail: result.error,
      });
      return;
    }
    if (attempt < IMMEDIATE_ATTEMPTS) await sleep(delay * attempt);
  }

  opts.logger?.log({ event: "notify.failed", enquiry_id: id, attempts: IMMEDIATE_ATTEMPTS });
}

function bumpAttempts(db: Db, id: number): void {
  db.prepare(`UPDATE enquiry SET notify_attempts = notify_attempts + 1 WHERE id = ?`).run(id);
}

/**
 * The duplicate path from #6: the row is inserted anyway — each submission
 * carries its own Consent Record and discarding one destroys the audit trail —
 * but the second Telegram message is not sent. Buzzing Jayeeta twice for one
 * parent trains her to ignore the channel.
 */
export function suppressNotification(db: Db, id: number): void {
  db.prepare(`UPDATE enquiry SET notification_status = 'suppressed' WHERE id = ?`).run(id);
}

/**
 * Re-attempt undelivered notifications, bounded at 24 hours.
 *
 * Without this a two-minute Telegram blip burns three retries in ten seconds,
 * marks the row failed, and nothing ever tries again — the lead sits unread
 * until the alert an hour later and a manual intervention. Deferring to the
 * nightly sweep is worse than useless: a notification delivered at 2am about
 * yesterday afternoon's enquiry has already lost the race to whichever centre
 * answered first.
 */
export async function retryPendingNotifications(
  db: Db,
  telegram: TelegramClient,
  opts: NotifyOptions = {},
): Promise<number> {
  const rows = db
    .prepare(
      `SELECT id FROM enquiry
        WHERE notification_status IN ('pending', 'failed')
          AND created_at >= ?
          AND ${NOT_WITHDRAWN}
        ORDER BY created_at ASC`,
    )
    .all(hoursAgoIso(RETRY_CEILING_HOURS)) as { id: number }[];

  for (const { id } of rows) {
    await notifyEnquiry(db, telegram, id, opts);
  }
  return rows.length;
}

/** Starts the 5-minute loop. Returns a stop function for tests and shutdown. */
export function startRetryLoop(
  db: Db,
  telegram: TelegramClient,
  opts: NotifyOptions = {},
  intervalMs = 5 * 60_000,
): () => void {
  const timer = setInterval(() => {
    void retryPendingNotifications(db, telegram, opts).catch(() => {
      /* the alert in the nightly sweep is the backstop */
    });
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

/**
 * Alert the Operator about notifications that never landed (#7 §5, run from the
 * #8 nightly sweep).
 *
 * Fires on `pending` and `failed` only. `suppressed` is a correct outcome, not a
 * fault. Re-deriving #6's 10-minute duplicate window here was rejected: it would
 * duplicate that logic in a second place and the two would drift apart the first
 * time either was touched.
 */
export async function alertStuckNotifications(
  db: Db,
  telegram: TelegramClient,
): Promise<boolean> {
  const rows = db
    .prepare(
      `SELECT id FROM enquiry
        WHERE notification_status IN ('pending', 'failed')
          AND created_at < ?
          AND ${NOT_WITHDRAWN}
        ORDER BY id ASC`,
    )
    .all(minutesAgoIso(STUCK_AFTER_MINUTES)) as { id: number }[];

  if (rows.length === 0) return false;

  const ids = rows.map((r) => r.id);
  await telegram.sendToOperator(
    formatOperatorAlert({ kind: "stuck_notifications", ids, count: ids.length }),
  );
  return true;
}

export function countPendingNotifications(db: Db): number {
  const row = db
    .prepare(
      `SELECT count(*) AS c FROM enquiry WHERE notification_status IN ('pending', 'failed')`,
    )
    .get() as { c: number };
  return row.c;
}
