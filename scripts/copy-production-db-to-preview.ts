import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type EnvLine = {
    key: string;
    value: string;
};

type PostgresConnection = {
    database: string;
    env: NodeJS.ProcessEnv;
    redactedUrl: string;
};

const defaultEnvFile = ".env";
const envFile = resolve(
    process.cwd(),
    process.argv.find(
        (arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1],
    ) ?? defaultEnvFile,
);

if (!existsSync(envFile)) {
    throw new Error(`Env file not found: ${envFile}`);
}

const envValues = parseEnvFile(readFileSync(envFile, "utf8"));
const productionDatabaseUrl = envValues.PRODUCTION_DATABASE_URL;
const previewDatabaseUrl = envValues.PREVIEW_DATABASE_URL;

if (!productionDatabaseUrl) {
    throw new Error(`PRODUCTION_DATABASE_URL is required in ${envFile}.`);
}

if (!previewDatabaseUrl) {
    throw new Error(`PREVIEW_DATABASE_URL is required in ${envFile}.`);
}

if (productionDatabaseUrl === previewDatabaseUrl) {
    throw new Error("PRODUCTION_DATABASE_URL and PREVIEW_DATABASE_URL must be different.");
}

const production = parsePostgresConnection(productionDatabaseUrl);
const preview = parsePostgresConnection(previewDatabaseUrl);
const tempDir = mkdtempSync(join(tmpdir(), "redirects-wizard-db-copy-"));
const dumpFile = join(tempDir, "production.dump");

try {
    console.log(`Dumping production database: ${production.redactedUrl}`);
    run(
        "pg_dump",
        ["--format=custom", "--no-owner", "--no-acl", "--file", dumpFile, production.database],
        production.env,
    );

    console.log(`Ensuring preview database exists: ${preview.redactedUrl}`);
    ensureDatabaseExists(preview);

    console.log(`Restoring dump into preview database: ${preview.redactedUrl}`);
    run(
        "pg_restore",
        [
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-acl",
            "--single-transaction",
            "--exit-on-error",
            "--dbname",
            preview.database,
            dumpFile,
        ],
        preview.env,
    );

    console.log("Copied production database to preview.");
} finally {
    rmSync(tempDir, { force: true, recursive: true });
}

function parseEnvFile(contents: string) {
    return Object.fromEntries(
        contents
            .split(/\r?\n/)
            .map(parseEnvLine)
            .filter((line): line is EnvLine => Boolean(line))
            .map(({ key, value }) => [key, value]),
    );
}

function parseEnvLine(line: string): EnvLine | undefined {
    const match = /^(?:\s*export\s+)?(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<raw>.*)$/.exec(line);

    if (!match?.groups) return undefined;

    const raw = match.groups.raw.trim();
    const quote = raw.startsWith('"') ? '"' : raw.startsWith("'") ? "'" : "";

    if (!quote) {
        return {
            key: match.groups.key,
            value: stripInlineComment(raw).trimEnd(),
        };
    }

    const closingQuoteIndex = findClosingQuote(raw, quote);

    if (closingQuoteIndex === -1) {
        throw new Error(`Unclosed quoted value for ${match.groups.key}.`);
    }

    return {
        key: match.groups.key,
        value: unescapeQuotedValue(raw.slice(1, closingQuoteIndex), quote),
    };
}

