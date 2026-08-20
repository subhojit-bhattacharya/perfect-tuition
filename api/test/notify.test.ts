import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import {
  alertStuckNotifications,
  countPendingNotifications,
  notifyEnquiry,
  retryPendingNotifications,
  suppressNotification,
} from "../src/notify.js";
import { daysAgo, fakeTelegram, insertEnquiry, minutesAgo, testDb } from "./helpers.js";

let ctx: ReturnType<typeof testDb>;
let db: Db;

beforeEach(() => {
  ctx = testDb();
  db = ctx.db;
});
afterEach(() => ctx.cleanup());

const statusOf = (id: number) =>
  db.prepare("SELECT notification_status, notify_attempts, notified_at FROM enquiry WHERE id = ?").get(id) as {
    notification_status: string;
    notify_attempts: number;
    notified_at: string | null;
  };

describe("notifyEnquiry", () => {
  it("sends to the Owner and marks the row sent", async () => {
    const tg = fakeTelegram();
    const id = insertEnquiry(db);

    await notifyEnquiry(db, tg, id);

    expect(tg.ownerMessages).toHaveLength(1);
    expect(tg.ownerMessages[0]).toContain("Rupa Sen");
    const s = statusOf(id);
    expect(s.notification_status).toBe("sent");
    expect(s.notified_at).not.toBeNull();
  });

  it("never sends an enquiry to the Operator channel", async () => {
    const tg = fakeTelegram();
    await notifyEnquiry(db, tg, insertEnquiry(db));
    expect(tg.operatorMessages).toHaveLength(0);
  });

  it("retries a retryable failure and succeeds", async () => {
    const tg = fakeTelegram();
    tg.failNext(2);
    const id = insertEnquiry(db);

    await notifyEnquiry(db, tg, id, { retryDelayMs: 0 });

    expect(tg.ownerMessages).toHaveLength(1);
    const s = statusOf(id);
    expect(s.notification_status).toBe("sent");
    expect(s.notify_attempts).toBe(3);
  });

  it("gives up after three attempts and marks the row failed", async () => {
    const tg = fakeTelegram();
    tg.failNext(10);
    const id = insertEnquiry(db);

    await notifyEnquiry(db, tg, id, { retryDelayMs: 0 });

    const s = statusOf(id);
    expect(s.notification_status).toBe("failed");
    expect(s.notify_attempts).toBe(3);
    expect(s.notified_at).toBeNull();
  });

  it("does not retry a non-retryable failure", async () => {
    const tg = fakeTelegram();
    tg.failNext(10, false);
    const id = insertEnquiry(db);

    await notifyEnquiry(db, tg, id, { retryDelayMs: 0 });

    const s = statusOf(id);
    expect(s.notification_status).toBe("failed");
    expect(s.notify_attempts).toBe(1);
  });

  it("sets notified_at only on a confirmed send", async () => {
    const tg = fakeTelegram();
    tg.failNext(10);
    const id = insertEnquiry(db);
    await notifyEnquiry(db, tg, id, { retryDelayMs: 0 });
    expect(statusOf(id).notified_at).toBeNull();
  });

  it("does not notify a withdrawn enquiry", async () => {
    const tg = fakeTelegram();
    const id = insertEnquiry(db, { withdrawn_at: new Date().toISOString() });
    await notifyEnquiry(db, tg, id);
    expect(tg.ownerMessages).toHaveLength(0);
  });
});

describe("suppressNotification — the duplicate path", () => {
  it("marks the row suppressed without sending", () => {
    const tg = fakeTelegram();
    const id = insertEnquiry(db);

    suppressNotification(db, id);

    expect(tg.ownerMessages).toHaveLength(0);
    expect(statusOf(id).notification_status).toBe("suppressed");
  });
});

