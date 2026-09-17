# Company-node licensing (Hub slices A+B)

Hub source for **meters, trial start, and place-first registration**.

Product SoT: Ideation license-pivot README (locked 2026-09-17). This note is the in-repo pointer — do not fork meter codes or trial semantics here.

## Meters (ZAR v0 stubs)

You pay for the **company**, not for each app and not for each vaulted branch.

| Code | Stub (ex VAT) | Rule |
| --- | --- | --- |
| `NODE_SUB_MONTHLY` | R499 | Licensed node + enabled apps |
| `NODE_TRIAL` | R0 | First 30 days after `node.trial_started` |
| `LOCATION_MONTHLY` | R79 | Extra locations after the first |
| `SEED_HOSTED_MONTHLY` | R199 × `billable_locations` | Hosted seed only; on-prem is R0 |

Catalog: `daup-frontend-edge/src/hub/priceMeters.ts`. Invoices are slice G.

## Trial

Clock starts at **`node.trial_started`**: first successful **mint + hydrate** with a seednode attached (hosted stub counts) — not Gmail login, not a draft place. First 30 days R0. Idempotent per `companyId`.

After trial: payment stub OK → `active`; else `past_due` (read-only, 7 days) then `suspended` (no writes).

Service: `daup-frontend-edge/src/hub/entitlements.ts`.

## Place-first registration

Create the company / place, then enable apps (eatery is one selectable app). Hub mints `companyId` once and attaches the default hosted seed `{ endpoint: "https://mcp.daup.co.za", mode: "hosted", companyId }`. Never remint on re-login or seed switch.

## Later slices

- C: `seednode_status` Connected badge
- F: switch hosted ↔ on-prem without reminting
- G: billing lines / invoices
