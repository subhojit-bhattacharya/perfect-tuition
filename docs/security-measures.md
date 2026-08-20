# Written security record

**Rule 6(1)(g), SPDI Rules 2011.** Committed and public deliberately: naming
SQLCipher, restic and a pre-commit hook discloses no vulnerability — it is the
same class of information a privacy policy carries — and a dated file in git
history is far stronger evidence of *when* a measure was adopted than a local
file with an mtime.

| | |
| --- | --- |
| **Data Fiduciary** | **Jayeeta Bhattacharya**, Owner, Perfect Tuition |
| **Grievance Officer** | Jayeeta Bhattacharya · privacy@perfect-tuition.co.in · one-month SLA |
| **Address** | Arnab Apartment, 444, Dum Dum Park Road, Dum Dum Park, Kolkata 700055 |
| **Operator** | By role only — one person, holding root on the machine, acting on the Owner's instruction |
| **Review cycle** | Every 6 months, at the same calendar point as the restore drill |
| **Last reviewed** | 2026-08-20 |

The Operator is named by role and not by name on purpose. Naming a specific
individual as the person holding root on the machine that stores parents' phone
numbers is a small but real social-engineering hint, and it costs this document
no evidential value.

---

## 1. Measures in place, mapped to Rule 6(1)

### (a) Encryption and access control

- **SQLCipher** on `api/data/enquiries.db`, via `better-sqlite3-multiple-ciphers`.
  `PRAGMA key` is the first statement on every connection, and `api/src/db.ts`
  is the only sanctioned way to open the file.
- The API listens on **127.0.0.1 only**. The Cloudflare Tunnel is the sole
  ingress.
- CORS is locked to `https://perfect-tuition.co.in` alone — not a wildcard.
- `.env` is mode 600, git-ignored, and additionally blocked by a committed
  pre-commit hook (§4).

### (b) Purpose limitation and data minimisation

- Six fields collected, itemised in the Consent Notice and `/privacy/`.
- **No `ip_address` column anywhere.** Rate limiting is enforced at the
  Cloudflare edge specifically so that IP addresses never reach this machine —
  better privacy, and less to disclose.
- **No `last_contact_at`.** See §3.
- **No third-party trackers of any kind**, sitewide. s.9(3) bans behavioural
  monitoring of children and this is a site children visit. Analytics is
  Cloudflare Web Analytics only: cookieless, no per-visitor profile.

### (c) Access logging

**Deferred to the admin view, with the reason recorded rather than left as an
oversight.** Logging reads is meaningless while the only read path is a
command-line tool run by the Operator, who owns the file. When an admin view
exists, this becomes real and this section is rewritten.

### (d) Retention

- **24 months from `created_at`**, matching the Consent Notice verbatim.
- **Floored at 12 months** by Rule 8(3). Nothing is erased before it is one year
  old, *including on request* — and the Consent Notice forewarns the parent of
  exactly this, which is what makes the deferral lawful under s.12(3).
- **Withdrawal of consent erases at the 12-month floor, not at 24.** s.8(7)(a)
  requires erasure on withdrawal *or* when the purpose is no longer served,
  whichever is earlier; the purpose is unambiguously spent the moment consent is
  withdrawn.
- Executed nightly by `scripts/backup.ts`, sweep **before** snapshot.

### (e) Logs

Metadata only — timestamp, endpoint, status code, `turnstile_status`, duplicate
outcome, enquiry id. **Never** `parent_name`, `phone_e164`, `phone_raw`,
`message`, or `consent_text`; `api/src/logger.ts` throws if any of those field
names is passed. Retained 12 months via `deploy/logrotate/perfect-tuition`.

### (f) Breach response

`docs/incident-runbook.md`, committed, with pre-drafted bilingual parent
notifications. Jayeeta Bhattacharya is the sole breach declarer.

### (g) This document.

---

## 2. Options declined, and why

Recording the rejected options matters as much as the adopted ones — it is what
stops a future session quietly reopening a closed question.

### Full-disk encryption — declined

Verified on the machine rather than assumed: `/etc/crypttab` does not exist,
`/dev/mapper` holds only `control`, and `/datascience` is plain ext4 on a single
disk.

**This laptop is the server.** It is powered on whenever the site can take an
enquiry, so FDE protects nothing while it is running. A LUKS retrofit requires
reinstalling Ubuntu; LUKS on `/datascience` alone would leave the service down
after every power cut until someone types a passphrase; and a keyfile on the same
disk is theatre.

