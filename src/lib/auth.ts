import { building } from "$app/environment";
import { env } from "$env/dynamic/private";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db } from "$lib/server/db";
import * as schema from "$lib/server/schema";

function requiredEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL", fallback: string) {
    const value = env[name];
    if (!value && !building) {
        throw new Error(`${name} is required.`);
    }

    return value ?? fallback;
}

export const auth = betterAuth({
    baseURL: requiredEnv("BETTER_AUTH_URL", "http://localhost:3000"),
    secret: requiredEnv("BETTER_AUTH_SECRET", "build-time-placeholder-secret-with-enough-length"),
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
});
