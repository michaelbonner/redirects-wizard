# Redirects Wizard

Redirects Wizard is a SvelteKit app for building and checking redirect rules — for Apache, nginx, Caddy, Netlify, Next.js, and Astro — during site migrations.

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

## CLI

`scripts/redirects.ts` exposes the same batch and URL operations as the app, for
scripting and for AI agents. It talks to Postgres directly — no dev server or
sign-in needed — reading connection strings from `.env`.

```sh
./scripts/redirects.ts batches           # or: bun run cli batches
./scripts/redirects.ts help              # full command and flag reference
```

| Command                         | Description                                              |
| ------------------------------- | -------------------------------------------------------- |
| `batches`                       | List batches with URL, unresolved, and untargeted counts |
| `batch <id>`                    | Show a batch and its URLs                                |
| `batch create <base-url>`       | Create a batch for a base URL                            |
| `batch set-base-url <id> <url>` | Point a batch at a different base URL                    |
| `batch check <id>`              | Re-request the batch's URLs and store their statuses     |
| `batch redirects <id>`          | Print generated redirect rules                           |
| `batch archive <id>`            | Archive (soft-delete) a batch                            |
| `urls add <batch-id> [url...]`  | Add production URLs; reads stdin when none are given     |
| `url <id>`                      | Show one URL with its redirect chain                     |
| `url set-target <id> [target]`  | Set the redirect target; omit it to clear                |
| `url check <id>`                | Re-request one URL and store the status                  |
| `url delete <id>`               | Delete (soft-delete) a URL                               |
| `users`                         | List accounts, for use with `--user`                     |

Useful flags: `--json` for machine-readable output, `--filter unresolved`,
`--format nginx`, `--limit`, `--no-check`, and `--concurrency`.

Batches are scoped to one account. With a single account in the database no flag
is needed; otherwise pass `--user <email>` or set `REDIRECTS_USER`.

`--db local` (the default), `--db preview`, and `--db production` select
`DATABASE_URL`, `PREVIEW_DATABASE_URL`, and `PRODUCTION_DATABASE_URL`
respectively. Reads work anywhere; commands that write to production also
require `--yes`.

Unlike the app, `batch create` does not capture a screenshot — use the
dashboard's refresh button for that.

A typical migration pass:

```sh
./scripts/redirects.ts batch create https://staging.example.com
cat old-urls.txt | ./scripts/redirects.ts urls add 12
./scripts/redirects.ts batch 12 --filter untargeted
./scripts/redirects.ts url set-target 480 /new-page
./scripts/redirects.ts batch redirects 12 --format nginx
./scripts/redirects.ts batch check 12 --filter unresolved
```

## Deploying

The app uses `@sveltejs/adapter-bun` for SvelteKit production builds. The
image is built in GitHub Actions and pushed to GHCR; Dokploy only pulls and
runs it. (The adapter was previously the archived `svelte-adapter-bun`.)

Build command (this is what the Dockerfile runs):

```sh
bun run build:bun
```

The official adapter calls Bun's own APIs while adapting the build, so the build
has to run under Bun. `build:bun` is `bun --bun vite build`, which re-invokes
Vite under Bun without recursing into the package's own `build` script.

Start command:

```sh
bun run start
```

Dokploy settings:

- Application port: `3000`
- Domain: `redirectswizard.com` (also served on `redirects.bootpack.dev`, which
  redirects to the canonical host)
- `HOST=0.0.0.0`
- `PORT=3000`
- `BETTER_AUTH_URL=https://redirectswizard.com`
- `BETTER_AUTH_SECRET=<random 32+ byte secret>`
- `DATABASE_URL=<postgres connection string>`
- `SCREENSHOTS_DIR=/data/screenshots`

There is deliberately no `ORIGIN` variable. The official adapter derives the
public HTTP origin from the incoming request's `Host` header, so the same image
serves production and every per-PR preview without a rebuild. SvelteKit's CSRF
check compares the request's `Origin` header against that same request-derived
origin, so form posts validate against the host the browser actually called.
`BETTER_AUTH_URL` is still required: Better Auth's base URL is fixed when the
auth object is initialised, so it cannot be inferred from the request later.

### Screenshots

Batch thumbnails are captured locally with Playwright driving headless
Chromium. The image installs a matching Chromium at build time, so no separate
screenshot service is required.

Captured images are written to `SCREENSHOTS_DIR`. Mount a **persistent volume**
at that path in Dokploy (e.g. `/data/screenshots`) so screenshots survive
redeploys. The container repairs ownership of that mounted directory at startup
and then runs the application as its unprivileged `bun` user. Screenshots are
(re)captured when a batch's base URL is set and via the refresh button on each
batch card.

Only the timestamp lives in Postgres — the image itself is a file on disk, so the
two can drift. Copying the production database (`bun db:copy-production-to-local`)
brings timestamps for batches whose images stay on the production volume, and a
redeploy without the volume mounted loses images the database still points at.
Drifted batches show the "No screenshot yet" placeholder; the refresh button
re-captures them.

For local development, install the browser once:

```sh
bunx playwright install chromium
```

## Building redirects

1. Create a batch from the dashboard.
1. Enter the base URL for the site being checked (dev, staging, or live).
1. Add known production URLs, one per line.
1. Set redirect targets for unresolved URLs.
1. Open "View redirects" to get redirect rules for Apache, nginx, Caddy, Netlify, Next.js, or Astro.
1. Recheck unresolved URLs after adding the rules to the server.
