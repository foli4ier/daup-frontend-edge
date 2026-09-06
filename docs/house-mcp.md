# Hub ↔ house MCP

Hub (`app.daup.co.za`) restores **Your places.** from the live house node — not browser `localStorage` alone.

## Endpoint

| | |
| --- | --- |
| Base URL | `VITE_APP_MCP_URL` if set, else `https://mcp.daup.co.za` |
| Path | `/mcp` |
| Method | `POST` JSON-RPC `2.0` `tools/call` |

Local Kortrijk / `daup-mcp-servers`: `VITE_APP_MCP_URL=http://localhost:8080` (Hub appends `/mcp`).

## Contract

`ownerEmail` is always the **signed-in Hub email** (normalized: trim + lowercase). Never a probe hardcode.

| Hub action | Tool | Arguments | Result (`content[0].text` JSON) |
| --- | --- | --- | --- |
| Sign-in restore Your places. | `places_list_by_email` | `{ ownerEmail }` | `{ email, places: [...] }` |
| Register a new house. | `places_register` | `{ ownerEmail, placeName, app, country, region, city }` | place record with `placeId` |
| Delete the house. | `places_unregister` | `{ placeId }` or `{ placeName, ownerEmail }` | removed |

`app` is `eatery` \| `farm` \| `reseller` \| `maker` (Hub mints Eatery today).

Client: `daup-frontend-edge/src/hub/houseMcp.ts`.

## Soft fail

If the house node is down, slow (>6s), or CORS-blocked:

- Sign-in still opens the hub on what’s already on this device
- Empty Your places. stays *No house on this hub yet.* plus *Couldn't reach your places. What's on this device is still here.*
- Register / Delete still update local Your places. Other browsers catch up when the node is back

No OAuth, passwords, or chain contracts in this wire.
