-- Perfect Tuition — Enquiry store.
--
-- Decided in #6 (API contract) and amended by #8 (retention, backup, access).
-- The database is encrypted at rest with SQLCipher; `PRAGMA key` must be the
-- first statement on every connection, before this file is applied.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- An inbound Enquiry from a Prospective Parent, with its Consent Record
-- denormalised alongside it. Validation is lenient by policy (#6): any
-- class/subject pairing is accepted, including ones we do not teach.
CREATE TABLE IF NOT EXISTS enquiry (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT    NOT NULL,                  -- ISO-8601 UTC; the retention clock
  parent_name   TEXT    NOT NULL,
  phone_e164    TEXT    NOT NULL,                  -- +919876543210
  phone_raw     TEXT    NOT NULL,                  -- exactly what they typed
  class_level   INTEGER,                           -- nullable, lenient
  subjects      TEXT    NOT NULL DEFAULT '[]',     -- JSON array
  mode          TEXT    NOT NULL,                  -- coaching_centre | home_tutor
  message       TEXT,

  -- Consent Record. The burden of proving consent falls on the business.
  consent_notice_version TEXT NOT NULL,
  consent_locale         TEXT NOT NULL,            -- en | bn
  consent_text           TEXT NOT NULL,            -- verbatim, denormalised
  consented_at           TEXT NOT NULL,

  turnstile_status       TEXT NOT NULL,            -- verified | unverified | failed
  notified_at            TEXT,                     -- NULL until Telegram confirms

  -- Lifecycle (#8). Deliberately no `last_contact_at`: there is no admin
  -- interface in v1, so nothing would ever write to it, and a retention field
  -- that is never updated makes the policy undemonstrable.
  withdrawn_at           TEXT,                     -- consent withdrawn (s.6(4)-(6))
  erasure_requested_at   TEXT                      -- stamped on request; execution
                                                   -- may be deferred to the Rule 8(3)
                                                   -- one-year floor
);

-- No `ip_address` column, deliberately: rate limiting happens at the Cloudflare
-- edge, so IP addresses never reach this machine.

-- The nightly retention sweep scans by age.
CREATE INDEX IF NOT EXISTS enquiry_created_at_idx
  ON enquiry (created_at);

-- Duplicate suppression (#6) and erasure lookup by phone (#8).
CREATE INDEX IF NOT EXISTS enquiry_phone_created_idx
  ON enquiry (phone_e164, created_at);

-- Pending erasure requests awaiting the one-year floor.
CREATE INDEX IF NOT EXISTS enquiry_erasure_requested_idx
  ON enquiry (erasure_requested_at)
  WHERE erasure_requested_at IS NOT NULL;

-- Append-only proof that erasure happened, holding ZERO identifiers (#8).
-- A tombstone keyed by phone number would retain an identifier for the very
-- person who asked to be forgotten, and a plain hash of a ten-digit Indian
-- mobile is brute-forced in under a second. The evidence offered to a regulator
-- is this entry plus the demonstrable absence of the row.
CREATE TABLE IF NOT EXISTS erasure_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  requested_at TEXT,                               -- NULL for retention expiry
  executed_at  TEXT    NOT NULL,
  reason       TEXT    NOT NULL,                   -- request | retention | withdrawal
  row_count    INTEGER NOT NULL DEFAULT 1,
  CHECK (reason IN ('request', 'retention', 'withdrawal')),
  CHECK (row_count > 0)
);

-- Retention, ratified in #8:
--   24 months from `created_at`, matching the Consent Notice verbatim.
--   Floored at 12 months by Rule 8(3) - nothing is erased before it is one
--   year old, including on request.
