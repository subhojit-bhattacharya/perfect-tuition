#!/usr/bin/env -S npx tsx
/**
 * The systemd `OnFailure=` handler (#8 §5).
 *
 * Invoked as `alert-failure.ts <unit-name>` when a scheduled job exits non-zero.
 * Metadata only: it names the unit, never anything the unit was working on.
 *
 * Stays silent while RESTIC_REPOSITORY is unset — the same arming switch the
 * rest of the monitoring uses (#7 §6), so the build weeks do not train the
 * Operator to ignore the channel before launch.
 */

import { execFileSync } from "node:child_process";
import { loadConfig } from "../api/src/config.js";
import { createTelegramClient } from "../api/src/telegram/client.js";
import { formatOperatorAlert } from "../api/src/telegram/format.js";

const unit = process.argv[2] ?? "unknown unit";
const config = loadConfig();

if (config.resticRepository === null) {
  console.log(`${unit} failed, but monitoring is disarmed (RESTIC_REPOSITORY unset).`);
  process.exit(0);
}

/** A couple of lines of context, without touching anything the job was handling. */
function lastLines(): string {
  try {
    return execFileSync("journalctl", ["-u", unit, "-n", "5", "--no-pager", "-o", "cat"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "(journal unavailable)";
  }
}

const telegram = createTelegramClient({
  botToken: config.telegramBotToken,
  chatIdOwner: config.telegramChatIdOwner,
  chatIdOperator: config.telegramChatIdOperator,
});

const result = await telegram.sendToOperator(
  formatOperatorAlert({ kind: "backup_failed", detail: `${unit} failed.\n\n${lastLines()}` }),
);

if (!result.ok) {
  console.error(`Could not reach Telegram to report ${unit}: ${result.error}`);
  process.exit(1);
}
