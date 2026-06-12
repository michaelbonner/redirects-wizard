# Redirects Wizard

Redirects Wizard is a SvelteKit app for building and checking redirect rules — for Apache, nginx, Caddy, Netlify, and Next.js — during site migrations.

## Stack

- SvelteKit
- shadcn-svelte-style local components
- Tailwind CSS
- Postgres
- Drizzle ORM
- better-auth

## Getting started

1. Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET`.
1. Start Postgres:

    ```sh
    docker compose up -d
    ```

1. Install dependencies:

    ```sh
    bun install
    ```

1. Generate and run migrations:

    ```sh
    bun run db:generate
    bun run db:migrate
    ```

1. Start the app:

    ```sh
    bun run dev
    ```

## Deploying

The app uses `svelte-adapter-bun` for SvelteKit production builds.
The included `nixpacks.toml` forces Nixpacks to start the Bun server instead of detecting the built assets as a Caddy static site.

Build command:

```sh
bun run build
```

Start command (set in `nixpacks.toml`):

```sh
CHROMIUM_PATH=$(command -v chromium) bun ./build/index.js
```

Dokploy settings:

- Application port: `3000`
- Builder: Nixpacks
- Domain: `redirects.bootpack.work`
- `HOST=0.0.0.0`
- `PORT=3000`
- `ORIGIN=https://redirects.bootpack.work`
- `BETTER_AUTH_URL=https://redirects.bootpack.work`
- `BETTER_AUTH_SECRET=<random 32+ byte secret>`
- `DATABASE_URL=<postgres connection string>`
- `SCREENSHOTS_DIR=/data/screenshots`

### Screenshots

Batch thumbnails are captured locally with Playwright driving headless
Chromium. `nixpacks.toml` adds `chromium` to the build and points Playwright at
it via `CHROMIUM_PATH`, so no separate screenshot service is required.

Captured images are written to `SCREENSHOTS_DIR`. Mount a **persistent volume**
at that path in Dokploy (e.g. `/data/screenshots`) so screenshots survive
redeploys. Screenshots are (re)captured when a batch's base URL is set and via
the refresh button on each batch card.

For local development, install the browser once:

```sh
bunx playwright install chromium
```

## Building redirects

1. Create a batch from the dashboard.
1. Enter the base URL for the site being checked (dev, staging, or live).
1. Add known production URLs, one per line.
1. Set redirect targets for unresolved URLs.
1. Open "View redirects" to get redirect rules for Apache, nginx, Caddy, Netlify, or Next.js.
1. Recheck unresolved URLs after adding the rules to the server.
