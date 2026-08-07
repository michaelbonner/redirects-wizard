import { and, asc, count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getRedirectFormats, isValidHttpUrl } from "../../src/lib/server/redirects";
import { batches, urls } from "../../src/lib/server/schema";
import { CliError, getOwnedBatch } from "./context";
import type { Context, Url } from "./context";
import {
    date,
    pluralize,
    print,
    printFields,
    printJson,
    printTable,
    statusCode,
    text,
    yesNo,
} from "./output";
import { mapWithConcurrency, recheckUrl, serializeUrl, urlColumns, urlRow } from "./urls";

/** Which URLs of a batch to show. */
export const urlFilters = ["all", "unresolved", "resolved", "untargeted"] as const;

export type UrlFilter = (typeof urlFilters)[number];

export function parseUrlFilter(value: string): UrlFilter {
    if ((urlFilters as readonly string[]).includes(value)) return value as UrlFilter;
    throw new CliError(
        `Unknown --filter "${value}". Expected one of: ${urlFilters.join(", ")}.`,
        2,
    );
}

function matchesFilter(url: Url, filter: UrlFilter) {
    switch (filter) {
        case "unresolved":
            return !url.addressed;
        case "resolved":
            return url.addressed;
        case "untargeted":
            return !url.addressed && !url.redirectTo;
        case "all":
            return true;
    }
}

export async function listBatches(context: Context) {
    const owner = await context.requireUser();
    const rows = await context.db
        .select({
            id: batches.id,
            baseUrl: batches.baseUrl,
            createdAt: batches.createdAt,
            urlCount: count(urls.id),
            unresolvedCount:
                sql<number>`count(${urls.id}) filter (where ${urls.addressed} = false)`.mapWith(
                    Number,
                ),
            untargetedCount:
                sql<number>`count(${urls.id}) filter (where ${urls.addressed} = false and ${urls.redirectTo} is null)`.mapWith(
                    Number,
                ),
        })
        .from(batches)
        .leftJoin(urls, and(eq(urls.batchId, batches.id), isNull(urls.deletedAt)))
        .where(and(eq(batches.userId, owner.id), isNull(batches.deletedAt)))
        .groupBy(batches.id)
        .orderBy(batches.baseUrl);

    if (context.json) {
        printJson({ user: owner.email, batches: rows });
        return;
    }

    printTable(
        ["ID", "BASE URL", "URLS", "UNRESOLVED", "UNTARGETED", "CREATED"],
        rows.map((row) => [
            String(row.id),
            text(row.baseUrl),
            String(row.urlCount),
            String(row.unresolvedCount),
            String(row.untargetedCount),
            date(row.createdAt),
        ]),
        `No batches for ${owner.email}.`,
    );
}

export type ShowBatchOptions = {
    batchId: number;
    filter: UrlFilter;
    limit?: number;
};

export async function showBatch(context: Context, options: ShowBatchOptions) {
    const batch = await getOwnedBatch(context, options.batchId);
    const allUrls = await context.db.query.urls.findMany({
        where: and(eq(urls.batchId, batch.id), isNull(urls.deletedAt)),
        orderBy: [asc(urls.addressed), asc(urls.url)],
    });

    const matching = allUrls.filter((url) => matchesFilter(url, options.filter));
    const shown = options.limit === undefined ? matching : matching.slice(0, options.limit);
    const unresolved = allUrls.filter((url) => !url.addressed);

    if (context.json) {
        printJson({
            batch,
            counts: {
                total: allUrls.length,
                unresolved: unresolved.length,
                untargeted: unresolved.filter((url) => !url.redirectTo).length,
                matchingFilter: matching.length,
            },
            urls: shown.map((url) => serializeUrl(batch, url)),
        });
        return;
    }

    printFields([
        ["Batch", String(batch.id)],
        ["Base URL", text(batch.baseUrl)],
        ["URLs", String(allUrls.length)],
        ["Unresolved", String(unresolved.length)],
        ["Untargeted", String(unresolved.filter((url) => !url.redirectTo).length)],
        ["Created", date(batch.createdAt)],
    ]);
    print();
    printTable(urlColumns, shown.map(urlRow), `No URLs match --filter ${options.filter}.`);

    if (shown.length < matching.length) {
        print();
        print(`Showing ${shown.length} of ${matching.length} matching URLs (--limit).`);
    }
}

export async function createBatch(context: Context, baseUrl: string) {
    context.requireWritable("create a batch");

    if (!isValidHttpUrl(baseUrl)) {
        throw new CliError("Enter a valid base URL including http:// or https://.");
    }

    const owner = await context.requireUser();
    const [batch] = await context.db
        .insert(batches)
        .values({ userId: owner.id, baseUrl })
        .returning();

    if (context.json) {
        printJson({ batch });
        return;
    }

    print(`Created batch ${batch.id} for ${baseUrl}.`);
}

