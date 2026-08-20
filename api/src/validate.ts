/**
 * Enquiry validation — lenient by policy (#6).
 *
 * A lost lead costs more than a messy row, so this rejects on exactly three
 * things: an unusable name, an unusable phone, and absent consent. Everything
 * else is coerced into something storable. In particular any class/subject
 * pairing is accepted, *including ones Perfect Tuition does not teach* —
 * anything built on this table later must not assume the pairing is valid.
 *
 * There is no `mode`: Home Tutor Matching was retired on 2026-08-20 and the
 * business is 100% a coaching centre, so there is nothing to choose between.
 */

import { normalisePhone } from "./phone.js";

export const CONSENT_LOCALES = ["en", "bn"] as const;
export type ConsentLocale = (typeof CONSENT_LOCALES)[number];

const NAME_MAX = 100;
const MESSAGE_MAX = 2000;
/** Not a policy limit — just a bound so a scripted client cannot store a novel. */
const SUBJECTS_MAX = 50;
const SUBJECT_LEN_MAX = 100;

export type ValidEnquiry = {
  parent_name: string;
  phone_e164: string;
  phone_raw: string;
  class_level: number | null;
  subjects: string[];
  message: string | null;
  consent_locale: ConsentLocale;
};

export type ValidationResult =
  | { ok: true; value: ValidEnquiry }
  | { ok: false; errors: Record<string, string> };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateEnquiry(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { ok: false, errors: { body: "Expected a JSON object." } };
  }

  const errors: Record<string, string> = {};

  // --- parent_name: required ---
  const rawName = body["parent_name"];
  const parent_name = typeof rawName === "string" ? rawName.trim() : "";
  if (parent_name === "") {
    errors["parent_name"] = "Please tell us your name.";
  } else if (parent_name.length > NAME_MAX) {
    errors["parent_name"] = `Please keep the name under ${NAME_MAX} characters.`;
  }

  // --- phone: required, stored in both forms ---
  const rawPhone = body["phone"];
  const phone = normalisePhone(typeof rawPhone === "string" ? rawPhone : undefined);
  if (!phone.ok) {
    errors["phone"] = "Please enter a 10-digit Indian mobile number.";
  }

  // --- consent: the one hard gate ---
  // A stored Enquiry without a Consent Record is precisely what DPDP penalises,
  // so this is checked for `true` identically, not for truthiness.
  if (body["consent"] !== true) {
    errors["consent"] = "Please agree to the notice above before sending.";
  }

  // --- message: optional, capped ---
  const rawMessage = body["message"];
  const trimmedMessage = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (trimmedMessage.length > MESSAGE_MAX) {
    errors["message"] = `Please keep the message under ${MESSAGE_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      parent_name,
      phone_e164: (phone as { ok: true; e164: string }).e164,
      // Deliberately untrimmed: this field's whole purpose is to be exactly what
      // they typed, for the cases where normalisation got it wrong.
      phone_raw: rawPhone as string,
      class_level: coerceClassLevel(body["class_level"]),
      subjects: coerceSubjects(body["subjects"]),
      message: trimmedMessage === "" ? null : trimmedMessage,
      consent_locale: coerceLocale(body["consent_locale"]),
    },
  };
}

/** Anything unusable becomes null rather than a rejection — the class is optional. */
function coerceClassLevel(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function coerceSubjects(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => s.slice(0, SUBJECT_LEN_MAX))
    .slice(0, SUBJECTS_MAX);
}

function coerceLocale(value: unknown): ConsentLocale {
  return CONSENT_LOCALES.includes(value as ConsentLocale) ? (value as ConsentLocale) : "en";
}
