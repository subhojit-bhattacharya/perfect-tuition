import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import { monthsAgo, runRetentionSweep } from "../src/retention.js";
import { correct, requestErasure, resolvePhone, show, withdrawConsent } from "../src/rights.js";
import { insertEnquiry, testDb } from "./helpers.js";

let ctx: ReturnType<typeof testDb>;
let db: Db;

beforeEach(() => {
  ctx = testDb();
  db = ctx.db;
});
afterEach(() => ctx.cleanup());

const PHONE = "+919876543210";
const count = () => (db.prepare("SELECT count(*) c FROM enquiry").get() as { c: number }).c;
const logs = () =>
  db.prepare("SELECT * FROM erasure_log").all() as { reason: string; requested_at: string | null }[];

describe("resolvePhone — the identity check", () => {
  it("accepts however the parent happens to write their number", () => {
    for (const input of ["9876543210", "098765 43210", "+91 98765-43210"]) {
      const r = resolvePhone(input);
      expect(r.ok && r.phoneE164, input).toBe(PHONE);
    }
  });

  it("refuses an unusable number rather than guessing", () => {
    expect(resolvePhone("12345").ok).toBe(false);
  });
});

describe("show", () => {
  it("returns every enquiry from that number, oldest first", () => {
    insertEnquiry(db, { created_at: monthsAgo(5) });
    insertEnquiry(db, { created_at: monthsAgo(1) });
    insertEnquiry(db, { phone_e164: "+919000000001" });

    const r = show(db, PHONE);
    expect(r.records).toHaveLength(2);
    expect(r.records[0]!.created_at < r.records[1]!.created_at).toBe(true);
  });

  it("hides withdrawn records but still counts them honestly", () => {
    insertEnquiry(db);
    insertEnquiry(db, { withdrawn_at: new Date().toISOString() });

    const r = show(db, PHONE);
    expect(r.records).toHaveLength(1);
    expect(r.withdrawnCount).toBe(1);
  });

  it("returns nothing for a number we hold no enquiry for", () => {
    expect(show(db, "+919000000009").records).toHaveLength(0);
  });
});

describe("correct", () => {
  it("corrects a misspelled name", () => {
    insertEnquiry(db, { parent_name: "Roopa Sen" });
    expect(correct(db, PHONE, "parent_name", "Rupa Sen")).toMatchObject({ ok: true, updated: 1 });
    expect(show(db, PHONE).records[0]!.parent_name).toBe("Rupa Sen");
  });

  it("moves the lookup key when the phone itself was wrong", () => {
    insertEnquiry(db);
    const r = correct(db, PHONE, "phone", "9123456789");
    expect(r.ok).toBe(true);
    expect(show(db, PHONE).records).toHaveLength(0);
    expect(show(db, "+919123456789").records).toHaveLength(1);
  });

  it("refuses a correction that would make the number unusable", () => {
    insertEnquiry(db);
    expect(correct(db, PHONE, "phone", "12345").ok).toBe(false);
    expect(show(db, PHONE).records).toHaveLength(1);
  });

  it("stores corrected subjects as the JSON array the column holds", () => {
    insertEnquiry(db);
    correct(db, PHONE, "subjects", "Economics, Accountancy");
    expect(show(db, PHONE).records[0]!.subjects).toBe('["Economics","Accountancy"]');
  });

  it("clears the class when told to", () => {
    insertEnquiry(db, { class_level: 9 });
    correct(db, PHONE, "class_level", "");
    expect(show(db, PHONE).records[0]!.class_level).toBeNull();
  });

  it("refuses a class that is not a whole number", () => {
    insertEnquiry(db);
    expect(correct(db, PHONE, "class_level", "nine").ok).toBe(false);
  });

  it("does not touch a withdrawn record", () => {
    insertEnquiry(db, { withdrawn_at: new Date().toISOString() });
    expect(correct(db, PHONE, "parent_name", "X")).toMatchObject({ updated: 0 });
  });
});

