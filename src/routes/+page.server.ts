import { db } from "$lib/server/db";
import { batches, urls } from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { and, count, eq, isNull, sql } from "drizzle-orm";

export async function load({ locals }) {
    if (!locals.user) {
        throw redirect(303, "/login");
    }

    const rows = await db
        .select({
            id: batches.id,
            devUrl: batches.devUrl,
            createdAt: batches.createdAt,
            urlCount: count(urls.id),
            remainingCount: sql<number>`count(${urls.id}) filter (where ${urls.addressed} = false)`,
        })
        .from(batches)
        .leftJoin(
            urls,
            and(eq(urls.batchId, batches.id), isNull(urls.deletedAt)),
        )
        .where(
            and(
                eq(batches.userId, locals.user.id),
                isNull(batches.deletedAt),
                sql`${batches.devUrl} <> ''`,
            ),
        )
        .groupBy(batches.id)
        .orderBy(batches.devUrl);

    return { batches: rows };
}

export const actions = {
    create: async ({ locals }) => {
        if (!locals.user) {
            return fail(401, { message: "You must be signed in." });
        }

        const [batch] = await db
            .insert(batches)
            .values({ userId: locals.user.id })
            .returning({ id: batches.id });

        throw redirect(303, `/batch/${batch.id}`);
    },
};
