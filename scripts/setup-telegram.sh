#!/usr/bin/env bash
#
# Telegram notification setup (#7 §9).
#
# A separate script from setup-tunnel.sh deliberately: that one is finished and
# byte-verified against its template, the two setups happen at different times
# for different reasons, and bolting five stages on would put working code at
# risk for no benefit.
#
# The hard Telegram constraint this walks around: a bot cannot message a user who
# has never messaged it first. Both people must press Start before their chat_id
# exists at all — which is a manual step, and belongs here rather than in a
# launch-day discovery.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$1"; }
err()  { printf '\033[1;31m✗ %s\033[0m\n' "$1" >&2; }

stage() {
    printf '\n'
    bold "── Stage $1 of 6 — $2"
    printf '\n'
}

pause() { read -r -p "Press Enter when done… " _; }

require() {
    command -v "$1" >/dev/null 2>&1 || { err "$1 is required but not installed."; exit 1; }
}
require curl

# Writes KEY=value into .env, replacing any existing line for that key.
write_env() {
    local key="$1" value="$2"
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
    fi
}

api() {
    local method="$1"; shift
    curl -fsS "https://api.telegram.org/bot${BOT_TOKEN}/${method}" "$@"
}

cat <<'INTRO'

  Perfect Tuition — Telegram notification setup

  One bot, two direct-message chats:

    OWNER    (Jayeeta)  — parent enquiries. The ONLY place personal data goes.
    OPERATOR            — backup failures, drive-swap warnings, stuck
                          notifications, weekly heartbeat. Metadata only.

  Direct messages, never groups: members can be added to a group later, which
  would quietly turn the two-person access rule into a policy nobody enforces.

INTRO

# ── Stage 1 ───────────────────────────────────────────────────────────────────
stage 1 "Create the bot with BotFather"
cat <<'EOF'
  1. Open Telegram and message @BotFather
  2. Send:  /newbot
  3. Give it a name (e.g. "Perfect Tuition") and a username ending in "bot"
  4. BotFather replies with a token that looks like 123456789:AAE...

EOF
read -r -p "Paste the bot token: " BOT_TOKEN
[ -n "$BOT_TOKEN" ] || { err "No token given."; exit 1; }

if ! api getMe >/dev/null 2>&1; then
    err "Telegram rejected that token. Check it and run this again."
    exit 1
fi
BOT_USERNAME=$(api getMe | grep -o '"username":"[^"]*"' | head -1 | cut -d'"' -f4)
ok "Token accepted — the bot is @${BOT_USERNAME}"

# ── Stage 2 ───────────────────────────────────────────────────────────────────
stage 2 "Harden the bot"
cat <<EOF
  Back in @BotFather, send /mybots, choose @${BOT_USERNAME}, then Bot Settings:

    • Allow Groups?      → turn OFF
    • Group Privacy      → turn ON
    • Inline Mode        → turn OFF

  Anyone who learns the username can message the bot. It has no inbound path in
  the code — no polling, no webhook, ever — and this stops a leaked username
  being added anywhere either.

EOF
pause
ok "Bot hardened"

# ── Stage 3 ───────────────────────────────────────────────────────────────────
stage 3 "The Start handshake — read back both chat IDs"
cat <<EOF
  A bot cannot message someone who has not messaged it first, so each person
  must press Start once. Their chat_id does not exist until they do.

  Ask BOTH people to open  https://t.me/${BOT_USERNAME}  and press Start:

    • Jayeeta (Owner)
    • the Operator

EOF
pause

# Setup is the one and only time the bot ever listens. After this it is
# permanently send-only.
UPDATES=$(api getUpdates)
mapfile -t CHATS < <(printf '%s' "$UPDATES" \
    | grep -o '"chat":{"id":[-0-9]*,"first_name":"[^"]*"' \
    | sed 's/"chat":{"id":\([-0-9]*\),"first_name":"\([^"]*\)"/\1 \2/' \
    | sort -u)

if [ "${#CHATS[@]}" -eq 0 ]; then
    err "No chats found. Did both people press Start? Try again."
    exit 1
fi

printf '  Chats that have messaged the bot:\n\n'
for i in "${!CHATS[@]}"; do
    printf '    [%d] %s\n' "$i" "${CHATS[$i]}"