describe("requestErasure", () => {
  it("erases immediately when the record has already passed the floor", () => {
    insertEnquiry(db, { created_at: monthsAgo(14) });
    const r = requestErasure(db, PHONE);
    expect(r).toMatchObject({ erasedNow: 1, deferred: 0 });
    expect(count()).toBe(0);
    expect(logs()[0]).toMatchObject({ reason: "request" });
  });

  it("defers a request against a record younger than a year, and says until when", () => {
    insertEnquiry(db, { created_at: monthsAgo(3) });
    const r = requestErasure(db, PHONE);
    expect(r).toMatchObject({ erasedNow: 0, deferred: 1 });
    expect(r.deferredUntil).not.toBeNull();
    expect(count()).toBe(1);
  });

  it("stamps the row so the nightly sweep picks it up on the day it crosses", () => {
    insertEnquiry(db, { created_at: monthsAgo(3) });
    requestErasure(db, PHONE);
    expect(show(db, PHONE).records[0]!.erasure_requested_at).not.toBeNull();

    // Nothing happens for now.
    expect(runRetentionSweep(db).request).toBe(0);

    // Nine months later the same stamped row is swept without anyone acting.
    db.prepare("UPDATE enquiry SET created_at = ?").run(monthsAgo(13));
    expect(runRetentionSweep(db).request).toBe(1);
    expect(count()).toBe(0);
  });

  it("handles a parent with both an old and a recent enquiry", () => {
    insertEnquiry(db, { created_at: monthsAgo(14) });
    insertEnquiry(db, { created_at: monthsAgo(2) });
    const r = requestErasure(db, PHONE);
    expect(r).toMatchObject({ erasedNow: 1, deferred: 1 });
    expect(count()).toBe(1);
  });

  it("does nothing for a number we hold nothing for", () => {
    expect(requestErasure(db, "+919000000009")).toMatchObject({ erasedNow: 0, deferred: 0 });
  });
});

describe("withdrawConsent", () => {
  it("makes the record invisible immediately, even though erasure waits", () => {
    insertEnquiry(db, { created_at: monthsAgo(2) });
    const r = withdrawConsent(db, PHONE);

    expect(r).toMatchObject({ withdrawn: 1, erasedNow: 0, deferred: 1 });
    // Invisible to every read path from this moment.
    expect(show(db, PHONE).records).toHaveLength(0);
    // But still on disk until the floor.
    expect(count()).toBe(1);
  });

  it("erases at the floor rather than at 24 months", () => {
    // The purpose is unambiguously spent the moment consent is withdrawn, so
    // holding the record the full 24 months would be indefensible.
    insertEnquiry(db, { created_at: monthsAgo(13) });
    withdrawConsent(db, PHONE);
    expect(count()).toBe(0);
    expect(logs()[0]).toMatchObject({ reason: "withdrawal" });
  });

  it("queues a young withdrawal for the sweep at the floor, not at 24 months", () => {
    insertEnquiry(db, { created_at: monthsAgo(2) });
    withdrawConsent(db, PHONE);

    db.prepare("UPDATE enquiry SET created_at = ?").run(monthsAgo(13));
    const s = runRetentionSweep(db);
    expect(s.withdrawal).toBe(1);
    expect(count()).toBe(0);
  });

  it("is idempotent — withdrawing twice does not double-count", () => {
    insertEnquiry(db, { created_at: monthsAgo(2) });
    withdrawConsent(db, PHONE);
    expect(withdrawConsent(db, PHONE)).toMatchObject({ withdrawn: 0 });
  });

  it("stops the record ever being notified about", () => {
    const id = insertEnquiry(db, { created_at: monthsAgo(2), notification_status: "pending" });
    withdrawConsent(db, PHONE);
    const row = db.prepare("SELECT withdrawn_at FROM enquiry WHERE id = ?").get(id) as {
      withdrawn_at: string | null;
    };
    expect(row.withdrawn_at).not.toBeNull();
  });
});
