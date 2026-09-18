# Place licensing (Hub slices A+B, P0/P1)

Hub source for **meters, trial start, and place-first registration**.

Product SoT: Ideation license-pivot README (locked 2026-09-17, place-billing amend). This note is the in-repo pointer — do not fork meter codes or trial semantics here.

## Meters (ZAR v0 stubs)

You pay for the **place**, not for each app and not for each vaulted branch. Extra branch = a new place.

| Code | Stub (ex VAT) | Rule |
| --- | --- | --- |
| `PLACE_SUB_MONTHLY` | R199 | This place + enabled apps |
| `PLACE_TRIAL` | R0 | First 30 days after `place.trial_started` |
| `SEED_HOSTED_MONTHLY` | R299 / place | Hosted seed only; on-prem shows R0 hosted line |
| `LOCATION_MONTHLY` | dead | Extra branch is a new place. Do not invoice. |

Catalog: `daup-frontend-edge/src/hub/priceMeters.ts`. Invoices are slice G.

## Id mapping (do not remint live places)

| A+B field | Place-billing field | Rule |
| --- | --- | --- |
| `companyId` (`co_*`) | `placeId` | Same value. Read both; write both. |
| `node.trial_started` | `place.trial_started` | Read both; new fires write `place.trial_started`. |
| `node_subscription_status` | `place_subscription_status` | Same enum. |
| `daup_node_entitlements` | same key | Live records stay put. |
| House MCP `placeId` (`place-*`) | unchanged | Network id. Not the licensed `co_*` id. |

## Trial

Clock starts at **`place.trial_started`**: first successful **mint + hydrate** with a seednode attached (hosted stub counts) — not Gmail login, not a draft place. First 30 days R0. Idempotent per licensed place id. Existing `node.trial_started` events count as already fired.

After trial: payment stub OK → `active`; else `past_due` (read-only, 7 days) then `suspended` (no writes).

Service: `daup-frontend-edge/src/hub/entitlements.ts`.

## Place-first registration

Create the company / place, then enable apps (eatery is one selectable app). Hub mints a licensed place id once per place and attaches the default hosted seed `{ endpoint: "https://mcp.daup.co.za", mode: "hosted", placeId }`. Opening a place is that place’s control plane (apps, then seed + subscription). Never remint on re-login, seed switch, or revisit. Owner may choose **Hosted.** (DAUP hosted endpoint stub) or **On this premises.** (hosted line R0; **Download seed setup.** is `https://github.com/foli4ier/daup-mcp-servers/releases/download/onprem-seed-v0/daup-onprem-seed-v0.zip` — scripts/zip v0, not an `.exe`). On-prem attach persists `{ mode, endpoint, ownerEmail, companyId, placeId }` with the opened place’s house id and never remints `companyId`. Local smoke `http://127.0.0.1:8080`; production https required. **Check seed.** polls `GET /health` then `seednode_status` (on-prem also `seednode_attach` first).

An owner may create more than one place. Each place has its own trial, invoice stub, and seed attach.

## Later slices

- C: **Check seed.** now polls `GET /health` + `seednode_status` (on-prem also `seednode_attach`). Connected. / Not connected yet. CORS to the owner’s `127.0.0.1` may still fail from Hub origin.
- F: migration verify, `house_state_get`
- G: billing lines / invoices
