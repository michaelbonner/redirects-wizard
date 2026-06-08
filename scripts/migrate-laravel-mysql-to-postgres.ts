import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import postgres from "postgres";

type LaravelUser = {
    id: number;
    name: string;
    email: string;
    email_verified_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
};

type LaravelBatch = {
    id: number;
    user_id: number | null;
    dev_url: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
};

type LaravelUrl = {
    id: number;
    batch_id: number;
    url: string;
    redirect_to: string | null;
    http_response: string | object | null;
    addressed: number | boolean;
    deleted_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
};

const execute = process.argv.includes("--execute");
const dryRun = !execute || process.argv.includes("--dry-run");
const reset = process.argv.includes("--reset");

const laravelDatabaseUrl = process.env.LARAVEL_DATABASE_URL;
const productionDatabaseUrl = process.env.PRODUCTION_DATABASE_URL;

if (!laravelDatabaseUrl) {
    throw new Error("LARAVEL_DATABASE_URL is required.");
}

if (!productionDatabaseUrl) {
    throw new Error("PRODUCTION_DATABASE_URL is required.");
}

const mysqlConnection = await mysql.createConnection(laravelDatabaseUrl);
const pg = postgres(productionDatabaseUrl, { max: 1 });

function toDate(value: Date | string | null | undefined) {
    if (!value) return new Date();
    return value instanceof Date ? value : new Date(value);
}

function legacyUserId(id: number) {
    return `laravel-user-${id}`;
}

function legacyAccountId(userId: number) {
    return `laravel-account-${userId}`;
}

function unavailablePassword() {
    return `migrated-laravel-password:${randomBytes(32).toString("hex")}`;
}

async function upsertUser(
    tx: postgres.TransactionSql<Record<string, unknown>>,
    user: LaravelUser,
) {
    const id = legacyUserId(user.id);
    const createdAt = toDate(user.created_at);
    const updatedAt = toDate(user.updated_at);

    await tx`
    insert into "user" (
      id,
      name,
      email,
      email_verified,
      image,
      created_at,
      updated_at
    )
    values (
      ${id},
      ${user.name},
      ${user.email},
      ${Boolean(user.email_verified_at)},
      ${null},
      ${createdAt},
      ${updatedAt}
    )
    on conflict (id) do update set
      name = excluded.name,
      email = excluded.email,
      email_verified = excluded.email_verified,
      updated_at = excluded.updated_at
  `;

    await tx`
    insert into account (
      id,
      account_id,
      provider_id,
      user_id,
      password,
      created_at,
      updated_at
    )
    values (
      ${legacyAccountId(user.id)},
      ${legacyUserId(user.id)},
      ${"credential"},
      ${id},
      ${unavailablePassword()},
      ${createdAt},
      ${updatedAt}
    )
    on conflict (id) do update set
      user_id = excluded.user_id,
      updated_at = excluded.updated_at
  `;
}

function parseHttpResponse(value: LaravelUrl["http_response"]) {
    if (!value) return null;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return {
            url: "",
            status_code: "Legacy parse error",
            message: value,
            headers: {},
        };
    }
}

async function readLaravelTable<T>(table: string) {
    const [rows] = await mysqlConnection.query(`select * from \`${table}\``);
    return rows as T[];
}

async function assertPostgresSchema() {
    const requiredTables = ["user", "account", "batches", "urls"];
    const rows = await pg<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${pg(requiredTables)}
  `;
    const foundTables = new Set(rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter(
        (table) => !foundTables.has(table),
    );

    if (missingTables.length) {
        throw new Error(
            `PRODUCTION_DATABASE_URL is missing migrated tables: ${missingTables.join(
                ", ",
            )}. Run Drizzle migrations against the target database first.`,
        );
    }
}

async function migrate() {
    const users = await readLaravelTable<LaravelUser>("users");
    const batches = await readLaravelTable<LaravelBatch>("batches");
    const urls = await readLaravelTable<LaravelUrl>("urls");
    const knownUserIds = new Set(users.map((user) => user.id));

    console.log(
        `${dryRun ? "Dry run:" : "Migrating:"} ${users.length} users, ${batches.length} batches, ${urls.length} urls`,
    );

    if (dryRun) {
        console.log(
            "No writes performed. Pass --execute to write to Postgres.",
        );
        return;
    }

    await assertPostgresSchema();

    await pg.begin(async (tx) => {
        if (reset) {
            await tx`delete from urls`;
            await tx`delete from batches`;
            await tx`delete from account where provider_id = 'credential' and id like 'laravel-account-%'`;
            await tx`delete from "user" where id like 'laravel-user-%'`;
        }

        for (const user of users) {
            await upsertUser(tx, user);
        }

        for (const batch of batches) {
            const userId = batch.user_id ?? 1;
            if (knownUserIds.has(userId)) continue;

            knownUserIds.add(userId);
            await upsertUser(tx, {
                id: userId,
                name: `Legacy User ${userId}`,
                email: `legacy-user-${userId}@example.invalid`,
                email_verified_at: null,
                created_at: batch.created_at,
                updated_at: batch.updated_at,
            });
        }

        for (const batch of batches) {
            const legacyOwnerId = batch.user_id ?? 1;

            await tx`
        insert into batches (
          id,
          user_id,
          dev_url,
          created_at,
          updated_at,
          deleted_at
        )
        values (
          ${batch.id},
          ${legacyUserId(legacyOwnerId)},
          ${batch.dev_url ?? ""},
          ${toDate(batch.created_at)},
          ${toDate(batch.updated_at)},
          ${batch.deleted_at}
        )
        on conflict (id) do update set
          user_id = excluded.user_id,
          dev_url = excluded.dev_url,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at
      `;
        }

        for (const url of urls) {
            const httpResponse = parseHttpResponse(url.http_response);

            await tx`
        insert into urls (
          id,
          batch_id,
          url,
          redirect_to,
          http_response,
          addressed,
          deleted_at,
          created_at,
          updated_at
        )
        values (
          ${url.id},
          ${url.batch_id},
          ${url.url},
          ${url.redirect_to},
          ${httpResponse === null ? null : tx.json(httpResponse)},
          ${Boolean(url.addressed)},
          ${url.deleted_at},
          ${toDate(url.created_at)},
          ${toDate(url.updated_at)}
        )
        on conflict (id) do update set
          batch_id = excluded.batch_id,
          url = excluded.url,
          redirect_to = excluded.redirect_to,
          http_response = excluded.http_response,
          addressed = excluded.addressed,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at
      `;
        }

        await tx`select setval(pg_get_serial_sequence('batches', 'id'), coalesce((select max(id) from batches), 1), true)`;
        await tx`select setval(pg_get_serial_sequence('urls', 'id'), coalesce((select max(id) from urls), 1), true)`;
    });

    console.log("Migration complete.");
}

try {
    await migrate();
} finally {
    await mysqlConnection.end();
    await pg.end();
}
