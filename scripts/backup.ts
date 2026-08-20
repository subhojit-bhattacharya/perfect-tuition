#!/usr/bin/env -S npx tsx
/**
 * The nightly job (#8 §5, §8). One timer, one script.
 *
 * ORDER MATTERS AND IS EASY TO GET BACKWARDS:
 *
 *   1. Execute erasure requests that crossed the twelve-month floor.
 *   2. Erase withdrawn records that crossed the floor.
 *   3. Erase records older than twenty-four months.
 *   4. Write the erasure_log entries.
 *   5. THEN snapshot and back up.
 *
 * Sweeping *after* the backup would mean each night's snapshot re-captures the
 * rows deleted that morning, and the ninety-day prune window silently becomes
 * their real retention period — which would make the promise in the Consent
 * Notice untrue.
 *
 * Every failure mode here is otherwise silent, so each gets its own control:
 *   - no drive attached      → mountpoint + `restic cat config` assertions
 *   - the backup erroring    → non-zero exit, caught by the systemd OnFailure unit
 *   - the drive never moving → staleness alert after eight days on one label
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  assertNoSqliteHeader,
  assertSnapshotEncrypted,
  driveStaleDays,
  isDriveStale,
  recordDriveUse,
  snapshotDatabase,
} from "../api/src/backup.js";
import { loadConfig, REPO_ROOT } from "../api/src/config.js";
import { openDatabase } from "../api/src/db.js";
import { consoleLogger } from "../api/src/logger.js";
import { alertStuckNotifications } from "../api/src/notify.js";
import { runRetentionSweep } from "../api/src/retention.js";
import { createTelegramClient } from "../api/src/telegram/client.js";
import { formatOperatorAlert } from "../api/src/telegram/format.js";

const config = loadConfig();
const logger = consoleLogger();

const telegram = createTelegramClient({
  botToken: config.telegramBotToken,
  chatIdOwner: config.telegramChatIdOwner,
  chatIdOperator: config.telegramChatIdOperator,
});

/** Alerts stay disarmed until RESTIC_REPOSITORY is set (#7 §6). */
const armed = config.resticRepository !== null;

async function alert(detail: string): Promise<void> {
  if (!armed) return;
  await telegram.sendToOperator(formatOperatorAlert({ kind: "backup_failed", detail }));
}

