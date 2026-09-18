# On-prem seednode operator pack (v0)

Hub download path: **`onprem-pack/`**

This is the operator door Hub links for **“On this premises”** seed mode. It starts the existing Kortrijk house node (`npm run start:home` → HTTP `:8080`). It is **not** a second runtime. Places, house_state, and seednode MCP contracts stay as they are.

`companyId` is an existing company id. Hub never mints a new one from this pack.

## Prerequisites

- **Node 20+**
- This pack at `onprem-pack/` inside a **built** `daup-mcp-servers` checkout (`npm install` + `npm run build`), **or** sitting next to that built checkout
- Optional: [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) for a public `https` URL

## Steps

### 1. Unzip / clone

Clone or unzip `daup-mcp-servers` so this folder is:

```text
daup-mcp-servers/onprem-pack/     ← Hub download path
```

If you received only this pack, place it next to a built `daup-mcp-servers` directory. `start-house` looks at `../` first, then a sibling `daup-mcp-servers/`.

```bash
cd daup-mcp-servers
npm install
npm run build
```

### 2. Copy `.env.example` → `.env`

From this folder:

```bash
cp .env.example .env
```

Windows:

```bat
copy .env.example .env
```

Set:

| Variable | v0 value |
| --- | --- |
| `PORT` | `8080` |
| `HOST` | `0.0.0.0` |
| `DAUP_DATA_DIR` | **absolute** durable path (not the repo, not a temp folder) |

Leave `DATABASE_URL` unset. Postgres is parked for this pack; the house node uses LevelDB at `DAUP_DATA_DIR`.

Unix example: `/home/you/daup/daup-mcp-data`  
Windows example: `C:\Users\you\daup\daup-mcp-data`

### 3. Run start-house

Unix:

```bash
./start-house.sh
```

Windows:

```bat
start-house.bat
```

The script ensures `DAUP_DATA_DIR` is an absolute path, then runs `npm run start:home` from the repo root (`../`). Expect a bind on `http://0.0.0.0:8080`.

Leave this process running.

### 4. Optional: start-tunnel (Cloudflare) for public https

Local-only Hub attach can use `http://127.0.0.1:8080` (http is allowed only for localhost). Remote Hub needs **https**.

Unix:

```bash
./start-tunnel.sh
```

Windows:

```bat
start-tunnel.bat
```

This is a **template**. It does not ship a real tunnel id or credentials. Replace the placeholders (`REPLACE_TUNNEL_ID`, hostname `mcp.example.com`) so the named tunnel forwards to `http://127.0.0.1:8080`. Then use `https://mcp.example.com` (your hostname) as the Hub endpoint.

### 5. Healthcheck

Unix:

```bash
./healthcheck.sh
```

Windows:

```bat
healthcheck.bat
```

Prints `ok` or `fail` from `GET http://127.0.0.1:8080/health`. If `COMPANY_ID` and/or `OWNER_EMAIL` are set in the environment (or `.env`), it also POSTs `tools/call` `seednode_status`.

See [STATUS.md](STATUS.md) for what **connected** means.

### 6. Hub: attach on-prem

In Hub, for **“On this premises”**, call `seednode_attach` with:

| Field | Value |
| --- | --- |
| `mode` | `on-prem` |
| `endpoint` | `https://…` (public tunnel) or `http://127.0.0.1:8080` (local only) |
| `companyId` | **existing** company id |
| `placeId` | the **opened place** |

Hub supplies `ownerEmail` of the signed-in owner (lookup key only).

Example (operator / debug; Hub does this in-app):

```bash
curl -s http://127.0.0.1:8080/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"seednode_attach","arguments":{"ownerEmail":"owner@example.com","mode":"on-prem","endpoint":"https://mcp.example.com","companyId":"<existing-company-id>","placeId":"<opened-place-id>"}}}'
```

Hub then polls `seednode_status` for the connected badge.

## Multi-place

One `companyId` per owner company. Hub passes the `placeId` of the **currently opened place**. `companyId` is never reminted. Places and house_state stay on their existing tools (`places_*`, `house_state_*`).

## What this pack does not do

- No parallel seednode / MCP runtime
- No new places / house_state / seednode contracts
- No real Cloudflare (or other) secrets — fill those on the machine
- `DATABASE_URL` / Postgres is parked; v0 is LevelDB at `DAUP_DATA_DIR`