function stripInlineComment(value: string) {
    const commentIndex = value.search(/\s#/);

    if (commentIndex === -1) return value;

    return value.slice(0, commentIndex);
}

function findClosingQuote(value: string, quote: "'" | '"') {
    for (let index = 1; index < value.length; index += 1) {
        if (value[index] === quote && value[index - 1] !== "\\") {
            return index;
        }
    }

    return -1;
}

function unescapeQuotedValue(value: string, quote: "'" | '"') {
    return value.replaceAll(`\\${quote}`, quote);
}

function ensureDatabaseExists(connection: PostgresConnection) {
    const { exists, env } = getDatabaseExists(connection);

    if (exists) return;

    run(
        "psql",
        [
            "--quiet",
            "--set",
            "ON_ERROR_STOP=1",
            "--command",
            `CREATE DATABASE ${quotePostgresIdentifier(connection.database)}`,
        ],
        env,
    );
}

function getDatabaseExists(connection: PostgresConnection) {
    const errors: string[] = [];

    for (const database of ["postgres", "template1"]) {
        const env: NodeJS.ProcessEnv = {
            ...connection.env,
            PGDATABASE: database,
        };
        const result = spawnSync(
            "psql",
            [
                "--no-align",
                "--tuples-only",
                "--quiet",
                "--set",
                "ON_ERROR_STOP=1",
                "--command",
                `SELECT 1 FROM pg_database WHERE datname = ${quotePostgresLiteral(connection.database)};`,
            ],
            {
                env,
                encoding: "utf8",
            },
        );

        if (result.error) {
            throw result.error;
        }

        if (result.status === 0) {
            return {
                env,
                exists: result.stdout.trim() === "1",
            };
        }

        errors.push(
            `psql against ${database} exited with status ${result.status}: ${result.stderr.trim()}`,
        );
    }

    throw new Error(
        `Could not check whether database ${connection.database} exists.\n${errors.join("\n")}`,
    );
}

function quotePostgresIdentifier(identifier: string) {
    return `"${identifier.replaceAll('"', '""')}"`;
}

function quotePostgresLiteral(value: string) {
    return `'${value.replaceAll("'", "''")}'`;
}

function parsePostgresConnection(databaseUrl: string): PostgresConnection {
    const url = new URL(databaseUrl);

    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
        throw new Error(`Unsupported database URL protocol: ${url.protocol}`);
    }

    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

    if (!database) {
        throw new Error("Database URL must include a database name.");
    }

    const env: NodeJS.ProcessEnv = {
        ...process.env,
        PGDATABASE: database,
        PGHOST: url.hostname,
    };

    if (url.port) env.PGPORT = url.port;
    if (url.username) env.PGUSER = decodeURIComponent(url.username);
    if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);

    setOptionalLibpqEnv(env, url.searchParams, "application_name", "PGAPPNAME");
    setOptionalLibpqEnv(env, url.searchParams, "channel_binding", "PGCHANNELBINDING");
    setOptionalLibpqEnv(env, url.searchParams, "connect_timeout", "PGCONNECT_TIMEOUT");
    setOptionalLibpqEnv(env, url.searchParams, "options", "PGOPTIONS");
    setOptionalLibpqEnv(env, url.searchParams, "sslcert", "PGSSLCERT");
    setOptionalLibpqEnv(env, url.searchParams, "sslcrl", "PGSSLCRL");
    setOptionalLibpqEnv(env, url.searchParams, "sslkey", "PGSSLKEY");
    setOptionalLibpqEnv(env, url.searchParams, "sslmode", "PGSSLMODE");
    setOptionalLibpqEnv(env, url.searchParams, "sslrootcert", "PGSSLROOTCERT");
    setOptionalLibpqEnv(env, url.searchParams, "target_session_attrs", "PGTARGETSESSIONATTRS");

    return {
        database,
        env,
        redactedUrl: redactDatabaseUrl(url),
    };
}

function setOptionalLibpqEnv(
    env: NodeJS.ProcessEnv,
    searchParams: URLSearchParams,
    param: string,
    envKey: string,
) {
    const value = searchParams.get(param);

    if (value) env[envKey] = value;
}

function redactDatabaseUrl(url: URL) {
    const redacted = new URL(url);

    if (redacted.password) redacted.password = "REDACTED";

    return redacted.toString();
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
    const result = spawnSync(command, args, {
        env,
        stdio: "inherit",
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`${command} exited with status ${result.status}.`);
    }
}
