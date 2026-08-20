/**
 * Service entry point.
 *
 * Runs on the Owner's laptop behind a Cloudflare Tunnel, listening only on
 * localhost — the tunnel is the sole ingress, so binding to 0.0.0.0 would
 * expose the API on any network the laptop joins for no benefit.
 */

import { serve } from "@hono/node-server";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { loadConsentNotices } from "./consent.js";
import { applySchema, openDatabase } from "./db.js";
import { createLogger } from "./logger.js";
import { startRetryLoop } from "./notify.js";
import { createRateLimiter } from "./rate-limit.js";
import { createTelegramClient } from "./telegram/client.js";
import { createTurnstile } from "./turnstile.js";

const config = loadConfig();
const logger = createLogger(config.logDir);

mkdirSync(dirname(config.dbPath), { recursive: true });

const db = openDatabase({ path: config.dbPath, key: config.sqlcipherKey });
applySchema(db);

// Read once, at boot and not per request: a deploy that changes the wording
// must not be able to leave rows pointing at a version nobody was ever shown.
const consent = loadConsentNotices(config.consentDir);

const telegram = createTelegramClient({
  botToken: config.telegramBotToken,
  chatIdOwner: config.telegramChatIdOwner,
  chatIdOperator: config.telegramChatIdOperator,
});

if (!telegram.configured) {
  logger.log({
    event: "boot.telegram_unconfigured",
    detail: "enquiries will be stored but not notified — run scripts/setup-telegram.sh",
  });
}

const app = createApp({
  db,
  consent,
  telegram,
  turnstile: createTurnstile(config.turnstileSecretKey),
  rateLimiter: createRateLimiter(),
  logger,
  allowedOrigin: config.allowedOrigin,
});

// Re-attempts undelivered notifications every five minutes, bounded at 24 hours.
// Without it a two-minute Telegram blip burns three retries in ten seconds and
// nothing ever tries again.
const stopRetries = startRetryLoop(db, telegram, { logger });

const server = serve({ fetch: app.fetch, port: config.port, hostname: "127.0.0.1" }, (info) => {
  logger.log({
    event: "boot.listening",
    detail: `127.0.0.1:${info.port}`,
    turnstile_status: config.turnstileSecretKey === null ? "unconfigured" : "configured",
  });
});

function shutdown(signal: string): void {
  logger.log({ event: "boot.shutdown", reason: signal });
  stopRetries();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
