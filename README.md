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
| **Root directory** | **leave empty** (or `/`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler versions upload` |

### If you see `Failed: root directory not found`

Cloudflare is looking for a subdirectory that does not exist in this repo. Common misconfigurations:

- `daup-frontend-edge` — wrong for this standalone repo (use empty root)
- `dist` — that is the **build output**, not the project root
- `app`, `frontend`, `packages/...` — not used here

Fix: open **Settings → Builds → Root directory**, clear the field (or set `/`), save, and retry the build.

Asset output is configured in `wrangler.json` as `"directory": "./dist"`. Do not put `dist` in the Root directory setting.

### Custom domain

Attach **app.daup.co.za** to this Worker in the Cloudflare dashboard. `wrangler.json` includes the route definition for production deploys.