describe("alertStuckNotifications — the alarm that would have cried wolf", () => {
  it("does not fire for a suppressed duplicate, however old", async () => {
    // This is the whole point of splitting notification_status out of
    // notified_at (#7 §5). Under the original design every legitimately
    // suppressed duplicate raised a false alarm, forever — on the one alert
    // whose entire job is to mean "Telegram is broken".
    const tg = fakeTelegram();
    insertEnquiry(db, { created_at: daysAgo(30), notification_status: "suppressed" });

    const fired = await alertStuckNotifications(db, tg);

    expect(fired).toBe(false);
    expect(tg.operatorMessages).toHaveLength(0);
  });

  it("does not fire for a delivered enquiry", async () => {
    const tg = fakeTelegram();
    insertEnquiry(db, { created_at: daysAgo(30), notification_status: "sent" });
    expect(await alertStuckNotifications(db, tg)).toBe(false);
  });

  it("does not fire for a pending enquiry younger than an hour", async () => {
    const tg = fakeTelegram();
    insertEnquiry(db, { created_at: minutesAgo(5), notification_status: "pending" });
    expect(await alertStuckNotifications(db, tg)).toBe(false);
  });

  it("fires for a pending enquiry older than an hour", async () => {
    const tg = fakeTelegram();
    insertEnquiry(db, { created_at: minutesAgo(90), notification_status: "pending" });

    expect(await alertStuckNotifications(db, tg)).toBe(true);
    expect(tg.operatorMessages).toHaveLength(1);
    expect(tg.operatorMessages[0]).not.toContain("Rupa Sen");
  });

  it("fires for a failed enquiry older than an hour", async () => {
    const tg = fakeTelegram();
    insertEnquiry(db, { created_at: minutesAgo(90), notification_status: "failed" });
    expect(await alertStuckNotifications(db, tg)).toBe(true);
  });

  it("reports the ids so the Operator can join without a name", async () => {
    const tg = fakeTelegram();
    const a = insertEnquiry(db, { created_at: minutesAgo(90), notification_status: "pending" });
    const b = insertEnquiry(db, { created_at: minutesAgo(90), notification_status: "failed" });

    await alertStuckNotifications(db, tg);

    expect(tg.operatorMessages[0]).toContain(String(a));
    expect(tg.operatorMessages[0]).toContain(String(b));
  });
});

describe("retryPendingNotifications", () => {
  it("re-attempts a failed row so a two-minute blip does not lose the lead", async () => {
    const tg = fakeTelegram();
    tg.failNext(10);
    const id = insertEnquiry(db);
    await notifyEnquiry(db, tg, id, { retryDelayMs: 0 });
    expect(statusOf(id).notification_status).toBe("failed");

    // Telegram comes back.
    tg.results.length = 0;
    await retryPendingNotifications(db, tg, { retryDelayMs: 0 });

    expect(statusOf(id).notification_status).toBe("sent");
    expect(statusOf(id).notify_attempts).toBeGreaterThan(3);
  });

  it("leaves rows older than 24 hours alone, so a revoked token is not hammered", async () => {
    const tg = fakeTelegram();
    const id = insertEnquiry(db, { created_at: daysAgo(2), notification_status: "failed" });

    await retryPendingNotifications(db, tg, { retryDelayMs: 0 });

    expect(tg.ownerMessages).toHaveLength(0);
    expect(statusOf(id).notification_status).toBe("failed");
  });

  it("never re-attempts a suppressed row", async () => {
    const tg = fakeTelegram();
    insertEnquiry(db, { notification_status: "suppressed" });
    await retryPendingNotifications(db, tg, { retryDelayMs: 0 });
    expect(tg.ownerMessages).toHaveLength(0);
  });

  it("never re-attempts a sent row", async () => {
    const tg = fakeTelegram();
    insertEnquiry(db, { notification_status: "sent" });
    await retryPendingNotifications(db, tg, { retryDelayMs: 0 });
    expect(tg.ownerMessages).toHaveLength(0);
  });
});

describe("countPendingNotifications", () => {
  it("counts pending and failed, but not suppressed or sent", () => {
    insertEnquiry(db, { notification_status: "pending" });
    insertEnquiry(db, { notification_status: "failed" });
    insertEnquiry(db, { notification_status: "suppressed" });
    insertEnquiry(db, { notification_status: "sent" });
    expect(countPendingNotifications(db)).toBe(2);
  });
});
