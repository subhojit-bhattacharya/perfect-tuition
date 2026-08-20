/**
 * Configuration, resolved once at boot.
 *
 * Everything the running service needs is read here so that a misconfiguration
 * fails at startup rather than on the first parent's enquiry.
 */

import { config as loadDotenv } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "..", "..");

loadDotenv({ path: join(REPO_ROOT, ".env"), quiet: true });

export type Config = {
  port: number;
  /** The single permitted browser origin. Not a wildcard (#6). */
  allowedOrigin: string;
  dbPath: string;
  sqlcipherKey: string;
  consentDir: string;
  turnstileSecretKey: string | null;
  telegramBotToken: string | null;
  telegramChatIdOwner: string | null;
  telegramChatIdOperator: string | null;
  /** Empty until the drives exist — and while empty, backup alerts stay disarmed (#7 §6). */
  resticRepository: string | null;
  logDir: string;
};

function optional(name: string): string | null {
  const v = process.env[name];
  return v === undefined || v.trim() === "" ? null : v.trim();
}

function required(name: string): string {
  const v = optional(name);
  if (v === null) throw new Error(`${name} is not set. See .env.example.`);
  return v;
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: Number(optional("API_PORT") ?? 3000),
    allowedOrigin: optional("ALLOWED_ORIGIN") ?? "https://perfect-tuition.co.in",
    dbPath: optional("DB_PATH") ?? join(REPO_ROOT, "api", "data", "enquiries.db"),
    sqlcipherKey: overrides.sqlcipherKey ?? required("SQLCIPHER_KEY"),
    consentDir: optional("CONSENT_DIR") ?? join(REPO_ROOT, "site", "src", "content", "consent"),
    turnstileSecretKey: optional("TURNSTILE_SECRET_KEY"),
    telegramBotToken: optional("TELEGRAM_BOT_TOKEN"),
    telegramChatIdOwner: optional("TELEGRAM_CHAT_ID_OWNER"),
    telegramChatIdOperator: optional("TELEGRAM_CHAT_ID_OPERATOR"),
    resticRepository: optional("RESTIC_REPOSITORY"),
    logDir: optional("LOG_DIR") ?? join(REPO_ROOT, "api", "logs"),
    ...overrides,
  };
}
