/**
 * The Telegram bot — send-only, permanently (#7 §7).
 *
 * There is no `getUpdates` polling and no webhook, and there never will be.
 * Anyone who learns the bot's username can message it; a bot with nothing to
 * receive should have no inbound path to attack or parse. Groups and inline mode
 * are disabled through BotFather for the same reason.
 *
 * The single exception is setup, where pressing Start is how each chat_id is
 * read. That happens once, by hand, through scripts/setup-telegram.sh — after
 * which the bot never listens again.
 */

export type SendResult = { ok: true } | { ok: false; error: string; retryable: boolean };

export type TelegramClient = {
  /** Parent enquiries. The only channel personal data may reach. */
  sendToOwner(html: string): Promise<SendResult>;
  /** Metadata only — never a name, never a number. */
  sendToOperator(html: string): Promise<SendResult>;
  readonly configured: boolean;
};

const TIMEOUT_MS = 10_000;

export function createTelegramClient(opts: {
  botToken: string | null;
  chatIdOwner: string | null;
  chatIdOperator: string | null;
}): TelegramClient {
  const configured =
    opts.botToken !== null && opts.chatIdOwner !== null && opts.chatIdOperator !== null;

  async function send(chatId: string | null, html: string): Promise<SendResult> {
    if (opts.botToken === null || chatId === null) {
      // Not a retryable condition: nothing will change until someone runs the
      // setup wizard, so retrying would just burn attempts.
      return { ok: false, error: "telegram not configured", retryable: false };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${opts.botToken}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: html,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: unknown;
        description?: unknown;
      } | null;

      if (json?.ok === true) return { ok: true };

      const description = typeof json?.description === "string" ? json.description : res.statusText;

      // 4xx other than 429 means the request itself is wrong — a revoked token,
      // a bad chat_id, or malformed HTML. Retrying an identical request cannot
      // help, and `notify_attempts` climbing to 47 is how the Operator tells
      // "Telegram hiccuped" from "rotate the token".
      const retryable = res.status === 429 || res.status >= 500;
      return { ok: false, error: `telegram: ${res.status} ${description}`, retryable };
    } catch (err) {
      return {
        ok: false,
        error: `telegram unreachable: ${(err as Error).message}`,
        retryable: true,
      };
    }
  }

  return {
    configured,
    sendToOwner: (html) => send(opts.chatIdOwner, html),
    sendToOperator: (html) => send(opts.chatIdOperator, html),
  };
}
