#!/usr/bin/env -S npx tsx
/**
 * The restore drill (#8 §5).
 *
 * **An untested backup is a belief, not a backup.** This is a hard launch gate,
 * and it repeats every 6 months alongside the review of
 * docs/security-measures.md — the same calendar event, so neither is remembered
 * alone.
 *
 *   npx tsx scripts/restore-drill.ts
 *
 * It restores to a temp directory, opens the database with the key, reports the
 * row count, and proves the restored file is unreadable *without* the key. It
 * never touches the live database.
 *
 * Passing this drill is also what arms monitoring: it is the step at which
 * RESTIC_REPOSITORY is known-good, and #7 §6 uses that variable as the switch
 * that turns backup alerts on. Removing this gate silently disarms them.
 */

import Database from "better-sqlite3-multiple-ciphers";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../api/src/config.js";

const config = loadConfig();

function step(n: number, text: string): void {
  console.log(`\n\x1b[1m[${n}/5]\x1b[0m ${text}`);
}
const pass = (t: string) => console.log(`  \x1b[1;32m✓\x1b[0m ${t}`);
const fail = (t: string): never => {
  console.error(`  \x1b[1;31m✗ ${t}\x1b[0m`);
  process.exit(1);
};

if (config.resticRepository === null) {
  fail("RESTIC_REPOSITORY is not set. There is nothing to restore from.");
}

const workDir = mkdtempSync(join(tmpdir(), "pt-restore-drill-"));

try {
  step(1, "Checking the repository is readable");
  const snapshots = execFileSync(
    "restic",
    ["-r", config.resticRepository!, "snapshots", "--json"],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(snapshots) as { short_id: string; time: string }[];
  if (parsed.length === 0) fail("The repository holds no snapshots.");
  const latest = parsed[parsed.length - 1]!;
  pass(`${parsed.length} snapshot(s); latest ${latest.short_id} from ${latest.time}`);

  step(2, "Restoring the latest snapshot to a temporary directory");
  execFileSync(
    "restic",
    ["-r", config.resticRepository!, "restore", "latest", "--target", workDir],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  pass(`Restored to ${workDir}`);

  step(3, "Locating the restored database");
  const found = execFileSync("find", [workDir, "-name", "enquiries.db", "-type", "f"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  if (found.length === 0) fail("No enquiries.db in the restored snapshot.");
  const restored = found[0]!;
  pass(`${restored} (${(statSync(restored).size / 1024).toFixed(0)} KB)`);

  step(4, "Proving it is unreadable WITHOUT the key");
  let openedUnkeyed = false;
  try {
    const probe = new Database(restored, { readonly: true });
    probe.prepare("SELECT count(*) FROM sqlite_master").get();
    probe.close();
    openedUnkeyed = true;
  } catch {
    /* correct */
  }
  if (openedUnkeyed) {
    fail("The restored database opened WITHOUT the key. The backup is plaintext.");
  }
  pass("Unreadable without the key, as it must be");

  step(5, "Opening it WITH the key and counting rows");
  const db = new Database(restored, { readonly: true });
  db.pragma("cipher='sqlcipher'");
  db.pragma(`key='${config.sqlcipherKey.replace(/'/g, "''")}'`);
  const { c } = db.prepare("SELECT count(*) AS c FROM enquiry").get() as { c: number };
  const { e } = db.prepare("SELECT count(*) AS e FROM erasure_log").get() as { e: number };
  db.close();
  pass(`${c} enquiry row(s), ${e} erasure log entr(ies) — the backup is real`);

  console.log(`
\x1b[1;32m── DRILL PASSED ──\x1b[0m

Record the date in docs/security-measures.md and set the next drill for six
months from today, at the same calendar point as the security-record review.
`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
