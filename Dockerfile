# syntax=docker/dockerfile:1

# =====================================================================
# Production image for Redirects Wizard.
#
# Built in GitHub Actions (see .github/workflows/deploy.yml) and pushed to
# GHCR; Dokploy only pulls and runs it. Previously Dokploy built this on the
# production box with nixpacks, which pinned the CPU for the length of every
# `vite build` and made deploys compete with the live site for RAM.
#
# The build needs NO database and NO real secrets: this app reads everything
# private through `$env/dynamic/private` (process.env at container start) and
# has no `$env/static/public` values, so it takes no build args at all.
#
# Both stages resolve the same base through this one ARG so they cannot drift
# apart, and so there is a single place to pin. Override to pin an exact image:
#   docker build --build-arg BUN_IMAGE=oven/bun:1@sha256:<digest> .
# =====================================================================
ARG BUN_IMAGE=oven/bun:1

FROM ${BUN_IMAGE} AS build
WORKDIR /app

# Install dependencies first so this layer caches unless the lockfile moves.
# devDependencies are needed both for the build (vite, svelte, tailwind) and at
# runtime (drizzle-kit runs the migrations on start), so this is deliberately
# not a --production install.
#
# --ignore-scripts: nothing here needs a postinstall, and it also skips the root
# `prepare` (`lefthook install`, which has no git repo to install into here).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

# SvelteKit's build imports every server route once to read its page options, so
# any module doing work at import time has to be satisfiable. These placeholders
# are scoped to this RUN, so they never reach the image's ENV; the running
# container sees the real Dokploy values.
RUN DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET=build_time_placeholder_not_used_at_runtime \
    bun run build

# =====================================================================
# Runtime — stays on the same Bun base as the build stage so the native
# binaries resolved during install are still the right ones.
#
# The whole /app tree is carried over rather than just build/: SvelteKit
# externalizes dependencies from the server bundle, and `drizzle-kit migrate`
# needs drizzle/, drizzle.config.ts and the schema — with drizzle-kit itself
# being a devDependency.
# =====================================================================
FROM ${BUN_IMAGE} AS runtime
WORKDIR /app

# HOST/PORT are what svelte-adapter-bun's server reads to bind.
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# This app captures screenshots: src/lib/server/screenshots.ts launches
# Playwright's chromium. nixpacks supplied that browser as a nix package and
# pointed CHROMIUM_PATH at it from the start command, so dropping nixpacks means
# the image has to provide a browser itself or the first capture fails at
# runtime — with the app otherwise healthy, so nothing would surface it.
#
# Installed here rather than pinned to a browser image tag so it always matches
# the Playwright version bun.lock resolves. --with-deps pulls the shared
# libraries headless Chromium needs. CHROMIUM_PATH is deliberately left unset:
# with it empty, screenshots.ts passes executablePath: undefined and Playwright
# resolves the browser it just installed.
RUN apt-get update \
    && bunx playwright install --with-deps chromium \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*

# The base image ships an unprivileged `bun` user (uid/gid 1000) but still
# defaults to root. Copy the tree with that ownership and drop to it, so the
# server does not run as root inside the container. Ownership matters as well as
# the USER: bun writes into node_modules/.cache, and screenshots are written
# under SCREENSHOTS_DIR.
COPY --from=build --chown=bun:bun /app ./
RUN chown -R bun:bun /ms-playwright

# A mounted volume keeps its host-side ownership and hides any ownership set in
# the image. Start as root just long enough for the entrypoint to make the
# screenshot directory writable, then use gosu to run the server as `bun`.
RUN chmod +x /app/docker-entrypoint.sh
ENTRYPOINT ["/app/docker-entrypoint.sh"]

EXPOSE 3000

# Runtime config (DATABASE_URL, ORIGIN, BETTER_AUTH_*, SCREENSHOTS_DIR, ...) is
# injected by Dokploy as container env vars. SCREENSHOTS_DIR points at a Dokploy
# volume mount, which is unaffected by this change.
#
# Run pending migrations before the server accepts traffic. Drizzle records
# applied migrations in the database, so later starts only apply new files.
# If a migration fails, the command stops and the server does not start with a
# schema that is older than the application code.
CMD ["bun", "run", "start"]
