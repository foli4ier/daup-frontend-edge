#!/usr/bin/env bash
# On-prem pack: start the existing Kortrijk house node (npm run start:home → :8080).
# Assumes this file lives at daup-mcp-servers/onprem-pack/start-house.sh
set -euo pipefail

PACK_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=onprem-lib.sh
# inline helpers (keep the pack as a flat folder of operator scripts)

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

require_node20() {
  if ! command -v node >/dev/null 2>&1; then
    echo "[onprem] Node 20+ is required (node not found)" >&2
    exit 1
  fi
  local major
  major="$(node -e "process.stdout.write(String(parseInt(process.versions.node, 10)))")"
  if [ "$major" -lt 20 ]; then
    echo "[onprem] Node 20+ is required (found $(node -v))" >&2
    exit 1
  fi
}

find_repo_root() {
  local parent sibling nested
  parent="$(cd "$PACK_DIR/.." && pwd)"
  if [ -f "$parent/package.json" ] && grep -q '"start:home"' "$parent/package.json" 2>/dev/null; then
    printf '%s\n' "$parent"
    return 0
  fi
  sibling="$(cd "$PACK_DIR/.." && pwd)/daup-mcp-servers"
  if [ -f "$sibling/package.json" ] && grep -q '"start:home"' "$sibling/package.json" 2>/dev/null; then
    printf '%s\n' "$sibling"
    return 0
  fi
  nested="$PACK_DIR/daup-mcp-servers"
  if [ -f "$nested/package.json" ] && grep -q '"start:home"' "$nested/package.json" 2>/dev/null; then
    printf '%s\n' "$nested"
    return 0
  fi
  echo "[onprem] Could not find daup-mcp-servers (npm run start:home)." >&2
  echo "[onprem] Put this pack at onprem-pack/ inside the repo, or next to a built checkout." >&2
  exit 1
}

absolutize_data_dir() {
  node -e '
    const path = require("node:path");
    const os = require("node:os");
    const raw = (process.env.DAUP_DATA_DIR || "").trim();
    const fallback = path.resolve(os.homedir(), "daup", "daup-mcp-data");
    const resolved = path.resolve(raw || fallback);
    if (!path.isAbsolute(resolved)) {
      console.error("[onprem] DAUP_DATA_DIR must be an absolute path");
      process.exit(1);
    }
    process.stdout.write(resolved);
  '
}

require_node20
load_dotenv "$PACK_DIR/.env"

REPO_ROOT="$(find_repo_root)"
load_dotenv "$REPO_ROOT/.env"

export PORT="${PORT:-8080}"
export HOST="${HOST:-0.0.0.0}"
export DAUP_DATA_DIR="$(absolutize_data_dir)"

if [ ! -f "$REPO_ROOT/dist/src/http/main.js" ]; then
  echo "[onprem] missing dist/src/http/main.js — run npm run build in $REPO_ROOT first" >&2
  exit 1
fi

echo "[onprem] pack: $PACK_DIR"
echo "[onprem] repo: $REPO_ROOT"
echo "[onprem] bind http://${HOST}:${PORT} (npm run start:home)"
echo "[onprem] DAUP_DATA_DIR=$DAUP_DATA_DIR"
echo "[onprem] DATABASE_URL parked for this pack (LevelDB at DAUP_DATA_DIR)"

cd "$REPO_ROOT"
exec npm run start:home