done
printf '\n'

read -r -p "Which number is Jayeeta (Owner)? " OWNER_IDX
read -r -p "Which number is the Operator?    " OPERATOR_IDX

CHAT_ID_OWNER=$(printf '%s' "${CHATS[$OWNER_IDX]}" | cut -d' ' -f1)
CHAT_ID_OPERATOR=$(printf '%s' "${CHATS[$OPERATOR_IDX]}" | cut -d' ' -f1)

if [ "$CHAT_ID_OWNER" = "$CHAT_ID_OPERATOR" ]; then
    warn "Both roles point at the same chat. Personal data and metadata would mix."
    read -r -p "Continue anyway? [y/N] " confirm
    [ "$confirm" = "y" ] || exit 1
fi

# ── Stage 4 ───────────────────────────────────────────────────────────────────
stage 4 "Write .env"
# Named after the recipient, not the payload: the entire safety property is that
# personal data reaches the Owner and never the Operator, and a variable named
# for who is on the other end makes a mis-wiring obvious on sight.
write_env TELEGRAM_BOT_TOKEN "$BOT_TOKEN"
write_env TELEGRAM_CHAT_ID_OWNER "$CHAT_ID_OWNER"
write_env TELEGRAM_CHAT_ID_OPERATOR "$CHAT_ID_OPERATOR"
ok "Written to .env (mode 600, git-ignored, and blocked by .githooks/pre-commit)"

# ── Stage 5 ───────────────────────────────────────────────────────────────────
stage 5 "Send a live test message to each chat"
api sendMessage \
    -d "chat_id=${CHAT_ID_OWNER}" \
    -d "parse_mode=HTML" \
    -d "text=<b>Perfect Tuition</b>%0A%0AThis is the chat where new enquiries will arrive." \
    >/dev/null
ok "Sent to the Owner chat"

api sendMessage \
    -d "chat_id=${CHAT_ID_OPERATOR}" \
    -d "parse_mode=HTML" \
    -d "text=<b>Perfect Tuition — Operator channel</b>%0A%0ABackup and delivery alerts will arrive here. No personal data is ever sent to this chat." \
    >/dev/null
ok "Sent to the Operator chat"

printf '\n  Check that both messages arrived in the right places before continuing.\n\n'
pause

# ── Stage 6 ───────────────────────────────────────────────────────────────────
stage 6 "The auto-delete timer — an attested manual control"
cat <<'EOF'
  A Telegram cloud chat keeps messages indefinitely, on Telegram's servers and
  on the phone. That sits entirely outside the 24-month retention policy: erase
  the row, prune the snapshot, and the parent's details are still in a chat from
  2027.

  Bot-side cleanup cannot fix this — deleteMessage only works within 48 hours of
  sending, far too short for a parent not yet reached by Tuesday.

  So JAYEETA must set this by hand, once:

    Open the chat with the bot → tap the bot name at the top
      → ⋮ (or "..." ) → Auto-Delete Messages → 1 month

  This script CANNOT verify it. It is a client-side setting with no Bot API
  representation, and it is the only control bounding Telegram's copy of the
  data. It is recorded as an attested manual control, which is weaker than a
  machine check — saying so plainly is the point.

EOF
read -r -p "Type 'set' once Jayeeta confirms the 1-month timer is on: " ATTEST

if [ "$ATTEST" != "set" ]; then
    warn "Not attested. Telegram's copy of parents' data is currently unbounded."
    warn "Re-run this script once it is set, and record the date in docs/security-measures.md."
    exit 1
fi

ATTEST_DATE=$(date -I)
ok "Attested on ${ATTEST_DATE}"

cat <<EOF

  ── Record this in docs/security-measures.md ──────────────────────────────────

    Telegram Auto-Delete Timer set to 1 month on the Owner's bot chat.
    Attested by Jayeeta Bhattacharya on ${ATTEST_DATE}.
    Attested manual control — not machine-verified.

  ──────────────────────────────────────────────────────────────────────────────

EOF

bold "Done. The bot is now send-only and never listens again."
printf '\nRestart the API to pick up the new values:\n'
printf '  sudo systemctl restart perfect-tuition-api\n\n'
