#!/usr/bin/env bash
# On-prem pack: GET /health → ok/fail. Optional tools/call seednode_status.
set -u

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
if [ -f "$PACK_DIR/../package.json" ]; then
  load_dotenv "$PACK_DIR/../.env"
fi

PORT="${PORT:-8080}"
HEALTH_URL="http://127.0.0.1:${PORT}/health"
MCP_URL="http://127.0.0.1:${PORT}/mcp"

if ! command -v curl >/dev/null 2>&1; then
  echo "fail"
  echo "[onprem] curl is required for healthcheck" >&2
  exit 1
fi

if curl -sf "$HEALTH_URL" >/dev/null; then
  echo "ok"
  HEALTH_OK=1
else
  echo "fail"
  HEALTH_OK=0
fi

if [ -z "${COMPANY_ID:-}" ] && [ -z "${OWNER_EMAIL:-}" ]; then
  [ "$HEALTH_OK" -eq 1 ] && exit 0
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[onprem] skip seednode_status (node not found)" >&2
  [ "$HEALTH_OK" -eq 1 ] && exit 0
  exit 1
fi

PAYLOAD="$(
  COMPANY_ID="${COMPANY_ID:-}" OWNER_EMAIL="${OWNER_EMAIL:-}" node -e '
    const args = {};
    if (process.env.COMPANY_ID) args.companyId = process.env.COMPANY_ID;
    if (process.env.OWNER_EMAIL) args.ownerEmail = process.env.OWNER_EMAIL;
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "seednode_status", arguments: args }
    }));
  '
)"

STATUS_RAW="$(curl -s -H 'content-type: application/json' -d "$PAYLOAD" "$MCP_URL" 2>/dev/null || true)"
if [ -n "$STATUS_RAW" ]; then
  echo "$STATUS_RAW"
  CONNECTED="$(
    printf '%s' "$STATUS_RAW" | node -e '
      let raw = "";
      process.stdin.on("data", (c) => { raw += c; });
      process.stdin.on("end", () => {
        try {
          const rpc = JSON.parse(raw);
          const text = rpc?.result?.content?.[0]?.text;
          const status = text ? JSON.parse(text) : rpc;
          process.stdout.write(status && status.connected === true ? "true" : "false");
        } catch {
          process.stdout.write("false");
        }
      });
    '
  )"
  if [ "$CONNECTED" = "true" ]; then
    echo "seednode_status.connected=true"
  else
    echo "seednode_status.connected=false"
  fi
else
  echo "seednode_status.connected=false"
fi

[ "$HEALTH_OK" -eq 1 ] && exit 0
exit 1
