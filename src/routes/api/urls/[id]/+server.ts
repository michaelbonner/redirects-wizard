import { getDevRedirectUrl, getDevUrl } from "$lib/server/redirects";
import { db } from "$lib/server/db";
import { batches, urls } from "$lib/server/schema";
import { error, json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";

async function getOwnedUrl(id: number, userId: string) {
    const row = await db
        .select({ url: urls, batch: batches })
        .from(urls)
        .innerJoin(batches, eq(urls.batchId, batches.id))
        .where(
            and(
                eq(urls.id, id),
                eq(batches.userId, userId),
                isNull(urls.deletedAt),
                isNull(batches.deletedAt),
            ),
        )
        .limit(1);

    if (!row[0]) {
        throw error(404, "URL not found");
    }

    return row[0];
}

export async function PATCH({ locals, params, request }) {
    if (!locals.user) {
        throw error(401, "Unauthorized");
    }

    const id = Number(params.id);
    const { url, batch } = await getOwnedUrl(id, locals.user.id);
    const body = (await request.json()) as { redirectTo?: string };
    const redirectTo = body.redirectTo?.trim() || null;

    if (redirectTo) {
        const original = new URL(url.url);
        const target = new URL(redirectTo, original.origin);
        if (target.toString() === original.toString()) {
            throw error(422, "Redirect URL cannot be the same as the URL to redirect.");
        }
    }

    const [updated] = await db
        .update(urls)
        .set({ redirectTo, updatedAt: new Date() })
        .where(eq(urls.id, id))
        .returning();

    return json({
        ...updated,
        devUrl: getDevUrl(batch, updated),
        devRedirectUrl: getDevRedirectUrl(batch, updated),
    });
}

export async function DELETE({ locals, params }) {
    if (!locals.user) {
        throw error(401, "Unauthorized");
    }

    const id = Number(params.id);
    await getOwnedUrl(id, locals.user.id);
    await db
        .update(urls)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(urls.id, id));

    return json({ success: true });
}
