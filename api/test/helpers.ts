import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applySchema, openDatabase, type Db } from "../src/db.js";
import type { SendResult, TelegramClient } from "../src/telegram/client.js";

/**
 * SQLCipher cannot key an in-memory database, so every test gets a real file in
 * a temp directory. This also means the tests exercise the same encrypted path
 * production uses, which is what makes the plaintext assertion in backup.test
 * meaningful.
 */
export function testDb(): { db: Db; path: string; key: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "pt-test-"));
  const path = join(dir, "enquiries.db");
  const key = "test-key-not-a-real-secret";
  const db = openDatabase({ path, key });
  applySchema(db);
  return {
    db,
    path,
    key,
    cleanup: () => {
      try {
        db.close();
      } catch {
        /* already closed */
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export type FakeTelegram = TelegramClient & {
  ownerMessages: string[];
  operatorMessages: string[];
  /** Queue of results; when exhausted, sends succeed. */
  results: SendResult[];
  failNext(n: number, retryable?: boolean): void;
};

export function fakeTelegram(): FakeTelegram {
  const ownerMessages: string[] = [];
  const operatorMessages: string[] = [];
  const results: SendResult[] = [];

  const next = (): SendResult => results.shift() ?? { ok: true };

  return {
    configured: true,
    ownerMessages,
    operatorMessages,
    results,
    failNext(n: number, retryable = true) {
      for (let i = 0; i < n; i++) {
        results.push({ ok: false, error: "simulated failure", retryable });
      }
    },
    async sendToOwner(html: string) {
      const r = next();
      if (r.ok) ownerMessages.push(html);
      return r;
    },
    async sendToOperator(html: string) {
      const r = next();
      if (r.ok) operatorMessages.push(html);
      return r;
    },
  };
}

export function insertEnquiry(db: Db, overrides: Record<string, unknown> = {}): number {
  const row = {
    created_at: new Date().toISOString(),
    parent_name: "Rupa Sen",
    phone_e164: "+919876543210",
    phone_raw: "98765 43210",
    class_level: 9,
    subjects: '["Accountancy"]',
    message: null,
    consent_notice_version: "2",
    consent_locale: "en",
    consent_text: "notice text",
    consented_at: new Date().toISOString(),
    turnstile_status: "verified",
    notification_status: "pending",
    ...overrides,
  };

  const columns = Object.keys(row);
  const stmt = db.prepare(
    `INSERT INTO enquiry (${columns.join(", ")}) VALUES (${columns.map((c) => `@${c}`).join(", ")})`,
  );
  return Number(stmt.run(row).lastInsertRowid);
}

/** An ISO timestamp `days` in the past — the retention tests are all about age. */
export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}
