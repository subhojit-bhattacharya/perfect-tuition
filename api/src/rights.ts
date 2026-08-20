/**
 * Data-principal rights (#8 §7).
 *
 * The Consent Notice promises a parent can see, correct, or delete their
 * information, or withdraw consent. All four get one lookup, one identity check
 * and one code path, so that they cannot drift apart.
 *
 * **Identity check: a matching phone number is sufficient.** Requiring proof of
 * identity in order to be *forgotten* is a dark pattern, and s.6(4) requires
 * withdrawal to be as easy as consent was — consent was a checkbox.
 *
 * **SLA: one month.** SPDI Rule 5(9) binds today and is materially tighter than
 * DPDP's 90 days; it survives comfortably under DPDP.
 *
 * Never run ad-hoc SQL against production instead of this. That is how the wrong
 * row gets deleted.
 */

import type { Db, EnquiryRow } from "./db.js";
import { NOT_WITHDRAWN } from "./db.js";
import { normalisePhone } from "./phone.js";
import { FLOOR_MONTHS } from "./retention.js";

export type Lookup = { ok: true; phoneE164: string } | { ok: false; error: string };

export function resolvePhone(input: string): Lookup {
  const phone = normalisePhone(input);
  if (!phone.ok) return { ok: false, error: `"${input}" is not a usable Indian mobile number.` };
  return { ok: true, phoneE164: phone.e164 };
}

/** The date a record becomes erasable: `created_at` plus the Rule 8(3) floor. */
export function floorDate(createdAt: string): string {
  const d = new Date(createdAt);
  d.setMonth(d.getMonth() + FLOOR_MONTHS);
  return d.toISOString();
}

export type ShowResult = {
  records: EnquiryRow[];
  /** Withdrawn rows are excluded from the listing but still owed an honest count. */
  withdrawnCount: number;
};

export function show(db: Db, phoneE164: string): ShowResult {
  const records = db
    .prepare(`SELECT * FROM enquiry WHERE phone_e164 = ? AND ${NOT_WITHDRAWN} ORDER BY created_at`)
    .all(phoneE164) as EnquiryRow[];

  const withdrawn = db
    .prepare(`SELECT count(*) c FROM enquiry WHERE phone_e164 = ? AND withdrawn_at IS NOT NULL`)
    .get(phoneE164) as { c: number };

  return { records, withdrawnCount: withdrawn.c };
}

export const CORRECTABLE = ["parent_name", "phone", "class_level", "subjects", "message"] as const;
export type CorrectableField = (typeof CORRECTABLE)[number];

export type CorrectResult =
  | { ok: true; updated: number; note?: string }
  | { ok: false; error: string };

export function correct(
  db: Db,
  phoneE164: string,
  field: CorrectableField,
  value: string,
): CorrectResult {
  // Correcting the phone re-normalises it and moves the lookup key with it,
  // otherwise the parent could never be found again under their real number.
  if (field === "phone") {
    const next = normalisePhone(value);
    if (!next.ok) return { ok: false, error: `"${value}" is not a usable Indian mobile number.` };
    const info = db
      .prepare(
        `UPDATE enquiry SET phone_e164 = ?, phone_raw = ? WHERE phone_e164 = ? AND ${NOT_WITHDRAWN}`,
      )
      .run(next.e164, value, phoneE164);
    return { ok: true, updated: info.changes, note: `New lookup key is ${next.e164}.` };
  }

  let stored: string | number | null = value;
  if (field === "class_level") {
    const n = Number(value);
    if (value.trim() !== "" && !Number.isInteger(n)) {
      return { ok: false, error: `class_level must be a whole number, got "${value}".` };
    }
    stored = value.trim() === "" ? null : n;
  }
  if (field === "subjects") {
    // Accepts a comma-separated list, stored as the JSON array the column holds.
    stored = JSON.stringify(
      value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== ""),
    );
  }
  if (field === "message" && value.trim() === "") stored = null;

  const info = db
    .prepare(`UPDATE enquiry SET ${field} = ? WHERE phone_e164 = ? AND ${NOT_WITHDRAWN}`)
    .run(stored, phoneE164);
  return { ok: true, updated: info.changes };
}

export type ErasureOutcome = {
  /** Rows destroyed now, because they had already passed the floor. */
  erasedNow: number;
  /** Rows stamped and queued, with the earliest date they can be erased. */
  deferred: number;
  deferredUntil: string | null;
};

/**
 * An erasure request. Rows past the floor go immediately; the rest are stamped
 * and picked up by the nightly sweep on the day they cross it.
 */
export function requestErasure(db: Db, phoneE164: string, now: Date = new Date()): ErasureOutcome {
  const requestedAt = now.toISOString();
  const rows = db
    .prepare(`SELECT id, created_at FROM enquiry WHERE phone_e164 = ?`)
    .all(phoneE164) as { id: number; created_at: string }[];

  return db.transaction((): ErasureOutcome => {
    let erasedNow = 0;
    let deferred = 0;
    let deferredUntil: string | null = null;

    for (const row of rows) {
      const erasableFrom = floorDate(row.created_at);
      if (erasableFrom <= requestedAt) {
        db.prepare(`DELETE FROM enquiry WHERE id = ?`).run(row.id);
        db.prepare(
          `INSERT INTO erasure_log (requested_at, executed_at, reason, row_count)
           VALUES (?, ?, 'request', 1)`,
        ).run(requestedAt, requestedAt);
        erasedNow += 1;
      } else {
        db.prepare(`UPDATE enquiry SET erasure_requested_at = ? WHERE id = ?`).run(
          requestedAt,
          row.id,
        );
        deferred += 1;
        if (deferredUntil === null || erasableFrom > deferredUntil) deferredUntil = erasableFrom;
      }
    }

    return { erasedNow, deferred, deferredUntil };
  })();
}

/**
 * Withdrawal of consent. The row becomes invisible to every read path
 * immediately and is never contacted again; the actual destruction still waits
 * for the twelve-month floor.
 */
export function withdrawConsent(
  db: Db,
  phoneE164: string,
  now: Date = new Date(),
): ErasureOutcome & { withdrawn: number } {
  const at = now.toISOString();

  return db.transaction(() => {
    const rows = db
      .prepare(`SELECT id, created_at FROM enquiry WHERE phone_e164 = ? AND ${NOT_WITHDRAWN}`)
      .all(phoneE164) as { id: number; created_at: string }[];

    let erasedNow = 0;
    let deferred = 0;
    let deferredUntil: string | null = null;

    for (const row of rows) {
      db.prepare(`UPDATE enquiry SET withdrawn_at = ? WHERE id = ?`).run(at, row.id);

      const erasableFrom = floorDate(row.created_at);
      if (erasableFrom <= at) {
        db.prepare(`DELETE FROM enquiry WHERE id = ?`).run(row.id);
        db.prepare(
          `INSERT INTO erasure_log (requested_at, executed_at, reason, row_count)
           VALUES (?, ?, 'withdrawal', 1)`,
        ).run(at, at);
        erasedNow += 1;
      } else {
        deferred += 1;
        if (deferredUntil === null || erasableFrom > deferredUntil) deferredUntil = erasableFrom;
      }
    }

    return { withdrawn: rows.length, erasedNow, deferred, deferredUntil };
  })();
}
