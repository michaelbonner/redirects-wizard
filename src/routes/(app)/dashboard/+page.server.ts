import { db } from "$lib/server/db";
import { captureScreenshot } from "$lib/server/screenshots";
import { batches, urls } from "$lib/server/schema";
import { isValidHttpUrl } from "$lib/server/redirects";
import { fail, redirect } from "@sveltejs/kit";
import { and, count, eq, isNull, sql } from "drizzle-orm";

export async function load({ locals }) {
    if (!locals.user) {
        throw redirect(303, "/login");
    }

    const rows = await db
        .select({
            id: batches.id,
            baseUrl: batches.baseUrl,
            createdAt: batches.createdAt,
            screenshotUpdatedAt: batches.screenshotUpdatedAt,
            urlCount: count(urls.id),
            remainingCount:
                sql<number>`count(${urls.id}) filter (where ${urls.addressed} = false)`.mapWith(
                    Number,
                ),
        })
        .from(batches)
        .leftJoin(urls, and(eq(urls.batchId, batches.id), isNull(urls.deletedAt)))
        .where(
            and(
                eq(batches.userId, locals.user.id),
                isNull(batches.deletedAt),
                sql`${batches.baseUrl} <> ''`,
            ),
        )
        .groupBy(batches.id)
        .orderBy(batches.baseUrl);

    return { batches: rows };
}

export const actions = {
    create: async ({ locals, request }) => {
        if (!locals.user) {
            return fail(401, { baseUrl: "", message: "You must be signed in." });
        }

        const formData = await request.formData();
        const baseUrl = String(formData.get("baseUrl") ?? "").trim();

        if (!isValidHttpUrl(baseUrl)) {
            return fail(400, {
                baseUrl,
                message: "Enter a valid base URL including http:// or https://.",
            });
        }

        const [batch] = await db
            .insert(batches)
            .values({ userId: locals.user.id, baseUrl })
            .returning({ id: batches.id });

        try {
            await captureScreenshot(batch.id, baseUrl);
        } catch (error) {
            // Best effort — the batch is created regardless; the user can
            // retry capture with the refresh button.
            console.error("[screenshot] capture failed on create", error);
        }

        throw redirect(303, `/batch/${batch.id}`);
    },

    refreshScreenshot: async ({ locals, request }) => {
        if (!locals.user) {
            return fail(401, { message: "You must be signed in." });
        }

        const formData = await request.formData();
        const batchId = Number(formData.get("batchId"));
        if (!Number.isInteger(batchId)) {
            return fail(400, { message: "Invalid batch." });
        }

        const batch = await db.query.batches.findFirst({
            where: and(
                eq(batches.id, batchId),
                eq(batches.userId, locals.user.id),
                isNull(batches.deletedAt),
            ),
        });

        if (!batch) {
            return fail(404, { message: "Batch not found." });
        }
        if (!batch.baseUrl) {
            return fail(400, { message: "Set a base URL first." });
        }

        try {
            await captureScreenshot(batch.id, batch.baseUrl);
        } catch (error) {
            console.error("[screenshot] capture failed on refresh", error);
            return fail(500, {
                message: `Could not capture screenshot: ${error instanceof Error ? error.message : String(error)}`,
            });
        }

        return { success: "Screenshot refreshed." };
    },
};
