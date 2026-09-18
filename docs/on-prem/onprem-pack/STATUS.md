# On-prem seednode status (v0)

**connected** = `GET /health` is ok **and** Hub `seednode_status.connected` is true.

## Operator (`/health`)

From this folder, with the house process running:

```bash
./healthcheck.sh
```

```bat
healthcheck.bat
```

`ok` means `curl -sf http://127.0.0.1:8080/health` received `{ "ok": true }`.

That is necessary but not sufficient for the Hub badge.

## Hub (`seednode_status`)

After `seednode_attach` with `mode=on-prem`, Hub polls `seednode_status` (`companyId` or `ownerEmail`).

`connected` is true only when **both** hold:

1. `GET {endpoint origin}/health` returns `{ "ok": true }`
2. An attach record with an endpoint is present for that company

If `COMPANY_ID` and/or `OWNER_EMAIL` are set, `healthcheck` also POSTs `tools/call` `seednode_status` to the local house node.

## Not connected

| Situation | Badge |
| --- | --- |
| House process down | disconnected (`/health` fail) |
| Tunnel down / public https unreachable | Hub `seednode_status.connected` false |
| Attach not yet run | no endpoint on the company record |
| Detach (clears endpoint/mode only) | disconnected; `companyId` row remains |

Re-attach with the **same** `companyId` and the `placeId` of the opened place. Places and house_state are not wiped.

## Contracts unchanged

`places_*`, `house_state_*`, and `seednode_*` names and JSON shapes are unchanged. This pack only starts `npm run start:home` on `:8080`.
