import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import { monthsAgo, runRetentionSweep } from "../src/retention.js";
import { insertEnquiry, testDb } from "./helpers.js";

let ctx: ReturnType<typeof testDb>;
let db: Db;

beforeEach(() => {
  ctx = testDb();
  db = ctx.db;
});
afterEach(() => ctx.cleanup());

const count = () => (db.prepare("SELECT count(*) c FROM enquiry").get() as { c: number }).c;
const logs = () =>
  db.prepare("SELECT * FROM erasure_log ORDER BY id").all() as {
    requested_at: string | null;
    executed_at: string;
    reason: string;
    row_count: number;
  }[];

describe("retention expiry — 24 months from created_at", () => {
  it("erases a record older than 24 months", () => {
    insertEnquiry(db, { created_at: monthsAgo(25) });
    const summary = runRetentionSweep(db);
    expect(summary.retention).toBe(1);
    expect(count()).toBe(0);
  });

  it("keeps a record younger than 24 months", () => {
    insertEnquiry(db, { created_at: monthsAgo(23) });
    expect(runRetentionSweep(db).retention).toBe(0);
    expect(count()).toBe(1);
  });

  it("logs the expiry with no requested_at, because nobody asked", () => {
    insertEnquiry(db, { created_at: monthsAgo(25) });
    insertEnquiry(db, { created_at: monthsAgo(30) });
    runRetentionSweep(db);

    const l = logs();
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ reason: "retention", requested_at: null, row_count: 2 });
  });

  it("runs the clock from created_at, not from any notion of last contact", () => {
    // `last_contact_at` is deliberately not implemented: with no admin view in
    // v1 nothing would ever write to it, and a retention field that is never
    // updated makes the policy undemonstrable.
    const cols = db.prepare("SELECT * FROM enquiry LIMIT 0").columns().map((c) => c.name);
    expect(cols).not.toContain("last_contact_at");
  });
});

describe("erasure requests — deferred to the twelve-month floor", () => {
  it("does not erase a request made before the record is a year old", () => {
    // Rule 8(3). The Consent Notice forewarns the parent of exactly this, which
    // is what makes the deferral lawful under s.12(3).
    insertEnquiry(db, { created_at: monthsAgo(3), erasure_requested_at: monthsAgo(1) });
    expect(runRetentionSweep(db).request).toBe(0);
    expect(count()).toBe(1);
  });

  it("erases the moment the record crosses twelve months", () => {
    insertEnquiry(db, { created_at: monthsAgo(13), erasure_requested_at: monthsAgo(10) });
    expect(runRetentionSweep(db).request).toBe(1);
    expect(count()).toBe(0);
  });

  it("preserves when the request was made, after the row carrying it is gone", () => {
    const requested = monthsAgo(10);
    insertEnquiry(db, { created_at: monthsAgo(13), erasure_requested_at: requested });
    runRetentionSweep(db);

    const l = logs();
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ reason: "request", requested_at: requested, row_count: 1 });
  });

  it("executes a request that crossed the floor months ago without anyone remembering", () => {
    // Step 1 of the sweep exists precisely so that honouring a deferred request
    // does not depend on a human remembering nine months later.
    insertEnquiry(db, { created_at: monthsAgo(20), erasure_requested_at: monthsAgo(18) });
    expect(runRetentionSweep(db).request).toBe(1);
  });
});

describe("withdrawal — erased at twelve months, not twenty-four", () => {
  it("erases a withdrawn record once it crosses the floor", () => {
    // s.8(7)(a): erasure on withdrawal *or* when the purpose is no longer
    // served, whichever is earlier. The purpose is spent the moment consent is
    // withdrawn, so holding it the full 24 months would be indefensible.
    insertEnquiry(db, { created_at: monthsAgo(13), withdrawn_at: monthsAgo(2) });
    expect(runRetentionSweep(db).withdrawal).toBe(1);
    expect(count()).toBe(0);
  });

  it("keeps a withdrawn record that has not yet reached the floor", () => {
    insertEnquiry(db, { created_at: monthsAgo(4), withdrawn_at: monthsAgo(1) });
    expect(runRetentionSweep(db).withdrawal).toBe(0);
    expect(count()).toBe(1);
  });

  it("logs withdrawal with the date consent was withdrawn", () => {
    const withdrawn = monthsAgo(2);
    insertEnquiry(db, { created_at: monthsAgo(13), withdrawn_at: withdrawn });
    runRetentionSweep(db);
    expect(logs()[0]).toMatchObject({ reason: "withdrawal", requested_at: withdrawn });
  });

  it("counts a withdrawn record once, not twice, when it is also past 24 months", () => {
    insertEnquiry(db, { created_at: monthsAgo(30), withdrawn_at: monthsAgo(2) });
    const s = runRetentionSweep(db);
    expect(s.withdrawal + s.retention).toBe(1);
    expect(count()).toBe(0);
    expect(logs()).toHaveLength(1);
  });
});

describe("the erasure log holds zero identifiers", () => {
  it("stores nothing that could identify the person who asked to be forgotten", () => {
    insertEnquiry(db, {
      created_at: monthsAgo(13),
      erasure_requested_at: monthsAgo(11),
      parent_name: "Rupa Sen",
      phone_e164: "+919876543210",
    });
    runRetentionSweep(db);

    const cols = db.prepare("SELECT * FROM erasure_log LIMIT 0").columns().map((c) => c.name);
    expect(cols.sort()).toEqual(["executed_at", "id", "reason", "requested_at", "row_count"]);

    // A tombstone keyed by phone number would retain an identifier for the very
    // person asking to be forgotten, and a plain hash of a ten-digit Indian
    // mobile is brute-forced in under a second.
    const serialised = JSON.stringify(logs());
    expect(serialised).not.toContain("Rupa");
    expect(serialised).not.toContain("9876543210");
  });
});

describe("the sweep as a whole", () => {
  it("leaves ordinary recent enquiries untouched", () => {
    insertEnquiry(db, { created_at: monthsAgo(1) });
    insertEnquiry(db, { created_at: monthsAgo(11) });
    const s = runRetentionSweep(db);
    expect(s).toMatchObject({ request: 0, withdrawal: 0, retention: 0 });
    expect(count()).toBe(2);
    expect(logs()).toHaveLength(0);
  });

  it("writes no log entry when nothing was erased", () => {
    insertEnquiry(db, { created_at: monthsAgo(1) });
    runRetentionSweep(db);
    expect(logs()).toHaveLength(0);
  });

  it("is idempotent — a second run the same night erases nothing more", () => {
    insertEnquiry(db, { created_at: monthsAgo(25) });
    insertEnquiry(db, { created_at: monthsAgo(13), erasure_requested_at: monthsAgo(11) });
    runRetentionSweep(db);
    const after = logs().length;

    const second = runRetentionSweep(db);
    expect(second).toMatchObject({ request: 0, withdrawal: 0, retention: 0 });
    expect(logs()).toHaveLength(after);
  });

  it("handles all three reasons in one pass", () => {
    insertEnquiry(db, { created_at: monthsAgo(13), erasure_requested_at: monthsAgo(11) });
    insertEnquiry(db, { created_at: monthsAgo(14), withdrawn_at: monthsAgo(1) });
    insertEnquiry(db, { created_at: monthsAgo(25) });
    insertEnquiry(db, { created_at: monthsAgo(2) });

    const s = runRetentionSweep(db);
    expect(s).toMatchObject({ request: 1, withdrawal: 1, retention: 1 });
    expect(count()).toBe(1);
    expect(logs().map((l) => l.reason).sort()).toEqual(["request", "retention", "withdrawal"]);
  });
});
