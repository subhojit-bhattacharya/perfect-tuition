import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import type { Hono } from "hono";
import { createApp } from "../src/app.js";
import { loadConsentNotices } from "../src/consent.js";
import { REPO_ROOT } from "../src/config.js";
import type { Db } from "../src/db.js";
import { createRateLimiter } from "../src/rate-limit.js";
import type { TurnstileStatus } from "../src/db.js";
import { fakeTelegram, testDb, type FakeTelegram } from "./helpers.js";

const CONSENT_DIR = join(REPO_ROOT, "site", "src", "content", "consent");
const ORIGIN = "https://perfect-tuition.co.in";

const goodBody = {
  parent_name: "Rupa Sen",
  phone: "98765 43210",
  class_level: 9,
  subjects: ["Accountancy"],
  message: "Please call after 6pm.",
  consent: true,
  consent_locale: "en",
  turnstile_token: "tok",
  website: "",
};

let ctx: ReturnType<typeof testDb>;
let db: Db;
let app: Hono;
let tg: FakeTelegram;
let turnstileStatus: TurnstileStatus;
let notifications: Promise<void>[];

beforeEach(() => {
  ctx = testDb();
  db = ctx.db;
  tg = fakeTelegram();
  turnstileStatus = "verified";
  notifications = [];

  app = createApp({
    db,
    consent: loadConsentNotices(CONSENT_DIR),
    telegram: tg,
    turnstile: { verify: async () => turnstileStatus },
    rateLimiter: createRateLimiter(1000),
    logger: { log: () => {} },
    allowedOrigin: ORIGIN,
    onNotify: (p) => notifications.push(p),
  });
});
afterEach(() => ctx.cleanup());

