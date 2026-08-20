#!/usr/bin/env -S npx tsx
/**
 * The weekly all-green heartbeat to the Operator channel (#7 §6).
 *
 * This exists because the alerting channel shares its single point of failure
 * with everything it monitors: if the laptop is off, nothing can send an alert
 * about it, so total silence is otherwise ambiguous between "fine" and
 * "catastrophe".
 *
 * Weekly, not daily, and that is a decision rather than a default. A message you
 * receive every morning and never act on becomes invisible within a fortnight,
 * and then it is not a signal at all. Weekly is rare enough that its absence is
 * noticeable.
 *
 * Metadata only — never a name, never a number.
 */

import { join, dirname } from "node:path";
import { lastBackupAt, readDriveState } from "../api/src/backup.js";
import { loadConfig } from "../api/src/config.js";
import { openDatabase } from "../api/src/db.js";
import { consoleLogger } from "../api/src/logger.js";
import { countPendingNotifications } from "../api/src/notify.js";
import { createTelegramClient } from "../api/src/telegram/client.js";
import { formatHeartbeat } from "../api/src/telegram/format.js";

const config = loadConfig();
const logger = consoleLogger();

const telegram = createTelegramClient({
  botToken: config.telegramBotToken,
  chatIdOwner: config.telegramChatIdOwner,
  chatIdOperator: config.telegramChatIdOperator,
});

const db = openDatabase({ path: config.dbPath, key: config.sqlcipherKey });

const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
const week = db
  .prepare(`SELECT count(*) c FROM enquiry WHERE created_at >= ?`)
  .get(weekAgo) as { c: number };

const statePath = join(dirname(config.dbPath), "backup-state.json");
const state = readDriveState(statePath);

const text = formatHeartbeat({
  // While RESTIC_REPOSITORY is unset this renders as a calm "not configured"
  // note rather than an alarm, so the build weeks do not train the Operator to
  // ignore the channel before launch.
  backupConfigured: config.resticRepository !== null,
  lastBackupAt: lastBackupAt(statePath),
  driveLabel: state?.label ?? null,
  enquiriesThisWeek: week.c,
  pendingNotifications: countPendingNotifications(db),
});

db.close();

const result = await telegram.sendToOperator(text);
logger.log({ event: "heartbeat.sent", detail: result.ok ? "ok" : result.error });
if (!result.ok) process.exit(1);
