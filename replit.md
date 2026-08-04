# DAVID V1 — DjamelBot

A Facebook Messenger bot engine with a web dashboard, built with Node.js/Express.

## Stack
- **Runtime:** Node.js 20
- **Server:** Express + Socket.io on port 5000
- **Database:** SQLite (`data/david.sqlite`)
- **Facebook API:** `@dongdev/fca-unofficial` (Djamel-fca v3.0)
- **AI:** `@anthropic-ai/sdk` (Claude)

## How to run
The workflow `Start application` runs `node index.js`, which is a watchdog that auto-restarts the bot engine (`David.js`).

Dashboard is accessible at port 5000. Default password: **`david2025`** (change in `config.json` → `dashboard.password`).

## First-time setup
The bot needs Facebook account cookies to connect to Messenger. Upload cookies from the dashboard after logging in — the bot logs `[LOGIN] لا توجد كوكيز — ارفعها من لوحة التحكم` until cookies are provided.

Optionally set email/password in `config.json` → `facebookAccount` to auto-login.

## Key files
- `index.js` — watchdog process (entry point)
- `David.js` — main bot engine
- `config.json` — all configuration (bot name, prefix, owner IDs, dashboard password, etc.)
- `app/` — dashboard frontend
- `src/` — bot commands and modules
- `scripts/fix-esm.js` — postinstall patch for ESM→CJS compatibility

## User preferences
- Keep the existing project structure and stack.
