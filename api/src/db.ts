/**
 * The Enquiry store.
 *
 * SQLCipher via better-sqlite3-multiple-ciphers (#8 §4). `PRAGMA key` is the
 * first statement on every connection, before the schema is applied — a
 * connection that skips it does not fail loudly, it just reads a file it cannot
 * decrypt, so `openDatabase` is the only sanctioned way in.
 *
 * Accepted residual risk, recorded in docs/security-measures.md rather than
 * hidden here: the key sits in plaintext in `.env` on an unencrypted disk in the
 * same room as the database. This defends against the file being *copied*, not
 * against the laptop being stolen.
 */

import Database from "better-sqlite3-multiple-ciphers";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Db = Database.Database;

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = join(here, "..", "schema.sql");

export type NotificationStatus = "pending" | "sent" | "suppressed" | "failed";
export type TurnstileStatus = "verified" | "unverified" | "failed";

/** Mirrors `enquiry` in schema.sql exactly. Note: no `mode`, no `ip_address`. */
export type EnquiryRow = {
  id: number;
  created_at: string;
  parent_name: string;
  phone_e164: string;
  phone_raw: string;
  class_level: number | null;
  subjects: string;
  message: string | null;
  consent_notice_version: string;
  consent_locale: string;
  consent_text: string;
  consented_at: string;
  turnstile_status: TurnstileStatus;
  notified_at: string | null;
  notification_status: NotificationStatus;
  notify_attempts: number;
  withdrawn_at: string | null;
  erasure_requested_at: string | null;
};

export type OpenOptions = {
  /** Path to the database file. SQLCipher cannot key an in-memory database. */
  path: string;
  key: string;
  readonly?: boolean;
};

export function openDatabase({ path, key, readonly = false }: OpenOptions): Db {
  if (key === "") {
    throw new Error(
      "SQLCIPHER_KEY is empty. Refusing to open the database unencrypted — " +
        "an unkeyed open would silently write plaintext personal data to disk.",
    );
  }

  const db = new Database(path, { readonly });
  // Order matters: cipher selection, then the key, then anything else.
  db.pragma("cipher='sqlcipher'");
  db.pragma(`key='${key.replace(/'/g, "''")}'`);

  // Proves the key actually opened the file. Without this a wrong key surfaces
  // later, at a random query, instead of here.
  db.prepare("SELECT count(*) FROM sqlite_master").get();

  if (!readonly) {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function applySchema(db: Db): void {
  db.exec(readFileSync(SCHEMA_PATH, "utf8"));
}

/**
 * Every read path in the application must exclude withdrawn rows: #8 §7 makes a
 * withdrawal *immediately* invisible and never contacted, with the actual
 * erasure deferred to the 12-month floor. Using this constant rather than
 * hand-writing the predicate is what keeps that true as read paths are added.
 */
export const NOT_WITHDRAWN = "withdrawn_at IS NULL";
