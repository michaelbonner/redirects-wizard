import { defineEnvVars } from "@sveltejs/kit/env";

/**
 * Explicit environment configuration for SvelteKit 3.
 *
 * Every value here is private (server-only) and read at runtime rather than
 * inlined at build time, so a container can be reconfigured by restarting it
 * without a rebuild. The build has to succeed without any of these set, so the
 * validators accept `undefined` and the call sites keep their existing
 * build-time placeholder / runtime error behaviour.
 */
export const variables = defineEnvVars({
    DATABASE_URL: {
        description: "Postgres connection string for the application database.",
        schema: (value) => value,
    },
    BETTER_AUTH_SECRET: {
        description: "Secret used to sign auth sessions and tokens.",
        schema: (value) => value,
    },
    BETTER_AUTH_URL: {
        description: "Public URL of this deployment, used as the auth base URL.",
        schema: (value) => value,
    },
    TELEGRAM_BOT_TOKEN: {
        description: "Bot token for sending contact notifications. Optional.",
        schema: (value) => value,
    },
    TELEGRAM_CHAT_ID: {
        description: "Chat id that receives contact notifications. Optional.",
        schema: (value) => value,
    },
    SCREENSHOTS_DIR: {
        description: "Directory that captured batch screenshots are written to.",
        schema: (value) => value,
    },
    CHROMIUM_PATH: {
        description: "Path to a Chromium binary for Playwright. Optional.",
        schema: (value) => value,
    },
});
