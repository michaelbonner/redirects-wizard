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
        ExternalLink,
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

    type RedirectChainEntry = {
        url: string;
        status_code?: number | string;
        redirect_to?: string;
    };

    let { data, form } = $props();

    let hideAddressed = $state(false);
    let hidePending = $state(false);
    let checkingAll = $state(false);
    let checkingUrls = $state<Record<number, boolean>>({});
    let checkErrors = $state<Record<number, string>>({});
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

    function getRedirectEntries(
        response: (typeof data.urls)[number]["httpResponse"],
    ): RedirectChainEntry[] {
        if (!response) return [];

        if (response.redirect_chain?.length) {
            return response.redirect_chain.map((entry) => ({
                url: entry.url,
                status_code: entry.status_code,
                redirect_to: entry.redirect_to,
            }));
        }

        return (
            response.redirect_path?.map((url) => ({
                url,
            })) ?? []
        );
    }

    function getStatusCode(status: number | string) {
        return String(status);
    }

    function getDisplayUrl(value: string) {
        try {
            const devUrl = new URL(data.batch.devUrl);
            const candidate = new URL(value, devUrl.origin);

            if (candidate.origin !== devUrl.origin) return value;

            return `${candidate.pathname}${candidate.search}${candidate.hash}`;
        } catch {
            return value;
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
        checkingUrls[id] = true;
        checkErrors[id] = "";

        try {
            const response = await fetch(`/api/urls/${id}/check`, {
                method: "POST",
            });
            if (response.ok) {
                const updated = await response.json();
                urlRows = urlRows.map((url) =>
                    url.id === id ? { ...url, ...updated } : url,
                );
            } else {
                checkErrors[id] = "Could not test URL.";
            }
        } catch {
            checkErrors[id] = "Could not test URL.";
        } finally {
            checkingUrls[id] = false;
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
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
            <a href="/" class="text-base/7 font-medium text-primary sm:text-sm/6">
                Back to batches
            </a>
            <h1 class="mt-2 truncate text-2xl/8 font-semibold text-zinc-950">
                {data.batch.devUrl || "New redirect batch"}
            </h1>
            <p class="mt-1 text-base/7 text-zinc-600 sm:text-sm/6">
                Review live URL checks, add redirect targets, and export rewrite rules.
            </p>
        </div>

        {#if validDevUrl}
            <Dialog.Root bind:open={redirectsOpen}>
                <Dialog.Trigger
                    class={buttonVariants({
                        variant: "outline",
                        class: "w-full gap-1.5 lg:w-auto",
                    })}
                >
                    <FileText class="size-5 sm:size-4" />
                    View redirects
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

    <div
        class="@container mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-zinc-200 ring-1 ring-zinc-200"
    >
        <div class="bg-white p-4">
            <p class="truncate text-sm/6 text-zinc-500">Total URLs</p>
            <p class="text-2xl/8 font-semibold text-zinc-950 tabular-nums">
                {urlRows.length}
            </p>
        </div>
        <div class="bg-white p-4">
            <p class="truncate text-sm/6 text-zinc-500">Addressed</p>
            <p class="text-2xl/8 font-semibold text-teal-700 tabular-nums">
                {addressedCount}
            </p>
        </div>
        <div class="bg-white p-4">
            <p class="truncate text-sm/6 text-zinc-500">Open</p>
            <p
                class={`text-2xl/8 font-semibold tabular-nums ${pendingCount > 0 ? "text-amber-700" : "text-teal-700"}`}
            >
                {pendingCount}
            </p>
        </div>
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
            class="grid gap-3 lg:grid-cols-[1fr_auto]"
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
                <Button type="submit" class="w-full lg:w-auto">Update URL</Button>
            </div>
        </form>
    </section>

    {#if validDevUrl}
        <section class="mt-6">
            <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 class="text-lg/7 font-semibold text-zinc-950 sm:text-base/7">
                        URLs
                    </h2>
                    <p class="text-base/7 text-zinc-600 sm:text-sm/6">
                        Showing {visibleUrls.length} of {urlRows.length} URL{urlRows.length === 1
                            ? ""
                            : "s"}.
                    </p>
                </div>
                {#if checkMessage}
                    <span class="text-base/7 text-zinc-500 sm:text-sm/6">
                        {checkMessage}
                    </span>
                {/if}
            </div>

            <div class="mb-4 flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant={hideAddressed ? "secondary" : "outline"}
                    onclick={() => (hideAddressed = !hideAddressed)}
                >
                    {#if hideAddressed}<Eye class="size-5 sm:size-4" /> Show addressed{:else}<EyeOff
                            class="size-5 sm:size-4"
                        /> Hide addressed{/if}
                </Button>
                <Button
                    type="button"
                    variant={hidePending ? "secondary" : "outline"}
                    onclick={() => (hidePending = !hidePending)}
                >
                    {#if hidePending}<Eye class="size-5 sm:size-4" /> Show pending{:else}<EyeOff
                            class="size-5 sm:size-4"
                        /> Hide pending{/if}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={checkingAll}
                    onclick={() => recheckMany(true)}
                >
                    <RotateCw
                        class={`size-5 sm:size-4 ${checkingAll ? "animate-spin" : ""}`}
                    /> Recheck unaddressed
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={checkingAll}
                    onclick={() => recheckMany(false)}
                >
                    <RotateCw
                        class={`size-5 sm:size-4 ${checkingAll ? "animate-spin" : ""}`}
                    /> Recheck all
                </Button>
            </div>

            <div class="hidden lg:block">
                <div class="-mx-4 -my-2 overflow-x-auto whitespace-nowrap sm:-mx-6 lg:-mx-8">
                    <div class="inline-block min-w-full px-4 py-2 align-middle sm:px-6 lg:px-8">
                        <table class="w-full table-fixed">
                            <colgroup>
                                <col class="w-[34%]" />
                                <col class="w-[26%]" />
                                <col class="w-[22%]" />
                                <col class="w-[18rem]" />
                            </colgroup>
                            <thead>
                                <tr class="border-b border-zinc-200">
                                    <th
                                        scope="col"
                                        class="py-3 pr-4 text-left text-sm/6 font-medium whitespace-nowrap text-zinc-600"
                                    >
                                        URL
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-sm/6 font-medium whitespace-nowrap text-zinc-600"
                                    >
                                        Redirect to
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-sm/6 font-medium whitespace-nowrap text-zinc-600"
                                    >
                                        Status
                                    </th>
                                    <th
                                        scope="col"
                                        class="py-3 pl-4 text-right text-sm/6 font-medium whitespace-nowrap text-zinc-600"
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each visibleUrls as url}
                                    {@const isChecking = checkingUrls[url.id]}
                                    <tr class="border-b border-zinc-200 last:border-b-0">
                                        <td class="max-w-[27rem] py-3 pr-4 align-top">
                                            <a
                                                href={url.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                class={`block min-w-0 text-sm/6 font-medium break-all whitespace-normal text-zinc-950 hover:text-primary ${url.addressed ? "line-through decoration-zinc-400" : ""}`}
                                                title={url.url}
                                            >
                                                {getDisplayUrl(url.url)}
                                            </a>
                                        </td>
                                        <td class="w-[24rem] px-4 py-3 align-top">
                                            {#if !url.addressed}
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
                                                {:else if url.redirectTo}
                                                    <span class="block truncate text-sm/6 text-zinc-700" title={url.redirectTo}>
                                                        {getDisplayUrl(
                                                            url.redirectTo,
                                                        )}
                                                </span>
                                            {:else}
                                                <span class="text-sm/6 text-zinc-400">No redirect target</span>
                                            {/if}
                                        </td>
                                        <td class="px-4 py-3 align-top">
                                            <div class="min-w-0 space-y-1.5">
                                                <Badge
                                                    class={url.addressed
                                                        ? "bg-teal-100 text-teal-800"
                                                        : "bg-amber-100 text-amber-800"}
                                                >
                                                    {url.addressed ? "Addressed" : "Open"}
                                                </Badge>
                                                {#if isChecking}
                                                    <div class="text-sm/6 text-zinc-600">
                                                        Testing URL...
                                                    </div>
                                                {:else if checkErrors[url.id]}
                                                    <div class="text-sm/6 text-red-700">
                                                        {checkErrors[url.id]}
                                                    </div>
                                                {:else if url.httpResponse}
                                                    <div class="text-sm/6 text-zinc-700">
                                                        Status: {url.httpResponse.status_code}
                                                    </div>
                                                    {@const redirectEntries =
                                                        getRedirectEntries(
                                                            url.httpResponse,
                                                        )}
                                                    {#if redirectEntries.length}
                                                        <ol class="space-y-1 text-xs/5 whitespace-normal text-zinc-500">
                                                            {#each redirectEntries as redirect}
                                                                <li
                                                                    class="flex min-w-0 items-start gap-1.5"
                                                                >
                                                                    {#if redirect.status_code}
                                                                        <span
                                                                            class="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700"
                                                                        >
                                                                            {getStatusCode(
                                                                                redirect.status_code,
                                                                            )}
                                                                        </span>
                                                                    {/if}
                                                                    <span
                                                                        class="min-w-0 break-all"
                                                                        title={redirect.url}
                                                                    >
                                                                        {getDisplayUrl(
                                                                            redirect.url,
                                                                        )}
                                                                    </span>
                                                                </li>
                                                            {/each}
                                                        </ol>
                                                    {/if}
                                                {/if}
                                            </div>
                                        </td>
                                        <td class="py-3 pl-4 align-top">
                                            <div class="flex justify-end gap-2">
                                                {#if url.devRedirectUrl}
                                                    <a
                                                        href={url.devRedirectUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        class={buttonVariants({
                                                            variant: "outline",
                                                            size: "sm",
                                                            class: "gap-1",
                                                        })}
                                                    >
                                                        <ExternalLink class="size-4" /> Verify
                                                    </a>
                                                {/if}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isChecking}
                                                    onclick={() => recheck(url.id)}
                                                >
                                                    <RotateCw
                                                        class={`size-4 ${isChecking ? "animate-spin" : ""}`}
                                                    />
                                                    {isChecking ? "Testing" : "Test"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onclick={() => removeUrl(url.id)}
                                                >
                                                    <Trash2 class="size-4" /> Remove
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="space-y-3 lg:hidden">
                {#each visibleUrls as url}
                    {@const isChecking = checkingUrls[url.id]}
                    <article class="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
                        <div class="flex items-start justify-between gap-3">
                            <a
                                href={url.url}
                                target="_blank"
                                rel="noreferrer"
                                class={`min-w-0 text-base/7 font-medium wrap-break-word text-zinc-950 sm:text-sm/6 ${url.addressed ? "line-through decoration-zinc-400" : ""}`}
                            >
                                {getDisplayUrl(url.url)}
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
                                    for={`redirect-mobile-${url.id}`}
                                    class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                                >
                                    Redirect to
                                </label>
                                <Input
                                    id={`redirect-mobile-${url.id}`}
                                    name={`redirect-mobile-${url.id}`}
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
                                        class="mt-2 inline-flex items-center gap-1 text-base/7 font-medium text-primary sm:text-sm/6"
                                    >
                                        Verify target
                                        <ExternalLink class="size-4" />
                                    </a>
                                {/if}
                            </div>
                        {:else if url.redirectTo}
                            <div class="mt-3 text-base/7 text-zinc-600 sm:text-sm/6">
                                <span class="font-medium text-zinc-900">Redirect:</span>
                                {getDisplayUrl(url.redirectTo)}
                            </div>
                        {/if}

                        <div class="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isChecking}
                                onclick={() => recheck(url.id)}
                            >
                                <RotateCw
                                    class={`size-5 sm:size-4 ${isChecking ? "animate-spin" : ""}`}
                                />
                                {isChecking ? "Testing" : "Test"}
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onclick={() => removeUrl(url.id)}
                            >
                                <Trash2 class="size-5 sm:size-4" /> Remove
                            </Button>
                        </div>

                        {#if isChecking}
                            <div class="mt-3 text-base/7 text-zinc-600 sm:text-sm/6">
                                Testing URL...
                            </div>
                        {:else if checkErrors[url.id]}
                            <div class="mt-3 text-base/7 text-red-700 sm:text-sm/6">
                                {checkErrors[url.id]}
                            </div>
                        {:else if url.httpResponse}
                            <div class="mt-3 text-base/7 text-zinc-600 sm:text-sm/6">
                                Status: {url.httpResponse.status_code}
                                {#if getRedirectEntries(url.httpResponse).length}
                                    <ol class="mt-2 list-decimal space-y-1 pl-5">
                                        {#each getRedirectEntries(url.httpResponse) as redirect}
                                            <li class="break-all">
                                                {#if redirect.status_code}
                                                    <span
                                                        class="mr-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs/5 font-medium text-zinc-700"
                                                    >
                                                        {getStatusCode(
                                                            redirect.status_code,
                                                        )}
                                                    </span>
                                                {/if}
                                                {getDisplayUrl(redirect.url)}
                                            </li>
                                        {/each}
                                    </ol>
                                {/if}
                            </div>
                        {/if}
                    </article>
                {/each}
            </div>
        </section>

        <section class="mt-6 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
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
                <Button type="submit" variant="secondary">Add URLs</Button>
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
            <AlertDialog.Trigger class={buttonVariants({ variant: "destructive" })}>
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
