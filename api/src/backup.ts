/**
 * Database snapshotting and the checks that stop a backup failing silently (#8 §5).
 *
 * Every failure mode in this design is silent, so each one gets a specific
 * control here rather than a comment somewhere hoping it is noticed.
 *
 * On the snapshot mechanism: #8 specified `db.backup()`, SQLite's Online Backup
 * API on the connection that already holds the key. That call is rejected by
 * better-sqlite3-multiple-ciphers with "incompatible source and target
 * databases" when the source is encrypted, so this uses `VACUUM INTO` instead —
 * SQLite's other consistent-snapshot primitive, issued on the same keyed
 * connection, which produces a single file inheriting the source's encryption.
 * It satisfies every property the ticket actually asked for, and
 * `assertSnapshotEncrypted` proves the important one rather than assuming it.
 */

import Database from "better-sqlite3-multiple-ciphers";
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import type { Db } from "./db.js";

/** #8 §5: the same drive sitting on the desk this long is the failure to catch. */
export const DRIVE_STALE_DAYS = 8;

/**
 * Take a consistent snapshot of the live database.
 *
 * Pointing restic at the live files instead would copy `.db`, `-wal` and `-shm`
 * at three different instants and can capture a torn state that restores
 * corrupt — discovered at restore time, which is the worst possible moment.
 */
export function snapshotDatabase(db: Db, destPath: string): void {
  if (existsSync(destPath)) unlinkSync(destPath);
  // Single statement, transactionally consistent, and the destination inherits
  // this connection's cipher and key.
  db.prepare("VACUUM INTO ?").run(destPath);
}

/**
 * Prove the snapshot cannot be opened without the key, and fail the backup if it
 * can.
 *
 * #8 makes this mandatory and explicitly refuses to take it on trust: a backup
 * that silently wrote plaintext would undo the entire encryption-at-rest
 * decision, and this is a cheap check to rule it out. It runs on every backup,
 * not once at implementation time, because the thing it guards against is a
 * future change to how the snapshot is produced.
 */
export function assertSnapshotEncrypted(snapshotPath: string): void {
  let opened = false;
  try {
    const probe = new Database(snapshotPath, { readonly: true });
    // Touching sqlite_master is what actually forces a page read.
    probe.prepare("SELECT count(*) FROM sqlite_master").get();
    probe.close();
    opened = true;
  } catch {
    // Correct: an unkeyed open must fail.
  }

  if (opened) {
    unlinkSync(snapshotPath);
    throw new Error(
      `Snapshot at ${snapshotPath} opened WITHOUT the SQLCipher key. ` +
        `It is plaintext personal data. The snapshot has been deleted and the backup is aborted.`,
    );
  }
}

/** A second, independent check: the raw bytes must not carry a known header. */
export function assertNoSqliteHeader(snapshotPath: string): void {
  const head = readFileSync(snapshotPath).subarray(0, 16).toString("latin1");
  if (head.startsWith("SQLite format 3")) {
    unlinkSync(snapshotPath);
    throw new Error(
      `Snapshot at ${snapshotPath} carries a plaintext SQLite header. ` +
        `The snapshot has been deleted and the backup is aborted.`,
    );
  }
}

export type DriveState = { label: string; since: string };

/**
 * Tracks which drive has been in use and for how long.
 *
 * This is the one control in the whole backup design with no machine behind it:
 * the weekly physical carry between two addresses decays within a month or two,
 * invisibly, because the backups keep succeeding the whole time.
 */
export function readDriveState(statePath: string): DriveState | null {
  if (!existsSync(statePath)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(statePath, "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as DriveState).label === "string" &&
      typeof (parsed as DriveState).since === "string"
    ) {
      return parsed as DriveState;
    }
  } catch {
    /* a corrupt state file just resets the clock */
  }
  return null;
}

export function recordDriveUse(
  statePath: string,
  label: string,
  now: Date = new Date(),
): DriveState {
  const previous = readDriveState(statePath);
  // A different label means the swap happened, so the clock restarts.
  const state: DriveState =
    previous !== null && previous.label === label
      ? previous
      : { label, since: now.toISOString() };

  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  return state;
}

export function driveStaleDays(state: DriveState, now: Date = new Date()): number {
  const since = new Date(state.since).getTime();
  return Math.floor((now.getTime() - since) / 86_400_000);
}

export function isDriveStale(state: DriveState, now: Date = new Date()): boolean {
  return driveStaleDays(state, now) > DRIVE_STALE_DAYS;
}

/** Used by the heartbeat to report the last successful backup. */
export function lastBackupAt(statePath: string): string | null {
  if (!existsSync(statePath)) return null;
  return statSync(statePath).mtime.toISOString();
}