function post(body: unknown, headers: Record<string, string> = {}) {
  return app.request("/v1/enquiries", {
    method: "POST",
    headers: { "content-type": "application/json", Origin: ORIGIN, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const rows = () => db.prepare("SELECT * FROM enquiry ORDER BY id").all() as Record<string, unknown>[];
const settle = () => Promise.all(notifications);

describe("GET /health", () => {
  it("returns 200 so tunnel-up-API-down is distinguishable from tunnel-down", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});

describe("CORS", () => {
  it("answers the preflight the JSON content-type forces", async () => {
    const res = await app.request("/v1/enquiries", {
      method: "OPTIONS",
      headers: { Origin: ORIGIN },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("allows the apex and nobody else — this is not a wildcard", async () => {
    const ok = await post(goodBody, { Origin: ORIGIN });
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);

    for (const origin of [
      "https://www.perfect-tuition.co.in",
      "https://perfect-tuition.co.in.evil.test",
      "http://perfect-tuition.co.in",
      "null",
    ]) {
      const res = await post({ ...goodBody, phone: "9000000001" }, { Origin: origin });
      expect(res.headers.get("Access-Control-Allow-Origin"), origin).toBeNull();
    }
  });

  it("refuses a preflight from another origin", async () => {
    const res = await app.request("/v1/enquiries", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.test" },
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /v1/enquiries — the happy path", () => {
  it("returns 201 and stores the enquiry", async () => {
    const res = await post(goodBody);
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true });

    const all = rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      parent_name: "Rupa Sen",
      phone_e164: "+919876543210",
      phone_raw: "98765 43210",
      class_level: 9,
      subjects: '["Accountancy"]',
      message: "Please call after 6pm.",
      turnstile_status: "verified",
    });
  });

  it("denormalises the Consent Record, because the burden of proof is ours", async () => {
    await post(goodBody);
    const row = rows()[0]!;
    expect(row["consent_notice_version"]).toBe("2");
    expect(row["consent_locale"]).toBe("en");
    expect(String(row["consent_text"])).toContain("We keep this information for 24 months");
    expect(row["consented_at"]).toBeTruthy();
  });

  it("stores the Bengali notice verbatim when that is what was shown", async () => {
    await post({ ...goodBody, consent_locale: "bn" });
    const row = rows()[0]!;
    expect(row["consent_locale"]).toBe("bn");
    expect(String(row["consent_text"])).toContain("২৪ মাস");
  });

  it("notifies the Owner", async () => {
    await post(goodBody);
    await settle();
    expect(tg.ownerMessages).toHaveLength(1);
    expect(tg.ownerMessages[0]).toContain("Rupa Sen");
  });

  it("stores no mode column and accepts a stale client still sending one", async () => {
    const res = await post({ ...goodBody, mode: "home_tutor" });
    expect(res.status).toBe(201);
    expect(rows()[0]).not.toHaveProperty("mode");
  });
});

describe("validation failures", () => {
  it("returns 400 with field-keyed errors", async () => {
    const res = await post({ ...goodBody, phone: "12345" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; errors: Record<string, string> };
    expect(body.ok).toBe(false);
    expect(body.errors).toHaveProperty("phone");
    expect(rows()).toHaveLength(0);
  });

  it("refuses to store an enquiry without consent", async () => {
    const res = await post({ ...goodBody, consent: false });
    expect(res.status).toBe(400);
    expect(rows()).toHaveLength(0);
  });

  it("returns 400 on a body that is not JSON", async () => {
    const res = await post("not json at all");
    expect(res.status).toBe(400);
  });
});

describe("the honeypot", () => {
  it("returns a silent 201 and stores nothing, so bots learn nothing", async () => {
    const res = await post({ ...goodBody, website: "http://spam.test" });
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(rows()).toHaveLength(0);
  });

  it("does not notify anyone", async () => {
    await post({ ...goodBody, website: "spam" });
    await settle();
    expect(tg.ownerMessages).toHaveLength(0);
  });

  it("is not tripped by the empty string a real form sends", async () => {
    expect((await post({ ...goodBody, website: "" })).status).toBe(201);
    expect(rows()).toHaveLength(1);
  });
});

describe("Turnstile", () => {
  it("rejects with 403 when Turnstile actively says no", async () => {
    turnstileStatus = "failed";
    const res = await post(goodBody);
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "turnstile" });
    expect(rows()).toHaveLength(0);
  });

  it("fails open when Turnstile is unreachable, and records that it did", async () => {
    // A parent lost to a Cloudflare hiccup costs a student; a junk row costs
    // one glance at Telegram.
    turnstileStatus = "unverified";
    const res = await post(goodBody);
    expect(res.status).toBe(201);
    expect(rows()[0]!["turnstile_status"]).toBe("unverified");
  });

  it("flags a fail-open enquiry in the Telegram message", async () => {
    turnstileStatus = "unverified";
    await post(goodBody);
    await settle();
    expect(tg.ownerMessages[0]).toContain("⚠");
  });
});

describe("duplicate suppression", () => {
  it("inserts the second row but suppresses its notification", async () => {
    await post(goodBody);
    await settle();
    expect(tg.ownerMessages).toHaveLength(1);

    await post(goodBody);
    await settle();

    // The row is kept: each submission carries its own Consent Record, and
    // discarding one would destroy the audit trail.
    expect(rows()).toHaveLength(2);
    // But Jayeeta is not buzzed twice for one parent.
    expect(tg.ownerMessages).toHaveLength(1);
    expect(rows()[1]!["notification_status"]).toBe("suppressed");
  });

  it("keys on the normalised phone, so a differently-typed number is still a duplicate", async () => {
    await post({ ...goodBody, phone: "98765 43210" });
    await post({ ...goodBody, phone: "+91-9876543210" });
    await settle();
    expect(rows()).toHaveLength(2);
    expect(rows()[1]!["notification_status"]).toBe("suppressed");
  });

  it("does not suppress a different parent", async () => {
    await post(goodBody);
    await post({ ...goodBody, phone: "9000000002" });
    await settle();
    expect(tg.ownerMessages).toHaveLength(2);
  });

  it("does not suppress once the ten-minute window has passed", async () => {
    await post(goodBody);
    await settle();
    db.prepare("UPDATE enquiry SET created_at = ?").run(
      new Date(Date.now() - 11 * 60_000).toISOString(),
    );

    await post(goodBody);
    await settle();
    expect(tg.ownerMessages).toHaveLength(2);
  });
});

describe("rate limiting", () => {
  it("returns 429 past the global cap", async () => {
    const limited = createApp({
      db,
      consent: loadConsentNotices(CONSENT_DIR),
      telegram: tg,
      turnstile: { verify: async () => "verified" as const },
      rateLimiter: createRateLimiter(2),
      logger: { log: () => {} },
      allowedOrigin: ORIGIN,
      onNotify: (p) => notifications.push(p),
    });

    const send = () =>
      limited.request("/v1/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json", Origin: ORIGIN },
        body: JSON.stringify(goodBody),
      });

    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(201);
    const third = await send();
    expect(third.status).toBe(429);
    await expect(third.json()).resolves.toEqual({ ok: false, error: "rate_limited" });
  });
});

describe("the response never leaks a stored identifier", () => {
  it("returns only {ok:true}, not the row", async () => {
    const res = await post(goodBody);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
