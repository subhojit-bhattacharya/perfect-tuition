import { describe, expect, it } from "vitest";
import { normalisePhone } from "../src/phone.js";

describe("normalisePhone", () => {
  it("accepts a plain ten-digit mobile", () => {
    expect(normalisePhone("9876543210")).toEqual({ ok: true, e164: "+919876543210" });
  });

  it("strips the separators parents actually type", () => {
    for (const input of [
      "98765 43210",
      "98765-43210",
      "(98765) 43210",
      " 98765 43210 ",
      "98765.43210",
    ]) {
      expect(normalisePhone(input), input).toEqual({ ok: true, e164: "+919876543210" });
    }
  });

  it("strips a leading zero", () => {
    expect(normalisePhone("098765 43210")).toEqual({ ok: true, e164: "+919876543210" });
  });

  it("accepts the country code with or without the plus", () => {
    expect(normalisePhone("+91 98765 43210")).toEqual({ ok: true, e164: "+919876543210" });
    expect(normalisePhone("91 98765 43210")).toEqual({ ok: true, e164: "+919876543210" });
    expect(normalisePhone("0091 98765 43210")).toEqual({ ok: true, e164: "+919876543210" });
  });

  it("normalises the business's own number, which begins with a zero and a six", () => {
    expect(normalisePhone("062911 65454")).toEqual({ ok: true, e164: "+916291165454" });
  });

  it("keeps a ten-digit number that merely starts with 91", () => {
    // 9123456789 is a valid mobile, not a country code followed by eight digits.
    expect(normalisePhone("9123456789")).toEqual({ ok: true, e164: "+919123456789" });
  });

  it("rejects anything that cannot be an Indian mobile", () => {
    for (const input of [
      "",
      "   ",
      "12345",
      "5876543210", // Indian mobiles begin 6-9
      "1234567890",
      "98765432101", // eleven digits
      "987654321", // nine digits
      "not a phone",
      "+1 415 555 0100",
    ]) {
      expect(normalisePhone(input).ok, input).toBe(false);
    }
  });

  it("rejects a non-string", () => {
    expect(normalisePhone(undefined).ok).toBe(false);
    expect(normalisePhone(9876543210 as unknown as string).ok).toBe(false);
  });
});
