# daup-frontend-edge

Owner hub for **app.daup.co.za** — set up the house, invite the floor.

This GitHub repository is the source for **Cloudflare Workers Builds**. The worker serves the Vite `dist/` folder as static assets (`wrangler.json`). Builds run on Cloudflare; do not commit `node_modules`.

Visual tokens live in [`daup-theme`](https://github.com/foli4ier/daup-theme) (`import "daup-theme/tokens.css"`).

## Local

```bash
npm install
npm run dev
npm run build
```

## Deploy (Cloudflare Workers Builds)

Connect this repo in **Workers & Pages → your Worker → Settings → Builds**.

This repository is **not** a monorepo. `package.json` and `wrangler.json` live at the repo root.

| Setting | Value |
|--------|--------|
| Git repository | `foli4ier/daup-frontend-edge` |
| Production branch | `main` |
| **Root directory** | **leave empty** (recommended) **or** `daup-frontend-edge` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler versions upload` |

If your Worker already has **Root directory** set to `daup-frontend-edge`, leave it — this repo now includes a `daup-frontend-edge/` build entry that runs the root build and copies `dist/` for Wrangler.

### If you see `Failed: root directory not found`

Cloudflare is looking for a subdirectory that does not exist. Common misconfigurations:

- `dist` — that is the **build output**, not the project root
- `app`, `frontend`, `packages/...` — not used here
- `/` with a trailing path typo

Fix options:

1. **Recommended:** set **Root directory** to empty, save, retry build.
2. **Also works:** set **Root directory** to `daup-frontend-edge` (supported via the wrapper folder in this repo).

Do not put `dist` in the Root directory setting. Asset output is configured in `wrangler.json` as `"directory": "./dist"`.

### Custom domain

Attach **app.daup.co.za** to this Worker in the Cloudflare dashboard. `wrangler.json` includes the route definition for production deploys.
