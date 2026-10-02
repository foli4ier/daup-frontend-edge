# daup-frontend-edge

Owner hub for **app.daup.co.za** — set up the place, invite the floor.

This GitHub repository is the source for **Cloudflare Workers Builds**. The worker serves the Vite `dist/` folder as static assets (`daup-frontend-edge/wrangler.json`). Builds run on Cloudflare; do not commit `node_modules`.

Visual tokens live in [`daup-theme`](https://github.com/foli4ier/daup-theme) (`import "daup-theme/tokens.css"`).

**Licensing (A+B).** Place-first company / place, node entitlements, month-1 trial — see [`docs/license-pivot.md`](docs/license-pivot.md).

## House place session

Hub sign-in stays the email door. **You.** keeps the WhatsApp number in E.164 beside that email. Opening **Finance, Trade, Vault, Project, Property, or Eatery** asks for one code to that number, then the Kortrijk seed mints a place session and a one-time `houseRedeem`. The same session opens the other house apps until it expires. **Chat** stays off that path. Project and Eatery open `https://…/d/hub?emailHint&houseHint&placeIdHint&houseRedeem`.

| Env | Where | Value |
| --- | --- | --- |
| `VITE_HOUSE_SEED_URL` | Hub build (public) | Seed origin. Production `https://mcp.daup.co.za`. Falls back to `VITE_APP_MCP_URL`, then that same host. |
| `HOUSE_SEED_URL` | Ops name for the same origin | Not a Vite secret. Do not put a signing secret beside it. |
| `HOUSE_SESSION_SECRET` | Kortrijk seed only | Already set on the seed. Never a `VITE_` variable and never in this static bundle. |
| `SESSION_SECRET` | Not used by this Hub | App cookies are minted by each house app after redeem. If a future Worker mints a host-only Hub cookie, that secret stays a Worker secret. |

While WhatsApp send is off, the seed should return `mockCode` on `POST /house/otp/challenge` (the same digits as the stderr log). The Hub shows that code in a popup; the person still confirms it. Until mcp-servers sends `mockCode`, read the code from the seed log. See [`docs/house-sso.md`](docs/house-sso.md).

## Local

From the repo root:

```bash
npm run dev --prefix daup-frontend-edge
# or
cd daup-frontend-edge && npm install && npm run dev
```

## Deploy (Cloudflare Workers Builds)

**Git repository must be `foli4ier/daup-frontend-edge`** — not `foli4ier/daup` (Flutter PWA).

In **Workers & Pages → daup-frontend-edge → Settings → Builds**:

| Setting | Value |
|--------|--------|
| Git repository | `foli4ier/daup-frontend-edge` |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler versions upload` |

### Root directory

The app source lives in **`daup-frontend-edge/`**. Set **Root directory** to one of these (all supported):

| Root directory | When to use |
|--------------|-------------|
| `daup-frontend-edge` | **Recommended** — matches repo name and worker name |
| `app` | If you chose this because the subdomain is app.daup.co.za |
| *(empty)* | Also works — root `package.json` delegates into `daup-frontend-edge/` |

Do **not** use `dist` (build output), `app.daup.co.za` (that is the **custom domain**, not a folder), or `foli4ier/daup` as the connected repo.

### Custom domain

Attach **app.daup.co.za** to this Worker in the Cloudflare dashboard. `wrangler.json` includes the route:

```json
{ "pattern": "app.daup.co.za", "custom_domain": true }
```

### If you see `Failed: root directory not found`

1. Confirm **Git repository** is `foli4ier/daup-frontend-edge` (not the Flutter `daup` repo).
2. Set **Root directory** to `daup-frontend-edge` (or `app`, or empty).
3. Save and retry the build.
