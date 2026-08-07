import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/lib/server/schema";
import { batches, urls, user } from "../../src/lib/server/schema";

export type DbTarget = "local" | "preview" | "production";

export type Database = PostgresJsDatabase<typeof schema>;

export type User = {
    id: string;
    name: string;
    email: string;
};

/** An expected failure: reported as a plain message instead of a stack trace. */
export class CliError extends Error {
    exitCode: number;

    constructor(message: string, exitCode = 1) {
        super(message);
        this.name = "CliError";
        this.exitCode = exitCode;
    }
}

const databaseUrlEnvVar = {
    local: "DATABASE_URL",
    preview: "PREVIEW_DATABASE_URL",
    production: "PRODUCTION_DATABASE_URL",
} as const satisfies Record<DbTarget, string>;

export function parseDbTarget(value: string): DbTarget {
    if (value in databaseUrlEnvVar) return value as DbTarget;
    throw new CliError(
        `Unknown --db target "${value}". Expected local, preview, or production.`,
        2,
    );
}

export type Context = {
    db: Database;
    /** Where the data lives, so commands can warn about production writes. */
    target: DbTarget;
    json: boolean;
    /** Resolves (and caches) the user whose batches the command operates on. */
    requireUser: () => Promise<User>;
    /** Refuses a mutating command against production unless --yes was passed. */
    requireWritable: (description: string) => void;
    close: () => Promise<void>;
};

export type ContextOptions = {
    target: DbTarget;
    json: boolean;
    /** Email of the user to operate as. Falls back to REDIRECTS_USER. */
    userEmail?: string;
    confirmed: boolean;
};

export function createContext(options: ContextOptions): Context {
    const envVar = databaseUrlEnvVar[options.target];
    const databaseUrl = process.env[envVar];

    if (!databaseUrl) {
        throw new CliError(`${envVar} is not set — add it to .env to use --db ${options.target}.`);
    }

    const client = postgres(databaseUrl, { max: 4, onnotice: () => {} });
    const db = drizzle(client, { schema });
    let cachedUser: Promise<User> | undefined;

    return {
        db,
        target: options.target,
        json: options.json,
        requireUser: () =>
            (cachedUser ??= resolveUser(db, options.userEmail ?? process.env.REDIRECTS_USER)),
        requireWritable: (description) => {
            if (options.target === "production" && !options.confirmed) {
                throw new CliError(`Refusing to ${description} in production without --yes.`, 2);
            }
        },
        close: () => client.end({ timeout: 5 }),
    };
}

async function resolveUser(db: Database, email?: string): Promise<User> {
    const columns = { id: true, name: true, email: true } as const;

    if (email) {
        const match = await db.query.user.findFirst({
            columns,
            where: eq(user.email, email),
        });

        if (!match) throw new CliError(`No user with email "${email}".`);
        return match;
    }

    // With a single account there is nothing to disambiguate, which keeps the
    // common case flag-free.
    const accounts = await db.query.user.findMany({ columns, limit: 2 });

    if (!accounts.length) throw new CliError("No users exist in this database.");
    if (accounts.length > 1) {
        throw new CliError(
            "Multiple users exist — pass --user <email> or set REDIRECTS_USER. Run `users` to list them.",
        );
    }

    return accounts[0];
}

export type Batch = typeof batches.$inferSelect;
export type Url = typeof urls.$inferSelect;

export async function getOwnedBatch(context: Context, batchId: number): Promise<Batch> {
    const owner = await context.requireUser();
    const batch = await context.db.query.batches.findFirst({
        where: and(
            eq(batches.id, batchId),
            eq(batches.userId, owner.id),
            isNull(batches.deletedAt),
        ),
    });

    if (!batch) throw new CliError(`No batch ${batchId} for ${owner.email}.`);
    return batch;
}

export async function getOwnedUrl(
    context: Context,
    urlId: number,
): Promise<{ url: Url; batch: Batch }> {
    const owner = await context.requireUser();
    const [row] = await context.db
        .select({ url: urls, batch: batches })
        .from(urls)
        .innerJoin(batches, eq(urls.batchId, batches.id))
        .where(
            and(
                eq(urls.id, urlId),
                eq(batches.userId, owner.id),
                isNull(urls.deletedAt),
                isNull(batches.deletedAt),
            ),
        )
        .limit(1);

    if (!row) throw new CliError(`No URL ${urlId} for ${owner.email}.`);
    return row;
}
