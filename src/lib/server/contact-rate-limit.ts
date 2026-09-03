const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 10_000;

type RateLimitEntry = {
    submissions: number;
    resetsAt: number;
};

type RateLimitResult = { kind: "allowed" } | { kind: "rate_limited"; retryAfterSeconds: number };

const entries = new Map<string, RateLimitEntry>();

function retryAfterSeconds(resetsAt: number, now: number): number {
    return Math.max(1, Math.ceil((resetsAt - now) / 1_000));
}

function removeExpiredEntries(now: number): void {
    for (const [clientAddress, entry] of entries) {
        if (entry.resetsAt <= now) {
            entries.delete(clientAddress);
        }
    }
}

export function consumeContactRateLimit(clientAddress: string): RateLimitResult {
    const now = Date.now();
    const entry = entries.get(clientAddress);

    if (entry && entry.resetsAt > now) {
        if (entry.submissions >= MAX_SUBMISSIONS_PER_WINDOW) {
            return {
                kind: "rate_limited",
                retryAfterSeconds: retryAfterSeconds(entry.resetsAt, now),
            };
        }

        entry.submissions += 1;
        return { kind: "allowed" };
    }

    if (entry) {
        entries.delete(clientAddress);
    }

    if (entries.size >= MAX_TRACKED_CLIENTS) {
        removeExpiredEntries(now);
    }

    if (entries.size >= MAX_TRACKED_CLIENTS) {
        return {
            kind: "rate_limited",
            retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1_000),
        };
    }

    entries.set(clientAddress, {
        submissions: 1,
        resetsAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return { kind: "allowed" };
}
