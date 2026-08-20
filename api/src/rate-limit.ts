/**
 * A crude global cap, as defence in depth only (#6).
 *
 * Real rate limiting happens at the Cloudflare edge (~5/min and ~30/hour per
 * IP). That placement is deliberate and is the reason there is no `ip_address`
 * column anywhere in this codebase: enforcing per-IP here would require the IP
 * to reach this machine, which is both worse privacy and one more thing to
 * disclose in the notice.
 *
 * So this counter is *global across all callers*, not per-IP. It exists to stop
 * a flood if the edge rule is ever misconfigured, and nothing more.
 */

const WINDOW_MS = 60_000;
const MAX_IN_WINDOW = 30;

export type RateLimiter = { take(): boolean };

export function createRateLimiter(
  max: number = MAX_IN_WINDOW,
  windowMs: number = WINDOW_MS,
  now: () => number = Date.now,
): RateLimiter {
  let windowStart = now();
  let count = 0;

  return {
    take(): boolean {
      const t = now();
      if (t - windowStart >= windowMs) {
        windowStart = t;
        count = 0;
      }
      if (count >= max) return false;
      count += 1;
      return true;
    },
  };
}
