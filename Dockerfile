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
    HOST=0.0.0.0

# The base image ships an unprivileged `bun` user (uid/gid 1000) but still
# defaults to root. Copy the tree with that ownership and drop to it, so neither
# the drizzle-kit migration nor the server runs as root inside the container.
# Ownership matters as well as the USER: bun writes into node_modules/.cache.
COPY --from=build --chown=bun:bun /app ./
USER bun

EXPOSE 3000

# Runtime config (DATABASE_URL, ORIGIN, BETTER_AUTH_*, SCREENSHOTS_DIR, ...) is
# injected by Dokploy as container env vars. SCREENSHOTS_DIR points at a Dokploy
# volume mount, which is unaffected by this change.
#
# `start` = `bun db:migrate && bun ./build/index.js`, exactly as before. A failed
# migration exits non-zero before the server binds, so the new container never
# becomes healthy and Dokploy keeps the previous one serving.
CMD ["bun", "run", "start"]
