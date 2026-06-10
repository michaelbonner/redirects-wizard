import type { HttpResponse } from "./schema";

type BatchLike = {
    devUrl: string;
};

type UrlLike = {
    url: string;
    redirectTo: string | null;
};

type RedirectFormat = {
    id: string;
    label: string;
    filename: string;
    body: string;
};

type RedirectRule = {
    sourcePath: string;
    sourceQuery: string;
    sourceQueryMatchers: string[];
    sourcePathWithQuery: string;
    targetPathWithQuery: string;
};

export function normalizeUrlInput(url: string) {
    const withoutHash = url.trim().split("#")[0] ?? "";
    if (!withoutHash) return "";
    return /^https?:\/\//i.test(withoutHash) ? withoutHash : `http://${withoutHash}`;
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

function escapeApacheRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeApacheTarget(value: string) {
    return value.replaceAll("%20", "\\ ");
}

function escapeNginxQuoted(value: string) {
    return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function normalizeRedirectTarget(batch: BatchLike, url: UrlLike) {
    return new URL(getDevRedirectUrl(batch, url));
}

function getRedirectRule(batch: BatchLike, url: UrlLike): RedirectRule {
    const current = new URL(url.url);
    const target = normalizeRedirectTarget(batch, url);
    const sourceQuery = current.search.startsWith("?") ? current.search.slice(1) : "";
    const sourcePathWithQuery = `${current.pathname}${current.search}`;
    const targetPathWithQuery = `${target.pathname}${target.search}`;

    return {
        sourcePath: current.pathname,
        sourceQuery,
        sourceQueryMatchers: sourceQuery ? sourceQuery.split("&") : [],
        sourcePathWithQuery,
        targetPathWithQuery,
    };
}

export function getApacheRewrite(batch: BatchLike, url: UrlLike) {
    const rule = getRedirectRule(batch, url);
    const path = rule.sourcePath.replace(/^\//, "");
    let pattern = "^$ ";

    if (path) {
        const escaped = escapeApacheRegex(path);
        pattern = `^${escaped}${path.endsWith("/") ? "?" : ""}$ `;
    }

    const flags = ["R=301", "NC", "L"];
    if (!rule.targetPathWithQuery.includes("?")) {
        flags.push("QSD");
    }

    let rewrite = "";
    if (rule.sourceQuery) {
        rewrite += `RewriteCond %{QUERY_STRING} ^${escapeApacheRegex(rule.sourceQuery)}$ [NC]\n`;
    }

    rewrite += `RewriteRule ${pattern}${escapeApacheTarget(rule.targetPathWithQuery)} [${flags.join(",")}]`;

    return rewrite;
}

export function getRewrite(batch: BatchLike, url: UrlLike) {
    return getApacheRewrite(batch, url);
}

function getNginxRedirect(batch: BatchLike, url: UrlLike) {
    const rule = getRedirectRule(batch, url);
    const target = escapeNginxQuoted(rule.targetPathWithQuery);

    if (rule.sourceQuery) {
        return [
            `if ($request_uri = "${escapeNginxQuoted(rule.sourcePathWithQuery)}") {`,
            `    return 301 ${target};`,
            "}",
        ].join("\n");
    }

    return [`location = ${rule.sourcePath} {`, `    return 301 ${target};`, "}"].join("\n");
}

function getCaddyRedirect(batch: BatchLike, url: UrlLike, index: number) {
    const rule = getRedirectRule(batch, url);
    if (!rule.sourceQuery) {
        return `redir ${rule.sourcePath} ${rule.targetPathWithQuery} permanent`;
    }

    const queryMatchers = rule.sourceQueryMatchers.join(" ");

    return [
        `@redirect_${index + 1} {`,
        `    path ${rule.sourcePath}`,
        `    query ${queryMatchers}`,
        "}",
        `redir @redirect_${index + 1} ${rule.targetPathWithQuery} permanent`,
    ].join("\n");
}

function getNetlifyRedirect(batch: BatchLike, url: UrlLike) {
    const rule = getRedirectRule(batch, url);
    const queryParams = rule.sourceQueryMatchers.join(" ");
    const source = [rule.sourcePath, queryParams].filter(Boolean).join(" ");

    return `${source} ${rule.targetPathWithQuery} 301!`;
}

export function getRedirectFormats(batch: BatchLike, redirectUrls: UrlLike[]) {
    const sortedUrls = [...redirectUrls].sort((a, b) => {
        const aRule = getRedirectRule(batch, a);
        const bRule = getRedirectRule(batch, b);
        return (
            bRule.sourcePathWithQuery.length - aRule.sourcePathWithQuery.length ||
            aRule.sourcePathWithQuery.localeCompare(bRule.sourcePathWithQuery)
        );
    });

    const apacheRules = sortedUrls.map((url) => getApacheRewrite(batch, url));
    const nginxRules = sortedUrls.map((url) => getNginxRedirect(batch, url));
    const caddyRules = sortedUrls.map((url, index) => getCaddyRedirect(batch, url, index));
    const netlifyRules = sortedUrls.map((url) => getNetlifyRedirect(batch, url));

    return [
        {
            id: "apache",
            label: "Apache .htaccess",
            filename: ".htaccess",
            body: ["RewriteEngine On", ...apacheRules].join("\n"),
        },
        {
            id: "nginx",
            label: "nginx",
            filename: "redirects.conf",
            body: nginxRules.join("\n\n"),
        },
        {
            id: "caddy",
            label: "Caddyfile",
            filename: "Caddyfile",
            body: caddyRules.join("\n\n"),
        },
        {
            id: "netlify",
            label: "Netlify _redirects",
            filename: "_redirects",
            body: netlifyRules.join("\n"),
        },
    ] satisfies RedirectFormat[];
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