export async function setBaseUrl(context: Context, batchId: number, baseUrl: string) {
    context.requireWritable("change a base URL");

    if (!isValidHttpUrl(baseUrl)) {
        throw new CliError("Enter a valid base URL including http:// or https://.");
    }

    const batch = await getOwnedBatch(context, batchId);
    const [updated] = await context.db
        .update(batches)
        .set({ baseUrl, updatedAt: new Date() })
        .where(eq(batches.id, batch.id))
        .returning();

    if (context.json) {
        printJson({ batch: updated });
        return;
    }

    print(`Batch ${updated.id} base URL set to ${updated.baseUrl}.`);
    print("Re-check the URLs with `batch check` to refresh their statuses.");
}

export type CheckBatchOptions = {
    batchId: number;
    filter: UrlFilter;
    concurrency: number;
};

export async function checkBatch(context: Context, options: CheckBatchOptions) {
    context.requireWritable("check a batch");
    const batch = await getOwnedBatch(context, options.batchId);

    if (!isValidHttpUrl(batch.baseUrl)) {
        throw new CliError(
            `Batch ${batch.id} has no valid base URL — set one with \`batch set-base-url ${batch.id} <url>\`.`,
        );
    }

    const pending = (
        await context.db.query.urls.findMany({
            where: and(eq(urls.batchId, batch.id), isNull(urls.deletedAt)),
            orderBy: [asc(urls.url)],
        })
    ).filter((url) => matchesFilter(url, options.filter));

    if (!pending.length) {
        throw new CliError(`No URLs in batch ${batch.id} match --filter ${options.filter}.`);
    }

    const before = new Map(pending.map((url) => [url.id, url.addressed]));
    const checked = await mapWithConcurrency(pending, options.concurrency, (url) =>
        recheckUrl(context, batch, url),
    );
    const resolved = checked.filter((url) => url.addressed && !before.get(url.id));

    if (context.json) {
        printJson({
            batchId: batch.id,
            checked: checked.length,
            newlyResolved: resolved.map((url) => url.id),
            urls: checked.map((url) => serializeUrl(batch, url)),
        });
        return;
    }

    printTable(
        ["ID", "STATUS", "RESOLVED", "URL", "TARGET"],
        checked.map((url) => [
            String(url.id),
            statusCode(url),
            yesNo(url.addressed),
            url.url,
            text(url.redirectTo),
        ]),
    );
    print();
    print(
        `Checked ${pluralize(checked.length, "URL")}; ${checked.filter((url) => !url.addressed).length} still unresolved, ${resolved.length} newly resolved.`,
    );
}

export type BatchRedirectsOptions = {
    batchId: number;
    /** A format id from getRedirectFormats, or "all". */
    format: string;
};

export async function batchRedirects(context: Context, options: BatchRedirectsOptions) {
    const batch = await getOwnedBatch(context, options.batchId);

    // Mirrors /api/batches/[id]/redirects: rules exist only for URLs that still
    // need a redirect and have a target set.
    const pending = await context.db.query.urls.findMany({
        where: and(
            eq(urls.batchId, batch.id),
            eq(urls.addressed, false),
            isNotNull(urls.redirectTo),
            isNull(urls.deletedAt),
        ),
    });

    const formats = getRedirectFormats(batch, pending);
    const requested =
        options.format === "all"
            ? formats
            : formats.filter((format) => format.id === options.format);

    if (!requested.length) {
        throw new CliError(
            `Unknown --format "${options.format}". Expected all or one of: ${formats
                .map((format) => format.id)
                .join(", ")}.`,
            2,
        );
    }

    if (context.json) {
        printJson({ batchId: batch.id, count: pending.length, formats: requested });
        return;
    }

    if (!pending.length) {
        print(`No unresolved URLs with a redirect target in batch ${batch.id}.`);
        return;
    }

    requested.forEach((format, index) => {
        if (index > 0) print();
        if (requested.length > 1) print(`# ${format.label} (${format.filename})`);
        print(format.body);
    });
}

export async function archiveBatch(context: Context, batchId: number) {
    context.requireWritable("archive a batch");
    const batch = await getOwnedBatch(context, batchId);
    await context.db
        .update(batches)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(batches.id, batch.id));

    if (context.json) {
        printJson({ id: batch.id, archived: true });
        return;
    }

    print(`Archived batch ${batch.id} (${text(batch.baseUrl)}).`);
}

export async function listUsers(context: Context) {
    const rows = await context.db.query.user.findMany({
        columns: { id: true, name: true, email: true, createdAt: true },
        orderBy: (fields, { asc: ascending }) => [ascending(fields.email)],
    });

    if (context.json) {
        printJson({ users: rows });
        return;
    }

    printTable(
        ["EMAIL", "NAME", "ID", "CREATED"],
        rows.map((row) => [row.email, text(row.name), row.id, date(row.createdAt)]),
        "No users in this database.",
    );
}
