/**
 * Telegram message bodies (#7 §3). Pure — no I/O — so the escaping and the
 * routing invariant can be tested without a bot token.
 *
 * The routing rule these formatters encode is absolute: `formatEnquiry` is the
 * only one that renders personal data, and it is only ever sent to the Owner
 * chat. Everything the Operator receives is metadata — "enquiry #123 stuck",
 * never a name or a number.
 */

import type { EnquiryRow } from "../db.js";

/**
 * Telegram's HTML parse mode needs exactly these three escaped. It is chosen
 * over Markdown deliberately: Markdown's escape set is larger, differs between
 * `Markdown` and `MarkdownV2`, and gets it wrong on exactly the inputs we do not
 * control — a parent whose name contains `_` would otherwise have Telegram
 * reject the send outright, and a real enquiry would silently fail to notify.
 */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const IST = "Asia/Kolkata";

function istTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function parseSubjects(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/**
 * What Jayeeta sees. The full message body is included — #6 rejected
 * server-side scanning, so this field may well contain a child's name despite
 * the UI hint. That is the argument for Telegram's one-month auto-delete timer
 * (#7 §4), not a reason to truncate: she needs the context to have a useful
 * first conversation.
 */
export function formatEnquiry(row: EnquiryRow): string {
  const name = escapeHtml(row.parent_name);
  const e164 = escapeHtml(row.phone_e164);
  const raw = escapeHtml(row.phone_raw);
  const subjects = parseSubjects(row.subjects).map(escapeHtml);

  // Telegram's auto-linking of bare numbers is unreliable across clients, so
  // both links are explicit.
  const waNumber = row.phone_e164.replace(/^\+/, "");
  const waPrefill = encodeURIComponent(
    `Namaskar ${row.parent_name}, this is Perfect Tuition replying to your enquiry.`,
  );

  const lines: string[] = [];

  const flag = row.turnstile_status === "unverified" ? " ⚠" : "";
  lines.push(`<b>New enquiry #${row.id}</b>${flag}`);
  lines.push("");
  lines.push(`<b>${name}</b>`);
  lines.push(`<a href="tel:${e164}">${e164}</a> · as typed: ${raw}`);
  lines.push(`<a href="https://wa.me/${waNumber}?text=${waPrefill}">Reply on WhatsApp</a>`);
  lines.push("");

  lines.push(row.class_level === null ? "Class not given" : `Class ${row.class_level}`);
  lines.push(subjects.length > 0 ? subjects.join(", ") : "No subjects given");

  if (row.message !== null && row.message !== "") {
    lines.push("");
    lines.push(escapeHtml(row.message));
  }

  lines.push("");
  lines.push(`<i>${escapeHtml(istTimestamp(row.created_at))}</i>`);

  if (flag !== "") {
    lines.push("<i>⚠ Bot check was skipped — Turnstile was unreachable.</i>");
  }

  return lines.join("\n");
}

export type OperatorAlert =
  | { kind: "stuck_notifications"; ids: number[]; count: number }
  | { kind: "backup_failed"; detail: string }
  | { kind: "drive_stale"; label: string; days: number };

/** Metadata only. Never a name, never a number (#7 §2, #6's logging rule). */
export function formatOperatorAlert(alert: OperatorAlert): string {
  switch (alert.kind) {
    case "stuck_notifications": {
      const shown = alert.ids.slice(0, 20).join(", ");
      const more = alert.ids.length > 20 ? ` (+${alert.ids.length - 20} more)` : "";
      return [
        `⚠ <b>${alert.count} enquiry notification(s) have not reached the Owner</b>`,
        "",
        `Enquiry ids: ${shown}${more}`,
        "",
        "Telegram delivery is failing, or the token has been revoked.",
      ].join("\n");
    }
    case "backup_failed":
      return [
        "⚠ <b>Backup failed</b>",
        "",
        escapeHtml(alert.detail),
        "",
        "No snapshot was written. The database is unprotected until this is fixed.",
      ].join("\n");
    case "drive_stale":
      return [
        "⚠ <b>The same backup drive has been in use too long</b>",
        "",
        `${escapeHtml(alert.label)} — ${alert.days} consecutive days.`,
        "",
        "Both copies are at one address. Swap the drives.",
      ].join("\n");
  }
}

export type Heartbeat = {
  lastBackupAt: string | null;
  driveLabel: string | null;
  enquiriesThisWeek: number;
  pendingNotifications: number;
  backupConfigured: boolean;
};

/**
 * Weekly, not daily, and deliberately so (#7 §6): a message you receive every
 * morning and never act on becomes invisible within a fortnight. It exists
 * because the alerting channel shares its single point of failure with
 * everything it monitors — if the laptop is off, nothing can alert about it, so
 * total silence would otherwise be ambiguous between "fine" and "catastrophe".
 */
export function formatHeartbeat(h: Heartbeat): string {
  const lines = ["<b>Perfect Tuition — weekly check</b>", ""];

  if (!h.backupConfigured) {
    // Calm note, not an alarm: monitoring is disarmed until RESTIC_REPOSITORY
    // is set, so that the build weeks do not train the Operator to ignore this.
    lines.push("Backup: not configured yet.");
  } else if (h.lastBackupAt === null) {
    lines.push("Backup: configured, but no snapshot has been recorded yet.");
  } else {
    lines.push(`Last backup: ${escapeHtml(istTimestamp(h.lastBackupAt))}`);
    lines.push(`Drive: ${escapeHtml(h.driveLabel ?? "unknown")}`);
  }

  lines.push(`Enquiries this week: ${h.enquiriesThisWeek}`);
  lines.push(
    h.pendingNotifications === 0
      ? "All notifications delivered."
      : `Awaiting delivery: ${h.pendingNotifications}`,
  );

  return lines.join("\n");
}
