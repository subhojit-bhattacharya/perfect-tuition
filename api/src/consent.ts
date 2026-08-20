/**
 * The Consent Notice, loaded once at boot (#6).
 *
 * Read at boot and *not* per request, deliberately: a deploy that changes the
 * wording mid-flight must not be able to leave rows pointing at a version that
 * was never shown to anybody. The version is a plain integer in the filename,
 * never a date, and it must be bumped on any wording change however small.
 *
 * The text is denormalised into every row because the burden of proving what a
 * parent actually agreed to falls on the business, and a file on disk can be
 * edited after the fact.
 */

import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ConsentLocale } from "./validate.js";
import { CONSENT_LOCALES } from "./validate.js";

export type ConsentNotice = {
  version: string;
  locale: ConsentLocale;
  title: string;
  body: string;
  agree: string;
  /** Exactly what the parent saw, in one string. This is what gets stored. */
  verbatim: string;
};

export type ConsentNotices = Record<ConsentLocale, ConsentNotice>;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseNotice(source: string, file: string): { meta: Record<string, string>; body: string } {
  const match = FRONTMATTER.exec(source);
  if (match === null) throw new Error(`${file}: expected YAML frontmatter.`);

  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const at = line.indexOf(":");
    if (at === -1) throw new Error(`${file}: cannot parse frontmatter line "${line}".`);
    meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { meta, body: match[2]!.trim() };
}

/**
 * Picks the highest `vN` present. Adding `v3.en.md` and `v3.bn.md` is therefore
 * the whole of "bump the notice" — there is no second place to update, and so
 * no way for the two languages to drift onto different versions unnoticed.
 */
export function resolveCurrentVersion(dir: string): string {
  const versions = new Set<number>();
  for (const name of readdirSync(dir)) {
    const m = /^v(\d+)\.(en|bn)\.md$/.exec(name);
    if (m !== null) versions.add(Number(m[1]));
  }
  if (versions.size === 0) throw new Error(`No consent notice files found in ${dir}.`);
  return String(Math.max(...versions));
}

export function loadConsentNotices(dir: string, version?: string): ConsentNotices {
  const resolved = version ?? resolveCurrentVersion(dir);
  const notices = {} as ConsentNotices;

  for (const locale of CONSENT_LOCALES) {
    const file = join(dir, `v${resolved}.${locale}.md`);
    const { meta, body } = parseNotice(readFileSync(file, "utf8"), file);

    // A mismatch here means the filename and the frontmatter disagree about
    // which version this is, which would make the stored Consent Record a lie.
    if (meta["version"] !== resolved) {
      throw new Error(
        `${file}: frontmatter version "${meta["version"]}" does not match filename v${resolved}.`,
      );
    }
    if (meta["locale"] !== locale) {
      throw new Error(`${file}: frontmatter locale "${meta["locale"]}" does not match filename.`);
    }

    const title = meta["title"];
    const agree = meta["agree"];
    if (title === undefined || agree === undefined) {
      throw new Error(`${file}: frontmatter needs both "title" and "agree".`);
    }

    notices[locale] = {
      version: resolved,
      locale,
      title,
      body,
      agree,
      verbatim: `${title}\n\n${body}\n\n${agree}`,
    };
  }

  return notices;
}
