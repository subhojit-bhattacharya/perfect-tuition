/**
 * Cloudflare Turnstile verification (#6).
 *
 * The governing decision is **fail open**. If Turnstile's API is unreachable we
 * accept the enquiry and record `turnstile_status = 'unverified'`, and the
 * Telegram notification carries a ⚠ so Jayeeta can see it happened. A parent
 * lost to a Cloudflare hiccup costs a student; a junk row costs one glance at
 * Telegram.
 *
 * Only an actual rejection — a reachable Turnstile saying no — produces `failed`,
 * which the route turns into a 403.
 */

import type { TurnstileStatus } from "./db.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 3000;

export type Turnstile = { verify(token: string | undefined): Promise<TurnstileStatus> };

export function createTurnstile(secretKey: string | null): Turnstile {
  return {
    async verify(token: string | undefined): Promise<TurnstileStatus> {
      // Not configured yet, or the client sent nothing. Both are the fail-open
      // path: this is a marketing form, not a bank.
      if (secretKey === null) return "unverified";
      if (typeof token !== "string" || token === "") return "unverified";

      try {
        const body = new FormData();
        body.append("secret", secretKey);
        body.append("response", token);

        const res = await fetch(VERIFY_URL, {
          method: "POST",
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!res.ok) return "unverified";

        const json = (await res.json()) as { success?: unknown };
        return json.success === true ? "verified" : "failed";
      } catch {
        // Unreachable, timed out, or unparseable. Fail open.
        return "unverified";
      }
    },
  };
}
