/**
 * The nightly retention sweep (#8 §1, §7, §8).
 *
 *   Period : 24 months from `created_at`.
 *   Floor  : 12 months, Rule 8(3). Nothing is erased before it is one year old,
 *            including on request.
 *   Clock  : collection, not last contact.
 *
 * Order matters and is easy to get backwards. The caller — scripts/backup.ts —
 * must run this sweep *before* the snapshot, never after. Sweeping after the
 * backup means each night's snapshot re-captures the rows deleted that morning,
 * and the 90-day prune window silently becomes their real retention period.
 */

import type { Db } from "./db.js";

export const RETENTION_MONTHS = 24;
/** Rule 8(3). Nothing goes below this, including an honoured erasure request. */
export const FLOOR_MONTHS = 12;

export type SweepSummary = {
  /** Erasure requests that had been waiting for the floor. */
  request: number;
  /** Withdrawn records that crossed the floor. */
  withdrawal: number;
  /** Ordinary expiry at 24 months. */
  retention: number;
};

export function monthsAgo(months: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

/**
 * Executes the three erasure passes in the order #8 §8 fixes, and writes the
 * `erasure_log` entries that are the evidence any of it happened.
 *
 * The whole thing is one transaction: a half-swept database that has deleted
 * rows but not logged them would leave us unable to prove a request was
 * honoured, which is worse than not having swept at all.
 */
export function runRetentionSweep(db: Db, now: Date = new Date()): SweepSummary {
  const executedAt = now.toISOString();
  const floor = monthsAgo(FLOOR_MONTHS, now);
  const expiry = monthsAgo(RETENTION_MONTHS, now);

  const sweep = db.transaction((): SweepSummary => {
    // 1. Erasure requests that have crossed the floor since yesterday.
    //
    // This step matters more than it looks: without it, honouring a deferred
    // request would depend on a human remembering nine months later.
    const request = eraseRequested(db, floor, executedAt);

    // 2. Withdrawn records that have crossed the floor.
    const withdrawal = eraseWithdrawn(db, floor, executedAt);

    // 3. Ordinary expiry at 24 months.
    const retention = eraseExpired(db, expiry, executedAt);

    return { request, withdrawal, retention };
  });

  return sweep();
}

/**
 * Per-row log entries, because `requested_at` differs per request and it is the
 * field that proves *when* the request was made — it has to survive the row that
 * carried it.
 */
function eraseRequested(db: Db, floor: string, executedAt: string): number {
  const rows = db
    .prepare(
      `SELECT id, erasure_requested_at FROM enquiry
        WHERE erasure_requested_at IS NOT NULL
          AND created_at <= ?`,
    )
    .all(floor) as { id: number; erasure_requested_at: string }[];

  eraseRows(db, rows, "request", executedAt, (r) => r.erasure_requested_at);
  return rows.length;
}

function eraseWithdrawn(db: Db, floor: string, executedAt: string): number {
  const rows = db
    .prepare(
      `SELECT id, withdrawn_at FROM enquiry
        WHERE withdrawn_at IS NOT NULL
          AND erasure_requested_at IS NULL
          AND created_at <= ?`,
    )
    .all(floor) as { id: number; withdrawn_at: string }[];

  eraseRows(db, rows, "withdrawal", executedAt, (r) => r.withdrawn_at);
  return rows.length;
}

/** Aggregated: nobody asked, so there is no per-row request date to preserve. */
function eraseExpired(db: Db, expiry: string, executedAt: string): number {
  const info = db.prepare(`DELETE FROM enquiry WHERE created_at <= ?`).run(expiry);
  const count = info.changes;

  if (count > 0) {
    db.prepare(
      `INSERT INTO erasure_log (requested_at, executed_at, reason, row_count)
       VALUES (NULL, ?, 'retention', ?)`,
    ).run(executedAt, count);
  }
  return count;
}

function eraseRows<T extends { id: number }>(
  db: Db,
  rows: T[],
  reason: "request" | "withdrawal",
  executedAt: string,
  requestedAt: (row: T) => string,
): void {
  if (rows.length === 0) return;

  const del = db.prepare(`DELETE FROM enquiry WHERE id = ?`);
  const log = db.prepare(
    `INSERT INTO erasure_log (requested_at, executed_at, reason, row_count)
     VALUES (?, ?, ?, 1)`,
  );

  for (const row of rows) {
    del.run(row.id);
    log.run(requestedAt(row), executedAt, reason);
  }
}