function run(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

async function main(): Promise<void> {
  // ---- Steps 1-4: the retention sweep, always, before anything is copied ----
  const db = openDatabase({ path: config.dbPath, key: config.sqlcipherKey });

  const summary = runRetentionSweep(db);
  logger.log({
    event: "sweep.complete",
    count: summary.request + summary.withdrawal + summary.retention,
    detail: `request=${summary.request} withdrawal=${summary.withdrawal} retention=${summary.retention}`,
  });

  // The stuck-notification alert rides the same nightly run (#7 §5). Without it
  // a revoked token means enquiries pile up unseen, and the failure looks
  // identical to "no enquiries today" — a perfectly normal Tuesday.
  //
  // Gated on Telegram being configured, NOT on `armed`. RESTIC_REPOSITORY arms
  // *backup* alerting; this alert is about notification delivery and has nothing
  // to do with the drives. Coupling them would leave undelivered enquiries
  // silently unreported for the whole period after the Telegram wizard has been
  // run but before the drives are bought — which is exactly the window in which
  // real enquiries start arriving.
  if (telegram.configured) {
    await alertStuckNotifications(db, telegram);
  }

  if (!armed) {
    // Deliberately not an error. Between now and the pre-launch restore drill no
    // backup has ever run and the drives do not exist; alarming every night
    // would train the Operator to ignore the channel before launch.
    logger.log({ event: "backup.skipped", reason: "RESTIC_REPOSITORY not set" });
    db.close();
    return;
  }

  const repository = config.resticRepository!;

  // ---- Assertion 1: the drive is actually there ----
  //
  // Without this, restic will happily create a fresh repository inside an empty
  // mountpoint on the root filesystem and "succeed" forever — a backup that
  // exists only as a belief.
  const mount = findMountpoint(repository);

  if (mount === null) {
    throw new Error(
      `Nothing along ${repository} is a mount point. Is the backup drive attached?`,
    );
  }

  // The backup drive is never the root filesystem. Without this check an absent
  // mount walks all the way up to `/`, which *is* a mount point, and the search
  // above would succeed vacuously — leaving restic free to write a "successful"
  // backup onto the very disk the backup exists to survive.
  if (mount === "/") {
    throw new Error(
      `${repository} sits on the root filesystem, not a backup drive. Is the drive attached?`,
    );
  }

  // ---- Assertion 2: it is the repository we expect, already initialised ----
  //
  // This script must NEVER run `restic init`. Initialisation is a deliberate,
  // once-per-drive act performed by hand, with the paper password already
  // written down — see the recovery chain in .env.example.
  try {
    run("restic", ["-r", repository, "cat", "config"]);
  } catch {
    throw new Error(
      `No restic repository at ${repository}. Initialise it by hand — never from this script.`,
    );
  }

  // ---- Step 5: a consistent snapshot, proven encrypted ----
  const stagingDir = join(dirname(config.dbPath), "snapshot");
  mkdirSync(stagingDir, { recursive: true });
  const snapshotPath = join(stagingDir, "enquiries.db");

  snapshotDatabase(db, snapshotPath);
  db.close();

  // Not taken on trust: a snapshot that silently wrote plaintext would undo
  // encryption at rest entirely, and this is cheap to rule out.
  assertSnapshotEncrypted(snapshotPath);
  assertNoSqliteHeader(snapshotPath);
  logger.log({ event: "snapshot.verified" });

  // ---- The backup itself ----
  //
  // Scope carries two different retention logics and they are kept visibly
  // apart: the snapshot holds personal data governed by the 24-month policy;
  // v0_GMB is the only copy of a dated Takeout snapshot — permanent business
  // data with no retention limit and none needed. `.env` is INCLUDED, not
  // excluded: it holds the SQLCipher key, and the instinct to leave it out is
  // exactly what breaks the recovery chain.
  const targets = [stagingDir, join(REPO_ROOT, ".env"), join(REPO_ROOT, "v0_GMB")].filter((p) =>
    existsSync(p),
  );

  run("restic", ["-r", repository, "backup", "--tag", "nightly", ...targets]);
  logger.log({ event: "backup.complete", count: targets.length });

  rmSync(stagingDir, { recursive: true, force: true });

  // ---- Pruning: the ceiling that makes the erasure promise honest ----
  //
  // ~30 daily + 8 weekly is about ninety days. There is deliberately no
  // --keep-yearly: a yearly snapshot would still hold rows we told a parent were
  // erased, which would quietly make the retention promise a lie.
  run("restic", [
    "-r",
    repository,
    "forget",
    "--prune",
    "--keep-daily",
    "30",
    "--keep-weekly",
    "8",
  ]);
  logger.log({ event: "prune.complete" });

  // ---- Assertion 3: the drive is actually being carried offsite ----
  const label = driveLabel(mount) ?? "unknown";
  const state = recordDriveUse(join(dirname(config.dbPath), "backup-state.json"), label);

  if (isDriveStale(state)) {
    // The one control in this design with no machine behind it. A weekly
    // physical carry decays within a month or two, invisibly, because the
    // backups keep succeeding the whole time.
    const days = driveStaleDays(state);
    await telegram.sendToOperator(formatOperatorAlert({ kind: "drive_stale", label, days }));
    logger.log({ event: "drive.stale", detail: label, count: days });
  }
}

/**
 * The nearest ancestor of the repository path that is an actual mount point.
 *
 * It must be an ancestor search, not just a check on the repository directory:
 * in production RESTIC_REPOSITORY is something like
 * `/media/subhojit/PT-BACKUP-A/restic`, where the *drive* is the mount point and
 * the repository is a directory sitting on it. Testing the repository path
 * itself would fail every single night on a perfectly healthy backup.
 *
 * Returns null if nothing along the path is mounted.
 */
function findMountpoint(repository: string): string | null {
  let candidate = resolve(repository);

  while (true) {
    if (existsSync(candidate)) {
      try {
        run("mountpoint", ["-q", candidate]);
        return candidate;
      } catch {
        /* not a mount point — keep walking up */
      }
    }
    const parent = dirname(candidate);
    if (parent === candidate) return null;
    candidate = parent;
  }
}

function driveLabel(mount: string): string | null {
  try {
    const source = run("findmnt", ["-n", "-o", "SOURCE", "--target", mount]).trim();
    return run("lsblk", ["-n", "-o", "LABEL", source]).trim() || null;
  } catch {
    return null;
  }
}

main().catch(async (err: Error) => {
  logger.log({ event: "backup.failed", detail: err.message });
  await alert(err.message).catch(() => {
    /* if Telegram is down too, the non-zero exit is the remaining signal */
  });
  console.error(err);
  process.exit(1);
});
