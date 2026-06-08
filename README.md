# Redirects Wizard

Redirects Wizard is a SvelteKit app for building and checking Apache redirect rules during site migrations.

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

## Migrating from Laravel

Set both database URLs in `.env`:

```sh
LARAVEL_DATABASE_URL=mysql://user:password@host:3306/database
PRODUCTION_DATABASE_URL=postgres://user:password@host:5432/database
```

Run a dry-run first:

```sh
bun run db:migrate:laravel
```

Execute the migration after Drizzle migrations have been applied to the target Postgres database:

```sh
bun run db:migrate:laravel -- --execute
```

To clear existing Postgres `urls`, `batches`, and migrated Laravel users before importing:

```sh
bun run db:migrate:laravel -- --execute --reset
```

Laravel bcrypt password hashes are not compatible with Better Auth's default password hashing. Migrated users are preserved for ownership/history, but they need a password reset or a Laravel bcrypt verifier before they can sign in with their old passwords.

## Deploying

The app uses `svelte-adapter-bun` for SvelteKit production builds.
The included `nixpacks.toml` forces Nixpacks to start the Bun server instead of detecting the built assets as a Caddy static site.

Build command:

```sh
bun run build
```

Start command:

```sh
bun ./build/index.js
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

## Building redirects

1. Create a batch from the dashboard.
1. Enter the dev URL for the site being checked.
1. Add known production URLs, one per line.
1. Set redirect targets for unresolved URLs.
1. Open "View rewrites" to get Apache rewrite rules.
1. Recheck unresolved URLs after adding the rewrites to the server.
