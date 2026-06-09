<script lang="ts">
    import Badge from "$lib/components/ui/badge.svelte";
    import Button from "$lib/components/ui/button.svelte";
    import { ExternalLink, Plus } from "lucide-svelte";

    let { data } = $props();

    function screenshotUrl(devUrl: string) {
        const url = new URL(
            "https://screenshot-maker.bootpack.dev/api/screenshot",
        );
        url.searchParams.set("url", devUrl);
        url.searchParams.set("width", "1400");
        url.searchParams.set("height", "800");
        url.searchParams.set("scale", "0.5");
        url.searchParams.set("quality", "80");
        url.searchParams.set("type", "avif");
        return url.toString();
    }
</script>

<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
        <div>
            <h1 class="text-2xl/8 font-semibold text-zinc-950">
                Redirect Batches
            </h1>
            <p class="text-base/7 text-zinc-600 sm:text-sm/6">
                Manage redirect checks and Apache rewrite output.
            </p>
        </div>
        <form method="POST" action="?/create">
            <Button type="submit" variant="primary"
                ><Plus class="size-5 sm:size-4" /> New batch</Button
            >
        </form>
    </div>

    {#if data.batches.length}
        <div class="@container">
            <div class="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
                {#each data.batches as batch}
                    <article
                        class="overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200"
                    >
                        <a
                            href={`/batch/${batch.id}`}
                            aria-label={`Manage ${batch.devUrl}`}
                        >
                            <img
                                src={screenshotUrl(batch.devUrl)}
                                alt={`${batch.devUrl} screenshot`}
                                class="aspect-video w-full bg-zinc-200 object-cover"
                                loading="lazy"
                            />
                        </a>
                        <div class="space-y-4 p-4">
                            <div class="space-y-2">
                                <a
                                    href={`/batch/${batch.id}`}
                                    class="block truncate text-base/6 font-semibold text-teal-800"
                                >
                                    {batch.devUrl}
                                </a>
                                <div class="flex flex-wrap items-center gap-2">
                                    <Badge
                                        class={batch.remainingCount > 0
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-teal-100 text-teal-800"}
                                    >
                                        {batch.urlCount - batch.remainingCount} /
                                        {batch.urlCount} addressed
                                    </Badge>
                                    <span
                                        class="text-base/7 text-zinc-500 sm:text-sm/6"
                                    >
                                        {new Date(
                                            batch.createdAt,
                                        ).toLocaleDateString()}
                                    </span>
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
        <div class="rounded-lg bg-white p-8 text-center ring-1 ring-zinc-200">
            <p class="text-base/7 text-zinc-600">No redirect batches yet.</p>
        </div>
    {/if}
</main>
