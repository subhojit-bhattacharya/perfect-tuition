# Perfect Tuition

The website and enquiry capture for [Perfect Tuition](https://perfect-tuition.co.in),
a coaching centre in Dum Dum Park, Kolkata, teaching ICSE and CBSE classes 3–12
since 2012.

A static Astro site on GitHub Pages, with enquiry capture posting through a
Cloudflare Tunnel to a SQLite-backed Hono service on the Owner's laptop.

```
site/     Astro static site — 5 pages, deployed to GitHub Pages
api/      Hono + SQLCipher enquiry store — runs on the laptop, localhost only
scripts/  Operational CLIs and setup wizards
deploy/   systemd units and logrotate config
docs/     Research briefs, the security record, the incident runbook
```

## Why it is built this way

The site's one job is to capture Enquiries, and **the primary call-to-action is a
phone or WhatsApp tap** — pure static HTML that works at 100% uptime whether or
not the laptop is awake. The form is the secondary path, and when it fails it
falls back to WhatsApp rather than losing the enquiry.

Three constraints shaped nearly everything else:

- **This is children's data.** Class and subject are attributes of a child, so
  DPDP s.9(3)'s ban on tracking and targeting children binds. There are **no
  third-party trackers anywhere on the site** — no ad-tech, no Google Analytics,
  and no Google Maps embed. That prohibition is flat and non-waivable.
- **The laptop is the server.** Full-disk encryption protects nothing on a
  machine that is powered on whenever the site can take an enquiry, so the
  database is encrypted with SQLCipher instead and the residual risk is written
  down rather than hidden.
- **Speed of reply beats tidiness.** Wherever the two pulled against each other —
  lenient validation, failing open on Turnstile, retrying notifications in
  process — speed won. A lost lead costs more than a messy row.

The reasoning behind each decision lives in the closed GitHub issues; the
compliance posture lives in [`docs/security-measures.md`](docs/security-measures.md).

## Setup

```bash
npm install
npm run setup                  # wires .githooks — do this on every fresh clone
cp .env.example .env           # then fill in the secrets
```

`npm run setup` is not optional. The pre-commit hook it installs hard-fails on
any staged database, `.env`, or `v0_GMB/` path. **This repository is public**, and
a leak is not recoverable by force-push.

## Running

```bash
npm run dev:api                # API on 127.0.0.1:3000
npm run dev:site               # site on localhost:4321
npm run build:site             # static output to site/dist/
npm test                       # API test suite
npm run typecheck              # both workspaces
```

## Operations

```bash
# Data-principal rights. Never run ad-hoc SQL against production instead.
npm run rights -- show     <phone>
npm run rights -- correct  <phone> <field> <value>
npm run rights -- erase    <phone>
npm run rights -- withdraw <phone>

# The nightly job: retention sweep FIRST, then snapshot and back up.
npm run backup

# The restore drill. Every 6 months, and once before launch.
npx tsx scripts/restore-drill.ts
```

### Wizards

| Script | What it walks |
| --- | --- |
| `scripts/setup-tunnel.sh` | Cloudflare Tunnel and DNS |
| `scripts/setup-telegram.sh` | The bot, both chat IDs, and the auto-delete timer |
| `scripts/generate-map.ts` | Regenerates the committed OpenStreetMap image |

### Deployment

```bash
sudo cp deploy/systemd/*.service deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now perfect-tuition-api.service
sudo systemctl enable --now perfect-tuition-backup.timer
sudo systemctl enable --now perfect-tuition-heartbeat.timer
sudo cp deploy/logrotate/perfect-tuition /etc/logrotate.d/perfect-tuition
```

The site deploys itself from `main` via GitHub Actions. The API is never shipped
from CI — it runs only on the laptop.

## Things that look like bugs and are not

- **`notification_status` exists alongside `notified_at`.** A duplicate enquiry
  is stored but deliberately not re-notified, so a null `notified_at` would mean
  both "Telegram is broken" and "deliberately silent" — and the alert watching it
  would cry wolf on every duplicate.
- **The form's error handling does not branch on the status code.** Cloudflare's
  error pages carry no CORS headers, so cross-origin the browser surfaces a
  rejected promise rather than a readable status. Rejection, non-2xx and timeout
  are one indistinguishable failure state, and code that special-cases `502` is
  wrong in exactly the case the fallback exists for.
- **`.env` is *included* in the backup.** It holds the SQLCipher key. The
  instinct to exclude it as a secret is what breaks the recovery chain — see
  [`docs/security-measures.md` §5](docs/security-measures.md).
- **There is no `ip_address` column.** Rate limiting is at the Cloudflare edge
  specifically so IPs never reach this machine.
- **The Google Business Profile name is wrong and stays wrong.** It still reads
  "Home Tutor & Private Tutor". Editing a profile's primary name risks
  suspension, a cost judged higher than the inaccuracy. Do not raise it again.

## Before launch

Open gates are tracked in
[`docs/security-measures.md` §9](docs/security-measures.md). None of them is code.
