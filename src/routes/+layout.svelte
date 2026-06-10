<script lang="ts">
    import "../app.css";
    import { authClient } from "$lib/auth-client";
    import { onMount } from "svelte";

    let { data, children } = $props();

    async function signOut() {
        await authClient.signOut();
        window.location.href = "/login";
    }

    onMount(() => {
        if (!data.user) return;

        const script = document.createElement("script");
        script.async = true;
        script.src =
            "https://easycustomerfeedback.com/widget/d496de302110410cb05eb1b436b7e53e/embed";
        script.dataset.label = "Send feedback";
        script.dataset.position = "right";
        script.dataset.color = "#007595";
        script.dataset.name = data.user.name;
        script.dataset.email = data.user.email;
        script.dataset.userId = data.user.id;
        document.body.appendChild(script);

        return () => {
            script.remove();
        };
    });
</script>

<svelte:head>
    <title>Redirects Wizard</title>
</svelte:head>

<div class="min-h-screen bg-zinc-50">
    <header class="border-b border-zinc-200 bg-white">
        <div
            class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        >
            <a
                href="/"
                class="flex items-center gap-2 text-base/6 font-semibold text-zinc-950"
            >
                <img src="/favicon.svg" alt="" class="size-6" />
                <span>Redirects Wizard</span>
            </a>
            {#if data.user}
                <nav class="flex items-center gap-3 text-base/6 sm:text-sm/6">
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
