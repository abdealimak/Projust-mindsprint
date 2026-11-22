#!/usr/bin/env bash
# Upload environment variables from a local file to the linked Vercel project (Production).
# Values are piped to the Vercel CLI and never printed; only names are shown.
#
#   npx vercel login && npx vercel link        # once
#   bash scripts/vercel-env.sh .env.production # then
#
# Skips empty values, values pointing at localhost, and the local-only AI_SERVER_* settings.
set -euo pipefail

FILE="${1:-.env.production}"
TARGET="${2:-production}"
[ -f "$FILE" ] || { echo "No $FILE. Copy .env.example to $FILE and fill it in." >&2; exit 1; }

VERCEL="npx --yes vercel@66.6.0"
added=0
skipped=0
# Names already on Vercel are left alone (change those in the dashboard or with `vercel env remove`)
existing=$($VERCEL env ls "$TARGET" 2>/dev/null | awk 'NR>1{print $1}' || true)

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  name="${line%%=*}"
  value="${line#*=}"
  # strip surrounding quotes
  value="${value%\"}"; value="${value#\"}"; value="${value%\'}"; value="${value#\'}"
  [[ "$name" =~ ^[A-Z0-9_]+$ ]] || continue
  if [ -z "$value" ] || [[ "$value" == *localhost* ]] || [[ "$name" == AI_SERVER_* ]] || [[ "$name" == NEXT_DIST_DIR ]]; then
    echo "skip  $name"
    skipped=$((skipped + 1))
    continue
  fi
  if [ "$name" = "TOKEN_ENCRYPTION_KEY" ] && [ "$value" = "dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleS0xMjM0NQ==" ]; then
    echo "STOP: TOKEN_ENCRYPTION_KEY is the public example value. Generate one: openssl rand -base64 32" >&2
    exit 1
  fi
  if printf '%s\n' "$existing" | grep -qx "$name"; then
    echo "exists $name (left unchanged)"
    skipped=$((skipped + 1))
    continue
  fi
  # NEXT_PUBLIC_* values are public by design (shipped to browsers): store as readable config.
  # Everything else is stored as a hidden Secret. The value goes in on stdin, never on the command line.
  if [[ "$name" == NEXT_PUBLIC_* ]]; then
    printf '%s' "$value" | $VERCEL env add "$name" --environment "$TARGET" --type config --yes >/dev/null 2>&1 \
      || { echo "FAILED $name" >&2; exit 1; }
  else
    printf '%s' "$value" | $VERCEL env add "$name" --environment "$TARGET" >/dev/null 2>&1 \
      || { echo "FAILED $name" >&2; exit 1; }
  fi
  echo "set   $name"
  added=$((added + 1))
done < "$FILE"

echo "Done: $added set, $skipped skipped ($TARGET). Redeploy for them to take effect: npx vercel --prod"
