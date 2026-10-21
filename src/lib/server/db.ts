import { building } from "$app/env";
import { DATABASE_URL } from "$app/env/private";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let dbInstance: PostgresJsDatabase<typeof schema> | undefined;

function getDb() {
    if (!DATABASE_URL) {
        if (building) {
            return (dbInstance ??= drizzle(
                postgres("postgres://build:build@localhost:5432/build"),
                { schema },
            ));
        }

        throw new Error("DATABASE_URL is required.");
    }

    dbInstance ??= drizzle(postgres(DATABASE_URL), { schema });
    return dbInstance;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
    get(_target, property, receiver) {
        const value = Reflect.get(getDb(), property, receiver);
        return typeof value === "function" ? value.bind(getDb()) : value;
    },
});
