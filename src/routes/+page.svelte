<script lang="ts">
    import { enhance } from "$app/forms";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import { ExternalLink, Plus } from "lucide-svelte";

    let { data, form } = $props();

    let createOpen = $state(false);
    let creating = $state(false);

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
        <Sheet.Root bind:open={createOpen}>
            <Sheet.Trigger>
                {#snippet child({ props })}
                    <Button {...props}>
                        <Plus class="size-5 sm:size-4" /> New batch
                    </Button>
                {/snippet}
            </Sheet.Trigger>
            <Sheet.Content>
                <Sheet.Header>
                    <Sheet.Title>New redirect batch</Sheet.Title>
                    <Sheet.Description>
                        Enter the Dev URL — the site where you're actively
                        working on the redirects. You'll add the redirects to
                        check after creating the batch.
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
                            The staging or development site where you're
                            actively working on the redirects.
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
