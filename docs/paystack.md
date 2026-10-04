# Paystack for a place subscription

Paystack (South Africa, ZAR) is the only payment door for a place. The hub does not show a bank account number.

Prices stay locked: place R199 a month, hosted seed R299 a month, both R498 a month. Annual is 10% off twelve months of the chosen option.

## Environment

Names only. Do not commit a key.

| Name | Where |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Worker secret. Initialize, verify, and the webhook signature all use it. Never prefix it with `VITE_`. |
| `PAYSTACK_PUBLIC_KEY` | Optional. Checkout uses the authorization URL from initialize, so the hub does not need the public key. |

Set the secret on Cloudflare with `wrangler secret put PAYSTACK_SECRET_KEY` from `daup-frontend-edge`. For a local Worker, put the same name in `daup-frontend-edge/.dev.vars` (gitignored). Vite dev reads `PAYSTACK_SECRET_KEY` from the environment for `/api/paystack/*`.

On the Paystack dashboard, enable card, Ozow (EFT), and Capitec Pay. Checkout does not send a `channels` list or a plan code, so those dashboard methods stay available. Ozow and Capitec Pay are once-off charges. The amount is the locked period total in ZAR cents, computed on the server.

## What marks a place paid

Opening checkout does not. The browser keeps the place in `daup_node_entitlements`. `payment_method_ok` becomes true only after `GET /api/paystack/confirm` verifies a successful charge, an active or non-renewing subscription, or a paid invoice, for the locked ZAR amount.

A one-off charge covers `paid_until` (paid time plus the monthly or annual period). After that, or when Paystack reports a failed charge, a failed invoice, or a subscription in attention, cancelled, or completed, the place shows payment due. A pending charge does not clear an earlier confirmation. A legacy record with no Paystack reference is left as stored.

`POST /api/paystack/webhook` checks `x-paystack-signature` (HMAC SHA512 of the raw body) and answers 200. It cannot write the browser store, so it does not entitle the place. The hub confirms when the owner returns from checkout, and again when My places opens a place that already has a Paystack reference.
