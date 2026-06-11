<script lang="ts">
    import { enhance } from "$app/forms";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import { urlSortKey } from "$lib/utils";
    import {
        Check,
        ExternalLink,
        FolderPlus,
        Plus,
        RotateCw,
        Search,
    } from "lucide-svelte";

    let { data, form } = $props();

    let createOpen = $state(false);
    let creating = $state(false);

    let refreshing = $state<Record<number, boolean>>({});

    let query = $state("");
    let sort = $state<"recent" | "name" | "needs-work">("recent");

    const totalRedirects = $derived(
        data.batches.reduce((sum, batch) => sum + batch.urlCount, 0),
    );
    const pendingRedirects = $derived(
        data.batches.reduce((sum, batch) => sum + batch.remainingCount, 0),
    );
    const completedBatches = $derived(
        data.batches.filter(
            (batch) => batch.urlCount > 0 && batch.remainingCount === 0,
        ).length,
    );

    const filteredBatches = $derived.by(() => {
        const needle = query.trim().toLowerCase();
        const matches = needle
            ? data.batches.filter((batch) =>
                  batch.devUrl.toLowerCase().includes(needle),
              )
            : [...data.batches];

        return matches.sort((a, b) => {
            if (sort === "name")
                return urlSortKey(a.devUrl).localeCompare(urlSortKey(b.devUrl));
            if (sort === "needs-work")
                return b.remainingCount - a.remainingCount;
            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
        });
    });

    function screenshotUrl(batch: {
        id: number;
        screenshotUpdatedAt: Date | null;
    }) {
        if (!batch.screenshotUpdatedAt) return null;
        const version = new Date(batch.screenshotUpdatedAt).getTime();
        return `/api/screenshot/${batch.id}?v=${version}`;
    }
</script>

