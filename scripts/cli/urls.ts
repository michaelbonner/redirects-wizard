import { and, eq, isNull, or } from "drizzle-orm";
import {
    checkUrl,
    getBaseRedirectUrl,
    getBaseUrl,
    isValidHttpUrl,
    normalizeUrlInput,
    withoutTrailingSlash,
} from "../../src/lib/server/redirects";
import { urls } from "../../src/lib/server/schema";
import { CliError, getOwnedBatch, getOwnedUrl } from "./context";
import type { Batch, Context, Url } from "./context";
import {
    date,
    print,
    printFields,
    printJson,
    printTable,
    pluralize,
    statusCode,
    text,
    yesNo,
} from "./output";

/** The app's URL shape: the stored row plus the base-URL-relative variants. */
export function serializeUrl(batch: Batch, url: Url) {
    const hasBaseUrl = isValidHttpUrl(batch.baseUrl);
    return {
        ...url,
        baseUrl: hasBaseUrl ? getBaseUrl(batch, url) : "",
        baseRedirectUrl: hasBaseUrl ? getBaseRedirectUrl(batch, url) : "",
    };
}

/** Re-requests a URL against the batch's base URL and stores the result. */
export async function recheckUrl(context: Context, batch: Batch, url: Url): Promise<Url> {
    if (!isValidHttpUrl(batch.baseUrl)) {
        throw new CliError(
            `Batch ${batch.id} has no valid base URL — set one with \`batch set-base-url ${batch.id} <url>\`.`,
        );
    }

    const response = await checkUrl(getBaseUrl(batch, url));
    const [updated] = await context.db
        .update(urls)
        .set({
            addressed: response.status_code === 200,
            httpResponse: response,
            updatedAt: new Date(),
        })
        .where(eq(urls.id, url.id))
        .returning();

    return updated;
}

/** Runs `worker` over `items` with at most `limit` in flight, keeping order. */
export async function mapWithConcurrency<Item, Result>(
    items: Item[],
    limit: number,
    worker: (item: Item, index: number) => Promise<Result>,
): Promise<Result[]> {
    const results = Array.from({ length: items.length }) as Result[];
    let next = 0;

    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await worker(items[index], index);
        }
    });

    await Promise.all(runners);
    return results;
}

export async function showUrl(context: Context, urlId: number) {
    const { url, batch } = await getOwnedUrl(context, urlId);
    const serialized = serializeUrl(batch, url);

    if (context.json) {
        printJson({ url: serialized, batch });
        return;
    }

    printFields([
        ["URL", String(url.id)],
        ["Batch", `${batch.id} (${text(batch.baseUrl)})`],
        ["Production", url.url],
        ["Checked as", text(serialized.baseUrl)],
        ["Status", statusCode(url)],
        ["Resolved", yesNo(url.addressed)],
        ["Target", text(url.redirectTo)],
        ["Target URL", url.redirectTo ? text(serialized.baseRedirectUrl) : text(null)],
        ["Updated", url.updatedAt.toISOString()],
    ]);

    const chain = url.httpResponse?.redirect_chain ?? [];
    if (chain.length) {
        print();
        print("Redirect chain:");
        for (const hop of chain) {
            const arrow = hop.redirect_to ? ` -> ${hop.redirect_to}` : "";
            print(`  ${String(hop.status_code).padEnd(3)}  ${hop.url}${arrow}`);
        }
    }

    if (url.httpResponse?.message) {
        print();
        print(`Error: ${url.httpResponse.message}`);
    }
}

export type AddUrlsOptions = {
    batchId: number;
    inputs: string[];
    check: boolean;
    concurrency: number;
};

