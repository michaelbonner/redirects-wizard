#!/usr/bin/env bun
import {
    archiveBatch,
    batchRedirects,
    checkBatch,
    createBatch,
    listBatches,
    listUsers,
    parseUrlFilter,
    setBaseUrl,
    showBatch,
} from "./cli/batches";
import { CliError, createContext, parseDbTarget } from "./cli/context";
import type { Context } from "./cli/context";
import { print } from "./cli/output";
import { addUrls, checkSingleUrl, deleteUrl, setUrlTarget, showUrl } from "./cli/urls";

const usage = `redirects — inspect and edit Redirects Wizard data from the command line.

Usage
  ./scripts/redirects.ts <command> [arguments] [flags]

Batches
  batches                          List batches with URL and unresolved counts
  batch <id>                       Show a batch and its URLs
  batch create <base-url>          Create a batch for a base URL
  batch set-base-url <id> <url>    Point a batch at a different base URL
  batch check <id>                 Re-request the batch's URLs and store statuses
  batch redirects <id>             Print generated redirect rules
  batch archive <id>               Archive (soft-delete) a batch

URLs
  urls add <batch-id> [url...]     Add production URLs; reads stdin when none are given
  url <id>                         Show one URL with its redirect chain
  url set-target <id> [target]     Set the redirect target; omit it to clear
  url check <id>                   Re-request one URL and store the status
  url delete <id>                  Delete (soft-delete) a URL

Other
  users                            List accounts, for use with --user
  help                             Show this message

Flags
  --json                 Emit JSON instead of tables
  --user <email>         Account to act as (default: REDIRECTS_USER, or the only account)
  --db <target>          local (default), preview, or production
  --yes                  Allow a mutating command to run against --db production
  --filter <name>        all (default), unresolved, resolved, or untargeted
                         Applies to \`batch <id>\` and \`batch check\`
  --limit <n>            Cap the URLs listed by \`batch <id>\`
  --format <id>          apache (default), nginx, caddy, netlify, next-js, astro, or all
  --no-check             Skip the HTTP check when adding URLs
  --concurrency <n>      Parallel HTTP checks (default 6)

Notes
  Connection strings come from .env (DATABASE_URL, PREVIEW_DATABASE_URL,
  PRODUCTION_DATABASE_URL). Unlike the web app, \`batch create\` does not
  capture a screenshot.

Examples
  ./scripts/redirects.ts batches
  ./scripts/redirects.ts batch 12 --filter untargeted
  pbpaste | ./scripts/redirects.ts urls add 12
  ./scripts/redirects.ts url set-target 480 /new-page
  ./scripts/redirects.ts batch check 12 --filter unresolved
  ./scripts/redirects.ts batch redirects 12 --format nginx`;

const booleanFlags = new Set(["json", "yes", "no-check", "help"]);
const valueFlags = new Set(["user", "db", "filter", "limit", "format", "concurrency"]);

type Flags = Record<string, string | boolean | undefined>;

const commonFlags = ["json", "user", "db"] as const;

type CommandUsage = {
    minArgs: number;
    maxArgs?: number;
    flags?: readonly string[];
};

const commandUsage = {
    batches: { minArgs: 0, maxArgs: 0 },
    users: { minArgs: 0, maxArgs: 0 },
    "batch show": { minArgs: 1, maxArgs: 1, flags: ["filter", "limit"] },
    "batch create": { minArgs: 1, maxArgs: 1, flags: ["yes"] },
    "batch set-base-url": { minArgs: 2, maxArgs: 2, flags: ["yes"] },
    "batch check": { minArgs: 1, maxArgs: 1, flags: ["yes", "filter", "concurrency"] },
    "batch redirects": { minArgs: 1, maxArgs: 1, flags: ["format"] },
    "batch archive": { minArgs: 1, maxArgs: 1, flags: ["yes"] },
    "urls add": { minArgs: 1, flags: ["yes", "no-check", "concurrency"] },
    "url show": { minArgs: 1, maxArgs: 1 },
    "url set-target": { minArgs: 1, maxArgs: 2, flags: ["yes"] },
    "url check": { minArgs: 1, maxArgs: 1, flags: ["yes"] },
    "url delete": { minArgs: 1, maxArgs: 1, flags: ["yes"] },
} as const satisfies Record<string, CommandUsage>;

function parseArgv(argv: string[]) {
    const positional: string[] = [];
    const flags: Flags = {};

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === "--") {
            positional.push(...argv.slice(index + 1));
            break;
        }

        if (!arg.startsWith("--")) {
            positional.push(arg);
            continue;
        }

        const separator = arg.indexOf("=");
        const name = separator === -1 ? arg.slice(2) : arg.slice(2, separator);
        const inlineValue = separator === -1 ? undefined : arg.slice(separator + 1);

        if (booleanFlags.has(name)) {
            if (inlineValue !== undefined) {
                throw new CliError(`--${name} does not take a value.`, 2);
            }
            flags[name] = true;
            continue;
        }

        if (!valueFlags.has(name)) {
            throw new CliError(`Unknown flag --${name}. Run \`help\` for the flag list.`, 2);
        }

        const value = inlineValue ?? argv[++index];
        if (value === undefined) throw new CliError(`--${name} needs a value.`, 2);
        flags[name] = value;
    }

    return { positional, flags };
}

