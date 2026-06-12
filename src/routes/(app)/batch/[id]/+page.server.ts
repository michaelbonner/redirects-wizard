import {
    checkUrl,
    getBaseRedirectUrl,
    getBaseUrl,
    isValidHttpUrl,
    normalizeUrlInput,
    withoutTrailingSlash,
} from "$lib/server/redirects";
import { db } from "$lib/server/db";
import { captureScreenshot } from "$lib/server/screenshots";
import { batches, urls } from "$lib/server/schema";
import { error, fail, redirect } from "@sveltejs/kit";
import { and, asc, eq, isNull, or } from "drizzle-orm";

async function getOwnedBatch(batchId: number, userId: string) {
    const batch = await db.query.batches.findFirst({
        where: and(eq(batches.id, batchId), eq(batches.userId, userId), isNull(batches.deletedAt)),
    });

    if (!batch) {
        throw error(404, "Batch not found");
    }

    return batch;
}

export async function load({ locals, params }) {
    if (!locals.user) {
        throw redirect(303, "/login");
    }

    const batchId = Number(params.id);
    const batch = await getOwnedBatch(batchId, locals.user.id);
    const batchUrls = await db.query.urls.findMany({
        where: and(eq(urls.batchId, batch.id), isNull(urls.deletedAt)),
        orderBy: [asc(urls.addressed), asc(urls.url)],
    });

    return {
        batch,
        urls: batchUrls.map((url) => ({
            ...url,
            baseUrl: batch.baseUrl && isValidHttpUrl(batch.baseUrl) ? getBaseUrl(batch, url) : "",
            baseRedirectUrl:
                batch.baseUrl && isValidHttpUrl(batch.baseUrl) ? getBaseRedirectUrl(batch, url) : "",
        })),
    };
}

export const actions = {
    updateBaseUrl: async ({ locals, params, request }) => {
        if (!locals.user) return fail(401, { message: "You must be signed in." });

        const formData = await request.formData();
        const baseUrl = String(formData.get("baseUrl") ?? "").trim();

        if (!isValidHttpUrl(baseUrl)) {
            return fail(400, {
                message: "Enter a valid base URL including http:// or https://.",
            });
        }

        const batch = await getOwnedBatch(Number(params.id), locals.user.id);
        await db
            .update(batches)
            .set({ baseUrl, updatedAt: new Date() })
            .where(eq(batches.id, batch.id));

        try {
            await captureScreenshot(batch.id, baseUrl);
        } catch (error) {
            console.error("[screenshot] capture failed on updateBaseUrl", error);
            return {
                success: "Base URL updated. Screenshot could not be generated.",
            };
        }

        return { success: "Base URL updated." };
    },

    addUrls: async ({ locals, params, request }) => {
        if (!locals.user) return fail(401, { message: "You must be signed in." });

        const batch = await getOwnedBatch(Number(params.id), locals.user.id);
        const formData = await request.formData();
        const input = String(formData.get("urls") ?? "");
        const candidates = [
            ...new Set(input.split("\n").map(normalizeUrlInput).filter(Boolean)),
        ].filter(isValidHttpUrl);

        if (!candidates.length) {
            return fail(400, { message: "Add at least one valid URL." });
        }

        let added = 0;
        for (const candidate of candidates) {
            const trimmed = withoutTrailingSlash(candidate);
            const existing = await db.query.urls.findFirst({
                where: and(
                    eq(urls.batchId, batch.id),
                    isNull(urls.deletedAt),
                    or(eq(urls.url, trimmed), eq(urls.url, `${trimmed}/`)),
                ),
            });

            if (existing) continue;

            const [created] = await db
                .insert(urls)
                .values({ batchId: batch.id, url: candidate })
                .returning();
            const response = isValidHttpUrl(batch.baseUrl)
                ? await checkUrl(getBaseUrl(batch, created))
                : null;

            await db
                .update(urls)
                .set({
                    addressed: response?.status_code === 200,
                    httpResponse: response,
                    updatedAt: new Date(),
                })
                .where(eq(urls.id, created.id));

            added++;
        }

        return { success: `${added} URL${added === 1 ? "" : "s"} added.` };
    },

    archive: async ({ locals, params }) => {
        if (!locals.user) return fail(401, { message: "You must be signed in." });

        const batch = await getOwnedBatch(Number(params.id), locals.user.id);
        await db
            .update(batches)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(batches.id, batch.id));

        throw redirect(303, "/dashboard");
    },
};
