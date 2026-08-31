# daup-frontend-edge

Owner hub for **app.daup.co.za** — set up the house, invite the floor.

This GitHub repository is the source for **Cloudflare Workers Builds**. The worker serves the Vite `dist/` folder as static assets (`daup-frontend-edge/wrangler.json`). Builds run on Cloudflare; do not commit `node_modules`.

Visual tokens live in [`daup-theme`](https://github.com/foli4ier/daup-theme) (`import "daup-theme/tokens.css"`).

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
