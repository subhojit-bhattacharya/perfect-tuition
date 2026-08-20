import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  formatEnquiry,
  formatHeartbeat,
  formatOperatorAlert,
} from "../src/telegram/format.js";
import type { EnquiryRow } from "../src/db.js";

const row: EnquiryRow = {
  id: 123,
  created_at: "2026-08-20T14:02:00.000Z",
  parent_name: "Rupa Sen",
  phone_e164: "+919876543210",
  phone_raw: "98765 43210",
  class_level: 9,
  subjects: '["Accountancy","Economics"]',
  message: "Please call after 6pm.",
  consent_notice_version: "2",
  consent_locale: "en",
  consent_text: "…",
  consented_at: "2026-08-20T14:02:00.000Z",
  turnstile_status: "verified",
  notified_at: null,
  notification_status: "pending",
  notify_attempts: 0,
  withdrawn_at: null,
  erasure_requested_at: null,
};

describe("escapeHtml", () => {
  it("escapes exactly the three characters Telegram's HTML mode cares about", () => {
    expect(escapeHtml(`&<>`)).toBe("&amp;&lt;&gt;");
  });

  it("leaves quotes and Markdown metacharacters alone", () => {
    // We are not in Markdown mode precisely so that these need no handling.
    expect(escapeHtml(`*_[]()"'`)).toBe(`*_[]()"'`);
  });

  it("escapes the ampersand first, so an escape is not double-escaped", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("formatEnquiry", () => {
  it("leads with the name and phone", () => {
    const text = formatEnquiry(row);
    const nameAt = text.indexOf("Rupa Sen");
    const phoneAt = text.indexOf("+919876543210");
    const messageAt = text.indexOf("Please call after 6pm.");
    expect(nameAt).toBeGreaterThan(-1);
    expect(phoneAt).toBeGreaterThan(nameAt);
    expect(messageAt).toBeGreaterThan(phoneAt);
  });

  it("carries the enquiry id, which is the join key for the Operator channel", () => {
    expect(formatEnquiry(row)).toContain("123");
  });

  it("gives one tap to reply by phone and by WhatsApp", () => {
    const text = formatEnquiry(row);
    expect(text).toContain(`href="tel:+919876543210"`);
    expect(text).toContain(`href="https://wa.me/919876543210?text=`);
  });

  it("shows the raw string too, because normalisation can get it wrong", () => {
    expect(formatEnquiry(row)).toContain("98765 43210");
  });

  it("renders the class and subjects", () => {
    const text = formatEnquiry(row);
    expect(text).toContain("Class 9");
    expect(text).toContain("Accountancy");
    expect(text).toContain("Economics");
  });

  it("marks an enquiry that skipped bot-checking via the fail-open path", () => {
    expect(formatEnquiry({ ...row, turnstile_status: "unverified" })).toContain("⚠");
    expect(formatEnquiry(row)).not.toContain("⚠");
  });

  it("escapes every interpolated value", () => {
    const hostile: EnquiryRow = {
      ...row,
      parent_name: "<b>Rupa</b> & Sen",
      message: "a < b & c > d",
      phone_raw: "<script>",
      subjects: '["<i>Maths</i>"]',
    };
    const text = formatEnquiry(hostile);
    expect(text).toContain("&lt;b&gt;Rupa&lt;/b&gt; &amp; Sen");
    expect(text).toContain("a &lt; b &amp; c &gt; d");
    expect(text).toContain("&lt;script&gt;");
    expect(text).toContain("&lt;i&gt;Maths&lt;/i&gt;");
    // Nothing unescaped survives beyond the tags we deliberately emit.
    expect(text).not.toContain("<b>Rupa");
    expect(text).not.toContain("<script>");
  });

  it("survives a null message, class and empty subjects", () => {
    const sparse: EnquiryRow = { ...row, message: null, class_level: null, subjects: "[]" };
    expect(() => formatEnquiry(sparse)).not.toThrow();
    expect(formatEnquiry(sparse)).toContain("Rupa Sen");
  });

  it("survives subjects that are not parseable JSON", () => {
    expect(() => formatEnquiry({ ...row, subjects: "not json" })).not.toThrow();
  });

  it("shows the timestamp in India time, which is what Jayeeta reads", () => {
    // 14:02 UTC is 19:32 IST.
    expect(formatEnquiry(row)).toMatch(/7:32|19:32/);
  });
});

describe("the Operator channel carries no personal data", () => {
  const personal = ["Rupa Sen", "9876543210", "98765 43210", "Please call after 6pm"];

  it("names no one in a stuck-notification alert", () => {
    const text = formatOperatorAlert({ kind: "stuck_notifications", ids: [123, 124], count: 2 });
    expect(text).toContain("123");
    for (const leak of personal) expect(text).not.toContain(leak);
  });

  it("names no one in a backup failure", () => {
    const text = formatOperatorAlert({ kind: "backup_failed", detail: "drive not mounted" });
    expect(text).toContain("drive not mounted");
    for (const leak of personal) expect(text).not.toContain(leak);
  });

  it("names no one in a drive-swap warning", () => {
    const text = formatOperatorAlert({ kind: "drive_stale", label: "PT-BACKUP-A", days: 11 });
    expect(text).toContain("PT-BACKUP-A");
    expect(text).toContain("11");
  });

  it("names no one in the heartbeat", () => {
    const text = formatHeartbeat({
      lastBackupAt: "2026-08-19T20:00:00.000Z",
      driveLabel: "PT-BACKUP-A",
      enquiriesThisWeek: 7,
      pendingNotifications: 0,
      backupConfigured: true,
    });
    expect(text).toContain("7");
    expect(text).toContain("PT-BACKUP-A");
    for (const leak of personal) expect(text).not.toContain(leak);
  });

  it("reports unconfigured backup as a calm note, not an alarm", () => {
    const text = formatHeartbeat({
      lastBackupAt: null,
      driveLabel: null,
      enquiriesThisWeek: 0,
      pendingNotifications: 0,
      backupConfigured: false,
    });
    expect(text).toContain("not configured");
    expect(text).not.toContain("⚠");
  });
});
