<script lang="ts">
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import {
        ArrowLeft,
        Home,
        SearchX,
        ShieldAlert,
        ServerCrash,
    } from "lucide-svelte";

    const status = $derived(page.status);
    const isNotFound = $derived(status === 404);
    const isForbidden = $derived(status === 403 || status === 401);

    const heading = $derived(
        isNotFound
            ? "Page not found"
            : isForbidden
                ? "Access denied"
                : status === 500
                    ? "Something went wrong"
                    : "An error occurred",
    );

    const message = $derived(
        isNotFound
            ? "The page you're looking for doesn't exist or may have been moved to a different URL."
            : isForbidden
                ? "You don't have permission to view this page. Try signing in with a different account."
                : page.error?.message ??
                    "We ran into an unexpected problem. Please try again in a moment.",
    );
</script>

<svelte:head>
    <title>
        {isNotFound ? "Page not found" : `Error ${status}`} | Redirects Wizard
    </title>
</svelte:head>

<div
    class="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-24 text-zinc-900 antialiased sm:px-6 lg:px-8"
>
    <div class="mx-auto flex max-w-md flex-col items-center text-center">
        <div
            class="flex size-16 items-center justify-center rounded-full border border-zinc-200 bg-white"
        >
            {#if isNotFound}
                <SearchX class="size-7 text-zinc-400" strokeWidth={1.5} />
            {:else if isForbidden}
                <ShieldAlert class="size-7 text-zinc-400" strokeWidth={1.5} />
            {:else}
                <ServerCrash class="size-7 text-zinc-400" strokeWidth={1.5} />
            {/if}
        </div>

        <p class="mt-8 text-sm font-medium text-zinc-500 tabular-nums">
            {status}
        </p>

        <h1
            class="mt-2 text-2xl font-semibold tracking-tight text-balance text-zinc-950"
        >
            {heading}
        </h1>

        <p class="mt-3 max-w-sm text-base leading-relaxed text-pretty text-zinc-600">
            {message}
        </p>

        <div
            class="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:justify-center"
        >
            <Button href="/" size="lg" class="w-full sm:w-auto">
                <Home class="size-4" />
                Back to home
            </Button>
            <Button
                size="lg"
                variant="outline"
                class="w-full sm:w-auto"
                onclick={() => history.back()}
            >
                <ArrowLeft class="size-4" />
                Go back
            </Button>
        </div>
    </div>
</div>