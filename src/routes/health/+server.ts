import { db } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import { sql } from "drizzle-orm";

const headers = {
    "cache-control": "no-store",
};

async function checkDatabase() {
    await db.execute(sql`select 1`);
}

export async function GET() {
    try {
        await checkDatabase();
    } catch {
        return json(
            {
                status: "error",
                checks: {
                    database: "error",
                },
            },
            {
                status: 503,
                headers,
            },
        );
    }

    return json(
        {
            status: "ok",
            checks: {
                database: "ok",
            },
        },
        {
            headers,
        },
    );
}

export async function HEAD() {
    try {
        await checkDatabase();
    } catch {
        return new Response(null, {
            status: 503,
            headers,
        });
    }

    return new Response(null, {
        headers,
    });
}