export async function addUrls(context: Context, options: AddUrlsOptions) {
    context.requireWritable("add URLs");
    const batch = await getOwnedBatch(context, options.batchId);

    const lines = options.inputs.flatMap((input) => input.split("\n")).map((line) => line.trim());
    const skipped: { url: string; reason: string }[] = [];
    const candidates: string[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
        if (!line) continue;
        const normalized = normalizeUrlInput(line);

        if (!normalized || !isValidHttpUrl(normalized)) {
            skipped.push({ url: line, reason: "not a valid http(s) URL" });
            continue;
        }
        if (seen.has(normalized)) {
            skipped.push({ url: normalized, reason: "duplicate in input" });
            continue;
        }

        seen.add(normalized);
        candidates.push(normalized);
    }

    if (!candidates.length && !skipped.length) {
        throw new CliError("No URLs given — pass them as arguments or pipe them on stdin.");
    }

    const inserted: Url[] = [];
    for (const candidate of candidates) {
        const trimmed = withoutTrailingSlash(candidate);
        const existing = await context.db.query.urls.findFirst({
            where: and(
                eq(urls.batchId, batch.id),
                isNull(urls.deletedAt),
                or(eq(urls.url, trimmed), eq(urls.url, `${trimmed}/`)),
            ),
        });

        if (existing) {
            skipped.push({ url: candidate, reason: `already in batch as URL ${existing.id}` });
            continue;
        }

        const [created] = await context.db
            .insert(urls)
            .values({ batchId: batch.id, url: candidate })
            .returning();
        inserted.push(created);
    }

    const canCheck = options.check && isValidHttpUrl(batch.baseUrl);
    const added = canCheck
        ? await mapWithConcurrency(inserted, options.concurrency, (url) =>
              recheckUrl(context, batch, url),
          )
        : inserted;

    if (context.json) {
        printJson({
            batchId: batch.id,
            checked: canCheck,
            added: added.map((url) => serializeUrl(batch, url)),
            skipped,
        });
        return;
    }

    printTable(
        ["ACTION", "ID", "URL", "STATUS", "NOTE"],
        [
            ...added.map((url) => ["added", String(url.id), url.url, statusCode(url), ""]),
            ...skipped.map((entry) => ["skipped", text(null), entry.url, text(null), entry.reason]),
        ],
        "Nothing to add.",
    );
    print();
    print(
        `${pluralize(added.length, "URL")} added, ${skipped.length} skipped.${
            canCheck ? "" : " URLs were not checked."
        }`,
    );
}

export async function setUrlTarget(context: Context, urlId: number, target: string | undefined) {
    context.requireWritable("change a redirect target");
    const { url, batch } = await getOwnedUrl(context, urlId);
    const redirectTo = target?.trim() || null;

    if (redirectTo) {
        const original = new URL(url.url);
        const resolved = new URL(redirectTo, original.origin);
        if (resolved.toString() === original.toString()) {
            throw new CliError("Redirect target cannot be the same as the URL being redirected.");
        }
    }

    const [updated] = await context.db
        .update(urls)
        .set({ redirectTo, updatedAt: new Date() })
        .where(eq(urls.id, url.id))
        .returning();

    const serialized = serializeUrl(batch, updated);

    if (context.json) {
        printJson({ url: serialized });
        return;
    }

    print(
        redirectTo
            ? `URL ${updated.id} now redirects to ${redirectTo} (${text(serialized.baseRedirectUrl)}).`
            : `Cleared the redirect target for URL ${updated.id}.`,
    );
}

export async function checkSingleUrl(context: Context, urlId: number) {
    context.requireWritable("check a URL");
    const { url, batch } = await getOwnedUrl(context, urlId);
    const updated = await recheckUrl(context, batch, url);

    if (context.json) {
        printJson({ url: serializeUrl(batch, updated) });
        return;
    }

    printTable(
        ["ID", "STATUS", "RESOLVED", "URL"],
        [[String(updated.id), statusCode(updated), yesNo(updated.addressed), updated.url]],
    );
}

export async function deleteUrl(context: Context, urlId: number) {
    context.requireWritable("delete a URL");
    const { url } = await getOwnedUrl(context, urlId);
    await context.db
        .update(urls)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(urls.id, url.id));

    if (context.json) {
        printJson({ id: url.id, deleted: true });
        return;
    }

    print(`Deleted URL ${url.id} (${url.url}).`);
}

export function urlRow(url: Url) {
    return [
        String(url.id),
        statusCode(url),
        yesNo(url.addressed),
        url.url,
        text(url.redirectTo),
        date(url.updatedAt),
    ];
}

export const urlColumns = ["ID", "STATUS", "RESOLVED", "URL", "TARGET", "UPDATED"];