### Cloud backup — declined

Both configured rclone remotes are `type = drive` on the **Operator's personal
Google accounts**. Using either would put parents' data in Google's custody under
a consumer agreement with no DPA, held by someone who is not the Data Fiduciary —
a second processor relationship on top of Cloudflare's, and the weakest option
available on both legal and privacy grounds.

The two-drive weekly swap achieves the offsite leg with no processor, no
contract, and no cross-border transfer question.

### Identifier-bearing erasure tombstones — declined

`erasure_log` holds **zero identifiers**: `requested_at`, `executed_at`,
`reason`, `row_count`. Nothing else.

A tombstone keyed by phone number would retain an identifier for the very person
who asked to be forgotten, and a plain hash of a ten-digit Indian mobile is
brute-forced in under a second. An HMAC under a secret would work but adds a
third secret to escrow for a dispute that is unlikely.

The evidence offered to a regulator is the log entry **plus the demonstrable
absence of the row**. *"We kept no record of who asked to be forgotten"* is the
correct posture, not a gap.

### `last_contact_at` — declined

The DPDP research checklist asks for it. There is no admin interface in v1, so
nothing would ever write to it, and a retention field that is never updated is
worse than no field: it silently means "24 months from collection" while claiming
to mean something else, and it makes the policy undemonstrable. **A formal
amendment to the research checklist.**

### A second notification channel — declined

No email, no SMS. Redundancy sounds free and is not: a second channel is a second
permanent copy of parents' names and phone numbers, with its own retention
behaviour, its own processor, and its own disclosure obligation.

Redundancy is covered from the other end instead — the site reveals a WhatsApp
fallback whenever the API is unreachable, so the enquiry reaches Jayeeta by a
path that does not involve our infrastructure at all.

---

## 3. Accepted residual risks

Stated plainly rather than omitted.

### The SQLCipher key sits beside the database it decrypts

The key is in plaintext in `.env`, on an unencrypted disk, in the same room as
the database. SQLCipher therefore defends against the file being **copied** —
into the repo, a backup, a support ticket — and **not at all** against laptop
theft.

**Compensating control:** a physical policy that the machine does not leave the
premises. This is an attested policy, not a machine check.

**Consequence:** theft of the laptop is a reportable breach of every enquiry ever
taken. The runbook covers it.

### Our logs cannot tell you which enquiry was accessed

Rule 6(1)(e) and Rule 8(3) both want a year of logs; the metadata-only rule
forbids names, phones and messages in them. These coexist, with an honest cost:
in a breach the logs can say an endpoint was hit, not whose record was read.

That is a deliberate trade of forensic depth for holding less data, written down
here rather than discovered during an incident.

### The blast radius of a breach cannot be narrowed

Because `erasure_log` holds no identifiers, we cannot reconstruct who was in the
database at a past date. **"Each affected parent" therefore means every parent
still in the database.** The runbook states this up front so nobody wastes an
hour in an incident trying to narrow it.

### Telegram's copy is bounded by an attested manual control

The one-month Auto-Delete Timer is a client-side setting with no Bot API
representation. `scripts/setup-telegram.sh` sends a live test message, asks
Jayeeta to set the timer, and requires her to type a confirmation — the date is
recorded below as an **attested manual control, weaker than a machine check**.

Bot-side cleanup was investigated and rejected on a checked fact: `deleteMessage`
only works within 48 hours of sending, far too short for a parent not yet reached.

| Control | Attested by | Date |
| --- | --- | --- |
| Telegram Auto-Delete Timer, 1 month, Owner's bot chat | Jayeeta Bhattacharya | *(pending — run `scripts/setup-telegram.sh`)* |
| Laptop does not leave the premises | Jayeeta Bhattacharya | *(pending)* |

---

## 4. Repository protection

This repository is **public**. `.gitignore` is empirically verified, but
`git add -f` bypasses it entirely, and a hook written into `.git/hooks` is not
version-controlled — it vanishes on any fresh clone.

`.githooks/pre-commit` is committed and wired via `core.hooksPath` (`npm run
setup`). It **hard-fails** — refuses the commit, does not warn — on any staged
path under `api/data/`, any database file, any `.env` other than `.env.example`,
`v0_GMB/`, and `api/logs/`. A warning in a terminal at 1am is not a control.

---

## 5. Backup, and the chain that makes it recoverable

