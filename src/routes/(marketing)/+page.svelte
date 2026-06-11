<script lang="ts">
    import Button from "$lib/components/ui/button/button.svelte";
    import {
        ArrowRight,
        Check,
        FolderPlus,
        ListChecks,
        FileCode2,
        Camera,
        Gauge,
        ShieldCheck,
    } from "lucide-svelte";

    let { data } = $props();

    const primaryCta = $derived(
        data.user
            ? { href: "/dashboard", label: "Go to dashboard" }
            : { href: "/register", label: "Start checking redirects" },
    );

    const steps = [
        {
            icon: FolderPlus,
            title: "Create a batch",
            body: "Point a batch at your staging or dev site, then paste in the old URLs you need to redirect.",
        },
        {
            icon: ListChecks,
            title: "Check every redirect",
            body: "We follow each URL, record the final destination and status code, and flag anything that misses.",
        },
        {
            icon: FileCode2,
            title: "Export the redirect rules",
            body: "Copy production-ready rules for Apache, nginx, Caddy, Netlify, or Next.js once every redirect is verified and addressed.",
        },
    ];

    const features = [
        {
            icon: ListChecks,
            title: "Bulk redirect checks",
            body: "Validate hundreds of URLs at once and see exactly where each one lands.",
        },
        {
            icon: FileCode2,
            title: "Rules for your stack",
            body: "Generate clean, copy-paste redirect rules for Apache, nginx, Caddy, Netlify, or Next.js — ready to drop straight into your config.",
        },
        {
            icon: Camera,
            title: "Live screenshots",
            body: "Capture a screenshot of each destination so you can confirm the page looks right.",
        },
        {
            icon: Gauge,
            title: "Progress tracking",
            body: "Track addressed vs. pending redirects per batch so nothing slips through the cracks.",
        },
        {
            icon: ShieldCheck,
            title: "Protect your SEO",
            body: "Catch broken or missing redirects before launch and preserve your hard-won rankings.",
        },
        {
            icon: FolderPlus,
            title: "Organized in batches",
            body: "Group redirects by project or migration and pick up right where you left off.",
        },
    ];
</script>

<svelte:head>
    <title>Redirects Wizard — Ship site migrations without losing SEO</title>
    <meta
        name="description"
        content="Verify every redirect against your staging site and generate production-ready redirect rules for Apache, nginx, Caddy, Netlify, and Next.js before your migration goes live."
    />
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
    <div
        class="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-teal-50/70 to-white"
    ></div>
    <div
        class="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 lg:px-8"
    >
        <p
            class="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-sm/6 font-medium text-teal-800"
        >
            <Check class="size-3.5" /> Built for site migrations
        </p>
        <h1
            class="mx-auto mt-6 max-w-[20ch] text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl"
        >
            Migrate your site without losing a single redirect
        </h1>
        <p class="mx-auto mt-5 max-w-2xl text-lg/8 text-pretty text-zinc-600">
            Redirects Wizard checks every old URL against your new site, flags
            the ones that miss, and generates production-ready redirect rules —
            so your rankings survive launch day.
        </p>
        <div
            class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
            <Button href={primaryCta.href} size="lg">
                {primaryCta.label}
                <ArrowRight class="size-4" />
            </Button>
            <Button href="/features" size="lg" variant="outline">
                See how it works
            </Button>
        </div>
        <p class="mt-4 text-sm/6 text-zinc-500">
            No credit card required. Start your first batch in minutes.
        </p>
    </div>
</section>

<!-- Problem / value strip -->
<section class="border-y border-zinc-200 bg-zinc-50">
    <div
        class="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8"
    >
        {#each [{ stat: "301s", label: "Verified end to end" }, { stat: "5", label: "Export formats, ready to ship" }, { stat: "100%", label: "Coverage before launch" }, { stat: "0", label: "Surprises on go-live" }] as item (item.label)}
            <div class="px-4 text-center">
                <p class="text-3xl/9 font-semibold text-teal-700 tabular-nums">
                    {item.stat}
                </p>
                <p class="mt-1 text-sm/6 text-zinc-600">{item.label}</p>
            </div>
        {/each}
    </div>
</section>

<!-- How it works -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
    <div class="max-w-2xl">
        <h2
            class="text-3xl font-semibold tracking-tight text-balance text-zinc-950"
        >
            Three steps to a clean migration
        </h2>
        <p class="mt-4 text-lg/8 text-pretty text-zinc-600">
            From a list of old URLs to verified redirect rules — without the
            spreadsheet.
        </p>
    </div>
    <dl class="mt-14 grid gap-8 md:grid-cols-3">
        {#each steps as step, i (step.title)}
            <div class="relative rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
                <div
                    class="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"
                >
                    <step.icon class="size-5" />
                </div>
                <p
                    class="mt-4 text-sm/6 font-medium text-teal-700 tabular-nums"
                >
                    Step {i + 1}
                </p>
                <dt class="mt-1 text-lg/7 font-semibold text-zinc-950">
                    {step.title}
                </dt>
                <dd class="mt-2 text-base/7 text-zinc-600">{step.body}</dd>
            </div>
        {/each}
    </dl>
</section>

<!-- Features grid -->
<section class="border-t border-zinc-200 bg-zinc-50">
    <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
            <h2
                class="text-3xl font-semibold tracking-tight text-balance text-zinc-950"
            >
                Everything you need to land the redirects
            </h2>
            <p class="mt-4 text-lg/8 text-pretty text-zinc-600">
                Purpose-built for the messy reality of moving a site to a new
                platform, structure, or domain.
            </p>
        </div>
        <dl class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each features as feature (feature.title)}
                <div class="rounded-2xl bg-white p-6 ring-1 ring-zinc-200">
                    <div
                        class="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700"
                    >
                        <feature.icon class="size-5" />
                    </div>
                    <dt class="mt-4 text-base/7 font-semibold text-zinc-950">
                        {feature.title}
                    </dt>
                    <dd class="mt-1.5 text-base/7 text-zinc-600">
                        {feature.body}
                    </dd>
                </div>
            {/each}
        </dl>
        <div class="mt-12">
            <Button href="/features" variant="outline">
                Explore all features <ArrowRight class="size-4" />
            </Button>
        </div>
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
            Don't let a migration tank your traffic
        </h2>
        <p class="mx-auto mt-4 max-w-xl text-lg/8 text-pretty text-teal-50">
            Spin up a batch, check your redirects, and walk into launch day
            knowing every URL lands where it should.
        </p>
        <div class="mt-8 flex justify-center">
            <Button
                href={primaryCta.href}
                size="lg"
                class="bg-white text-teal-800 hover:bg-teal-50"
            >
                {primaryCta.label}
                <ArrowRight class="size-4" />
            </Button>
        </div>
    </div>
</section>
