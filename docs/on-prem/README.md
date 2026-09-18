# On-prem seed setup

Product SoT: [`foli4ier/daup-mcp-servers` `onprem-pack/`](https://github.com/foli4ier/daup-mcp-servers/tree/main/onprem-pack) (v0, same as Kortrijk `start:home`).

**Door:** **Download seed setup.** → [daup-onprem-seed-v0.zip](https://github.com/foli4ier/daup-mcp-servers/releases/download/onprem-seed-v0/daup-onprem-seed-v0.zip)  
Release: [onprem-seed-v0](https://github.com/foli4ier/daup-mcp-servers/releases/tag/onprem-seed-v0)  
Prefer **zip** over tgz. Scripts/zip v0 — not a compiled `.exe`.

Hub also ships a same-origin copy at `/on-prem/daup-onprem-seed-v0.zip` (`docs/on-prem/onprem-pack/`) if the GitHub asset is unreachable.

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

**Check seed.** POSTs `seednode_attach` (on-prem) then polls `seednode_status`. Kitchen: **Connected.** or **Not connected yet.**

Local Hub stub endpoint is `http://127.0.0.1:8080` until a public https host is set.

## Stub vs live

| Live | Stub |
| --- | --- |
| Download door = GitHub `onprem-seed-v0` zip | GitHub asset 404s for anonymous clients while the pack repo is private — Hub copy still at `/on-prem/daup-onprem-seed-v0.zip` |
| Attach JSON with opened `placeId`; Check seed. poll | Customer tunnel hostname (owner fills cloudflared) |
| Meters R199 / R299 hosted / R0 on-prem | Manage billing. Coming. |