<Sheet.Root bind:open={createOpen}>
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div
            class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div>
                <h1 class="text-2xl/8 font-semibold text-zinc-950">
                    Redirect Batches
                </h1>
                <p class="text-base/7 text-zinc-600 sm:text-sm/6">
                    Manage redirect checks and export redirect rules.
                </p>
            </div>
            <Sheet.Trigger>
                {#snippet child({ props })}
                    <Button {...props}>
                        <Plus class="size-5 sm:size-4" /> New batch
                    </Button>
                {/snippet}
            </Sheet.Trigger>
        </div>

        {#if data.batches.length}
            <div
                class="@container mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-zinc-200 ring-1 ring-zinc-200 @2xl:grid-cols-4"
            >
                <div class="bg-white p-4">
                    <p class="truncate text-sm/6 text-zinc-500">Batches</p>
                    <p
                        class="text-2xl/8 font-semibold text-zinc-950 tabular-nums"
                    >
                        {data.batches.length}
                    </p>
                </div>
                <div class="bg-white p-4">
                    <p class="truncate text-sm/6 text-zinc-500">Completed</p>
                    <p
                        class="text-2xl/8 font-semibold text-zinc-950 tabular-nums"
                    >
                        {completedBatches}
                    </p>
                </div>
                <div class="bg-white p-4">
                    <p class="truncate text-sm/6 text-zinc-500">
                        Total redirects
                    </p>
                    <p
                        class="text-2xl/8 font-semibold text-zinc-950 tabular-nums"
                    >
                        {totalRedirects}
                    </p>
                </div>
                <div class="bg-white p-4">
                    <p class="truncate text-sm/6 text-zinc-500">
                        Still pending
                    </p>
                    <p
                        class="text-2xl/8 font-semibold tabular-nums {pendingRedirects >
                        0
                            ? 'text-amber-700'
                            : 'text-teal-700'}"
                    >
                        {pendingRedirects}
                    </p>
                </div>
            </div>

            <div
                class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div class="relative sm:max-w-xs sm:flex-1">
                    <Search
                        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                    />
                    <Input
                        type="search"
                        placeholder="Search by URL…"
                        bind:value={query}
                        class="pl-9"
                        aria-label="Search batches by URL"
                    />
                </div>
                <label class="flex items-center gap-2 text-sm/6 text-zinc-600">
                    Sort
                    <select
                        bind:value={sort}
                        class="rounded-md bg-white py-1.5 pr-8 pl-3 text-sm/6 text-zinc-900 ring-1 ring-zinc-200 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    >
                        <option value="recent">Most recent</option>
                        <option value="needs-work">Needs work</option>
                        <option value="name">URL (A–Z)</option>
                    </select>
                </label>
            </div>

            {#if filteredBatches.length}
                <div class="@container">
                    <div class="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
                        {#each filteredBatches as batch (batch.id)}
                            {@const addressed =
                                batch.urlCount - batch.remainingCount}
                            {@const percent =
                                batch.urlCount > 0
                                    ? Math.round(
                                          (addressed / batch.urlCount) * 100,
                                      )
                                    : 0}
                            {@const complete =
                                batch.urlCount > 0 &&
                                batch.remainingCount === 0}
                            <article
                                class="group overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200 transition hover:shadow-md hover:ring-zinc-300"
                            >
                                <div class="relative">
                                    <a
                                        href={`/batch/${batch.id}`}
                                        aria-label={`Manage ${batch.devUrl}`}
                                    >
                                        {#if screenshotUrl(batch)}
                                            <img
                                                src={screenshotUrl(batch)}
                                                alt={`${batch.devUrl} screenshot`}
                                                class="aspect-video w-full bg-zinc-200 object-cover transition group-hover:opacity-90"
                                                loading="lazy"
                                            />
                                        {:else}
                                            <div
                                                class="flex aspect-video w-full items-center justify-center bg-zinc-200 text-sm text-zinc-500"
                                            >
                                                No screenshot yet
                                            </div>
                                        {/if}
                                    </a>
                                    <form
                                        method="POST"
                                        action="?/refreshScreenshot"
                                        class="absolute top-2 right-2"
                                        use:enhance={() => {
                                            refreshing[batch.id] = true;
                                            return async ({ update }) => {
                                                await update();
                                                refreshing[batch.id] = false;
                                            };
                                        }}
                                    >
                                        <input
                                            type="hidden"
                                            name="batchId"
                                            value={batch.id}
                                        />
                                        <button
                                            type="submit"
                                            disabled={refreshing[batch.id]}
                                            title="Refresh screenshot"
                                            aria-label="Refresh screenshot"
                                            class="rounded-md bg-white/90 p-1.5 text-zinc-700 ring-1 ring-zinc-200 backdrop-blur hover:bg-white disabled:opacity-60"
                                        >
                                            <RotateCw
                                                class={`size-4 ${refreshing[batch.id] ? "animate-spin" : ""}`}
                                            />
                                        </button>
                                    </form>
                                </div>
                                <div class="space-y-4 p-4">
                                    <div class="space-y-2">
                                        <a
                                            href={`/batch/${batch.id}`}
                                            class="block truncate text-base/6 font-semibold text-teal-800 hover:text-teal-900"
                                        >
                                            {batch.devUrl}
                                        </a>
                                        <div
                                            class="flex flex-wrap items-center gap-2"
                                        >
                                            {#if complete}
                                                <Badge
                                                    class="bg-teal-100 text-teal-800"
                                                >
                                                    <Check class="size-3" /> Complete
                                                </Badge>
                                            {:else if batch.urlCount > 0}
                                                <Badge
                                                    class="bg-amber-100 text-amber-800 tabular-nums"
                                                >
                                                    {batch.remainingCount} pending
                                                </Badge>
                                            {:else}
                                                <Badge
                                                    class="bg-zinc-100 text-zinc-600"
                                                >
                                                    No redirects yet
                                                </Badge>
                                            {/if}
                                            <span
                                                class="text-base/7 text-zinc-500 tabular-nums sm:text-sm/6"
                                            >
                                                Created {new Date(
                                                    batch.createdAt,
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div class="space-y-1.5">
                                        <div
                                            class="flex items-center justify-between text-sm/6 text-zinc-600 tabular-nums"
                                        >
                                            <span>
                                                {addressed} / {batch.urlCount} addressed
                                            </span>
                                            <span class="font-medium">
                                                {percent}%
                                            </span>
                                        </div>
                                        <div
                                            class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"
                                            role="progressbar"
                                            aria-valuenow={percent}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`${percent}% of redirects addressed`}
                                        >
                                            <div
                                                class="h-full rounded-full transition-[width] {complete
                                                    ? 'bg-teal-600'
                                                    : 'bg-teal-500'} w-(--progress)"
                                                style="--progress: {percent}%"
                                            ></div>
                                        </div>
                                    </div>

                                    <div
                                        class="flex items-center justify-between gap-3"
                                    >
                                        <a
                                            href={`/batch/${batch.id}`}
                                            class="rounded-md bg-white px-3 py-2 text-base/6 font-medium text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 sm:py-1.5 sm:text-sm/6"
                                        >
                                            Manage
                                        </a>
                                        <a
                                            href={batch.devUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            class="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-base/6 font-medium text-zinc-700 hover:bg-zinc-100 sm:py-1.5 sm:text-sm/6"
                                        >
                                            Visit <ExternalLink
                                                class="size-5 sm:size-4"
                                            />
                                        </a>
                                    </div>
                                </div>
                            </article>
                        {/each}
                    </div>
                </div>
            {:else}
                <div
                    class="rounded-lg bg-white p-8 text-center ring-1 ring-zinc-200"
                >
                    <p class="text-base/7 text-zinc-600">
                        No batches match “{query}”.
                    </p>
                    <button
                        type="button"
                        class="mt-2 text-sm/6 font-medium text-teal-700 hover:text-teal-900"
                        onclick={() => (query = "")}
                    >
                        Clear search
                    </button>
                </div>
            {/if}
        {:else}
            <div
                class="flex flex-col items-center rounded-lg bg-white px-6 py-16 text-center ring-1 ring-zinc-200"
            >
                <div
                    class="flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700"
                >
                    <FolderPlus class="size-6" />
                </div>
                <h2 class="mt-4 text-lg/7 font-semibold text-zinc-950">
                    Create your first redirect batch
                </h2>
                <p class="mt-1 max-w-sm text-base/7 text-zinc-600 sm:text-sm/6">
                    A batch groups the redirects you want to check against a dev
                    or staging site, then generates redirect rules for Apache,
                    nginx, Caddy, Netlify, and Next.js.
                </p>
                <Sheet.Trigger>
                    {#snippet child({ props })}
                        <Button {...props} class="mt-6">
                            <Plus class="size-5 sm:size-4" /> New batch
                        </Button>
                    {/snippet}
                </Sheet.Trigger>
            </div>
        {/if}
    </main>

    <Sheet.Content>
        <Sheet.Header>
            <Sheet.Title>New redirect batch</Sheet.Title>
            <Sheet.Description>
                Enter the Dev URL — the site where you're actively working on
                the redirects. You'll add the redirects to check after creating
                the batch.
            </Sheet.Description>
        </Sheet.Header>

        <form
            method="POST"
            action="?/create"
            class="flex flex-1 flex-col gap-6"
            use:enhance={() => {
                creating = true;
                return async ({ update }) => {
                    await update();
                    creating = false;
                };
            }}
        >
            <div class="space-y-1.5">
                <label
                    for="new-batch-dev-url"
                    class="block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                >
                    Dev URL
                </label>
                <Input
                    id="new-batch-dev-url"
                    name="devUrl"
                    type="url"
                    value={form?.devUrl ?? ""}
                    placeholder="https://www.example.test"
                    autocomplete="off"
                    required
                />
                <p class="text-sm/6 text-zinc-500">
                    The staging or development site where you're actively
                    working on the redirects.
                </p>
                {#if form?.message}
                    <p class="text-sm/6 text-red-600">
                        {form.message}
                    </p>
                {/if}
            </div>

            <Sheet.Footer showCloseButton>
                <Button type="submit" disabled={creating}>
                    {creating ? "Creating…" : "Create batch"}
                </Button>
            </Sheet.Footer>
        </form>
    </Sheet.Content>
</Sheet.Root>