| | |
| --- | --- |
| Tool | `restic` — encrypts natively, so the drives need no LUKS of their own |
| Destination | **Two USB drives, swapped weekly**, one always at a second address |
| Layout | One repository per drive, mounted by filesystem label (`PT-BACKUP-A` / `PT-BACKUP-B`) |
| Scope | `api/data/` snapshot + `.env` + `v0_GMB/` |
| Schedule | Daily, systemd timer, `Persistent=true` (the laptop sleeps) |
| Pruning | ~30 daily + 8 weekly ≈ **90 days maximum**. No `--keep-yearly`. |
| Cloud | **None** |

### Two retention logics, kept visibly apart

Conflating these is how `v0_GMB` accidentally acquires a deletion rule it should
never have:

- **`api/data/`** is backed up because it holds **personal data**, governed by
  the 24-month policy.
- **`v0_GMB/`** (212 MB, static) is backed up because it is the only copy of a
  dated Takeout snapshot — **permanent business data with no retention limit and
  none needed**. Checked before this call: `BusinessCalls.json` is empty (`{}`),
  so Google logged no caller numbers, and the reviews carry no names or verbatim
  text. It is business data, not personal data.

The repository itself needs no backup; it is on GitHub.

### Pruning is what makes the erasure promise honest

If enquiries are erased at 24 months but a snapshot from month 3 still contains
them, **nothing has been erased** — the copy has merely moved. With a 90-day
snapshot ceiling the honest statement to a parent is *"erased within 90 days of
the request taking effect, including from backups"*. A `--keep-yearly` policy
would quietly make the retention promise a lie.

### The recovery chain — single-rooted, one secret on paper

> **paper → restic password → repository → `.env` → SQLCipher key → database**

**Only the restic password is escrowed**, handwritten, **two copies** — one held
by Jayeeta, one stored with the offsite drive.

Two consequences that are easy to get backwards and fatal if you do:

1. **`.env` must be *included* in the backup**, not excluded as a secret. The
   instinct to exclude it is what breaks the chain.
2. **Write the restic password down *before* `restic init`**, not after.

### Three silent failures, three specific controls

1. **No drive attached.** `scripts/backup.ts` asserts `mountpoint -q` **and**
   `restic cat config` before touching anything, and exits non-zero otherwise. It
   **never** runs `restic init` — without this check restic will happily create a
   fresh repository inside an empty mountpoint on the root filesystem and
   "succeed" forever.
2. **The backup erroring.** `OnFailure=perfect-tuition-alert@%n.service` posts to
   the Operator's Telegram channel.
3. **The drive that never leaves the desk.** The script records the filesystem
   label it wrote to and alerts if the same label has been in use for more than 8
   consecutive days. This is the one control in the design with no machine behind
   it — a weekly physical carry decays within a month or two, invisibly, because
   the backups keep succeeding the whole time.

### The snapshot is proven encrypted on every run

`PRAGMA journal_mode = WAL` means pointing restic at the live database would copy
`.db`, `-wal` and `-shm` at three different instants and could capture a torn
state that restores corrupt. The snapshot therefore runs through
`VACUUM INTO` on the keyed connection, producing one consistent file.

`assertSnapshotEncrypted` then **proves the file cannot be opened without the
key**, and `assertNoSqliteHeader` independently checks the raw bytes. If either
fails the snapshot is deleted and the backup aborts. This runs every night, not
once at implementation time, because what it guards against is a future change to
how the snapshot is produced.

> **Deviation from #8, recorded:** the ticket specified `db.backup()`, SQLite's
> Online Backup API. That call is rejected by
> `better-sqlite3-multiple-ciphers` with *"backup is not supported with
> incompatible source and target databases"* when the source is encrypted.
> `VACUUM INTO` is SQLite's other consistent-snapshot primitive, is issued on the
> same keyed connection, and produces a file inheriting the source's encryption —
> verified by the assertions above and by `api/test/backup.test.ts`.

### Restore drill — a hard launch gate

**An untested backup is a belief, not a backup.** Run `npx tsx
scripts/restore-drill.ts`: it restores the latest snapshot to a temp directory,
proves the restored database cannot be opened without the key, then opens it with
the key and reports the row count. It never touches the live database.

- **Once before launch — non-negotiable.**
- **Every 6 months** thereafter, plus monthly `restic check --read-data-subset`.
- The six-monthly drill is the same calendar event as the review of this
  document, so neither is remembered alone.

### ⚠ Monitoring arms itself — do not simplify this away

