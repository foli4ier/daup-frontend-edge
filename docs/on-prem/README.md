# On-prem seed setup (Hub mirror)

Product SoT: [`foli4ier/daup-mcp-servers` `onprem-pack/`](https://github.com/foli4ier/daup-mcp-servers/tree/main/onprem-pack) (v0, same as Kortrijk `start:home`).

Release tag `onprem-seed-v0` ships `daup-onprem-seed-v0.zip` (scripts, not a compiled `.exe`). That repo is private, so Hub does **not** send owners to GitHub. Hub serves a mirror:

**Door:** **Download seed setup.** → `/on-prem/daup-onprem-seed-v0.zip`  
**Mirror of:** `docs/on-prem/onprem-pack/` (start-house `.sh`/`.bat`, optional cloudflared `start-tunnel`, healthcheck, README)

## Health

`curl -sf $SEED_BASE/health` → `{"ok":true}`, then `seednode_status`.

- Local smoke: `http://127.0.0.1:8080`
- Production attach: `https://mcp.<customer-host>` (https required)

## Hub attach after stand-up

Hub persists (and must pass) the opened place’s house `placeId` — never remint `companyId`:

```json
{
  "mode": "on-prem",
  "endpoint": "https://mcp.<customer-host>",
  "ownerEmail": "<owner>",
  "companyId": "<existing-never-remint>",
  "placeId": "<opened-place-id>"
}
```

Local Hub stub endpoint is `http://127.0.0.1:8080` until a public https host is set.

## Stub vs live

| Live | Stub |
| --- | --- |
| Zip bytes Hub serves = v0 operator pack scripts | Connected badge / Check seed. polling (slice C) |
| Attach JSON shape with opened `placeId` | Customer tunnel hostname (owner fills cloudflared) |
| Meters R199 / R299 hosted / R0 on-prem | Manage billing. Coming. |