function invocation(positional: string[]) {
    const [command, first, ...remaining] = positional;

    if (command === "batch") {
        return Number.isInteger(Number(first))
            ? { name: "batch show", args: positional.slice(1) }
            : { name: `batch ${first ?? ""}`, args: remaining };
    }

    if (command === "url") {
        return Number.isInteger(Number(first))
            ? { name: "url show", args: positional.slice(1) }
            : { name: `url ${first ?? ""}`, args: remaining };
    }

    if (command === "urls") return { name: `urls ${first ?? ""}`, args: remaining };
    return { name: command ?? "", args: positional.slice(1) };
}

function validateInvocation(positional: string[], flags: Flags) {
    const { name, args } = invocation(positional);
    const rules = commandUsage[name as keyof typeof commandUsage];
    if (!rules) return;

    const allowedFlags = new Set<string>([...commonFlags, ...(rules.flags ?? [])]);
    const unsupported = Object.keys(flags).find((flag) => !allowedFlags.has(flag));
    if (unsupported) {
        throw new CliError(`--${unsupported} does not apply to \`${name}\`.`, 2);
    }

    if (
        args.length < rules.minArgs ||
        (rules.maxArgs !== undefined && args.length > rules.maxArgs)
    ) {
        throw new CliError(`Wrong number of arguments for \`${name}\`. Run \`help\` for usage.`, 2);
    }
}

function flagString(flags: Flags, name: string) {
    const value = flags[name];
    return typeof value === "string" ? value : undefined;
}

function flagNumber(flags: Flags, name: string, fallback: number) {
    const value = flagString(flags, name);
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new CliError(`--${name} must be a positive integer.`, 2);
    }

    return parsed;
}

function requireId(value: string | undefined, label: string) {
    const parsed = Number(value);
    if (!value || !Number.isInteger(parsed) || parsed < 1) {
        throw new CliError(`Expected a numeric ${label} id, got "${value ?? ""}".`, 2);
    }

    return parsed;
}

function requireArgument(value: string | undefined, label: string) {
    if (!value) throw new CliError(`Missing ${label}. Run \`help\` for usage.`, 2);
    return value;
}

async function readStdin() {
    if (process.stdin.isTTY) return [];

    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    return [Buffer.concat(chunks).toString("utf8")];
}

async function run(context: Context, positional: string[], flags: Flags) {
    const { name, args } = invocation(positional);

    switch (name) {
        case "batches":
            return listBatches(context);

        case "users":
            return listUsers(context);

        case "batch show":
            return showBatch(context, {
                batchId: requireId(args[0], "batch"),
                filter: parseUrlFilter(flagString(flags, "filter") ?? "all"),
                limit: flagString(flags, "limit") ? flagNumber(flags, "limit", 0) : undefined,
            });
        case "batch create":
            return createBatch(context, requireArgument(args[0], "base URL"));
        case "batch set-base-url":
            return setBaseUrl(
                context,
                requireId(args[0], "batch"),
                requireArgument(args[1], "base URL"),
            );
        case "batch check":
            return checkBatch(context, {
                batchId: requireId(args[0], "batch"),
                filter: parseUrlFilter(flagString(flags, "filter") ?? "all"),
                concurrency: flagNumber(flags, "concurrency", 6),
            });
        case "batch redirects":
            return batchRedirects(context, {
                batchId: requireId(args[0], "batch"),
                format: flagString(flags, "format") ?? "apache",
            });
        case "batch archive":
            return archiveBatch(context, requireId(args[0], "batch"));
        case "urls add": {
            const inputs = args.slice(1);
            return addUrls(context, {
                batchId: requireId(args[0], "batch"),
                inputs: inputs.length ? inputs : await readStdin(),
                check: flags["no-check"] !== true,
                concurrency: flagNumber(flags, "concurrency", 6),
            });
        }
        case "url show":
            return showUrl(context, requireId(args[0], "URL"));
        case "url set-target":
            return setUrlTarget(context, requireId(args[0], "URL"), args[1]);
        case "url check":
            return checkSingleUrl(context, requireId(args[0], "URL"));
        case "url delete":
            return deleteUrl(context, requireId(args[0], "URL"));
        default:
            throw new CliError(`Unknown command "${name}". Run \`help\` for usage.`, 2);
    }
}

async function main() {
    const { positional, flags } = parseArgv(process.argv.slice(2));

    if (!positional.length || positional[0] === "help" || flags.help === true) {
        print(usage);
        return;
    }

    validateInvocation(positional, flags);

    const context = createContext({
        target: parseDbTarget(flagString(flags, "db") ?? "local"),
        json: flags.json === true,
        userEmail: flagString(flags, "user"),
        confirmed: flags.yes === true,
    });

    try {
        await run(context, positional, flags);
    } finally {
        await context.close();
    }
}

try {
    await main();
} catch (error) {
    if (error instanceof CliError) {
        process.stderr.write(`${error.message}\n`);
        process.exit(error.exitCode);
    }

    throw error;
}
