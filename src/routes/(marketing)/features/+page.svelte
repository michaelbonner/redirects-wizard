<script lang="ts">
    import Button from "$lib/components/ui/button/button.svelte";
    import {
        ArrowRight,
        ListChecks,
        FileCode2,
        Camera,
        Gauge,
        FolderPlus,
        ShieldCheck,
        Search,
        RotateCw,
        CheckCircle2,
    } from "lucide-svelte";

    let { data } = $props();

    const primaryCta = $derived(
        data.user
            ? { href: "/dashboard", label: "Go to dashboard" }
            : { href: "/register", label: "Get started free" },
    );

    const sections = [
        {
            icon: ListChecks,
            title: "Bulk redirect checking",
            body: "Paste in your full list of legacy URLs and Redirects Wizard follows each one against your dev or staging site. You see the final destination, the HTTP status code, and whether the redirect resolves the way you expect — all in one pass.",
            points: [
                "Check entire URL lists in a single batch",
                "See the resolved destination for every request",
                "Spot redirect chains, loops, and dead ends instantly",
            ],
        },
        {
            icon: FileCode2,
            title: "Redirect rules for your stack",
            body: "Once your redirects are verified, export clean rules that are ready to drop straight into your server config — whether you run Apache, nginx, Caddy, or Netlify. No hand-editing, no typos — just copy and ship.",
            points: [
                "Output for Apache (.htaccess), nginx, Caddy, and Netlify",
                "Generated only from verified redirects",
                "Copy straight into your config or redirects file",
            ],
        },
        {
            icon: Camera,
            title: "Destination screenshots",
            body: "A redirect that returns a 200 isn't always the right page. Redirects Wizard captures a screenshot of each destination so you can confirm visitors land on the page you intended — not a generic homepage or error screen.",
            points: [
                "Automatic screenshot capture per batch",
                "Refresh any screenshot on demand",
                "Catch soft 404s and wrong-page redirects",
            ],
        },
        {
            icon: Gauge,
            title: "Progress tracking",
            body: "Every batch shows how many redirects are addressed versus still pending, with a clear progress bar. Mark redirects as handled as you work through them, and always know exactly what's left before launch.",
            points: [
                "Addressed vs. pending counts per batch",
                "Visual progress bars at a glance",
                "Filter, search, and sort by what needs work",
            ],
        },
    ];

    const grid = [
        {
            icon: FolderPlus,
            title: "Organized batches",
            body: "Group redirects by project, migration, or client and return to any batch later.",
        },
        {
            icon: Search,
            title: "Search & sort",
            body: "Find batches by URL and sort by most recent, name, or what still needs work.",
        },
        {
            icon: RotateCw,
            title: "On-demand refresh",
            body: "Re-run a check or re-capture a screenshot any time the target site changes.",
        },
        {
            icon: ShieldCheck,
            title: "SEO protection",
            body: "Preserve link equity and rankings by verifying every redirect before go-live.",
        },
        {
            icon: CheckCircle2,
            title: "Status codes",
            body: "See 301, 302, 404, and everything in between so you redirect with the right code.",
        },
        {
            icon: Gauge,
            title: "Launch confidence",
            body: "Walk into launch day with a verified, exportable record of every redirect.",
        },
    ];
</script>

<svelte:head>
    <title>Features — Redirects Wizard</title>
    <meta
        name="description"
        content="Bulk redirect checks, multi-platform redirect rules for Apache, nginx, Caddy, and Netlify, destination screenshots, and progress tracking — everything you need to land a site migration."
    />
</svelte:head>

<!-- Header -->
<section
    class="border-b border-zinc-200 bg-linear-to-b from-teal-50/70 to-white"
>
    <div class="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1
            class="mx-auto max-w-[22ch] text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl"
        >
            Built to check redirects, end to end
        </h1>
        <p class="mx-auto mt-5 max-w-2xl text-lg/8 text-pretty text-zinc-600">
            From verifying a thousand legacy URLs to exporting the redirect
            rules that make them work — every step lives in one place.
        </p>
        <div class="mt-8 flex justify-center">
            <Button href={primaryCta.href} size="lg">
                {primaryCta.label}
                <ArrowRight class="size-4" />
            </Button>
        </div>
    </div>
</section>

<!-- Alternating sections -->
<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    {#each sections as section, i (section.title)}
        <section
            class="grid items-center gap-10 border-b border-zinc-100 py-20 lg:grid-cols-2 lg:gap-16"
        >
            <div class={i % 2 === 1 ? "lg:order-2" : ""}>
                <div
                    class="flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700"
                >
                    <section.icon class="size-6" />
                </div>
                <h2
                    class="mt-5 text-2xl font-semibold tracking-tight text-balance text-zinc-950"
                >
                    {section.title}
                </h2>
                <p class="mt-3 text-lg/8 text-pretty text-zinc-600">
                    {section.body}
                </p>
                <ul role="list" class="mt-6 space-y-3">
                    {#each section.points as point (point)}
                        <li
                            class="flex items-start gap-3 text-base/7 text-zinc-700"
                        >
                            <CheckCircle2
                                class="mt-1 size-5 shrink-0 text-teal-600"
                            />
                            {point}
                        </li>
                    {/each}
                </ul>
            </div>
            <div class={i % 2 === 1 ? "lg:order-1" : ""}>
                <div
                    class="aspect-4/3 rounded-2xl bg-linear-to-br from-teal-100 via-teal-50 to-white ring-1 ring-zinc-200"
                >
                    <div class="flex h-full items-center justify-center">
                        <section.icon class="size-20 text-teal-600/40" />
                    </div>
                </div>
            </div>
        </section>
    {/each}
</div>

<!-- Grid of smaller features -->
<section class="bg-zinc-50">
    <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
            <h2
                class="text-3xl font-semibold tracking-tight text-balance text-zinc-950"
            >
                And the details that save you time
            </h2>
        </div>
        <dl class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each grid as item (item.title)}
                <div class="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
                    <div
                        class="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700"
                    >
                        <item.icon class="size-5" />
                    </div>
                    <dt class="mt-4 text-base/7 font-semibold text-zinc-950">
                        {item.title}
                    </dt>
                    <dd class="mt-1.5 text-base/7 text-zinc-600">
                        {item.body}
                    </dd>
                </div>
            {/each}
        </dl>
    </div>
</section>

<!-- CTA -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
    <div
        class="overflow-hidden rounded-3xl bg-teal-700 px-6 py-16 text-center sm:px-16"
    >
        <h2
            class="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white"
        >
            Ready to verify your redirects?
        </h2>
        <p class="mx-auto mt-4 max-w-xl text-lg/8 text-pretty text-teal-50">
            Create your first batch and see exactly where every URL lands.
        </p>
        <div
            class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
            <Button
                href={primaryCta.href}
                size="lg"
                class="bg-white text-teal-800 hover:bg-teal-50"
            >
                {primaryCta.label}
                <ArrowRight class="size-4" />
            </Button>
            <Button
                href="/contact"
                size="lg"
                variant="outline"
                class="border-teal-400 bg-transparent text-white hover:bg-teal-600 hover:text-white"
            >
                Talk to us
            </Button>
        </div>
    </div>
</section>
