# Seed setup (placeholder pack)

This zip is a **placeholder**. Hub serves it so you can download a real file today.

There is no live on-prem installer in this repo yet. Kortrijk / start-house talks to `http://127.0.0.1:8080` locally (`docs/house-mcp.md`). That host is the stub this pack checks.

## What is in here

- `start.sh` — skeleton start for a seed on this premises
- `health-check.sh` — curl the local health URL

Not a Windows `.exe`. Unpack on the machine that stays at the place.

## Next

1. Copy this folder onto that machine.
2. Run `./start.sh`
3. Run `./health-check.sh`
4. On Hub, keep **On this premises.** selected. Status stays *Status not checked yet.* until Check seed. is live.
