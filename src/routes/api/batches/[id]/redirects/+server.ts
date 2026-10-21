import { getRedirectFormats } from "#lib/server/redirects.js";
import { db } from "#lib/server/db.js";
import { batches, urls } from "#lib/server/schema.js";
import { error, redirect } from "@sveltejs/kit";
import { and, eq, isNull, isNotNull } from "drizzle-orm";

export async function GET({ locals, params }) {
    if (!locals.user) {
        throw redirect(303, "/login");
    }

    const batch = await db.query.batches.findFirst({
        where: and(
            eq(batches.id, Number(params.id)),
            eq(batches.userId, locals.user.id),
            isNull(batches.deletedAt),
        ),
    });

    if (!batch) {
        throw error(404, "Batch not found");
    }

    const pendingUrls = await db.query.urls.findMany({
        where: and(
            eq(urls.batchId, batch.id),
            eq(urls.addressed, false),
            isNotNull(urls.redirectTo),
            isNull(urls.deletedAt),
        ),
    });

    return Response.json({
        formats: getRedirectFormats(batch, pendingUrls),
        count: pendingUrls.length,
    });
}
