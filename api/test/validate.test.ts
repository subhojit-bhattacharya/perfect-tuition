import { describe, expect, it } from "vitest";
import { validateEnquiry } from "../src/validate.js";

const good = {
  parent_name: "Rupa Sen",
  phone: "98765 43210",
  class_level: 9,
  subjects: ["Accountancy", "Economics"],
  message: "Please call after 6pm.",
  consent: true,
  consent_locale: "en",
};

describe("validateEnquiry", () => {
  it("accepts a well-formed enquiry", () => {
    const r = validateEnquiry(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      parent_name: "Rupa Sen",
      phone_e164: "+919876543210",
      phone_raw: "98765 43210",
      class_level: 9,
      subjects: ["Accountancy", "Economics"],
      message: "Please call after 6pm.",
      consent_locale: "en",
    });
  });

  describe("the three hard gates", () => {
    it("rejects a missing or blank parent_name", () => {
      for (const parent_name of [undefined, "", "   ", null, 42]) {
        const r = validateEnquiry({ ...good, parent_name });
        expect(r.ok, String(parent_name)).toBe(false);
        if (!r.ok) expect(r.errors).toHaveProperty("parent_name");
      }
    });

    it("rejects a parent_name over 100 characters", () => {
      const r = validateEnquiry({ ...good, parent_name: "a".repeat(101) });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors).toHaveProperty("parent_name");
    });

    it("rejects a phone that cannot be an Indian mobile", () => {
      for (const phone of [undefined, "", "12345", "+1 415 555 0100"]) {
        const r = validateEnquiry({ ...good, phone });
        expect(r.ok, String(phone)).toBe(false);
        if (!r.ok) expect(r.errors).toHaveProperty("phone");
      }
    });

    it("rejects unless consent is exactly true", () => {
      for (const consent of [undefined, false, "true", 1, null]) {
        const r = validateEnquiry({ ...good, consent });
        expect(r.ok, String(consent)).toBe(false);
        if (!r.ok) expect(r.errors).toHaveProperty("consent");
      }
    });

    it("reports every failing field at once, not just the first", () => {
      const r = validateEnquiry({ parent_name: "", phone: "nope", consent: false });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(Object.keys(r.errors).sort()).toEqual(["consent", "parent_name", "phone"]);
      }
    });
  });

  describe("lenient by policy", () => {
    it("accepts a class/subject pairing Perfect Tuition does not teach", () => {
      // A lost lead costs more than a messy row (#6). Class 11 Physics is not
      // taught, and the API must still take the enquiry.
      const r = validateEnquiry({ ...good, class_level: 11, subjects: ["Physics"] });
      expect(r.ok).toBe(true);
    });

    it("accepts a missing class_level as null", () => {
      const r = validateEnquiry({ ...good, class_level: undefined });
      expect(r.ok && r.value.class_level).toBe(null);
    });

    it("coerces an unusable class_level to null rather than rejecting", () => {
      for (const class_level of ["", "nursery", {}, NaN, true]) {
        const r = validateEnquiry({ ...good, class_level });
        expect(r.ok, String(class_level)).toBe(true);
        if (r.ok) expect(r.value.class_level).toBe(null);
      }
    });

    it("accepts a numeric string class_level", () => {
      const r = validateEnquiry({ ...good, class_level: "9" });
      expect(r.ok && r.value.class_level).toBe(9);
    });

    it("accepts missing or non-array subjects as an empty list", () => {
      for (const subjects of [undefined, null, "Maths", 7, {}]) {
        const r = validateEnquiry({ ...good, subjects });
        expect(r.ok, String(subjects)).toBe(true);
        if (r.ok) expect(r.value.subjects).toEqual([]);
      }
    });

    it("keeps only the string entries in subjects", () => {
      const r = validateEnquiry({ ...good, subjects: ["Maths", 3, null, "  Bengali  ", ""] });
      expect(r.ok && r.value.subjects).toEqual(["Maths", "Bengali"]);
    });

    it("accepts a blank or missing message", () => {
      for (const message of [undefined, "", "   ", null]) {
        const r = validateEnquiry({ ...good, message });
        expect(r.ok, String(message)).toBe(true);
        if (r.ok) expect(r.value.message).toBe(null);
      }
    });

    it("defaults an absent or unrecognised consent_locale to en", () => {
      for (const consent_locale of [undefined, "", "fr", 9]) {
        const r = validateEnquiry({ ...good, consent_locale });
        expect(r.ok, String(consent_locale)).toBe(true);
        if (r.ok) expect(r.value.consent_locale).toBe("en");
      }
    });

    it("keeps a bn consent_locale", () => {
      const r = validateEnquiry({ ...good, consent_locale: "bn" });
      expect(r.ok && r.value.consent_locale).toBe("bn");
    });
  });

  it("rejects a message over 2000 characters", () => {
    const r = validateEnquiry({ ...good, message: "x".repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty("message");
  });

  it("trims the parent name and preserves the raw phone exactly as typed", () => {
    const r = validateEnquiry({ ...good, parent_name: "  Rupa Sen  ", phone: " 098765-43210 " });
    expect(r.ok && r.value.parent_name).toBe("Rupa Sen");
    expect(r.ok && r.value.phone_raw).toBe(" 098765-43210 ");
    expect(r.ok && r.value.phone_e164).toBe("+919876543210");
  });

  it("caps a runaway subjects array instead of storing it whole", () => {
    const r = validateEnquiry({ ...good, subjects: Array(500).fill("Maths") });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.subjects.length).toBeLessThanOrEqual(50);
  });

  it("rejects a non-object body", () => {
    for (const body of [null, undefined, "string", 42, []]) {
      expect(validateEnquiry(body).ok, String(body)).toBe(false);
    }
  });

  it("has no notion of mode", () => {
    // Home Tutor Matching was retired 2026-08-20. A stale client still sending
    // `mode` must not be rejected, and the field must not survive into the value.
    const r = validateEnquiry({ ...good, mode: "home_tutor" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).not.toHaveProperty("mode");
  });
});