`RESTIC_REPOSITORY` is the arming switch. **While it is empty, backup failures do
not alert** and "not configured" appears as a calm one-line note in the weekly
heartbeat instead. This stops the build weeks — when no backup has ever run and
the drives do not exist — from training the Operator to ignore the channel before
launch.

**The tradeoff, stated rather than hidden: if `RESTIC_REPOSITORY` is never set,
monitoring stays silently disarmed forever.** This is acceptable *only* because
the restore drill above is a hard launch gate, so an unset path cannot reach
production.

**Anyone who removes or weakens that launch gate silently disarms monitoring as a
side effect.** That dependency is recorded here precisely so it is not
"simplified" later.

---

## 6. Access

Two people, and no more.

- **Jayeeta Bhattacharya** (Owner, Data Fiduciary) — sees every enquiry as it
  arrives in Telegram.
- **The Operator** — root on the machine, acts on her instruction.

Telegram uses **direct messages, never groups**. Members can be added to a group
later, which would quietly turn this two-person rule into a policy nobody
enforces.

---

## 7. Rights procedures

One CLI, `scripts/enquiry-rights.ts`, with `show` / `correct` / `erase` /
`withdraw`. Same lookup, same identity check, one code path.

- **Identity check: a matching phone number is sufficient.** Requiring proof of
  identity in order to be *forgotten* is a dark pattern, and s.6(4) requires
  withdrawal to be as easy as consent was — consent was a checkbox.
- **Route:** Jayeeta forwards the request to the Operator, who runs the script and
  sends back one confirming sentence, including the deferred date where the floor
  applies. She reads the result out over the phone; the script exists so that what
  she reads out is right.
- **Never ad-hoc SQL against production.** That is how the wrong row gets deleted.
- **SLA: one month.** SPDI Rule 5(9) binds today and is materially tighter than
  DPDP's 90 days.

---

## 8. Processor contracts

**Two processors are in scope, and both are disclosed on `/privacy/`.**

| Processor | Role | Contract |
| --- | --- | --- |
| **Cloudflare** | TLS termination at the edge; Tunnel; Turnstile; Web Analytics | **DPA v6.4, effective 2026-04-03** — *acceptance date pending* |
| **Telegram** | Carries the enquiry notification to the Owner's phone | Bounded by the one-month auto-delete timer (§3) |

The Cloudflare DPA states it *"forms part of the Main Agreement"* but also carries
acceptance-warranty language — *"If you are accepting this DPA on behalf of
Customer, you warrant…"* — which reads as contemplating an affirmative act rather
than silent incorporation, and the public page does not resolve whether self-serve
accounts get it automatically. Given that ambiguity, **assuming incorporation is
the weaker position**: accept it explicitly in the dashboard and record the date
here.

On **Telegram and cross-border transfer**: s.16 operates as a blacklist and no
countries have been notified, so the transfer is permitted. It was only ever the
*undisclosed* part that was a problem, and `/privacy/` now discloses it.

**Open, and outside what this document can close:** whether Cloudflare's
GDPR-shaped DPA actually transfers to Indian law is a legal-review item.

---

## 9. Open launch gates

Not code. None of these is optional.

- [ ] Two USB drives bought and labelled `PT-BACKUP-A` / `PT-BACKUP-B`
- [ ] Restic password **written on paper, two copies, before `restic init`**
- [ ] `restic init` on each drive, by hand
- [ ] **Restore drill run** on the real drives — and with it, monitoring armed

      The whole chain was exercised end to end on 2026-08-20 against a throwaway
      restic repository: sweep → `VACUUM INTO` snapshot → encryption assertions →
      `restic backup` → `restic forget --prune` → restore → open with the key → row
      count. It passed. That proves the *code* works; it does not discharge this
      gate, which is about the actual drives and the paper password.
- [ ] `privacy@perfect-tuition.co.in` mailbox exists (an address that bounces is
      worse than naming none)
- [ ] Cloudflare DPA accepted in the dashboard, date recorded in §8
- [ ] Telegram auto-delete timer set and attested, date recorded in §3
- [ ] Legal opinion on Rule 10 — declaration vs DigiLocker verification
- [ ] **Enable GitHub Pages and restore the deploy workflow's push trigger**

      `.github/workflows/deploy.yml` is `workflow_dispatch`-only on purpose. The
      apex DNS already points at Pages and `public/CNAME` claims the apex, so the
      first successful run puts the site live on the real business domain. That
      must not happen as a side effect of a push while the gates above are open —
      in particular the `privacy@` mailbox, since a Grievance Officer address that
      bounces is worse than naming none.
