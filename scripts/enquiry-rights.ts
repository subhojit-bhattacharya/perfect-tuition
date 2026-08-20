#!/usr/bin/env -S npx tsx
/**
 * Data-principal rights CLI (#8 §7).
 *
 *   npm run rights -- show     <phone>
 *   npm run rights -- correct  <phone> <field> <value>
 *   npm run rights -- erase    <phone>
 *   npm run rights -- withdraw <phone>
 *
 * The route in practice: Jayeeta forwards the parent's request to the Operator,
 * who runs this and sends back one confirming sentence — including the deferred
 * date where the twelve-month floor applies. She then reads the result out over
 * the phone. This script exists so that what she reads out is right.
 *
 * **Never run ad-hoc SQL against production instead.** That is how the wrong row
 * gets deleted.
 *
 * SLA: one month (SPDI Rule 5(9), which binds today and is tighter than DPDP's
 * ninety days).
 */

import { loadConfig } from "../api/src/config.js";
import { openDatabase } from "../api/src/db.js";
import {
  CORRECTABLE,
  correct,
  requestErasure,
  resolvePhone,
  show,
  withdrawConsent,
  type CorrectableField,
} from "../api/src/rights.js";

const USAGE = `
Usage:
  npm run rights -- show     <phone>
  npm run rights -- correct  <phone> <field> <value>
  npm run rights -- erase    <phone>
  npm run rights -- withdraw <phone>

Correctable fields: ${CORRECTABLE.join(", ")}

A matching phone number is sufficient identity proof. Requiring documents in
order to be forgotten is a dark pattern, and s.6(4) requires withdrawal to be as
easy as consent was.
`.trim();

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Renders a date the way it will be read out over the phone. */
function readable(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

const [subcommand, phoneArg, ...rest] = process.argv.slice(2);

if (subcommand === undefined || subcommand === "--help" || subcommand === "-h") {
  console.log(USAGE);
  process.exit(0);
}
if (phoneArg === undefined) fail(`A phone number is required.\n\n${USAGE}`);

const lookup = resolvePhone(phoneArg);
if (!lookup.ok) fail(lookup.error);
const phoneE164 = lookup.phoneE164;

const config = loadConfig();
const db = openDatabase({ path: config.dbPath, key: config.sqlcipherKey });

try {
  switch (subcommand) {
    case "show": {
      const { records, withdrawnCount } = show(db, phoneE164);
      console.log(`\n${phoneE164} — ${records.length} enquiry/enquiries held.\n`);

      for (const r of records) {
        const subjects = (JSON.parse(r.subjects) as string[]).join(", ") || "none given";
        console.log(`  #${r.id}  ${readable(r.created_at)}`);
        console.log(`     Name     : ${r.parent_name}`);
        console.log(`     Phone    : ${r.phone_e164}  (as given: ${r.phone_raw})`);
        console.log(`     Class    : ${r.class_level ?? "not given"}`);
        console.log(`     Subjects : ${subjects}`);
        console.log(`     Message  : ${r.message ?? "none"}`);
        console.log(`     Consent  : notice v${r.consent_notice_version} (${r.consent_locale})`);
        if (r.erasure_requested_at !== null) {
          console.log(`     Erasure  : requested ${readable(r.erasure_requested_at)}, pending`);
        }
        console.log("");
      }

      if (withdrawnCount > 0) {
        console.log(
          `  ${withdrawnCount} further record(s) had consent withdrawn. They are no longer\n` +
            `  used or contacted, and are queued for erasure at the one-year mark.\n`,
        );
      }
      console.log(`Done: showed ${records.length} record(s) for ${phoneE164}.`);
      break;
    }

    case "correct": {
      const [field, ...valueParts] = rest;
      const value = valueParts.join(" ");
      if (field === undefined || value === "") {
        fail(`correct needs a field and a value.\n\n${USAGE}`);
      }
      if (!(CORRECTABLE as readonly string[]).includes(field)) {
        fail(`"${field}" is not correctable. Choose one of: ${CORRECTABLE.join(", ")}`);
      }

      const result = correct(db, phoneE164, field as CorrectableField, value);
      if (!result.ok) fail(result.error);

      console.log(`\nDone: corrected ${field} on ${result.updated} record(s) for ${phoneE164}.`);
      if (result.note !== undefined) console.log(result.note);
      break;
    }

    case "erase": {
      const r = requestErasure(db, phoneE164);
      console.log("");
      if (r.erasedNow > 0) console.log(`Erased now: ${r.erasedNow} record(s).`);
      if (r.deferred > 0 && r.deferredUntil !== null) {
        // The Consent Notice forewarns the parent of exactly this, which is what
        // makes the deferral lawful under s.12(3).
        console.log(
          `Queued: ${r.deferred} record(s) are not yet a year old. The law requires us to\n` +
            `keep records for at least one year, so they will be erased on ${readable(r.deferredUntil)}.`,
        );
      }
      if (r.erasedNow === 0 && r.deferred === 0) console.log(`Nothing held for ${phoneE164}.`);
      console.log(`\nDone: erasure requested for ${phoneE164}.`);
      break;
    }

    case "withdraw": {
      const r = withdrawConsent(db, phoneE164);
      console.log("");
      console.log(`Consent withdrawn on ${r.withdrawn} record(s). They are now invisible to`);
      console.log(`every read path and will not be contacted again.`);
      if (r.erasedNow > 0) console.log(`Erased now: ${r.erasedNow} record(s).`);
      if (r.deferred > 0 && r.deferredUntil !== null) {
        console.log(`Queued: ${r.deferred} record(s) will be erased on ${readable(r.deferredUntil)}.`);
      }
      console.log(`\nDone: consent withdrawn for ${phoneE164}.`);
      break;
    }

    default:
      fail(`Unknown subcommand "${subcommand}".\n\n${USAGE}`);
  }
} finally {
  db.close();
}
