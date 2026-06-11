<script lang="ts">
    import { enhance } from "$app/forms";
    import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { buttonVariants } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import Input from "$lib/components/ui/input/input.svelte";
    import Textarea from "$lib/components/ui/textarea/textarea.svelte";
    import {
        Check,
        Clipboard,
        Eye,
        EyeOff,
        FileText,
        RotateCw,
        Trash2,
    } from "lucide-svelte";

    type RedirectFormat = {
        id: string;
        label: string;
        filename: string;
        body: string;
    };

    let { data, form } = $props();

    let hideAddressed = $state(false);
    let hidePending = $state(false);
    let checkingAll = $state(false);
    let checkMessage = $state("");
    let urlRows = $state<typeof data.urls>([]);
    let redirectsOpen = $state(false);
    let redirectsLoading = $state(false);
    let redirectsError = $state("");
    let redirectFormats = $state<RedirectFormat[]>([]);
    let selectedFormatId = $state("apache");
    let copyMessage = $state("");
    let redirectCount = $state(0);

    $effect(() => {
        urlRows = data.urls;
    });

    $effect(() => {
        if (redirectsOpen) {
            void loadRedirects();
        } else {
            copyMessage = "";
        }
    });

    const validDevUrl = $derived(Boolean(data.batch.devUrl));
    const addressedCount = $derived(
        urlRows.filter((url) => url.addressed).length,
    );
    const pendingCount = $derived(
        urlRows.filter((url) => !url.addressed).length,
    );
    const visibleUrls = $derived(
        urlRows.filter((url) => {
            if (hideAddressed && url.addressed) return false;
            if (hidePending && !url.addressed && url.redirectTo) return false;
            return true;
        }),
    );
    const selectedFormat = $derived(
        redirectFormats.find((format) => format.id === selectedFormatId) ??
            redirectFormats[0],
    );

    async function loadRedirects() {
        redirectsLoading = true;
        redirectsError = "";
        copyMessage = "";

        try {
            const response = await fetch(
                `/api/batches/${data.batch.id}/redirects`,
            );
            if (!response.ok) {
                redirectsError = "Could not load redirects.";
                return;
            }

            const payload = (await response.json()) as {
                formats: RedirectFormat[];
                count: number;
            };
            redirectFormats = payload.formats;
            redirectCount = payload.count;
            if (
                !payload.formats.some(
                    (format) => format.id === selectedFormatId,
                )
            ) {
                selectedFormatId = payload.formats[0]?.id ?? "apache";
            }
        } catch {
            redirectsError = "Could not load redirects.";
        } finally {
            redirectsLoading = false;
        }
    }

    function selectRedirectFormat(id: string) {
        selectedFormatId = id;
        copyMessage = "";
    }

    function copyWithFallback(text: string) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.append(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();

        if (!copied) {
            throw new Error("Copy command failed");
        }
    }

    async function copySelectedRedirects() {
        if (!selectedFormat) return;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(selectedFormat.body);
            } else {
                copyWithFallback(selectedFormat.body);
            }
            copyMessage = "Copied";
        } catch {
            copyMessage = "Copy failed";
        }
    }

    async function recheck(id: number) {
        const response = await fetch(`/api/urls/${id}/check`, {
            method: "POST",
        });
        if (response.ok) {
            const updated = await response.json();
            urlRows = urlRows.map((url) =>
                url.id === id ? { ...url, ...updated } : url,
            );
        }
    }

    async function recheckMany(onlyUnaddressed: boolean) {
        checkingAll = true;
        checkMessage = "Checking URLs...";
        const targets = urlRows.filter(
            (url) => !onlyUnaddressed || !url.addressed,
        );

        for (const url of targets) {
            await recheck(url.id);
        }

        checkingAll = false;
        checkMessage = `Checked ${targets.length} URL${targets.length === 1 ? "" : "s"}.`;
    }

    async function updateRedirect(id: number, redirectTo: string) {
        const response = await fetch(`/api/urls/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ redirectTo }),
        });

        if (response.ok) {
            const updated = await response.json();
            urlRows = urlRows.map((url) =>
                url.id === id ? { ...url, ...updated } : url,
            );
        }
    }

    async function removeUrl(id: number) {
        const response = await fetch(`/api/urls/${id}`, { method: "DELETE" });
        if (response.ok) {
            urlRows = urlRows.filter((url) => url.id !== id);
        }
    }
</script>

<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
        <div class="min-w-0">
            <a
                href="/"
                class="text-base/7 font-medium text-teal-700 sm:text-sm/6"
                >Back to batches</a
            >
            <h1 class="mt-2 truncate text-2xl/8 font-semibold text-zinc-950">
                {data.batch.devUrl || "New redirect batch"}
            </h1>
            <div class="mt-2 flex flex-wrap gap-2">
                <Badge>{urlRows.length} URLs</Badge>
                <Badge
                    class={pendingCount > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-teal-100 text-teal-800"}
                >
                    {addressedCount} addressed
                </Badge>
            </div>
        </div>

        {#if validDevUrl}
            <Dialog.Root bind:open={redirectsOpen}>
                <Dialog.Trigger
                    class="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-base/6 font-medium text-zinc-900 ring-1 ring-zinc-200 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:py-1.5 sm:text-sm/6"
                >
                    View redirects <FileText class="size-5 sm:size-4" />
                </Dialog.Trigger>
                <Dialog.Content class="sm:max-w-4xl">
                    <Dialog.Header>
                        <Dialog.Title>Redirects</Dialog.Title>
                        <Dialog.Description>
                            {redirectCount} pending URL{redirectCount === 1
                                ? ""
                                : "s"} with redirect targets.
                        </Dialog.Description>
                    </Dialog.Header>

                    {#if redirectsLoading}
                        <div
                            class="rounded-md bg-zinc-50 px-4 py-8 text-center text-base/7 text-zinc-600 ring-1 ring-zinc-200 sm:text-sm/6"
                        >
                            Loading redirects...
                        </div>
                    {:else if redirectsError}
                        <div
                            class="rounded-md bg-red-50 px-4 py-3 text-base/7 text-red-800 ring-1 ring-red-200 sm:text-sm/6"
                        >
                            {redirectsError}
                        </div>
                    {:else if selectedFormat}
                        <div class="flex flex-wrap gap-2">
                            {#each redirectFormats as format}
                                <button
                                    type="button"
                                    aria-pressed={selectedFormatId ===
                                        format.id}
                                    class={`rounded-md px-3 py-2 text-base/6 font-medium ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:py-1.5 sm:text-sm/6 ${
                                        selectedFormatId === format.id
                                            ? "bg-teal-700 text-white ring-teal-700"
                                            : "bg-white text-zinc-900 ring-zinc-200 hover:bg-zinc-50"
                                    }`}
                                    onclick={() =>
                                        selectRedirectFormat(format.id)}
                                >
                                    {format.label}
                                </button>
                            {/each}
                        </div>

                        <div class="min-h-0 overflow-hidden">
                            <div
                                class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span
                                    class="font-mono text-base/7 text-zinc-600 sm:text-sm/6"
                                >
                                    {selectedFormat.filename}
                                </span>
                                <Button
                                    type="button"
                                    onclick={copySelectedRedirects}
                                >
                                    {#if copyMessage === "Copied"}
                                        <Check class="size-5 sm:size-4" />
                                    {:else}
                                        <Clipboard class="size-5 sm:size-4" />
                                    {/if}
                                    {copyMessage || "Copy to clipboard"}
                                </Button>
                            </div>
                            <pre
                                class="max-h-[52vh] min-h-72 overflow-auto rounded-md bg-zinc-950 p-4 text-sm/6 whitespace-pre-wrap text-zinc-50 ring-1 ring-zinc-950/10"><code
                                    >{selectedFormat.body}</code
                                ></pre>
                        </div>
                    {/if}
                </Dialog.Content>
            </Dialog.Root>
        {/if}
    </div>

    {#if form?.message}
        <div
            class="mb-4 rounded-md bg-amber-50 px-4 py-3 text-base/7 text-amber-900 ring-1 ring-amber-200 sm:text-sm/6"
        >
            {form.message}
        </div>
    {/if}
    {#if form?.success}
        <div
            class="mb-4 rounded-md bg-teal-50 px-4 py-3 text-base/7 text-teal-900 ring-1 ring-teal-200 sm:text-sm/6"
        >
            {form.success}
        </div>
    {/if}

    <section class="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        <form
            method="POST"
            action="?/updateDevUrl"
            class="grid gap-3 sm:grid-cols-[1fr_auto]"
        >
            <div>
                <label
                    for="devUrl"
                    class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                    >Dev URL</label
                >
                <Input
                    id="devUrl"
                    name="devUrl"
                    value={data.batch.devUrl}
                    placeholder="https://www.example.test"
                />
            </div>
            <div class="flex items-end">
                <Button type="submit" class="w-full sm:w-auto"
                    >Update URL</Button
                >
            </div>
        </form>
    </section>

    {#if validDevUrl}
        <section class="mt-4 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
            <div class="mb-4 flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    onclick={() => (hideAddressed = !hideAddressed)}
                >
                    {#if hideAddressed}<Eye class="size-5 sm:size-4" /> Show addressed{:else}<EyeOff
                            class="size-5 sm:size-4"
                        /> Hide addressed{/if}
                </Button>
                <Button
                    type="button"
                    onclick={() => (hidePending = !hidePending)}
                >
                    {#if hidePending}<Eye class="size-5 sm:size-4" /> Show pending{:else}<EyeOff
                            class="size-5 sm:size-4"
                        /> Hide pending{/if}
                </Button>
                <Button
                    type="button"
                    disabled={checkingAll}
                    onclick={() => recheckMany(true)}
                >
                    <RotateCw
                        class={`size-5 sm:size-4 ${checkingAll ? "animate-spin" : ""}`}
                    /> Recheck unaddressed
                </Button>
                <Button
                    type="button"
                    disabled={checkingAll}
                    onclick={() => recheckMany(false)}
                >
                    <RotateCw
                        class={`size-5 sm:size-4 ${checkingAll ? "animate-spin" : ""}`}
                    /> Recheck all
                </Button>
                {#if checkMessage}<span
                        class="text-base/7 text-zinc-500 sm:text-sm/6"
                        >{checkMessage}</span
                    >{/if}
            </div>

            <div class="@container">
                <div class="grid gap-3 @4xl:grid-cols-2">
                    {#each visibleUrls as url}
                        <article
                            class={`rounded-lg p-4 ring-1 ring-zinc-200 ${url.addressed ? "bg-zinc-50" : "bg-white"}`}
                        >
                            <div class="flex items-start justify-between gap-3">
                                <a
                                    href={url.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    class={`min-w-0 text-base/7 font-medium wrap-break-word text-teal-800 sm:text-sm/6 ${url.addressed ? "line-through" : ""}`}
                                >
                                    {url.url}
                                </a>
                                <Badge
                                    class={url.addressed
                                        ? "bg-teal-100 text-teal-800"
                                        : "bg-amber-100 text-amber-800"}
                                >
                                    {url.addressed ? "Addressed" : "Open"}
                                </Badge>
                            </div>

                            {#if !url.addressed}
                                <div class="mt-4">
                                    <label
                                        for={`redirect-${url.id}`}
                                        class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                                    >
                                        Redirect to
                                    </label>
                                    <Input
                                        id={`redirect-${url.id}`}
                                        name={`redirect-${url.id}`}
                                        value={url.redirectTo ?? ""}
                                        placeholder="/"
                                        onblur={(event: FocusEvent) =>
                                            updateRedirect(
                                                url.id,
                                                (
                                                    event.currentTarget as HTMLInputElement
                                                ).value,
                                            )}
                                    />
                                    {#if url.devRedirectUrl}
                                        <a
                                            href={url.devRedirectUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            class="mt-2 inline-flex text-base/7 font-medium text-teal-700 sm:text-sm/6"
                                        >
                                            Verify redirect target
                                        </a>
                                    {/if}
                                </div>
                            {/if}

                            <div class="mt-4 flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onclick={() => recheck(url.id)}
                                >
                                    <RotateCw class="size-5 sm:size-4" /> Test live
                                    redirect
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onclick={() => removeUrl(url.id)}
                                >
                                    <Trash2 class="size-5 sm:size-4" /> Remove
                                </Button>
                            </div>

                            {#if url.httpResponse}
                                <div
                                    class="mt-3 text-base/7 text-zinc-600 sm:text-sm/6"
                                >
                                    Status: {url.httpResponse.status_code}
                                    {#if url.httpResponse.redirect_path?.length}
                                        <ol
                                            class="mt-2 list-decimal space-y-1 pl-5"
                                        >
                                            {#each url.httpResponse.redirect_path as redirect}
                                                <li class="break-all">
                                                    {redirect}
                                                </li>
                                            {/each}
                                        </ol>
                                    {/if}
                                </div>
                            {/if}
                        </article>
                    {/each}
                </div>
            </div>
        </section>

        <section class="mt-4 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
            <h2 class="text-lg/7 font-semibold text-zinc-950 sm:text-base/7">
                Add URLs to test
            </h2>
            <form
                method="POST"
                action="?/addUrls"
                class="mt-3 space-y-3"
                use:enhance
            >
                <div>
                    <label
                        for="urls"
                        class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                        >URLs, one per line</label
                    >
                    <Textarea id="urls" name="urls" rows={8} />
                </div>
                <Button type="submit">Add URLs</Button>
            </form>
        </section>
    {:else}
        <div
            class="mt-4 rounded-lg bg-sky-50 px-4 py-3 text-base/7 text-sky-950 ring-1 ring-sky-200 sm:text-sm/6"
        >
            Enter a valid dev URL before adding URLs.
        </div>
    {/if}

    <section class="mt-6 flex justify-end">
        <AlertDialog.Root>
            <AlertDialog.Trigger
                class={buttonVariants({ variant: "destructive" })}
            >
                Archive batch
            </AlertDialog.Trigger>
            <AlertDialog.Content
                class="mx-4 max-w-[calc(100%-2rem)] bg-white text-zinc-950 ring-zinc-950/10"
            >
                <AlertDialog.Header>
                    <AlertDialog.Title class="text-zinc-950">
                        Archive batch?
                    </AlertDialog.Title>
                    <AlertDialog.Description class="text-zinc-600">
                        This will hide {data.batch.devUrl ||
                            "this redirect batch"} from your batches list. You can
                        no longer access it from the app after archiving.
                    </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                    <form method="POST" action="?/archive">
                        <AlertDialog.Action type="submit" variant="destructive">
                            Archive batch
                        </AlertDialog.Action>
                    </form>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog.Root>
    </section>
</main>
