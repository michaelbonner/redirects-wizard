<script lang="ts">
    import "../app.css";
    import { authClient } from "$lib/auth-client";

    let { data, children } = $props();

    async function signOut() {
        await authClient.signOut();
        window.location.href = "/login";
    }
</script>

<svelte:head>
    <title>Redirects Wizard</title>
</svelte:head>

<div class="min-h-screen bg-zinc-50">
    <header class="border-b border-zinc-200 bg-white">
        <div
            class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        >
            <a href="/" class="text-base/6 font-semibold text-zinc-950"
                >Redirects Wizard</a
            >
            {#if data.user}
                <nav class="flex items-center gap-3 text-base/6 sm:text-sm/6">
                    <span
                        class="hidden max-w-48 truncate text-zinc-500 sm:inline"
                        >{data.user.email}</span
                    >
                    <button
                        type="button"
                        class="font-medium text-zinc-700 hover:text-zinc-950"
                        onclick={signOut}
                    >
                        Sign out
                    </button>
                </nav>
            {/if}
        </div>
    </header>

    {@render children()}
</div>
