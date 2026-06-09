import { db } from "$lib/server/db";
import { batches } from "$lib/server/schema";
import { screenshotFilePath } from "$lib/server/screenshots";
import { error } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { readFile } from "node:fs/promises";

export async function GET({ params, locals }) {
    if (!locals.user) {
        throw error(401, "Unauthorized");
    }

    const batchId = Number(params.id);
    if (!Number.isInteger(batchId)) {
        throw error(404, "Not found");
    }

    const batch = await db.query.batches.findFirst({
        where: and(
            eq(batches.id, batchId),
            eq(batches.userId, locals.user.id),
            isNull(batches.deletedAt),
        ),
    });

    if (!batch?.screenshotUpdatedAt) {
        throw error(404, "Not found");
    }

    let file: Buffer;
    try {
        file = await readFile(screenshotFilePath(batchId));
    } catch {
        throw error(404, "Not found");
    }

    return new Response(new Uint8Array(file), {
        headers: {
            "content-type": "image/jpeg",
            // Responses are addressed by a ?v=<timestamp> cache-buster, so a
            // given URL never changes — safe to cache aggressively & privately.
            "cache-control": "private, max-age=31536000, immutable",
        },
    });
}
