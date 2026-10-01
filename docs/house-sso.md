# House place session (Hub PR3)

Kortrijk (`https://mcp.daup.co.za`) mints the place session. The Hub runs the code door and opens Finance, Trade, Vault, Project, Property, and Eatery with a one-time `houseRedeem`. Chat is not on this path.

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
2. **Open.** on Finance, Trade, Vault, Project, Property, or Eatery calls `POST /house/otp/challenge` with `placeId` and the WhatsApp number, then `POST /house/session` with `challengeId`, `code`, `placeId`, and `phone`.
3. Fetches use `credentials: 'include'` so the seed can set host-only `daup_house_session` when the browser will store it. If the JSON body carries a bearer, the Hub sends it back as `Authorization` on `POST /house/session/redeem/issue`. That bearer is not put on the app URL.
4. The app opens with `houseRedeem` plus the existing hint params when email and house are known.

No `Domain=.daup.co.za` cookie. The Hub does not write the seed cookie itself.

## Profile WhatsApp is the one number

**You.** shows the email and, beside it, the WhatsApp number. That number is stored on the Hub profile as E.164 (`profile.demographics.whatsappNumber`, for example `+27829261373`). A local `082…` form is the same key. It is not a second phone: it is the `phone` already sent on `POST /house/otp/challenge` and `POST /house/session`, and the `otpPhone` remembered for a mock challenge.

One code to that number mints one place session. While that session is still held and the seed is not returning `mockCode`, **Open.** on Finance, Trade, Vault, Project, Property, and Eatery redeems `houseRedeem` without a second code. Every challenge uses the profile number, so the house apps are tied to it. Chat stays off this path.

Changing the number on **You.** drops the held session. The next **Open.** texts the new number. Clearing the house keeps the email and the WhatsApp number.

Soft-test place: Kortrijk (`https://mcp.daup.co.za`), Frans `+27829261373`, place id `80a48803-e2fb-492c-8fe3-431e22a1e2cb`. While WhatsApp delivery is off, each **Open.** still asks for the mock code, always for this same number.

## Open URL shapes

Hints stay `emailHint`, `houseHint`, `placeIdHint`. Proof is `houseRedeem` from the seed (`hr_…`). These are not query keys: `token`, `email`, `places`, `hubPlaces`, `role`, `daup1`.

| App | URL |
| --- | --- |
| Project | `https://project.daup.co.za/d/hub?emailHint&houseHint&placeIdHint&houseRedeem` |
| Eatery | `https://eatery.daup.co.za/d/hub?emailHint&houseHint&placeIdHint&houseRedeem` |
| Finance | `https://finance.daup.co.za/?emailHint&houseHint&placeIdHint&houseRedeem` |
| Trade | `https://trade.daup.co.za/?…` |
| Vault | `https://vault.daup.co.za/?…` |
| Property | `https://property.daup.co.za/?…` |
| Chat | `https://chat.daup.co.za` with no query and no redeem |

Project and Eatery keep `/d/hub`. Finance, Trade, Vault, and Property stay on the app home so a pre-cutover app still loads. Static **Open.** hrefs do not contain `houseRedeem`; the id is issued on the click (about 60 seconds, single use).

## Reading the mock code

While WhatsApp delivery is off, Kortrijk still logs `[house-otp] mock code challengeId=… code=…` to stderr. The Hub does not invent a code.

When mock mode is on, `POST /house/otp/challenge` should also return the same digits as `mockCode` (string). The Hub then shows that code in a popup after **Send a code.** The person still types it, or taps **Use this code.**, and then **Open.**

```json
{
  "ok": true,
  "challengeId": "ch_…",
  "expiresAt": 1790741320790,
  "mockCode": "482913"
}
```

Omit `mockCode` entirely once WhatsApp sends the text. Do not send `null`. The Hub also accepts `mock_code`, but the seed field to add is `mockCode`.

Probed live on 30 Sep 2026: the challenge body is still `{ ok, challengeId, expiresAt }` only, so the popup stays hidden until mcp-servers returns `mockCode`.

Unknown numbers still fail closed at session mint when the seed says so. A short number (under 8 digits) is rejected before the call.

## Why Open showed "We could not open that just now."

That sentence is the Hub's generic failure. It is what you see when mint or redeem does not produce a usable bearer, including HTTP 401 `place session required` / `place session is not valid` from `POST /house/session/redeem/issue`.

Checked against the live seed and this client:

- CORS from `https://app.daup.co.za` already allows credentialed `POST` with `Authorization`. The cookie stays host-only `SameSite=Lax`. The Hub does not set `Domain`.
- Mint already sends `placeId`, `phone`, `challengeId`, and `code`. A body without `placeId` is `400 {"error":"placeId is required"}` on the seed.
- A success JSON `message` (for example "Place session ready") used to abort the client before it read `placeSession` or `houseRedeem`. Redeem then never saw `Authorization`, or the success redeem was thrown away.
- The bearer is read from `placeSession`, `place_session`, `session`, `daup_house_session`, or `token` (including one object wrap), and from the CORS-exposed `Mcp-Session-Id` header when the JSON has no bearer string. It is sent as `Authorization: Bearer` on redeem issue. It is not put on the app URL.
- The place id sent on mint prefers the house UUID over `companyId`. The soft-test place is `80a48803-e2fb-492c-8fe3-431e22a1e2cb`.
