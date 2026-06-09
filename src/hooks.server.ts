export async function handle({ event, resolve }) {
    if (event.url.pathname === "/health" || event.url.pathname === "/health/") {
        return resolve(event);
    }

    const { auth } = await import("$lib/auth");

    if (event.url.pathname.startsWith("/api/auth")) {
        return auth.handler(event.request);
    }

    const session = await auth.api.getSession({
        headers: event.request.headers,
    });

    event.locals.session = session?.session ?? null;
    event.locals.user = session?.user ?? null;

    return resolve(event);
}
