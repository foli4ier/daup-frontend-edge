#!/bin/sh
# Placeholder health check. Same local host as docs/house-mcp.md (Kortrijk / start-house).
set -eu
URL="${SEED_HEALTH_URL:-http://127.0.0.1:8080/health}"
if curl -sf "$URL" >/dev/null; then
  echo "Seed answered."
  exit 0
fi
echo "Seed is not answering yet. Start it on this premises, then try again."
exit 1
