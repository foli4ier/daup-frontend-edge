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
| Delete the house. | `house_state_delete` | `{ ownerEmail, placeId }` | house state gone |

**Log off.** wipes Hub local + session keys on this origin (vault, places cache, session). Next email sign-in calls `places_list_by_email` again.

`app` is `eatery` \| `farm` \| `reseller` \| `maker` (Hub mints Eatery today).

Client: `daup-frontend-edge/src/hub/houseMcp.ts`.

## Soft fail

If the house node is down, slow (>6s), or CORS-blocked:

- Sign-in still opens the hub on what’s already on this device
- Empty Your places. stays exactly **No house on this hub yet.**
- Register / Delete still update local Your places. Other browsers catch up when the node is back
- **Log off.** still returns to the email door if the node is down
- **Delete the house.** still clears local Hub place records if unregister / house_state_delete fail

No new door copy. No protocol words on Your places.

No OAuth, passwords, or chain contracts in this wire.

## UX lock

1. `places_register` only on **Register a new house.**
2. `places_list_by_email` only on email sign-in
3. Empty card copy is unchanged
4. Screenshots skipped when copy is unchanged
