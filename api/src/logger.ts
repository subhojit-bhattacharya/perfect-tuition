/**
 * Metadata-only logging (#6, #8 §9).
 *
 * Never `parent_name`, `phone_e164`, `phone_raw`, or `message`. Concretely this
 * means overriding the framework habit of logging the request body on a
 * validation failure — otherwise the logs quietly become a second, unmanaged
 * copy of the personal data with none of the retention controls on it.
 *
 * The honest consequence, written down rather than discovered in an incident:
 * these logs cannot tell you *which* enquiry was accessed in a breach, only that
 * an endpoint was hit. That is a deliberate trade of forensic depth for holding
 * less data.
 *
 * Retention is 12 months, enforced by logrotate (deploy/logrotate/), not here.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** The union of everything that may be logged. Adding a field is a decision. */
export type LogEvent = {
  event: string;
  status?: number;
  method?: string;
  path?: string;
  /** The enquiry id is an opaque integer, not an identifier for a person. */
  enquiry_id?: number;
  turnstile_status?: string;
  duplicate_suppressed?: boolean;
  notification_status?: string;
  attempts?: number;
  count?: number;
  duration_ms?: number;
  reason?: string;
  detail?: string;
};

/**
 * Field names that must never appear in a log line. Asserted at runtime rather
 * than left to review, because the cost of getting this wrong is a second
 * uncontrolled copy of parents' personal data.
 */
const FORBIDDEN = ["parent_name", "phone", "phone_e164", "phone_raw", "message", "consent_text"];

export type Logger = { log(event: LogEvent): void };

export function createLogger(logDir: string | null): Logger {
  if (logDir !== null) mkdirSync(logDir, { recursive: true });

  return {
    log(event: LogEvent): void {
      for (const key of Object.keys(event)) {
        if (FORBIDDEN.includes(key)) {
          throw new Error(
            `Refusing to log "${key}": logs are metadata-only (#6). ` +
              `Personal data in logs would be an uncontrolled second copy.`,
          );
        }
      }

      const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
      if (logDir === null) return;
      appendFileSync(join(logDir, "api.log"), line + "\n");
    },
  };
}

/** Used by tests and by the CLI scripts, which print rather than write a file. */
export function consoleLogger(): Logger {
  return {
    log(event: LogEvent): void {
      for (const key of Object.keys(event)) {
        if (FORBIDDEN.includes(key)) throw new Error(`Refusing to log "${key}".`);
      }
      console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
    },
  };
}
