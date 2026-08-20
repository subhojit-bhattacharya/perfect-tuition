/**
 * Phone normalisation, per the #6 contract: accept liberally, store both forms.
 *
 * The API stores `phone_e164` *and* `phone_raw` precisely because normalisation
 * can get it wrong — when it does, the raw string is what lets Jayeeta call back.
 * So this function's job is to be generous, not clever.
 */

export type PhoneResult = { ok: true; e164: string } | { ok: false };

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export function normalisePhone(input: string | undefined | null): PhoneResult {
  if (typeof input !== "string") return { ok: false };

  // Everything a human might use as a separator goes, including the plus — the
  // country code is re-derived from the digits below rather than trusted.
  let digits = input.replace(/\D/g, "");
  if (digits === "") return { ok: false };

  // 00 is the other way people write the international prefix.
  if (digits.startsWith("00")) digits = digits.slice(2);

  // A domestic trunk prefix, which may now be sitting in front of a country code.
  digits = digits.replace(/^0+/, "");

  // Only treat a leading 91 as the country code when what follows is exactly a
  // ten-digit mobile. A bare "9123456789" is itself a valid number, so length is
  // the only thing that disambiguates.
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (!INDIAN_MOBILE.test(digits)) return { ok: false };
  return { ok: true, e164: `+91${digits}` };
}
