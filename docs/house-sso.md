# House place session (Hub PR3)

Kortrijk (`https://mcp.daup.co.za`) mints the place session. The Hub runs the code door and opens Finance, Trade, Vault, Project, and Property with a one-time `houseRedeem`. Chat is not on this path.

`HOUSE_SESSION_SECRET` is already set on Kortrijk. The Hub bundle does not contain it, and it must not be copied into `VITE_` env. This Hub does not mint an app cookie, so it does not use `SESSION_SECRET`. A later app cutover may use a per-app `SESSION_SECRET` as a Worker secret after redeem.

## Env

| Name | Role |
| --- | --- |
| `VITE_HOUSE_SEED_URL` | Seed origin baked into the Hub. Production `https://mcp.daup.co.za`. |
| `HOUSE_SEED_URL` | Same origin when you are talking about the Worker/ops config. Not read by Vite unless you also set the `VITE_` name. |
| `VITE_APP_MCP_URL` | Used when `VITE_HOUSE_SEED_URL` is unset (Hub strips a trailing `/mcp`). |

Local dev (`.env.development`) points the seed at `http://localhost:8080`.

## What Open does

1. Email door is unchanged (`localStorage` owner session).
2. **Open.** on Finance, Trade, Vault, Project, or Property calls `POST /house/otp/challenge` with `placeId` and the WhatsApp number, then `POST /house/session` with `challengeId`, `code`, `placeId`, and `phone`.
3. Fetches use `credentials: 'include'` so the seed can set host-only `daup_house_session` when the browser will store it. If the JSON body carries a bearer, the Hub sends it back as `Authorization` on `POST /house/session/redeem/issue`. That bearer is not put on the app URL.
4. The app opens with `houseRedeem` plus the existing hint params when email and house are known.

No `Domain=.daup.co.za` cookie. The Hub does not write the seed cookie itself.

## Open URL shapes

Hints stay `emailHint`, `houseHint`, `placeIdHint`. Proof is `houseRedeem` from the seed (`hr_…`). These are not query keys: `token`, `email`, `places`, `hubPlaces`, `role`, `daup1`.

| App | URL |
| --- | --- |
| Project | `https://project.daup.co.za/d/hub?emailHint&houseHint&placeIdHint&houseRedeem` |
| Finance | `https://finance.daup.co.za/?emailHint&houseHint&placeIdHint&houseRedeem` |
| Trade | `https://trade.daup.co.za/?…` |
| Vault | `https://vault.daup.co.za/?…` |
| Property | `https://property.daup.co.za/?…` |
| Chat | `https://chat.daup.co.za` with no query and no redeem |

Project keeps `/d/hub`. The other four stay on the app home so a pre-cutover app still loads. Static **Open.** hrefs do not contain `houseRedeem`; the id is issued on the click (about 60 seconds, single use).

## Reading the mock code

`POST /house/otp/challenge` returns `{ ok, challengeId, expiresAt }` only. The code is not in the JSON and not in a response header. With Meta send off, read the code for that `challengeId` from the Kortrijk seed log (the mock/test provider PR1 already runs). Type it into **Code.** on the Hub. Do not expect the Hub to display or invent it.

Unknown numbers still fail closed at session mint when the seed says so. A short number (under 8 digits) is rejected before the call.
