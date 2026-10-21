import type { Handle } from "@sveltejs/kit/hooks";

export const handle: Handle = async ({ event, resolve }) => {
    if (event.url.pathname === "/health" || event.url.pathname === "/health/") {
        return resolve(event);
    }

    const { auth } = await import("#lib/auth.js");

    if (event.url.pathname.startsWith("/api/auth")) {
        return auth.handler(event.request);
    }

    const session = await auth.api.getSession({
        headers: event.request.headers,
    });

    event.locals.session = session?.session ?? null;
    event.locals.user = session?.user ?? null;

    return resolve(event);
};
