import type { HttpResponse } from "./schema";

type BatchLike = {
    devUrl: string;
};

type UrlLike = {
    url: string;
    redirectTo: string | null;
};

export function normalizeUrlInput(url: string) {
    const withoutHash = url.trim().split("#")[0] ?? "";
    if (!withoutHash) return "";
    return withoutHash.startsWith("http")
        ? withoutHash
        : `http://${withoutHash}`;
}

export function withoutTrailingSlash(url: string) {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function isValidHttpUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function getDevUrl(batch: BatchLike, url: UrlLike) {
    const current = new URL(url.url);
    const dev = new URL(batch.devUrl);
    const next = new URL(dev.origin);
    next.pathname = current.pathname;
    next.search = current.search;
    return next.toString();
}

export function getDevRedirectUrl(batch: BatchLike, url: UrlLike) {
    const dev = new URL(batch.devUrl);
    const next = new URL(dev.origin);
    if (url.redirectTo) {
        const redirect = new URL(url.redirectTo, dev.origin);
        next.pathname = redirect.pathname;
        next.search = redirect.search;
    }
    return next.toString();
}

export function getRewrite(batch: BatchLike, url: UrlLike) {
    const current = new URL(url.url);
    const queryString = current.searchParams.toString();
    const path = current.pathname.replace(/^\//, "");
    let pattern = "(.*) ";

    if (path) {
        const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        pattern = `^${escaped}${path.endsWith("/") ? "?" : ""}$ `;
    }

    let rule = "";
    if (queryString) {
        rule += `RewriteCond %{QUERY_STRING} ${queryString}\n`;
    }

    rule += `RewriteRule ${pattern}${getDevRedirectUrl(batch, url)}? [R=301,NC,L]`;

    const devUrlWithSlash = batch.devUrl.endsWith("/")
        ? batch.devUrl
        : `${batch.devUrl}/`;

    return rule
        .replaceAll(devUrlWithSlash, "/")
        .replaceAll(batch.devUrl, "")
        .replaceAll("%20", "\\ ")
        .replaceAll(" ? ", " /? ");
}

export async function checkUrl(url: string): Promise<HttpResponse> {
    const redirectPath: string[] = [url];

    try {
        const response = await fetch(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                pragma: "no-cache",
                "user-agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
            },
        });

        if (response.redirected) {
            redirectPath.push(response.url);
        }

        return {
            url,
            status_code: response.status,
            redirect_path: redirectPath,
            headers: Object.fromEntries(response.headers.entries()),
        };
    } catch (error) {
        return {
            url,
            status_code: 504,
            message: error instanceof Error ? error.message : "Request failed",
            headers: {},
        };
    }
}
