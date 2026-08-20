/**
 * The Enquiry API (#6).
 *
 * Two endpoints and nothing else. `/health` exists so that "tunnel up, API down"
 * can be told from "tunnel down" without submitting a fake enquiry.
 */

import { Hono } from "hono";
import type { Db } from "./db.js";
import { NOT_WITHDRAWN } from "./db.js";
import type { ConsentNotices } from "./consent.js";
import type { Logger } from "./logger.js";
import type { RateLimiter } from "./rate-limit.js";
import type { TelegramClient } from "./telegram/client.js";
import type { Turnstile } from "./turnstile.js";
import { notifyEnquiry, suppressNotification } from "./notify.js";
import { validateEnquiry } from "./validate.js";

/** #6: a second submission from the same phone inside this window is not re-notified. */
const DUPLICATE_WINDOW_MINUTES = 10;

export type AppDeps = {
  db: Db;
  consent: ConsentNotices;
  telegram: TelegramClient;
  turnstile: Turnstile;
  rateLimiter: RateLimiter;
  logger: Logger;
  allowedOrigin: string;
  /**
   * Notification is fired and forgotten on the request path. Tests pass a
   * collector so they can await it; production passes nothing.
   */
  onNotify?: (p: Promise<void>) => void;
};

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  // --- CORS: one origin, not a wildcard (#6) ---
  //
  // `www` → apex is a 301 issued by GitHub Pages, not by Cloudflare, because
  // Redirect Rules need a proxied record and both host records are deliberately
  // grey-clouded. So only the apex ever reaches here.
  app.use("*", async (c, next) => {
    const origin = c.req.header("Origin");
    if (origin === deps.allowedOrigin) {
      c.header("Access-Control-Allow-Origin", deps.allowedOrigin);
      c.header("Vary", "Origin");
    }
    await next();
  });

  // A JSON content-type forces a preflight, so this must be handled explicitly.
  app.options("/v1/enquiries", (c) => {
    if (c.req.header("Origin") !== deps.allowedOrigin) return c.body(null, 403);
    c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "content-type");
    c.header("Access-Control-Max-Age", "86400");
    return c.body(null, 204);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/v1/enquiries", async (c) => {
    const started = Date.now();

    // Defence in depth only — real rate limiting is at the Cloudflare edge,
    // which is what keeps IP addresses out of this codebase entirely.
    if (!deps.rateLimiter.take()) {
      deps.logger.log({ event: "enquiry.rate_limited", status: 429 });
      return c.json({ ok: false, error: "rate_limited" }, 429);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      deps.logger.log({ event: "enquiry.bad_json", status: 400 });
      return c.json({ ok: false, errors: { body: "Expected JSON." } }, 400);
    }

    // --- Honeypot: hidden in the DOM, never shown to a human ---
    // A silent 201 so bots learn nothing. Checked before Turnstile because
    // there is no point asking Cloudflare about a caller we have already made
    // up our mind about.
    const honeypot = (body as Record<string, unknown> | null)?.["website"];
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      deps.logger.log({ event: "enquiry.honeypot", status: 201 });
      return c.json({ ok: true }, 201);
    }

    const validated = validateEnquiry(body);
    if (!validated.ok) {
      // Deliberately logging only the field names, never their values — the
      // framework habit of logging the offending body would make the log a
      // second uncontrolled copy of the personal data (#6).
      deps.logger.log({
        event: "enquiry.invalid",
        status: 400,
        detail: Object.keys(validated.errors).join(","),
      });
      return c.json({ ok: false, errors: validated.errors }, 400);
    }

    const token = (body as Record<string, unknown>)["turnstile_token"];
    const turnstileStatus = await deps.turnstile.verify(
      typeof token === "string" ? token : undefined,
    );

    // Only an actual rejection blocks. Unreachable means `unverified`, and the
    // enquiry is accepted: a parent lost to a Cloudflare hiccup costs a student.
    if (turnstileStatus === "failed") {
      deps.logger.log({ event: "enquiry.turnstile_rejected", status: 403, turnstile_status: turnstileStatus });
      return c.json({ ok: false, error: "turnstile" }, 403);
    }

    const notice = deps.consent[validated.value.consent_locale];
    const now = new Date().toISOString();

    const isDuplicate = hasRecentEnquiry(deps.db, validated.value.phone_e164);

    const info = deps.db
      .prepare(
        `INSERT INTO enquiry (
           created_at, parent_name, phone_e164, phone_raw, class_level, subjects, message,
           consent_notice_version, consent_locale, consent_text, consented_at,
           turnstile_status, notification_status
         ) VALUES (
           @created_at, @parent_name, @phone_e164, @phone_raw, @class_level, @subjects, @message,
           @consent_notice_version, @consent_locale, @consent_text, @consented_at,
           @turnstile_status, 'pending'
         )`,
      )
      .run({
        created_at: now,
        parent_name: validated.value.parent_name,
        phone_e164: validated.value.phone_e164,
        phone_raw: validated.value.phone_raw,
        class_level: validated.value.class_level,
        subjects: JSON.stringify(validated.value.subjects),
        message: validated.value.message,
        consent_notice_version: notice.version,
        consent_locale: notice.locale,
        consent_text: notice.verbatim,
        consented_at: now,
        turnstile_status: turnstileStatus,
      });

    const id = Number(info.lastInsertRowid);

    // The row is inserted either way — each submission carries its own Consent
    // Record and discarding one destroys the audit trail — but the second
    // Telegram message is suppressed.
    if (isDuplicate) {
      suppressNotification(deps.db, id);
    } else {
      // Fire and forget: the parent's 201 must not wait on Telegram, because #6
      // puts a 4-second client timeout on this request.
      const pending = notifyEnquiry(deps.db, deps.telegram, id, { logger: deps.logger }).catch(
        () => {
          /* the retry loop and the nightly alert are the backstops */
        },
      );
      deps.onNotify?.(pending);
    }

    deps.logger.log({
      event: "enquiry.accepted",
      status: 201,
      enquiry_id: id,
      turnstile_status: turnstileStatus,
      duplicate_suppressed: isDuplicate,
      duration_ms: Date.now() - started,
    });

    return c.json({ ok: true }, 201);
  });

  return app;
}

/**
 * Keyed on `phone_e164` alone. It used to be the phone/mode pair; `mode` was
 * removed when Home Tutor Matching was retired on 2026-08-20, and there is now
 * nothing to distinguish two enquiries from the same number.
 */
function hasRecentEnquiry(db: Db, phoneE164: string): boolean {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60_000).toISOString();
  const row = db
    .prepare(
      `SELECT 1 AS hit FROM enquiry
        WHERE phone_e164 = ? AND created_at >= ? AND ${NOT_WITHDRAWN}
        LIMIT 1`,
    )
    .get(phoneE164, since) as { hit: number } | undefined;
  return row !== undefined;
}
