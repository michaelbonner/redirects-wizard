import { env } from "$env/dynamic/private";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db } from "$lib/server/db";
import * as schema from "$lib/server/schema";

if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required.");
}

if (!env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL is required.");
}

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
});
