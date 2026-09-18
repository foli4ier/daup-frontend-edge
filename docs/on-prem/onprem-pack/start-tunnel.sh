#!/usr/bin/env bash
# Template: Cloudflare named tunnel → local house node http://127.0.0.1:8080
# Placeholder hostname: mcp.example.com
# Do not bake real tunnel ids, tokens, or credentials into this pack.
set -euo pipefail

PACK_DIR="$(cd "$(dirname "$0")" && pwd)"

load_dotenv() {
  local file="$1"
  [ -f "$file" ] || return 0
  while IFS= read -r raw || [ -n "$raw" ]; do
    local line="${raw%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [ -z "$line" ] && continue
    case "$line" in
      \#*) continue ;;
    esac
    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    [ -z "$key" ] && continue
    value="${value#"${value%%[![:space:]]*}"}"
    if [ "${#value}" -ge 2 ]; then
      local first="${value:0:1}"
      local last="${value: -1}"
      if { [ "$first" = '"' ] && [ "$last" = '"' ]; } || { [ "$first" = "'" ] && [ "$last" = "'" ]; }; then
        value="${value:1:$((${#value} - 2))}"
      fi
    fi
    if [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done < "$file"
}

load_dotenv "$PACK_DIR/.env"

PORT="${PORT:-8080}"
TUNNEL_ID="${CLOUDFLARE_TUNNEL_ID:-REPLACE_TUNNEL_ID}"
HOSTNAME="${CLOUDFLARE_HOSTNAME:-mcp.example.com}"
CREDENTIALS="${CLOUDFLARE_CREDENTIALS_FILE:-}"
LOCAL_URL="${TUNNEL_LOCAL_URL:-http://127.0.0.1:${PORT}}"

print_template() {
  cat <<EOF
[onprem] Cloudflare tunnel template (fill in on this machine; do not commit secrets)

  Named tunnel (Hub public https):
    hostname : ${HOSTNAME}
    service  : ${LOCAL_URL}
    tunnel id: ${TUNNEL_ID}

  Example config.yml (keep credentials off this repo):

    tunnel: ${TUNNEL_ID}
    credentials-file: ${CREDENTIALS:-/path/to/${TUNNEL_ID}.json}
    ingress:
      - hostname: ${HOSTNAME}
        service: ${LOCAL_URL}
      - service: http_status:404

  Then:
    cloudflared tunnel route dns ${TUNNEL_ID} ${HOSTNAME}
    cloudflared tunnel run ${TUNNEL_ID}

  Quick try (random trycloudflare.com URL, not a stable Hub endpoint):
    cloudflared tunnel --url ${LOCAL_URL}

  Hub attach after the named tunnel is up:
    seednode_attach mode=on-prem endpoint=https://${HOSTNAME} companyId=<existing> placeId=<opened place>
EOF
}

print_template

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[onprem] cloudflared not found — install it, then re-run with CLOUDFLARE_TUNNEL_ID set." >&2
  exit 1
fi

if [ "$TUNNEL_ID" = "REPLACE_TUNNEL_ID" ] || [ -z "$TUNNEL_ID" ]; then
  echo "[onprem] Set CLOUDFLARE_TUNNEL_ID to your named tunnel id (placeholder still in place)." >&2
  exit 1
fi

if [ -n "$CREDENTIALS" ]; then
  exec cloudflared tunnel --credentials-file "$CREDENTIALS" run "$TUNNEL_ID"
fi

exec cloudflared tunnel run "$TUNNEL_ID"
