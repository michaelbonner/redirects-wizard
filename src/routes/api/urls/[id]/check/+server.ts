import { checkUrl, getBaseRedirectUrl, getBaseUrl, isValidHttpUrl } from "$lib/server/redirects";
import { db } from "$lib/server/db";
import { batches, urls } from "$lib/server/schema";
import { error, json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";

export async function POST({ locals, params }) {
    if (!locals.user) {
        throw error(401, "Unauthorized");
    }

    const id = Number(params.id);
    const row = await db
        .select({ url: urls, batch: batches })
        .from(urls)
        .innerJoin(batches, eq(urls.batchId, batches.id))
        .where(
            and(
                eq(urls.id, id),
                eq(batches.userId, locals.user.id),
                isNull(urls.deletedAt),
                isNull(batches.deletedAt),
            ),
        )
        .limit(1);

    if (!row[0]) {
        throw error(404, "URL not found");
    }

    if (!isValidHttpUrl(row[0].batch.baseUrl)) {
        throw error(422, "Batch base URL is invalid");
    }

    const response = await checkUrl(getBaseUrl(row[0].batch, row[0].url));
    const [updated] = await db
        .update(urls)
        .set({
            addressed: response.status_code === 200,
            httpResponse: response,
            updatedAt: new Date(),
        })
        .where(eq(urls.id, id))
        .returning();

    return json({
        ...updated,
        baseUrl: getBaseUrl(row[0].batch, updated),
        baseRedirectUrl: getBaseRedirectUrl(row[0].batch, updated),
    });
}
