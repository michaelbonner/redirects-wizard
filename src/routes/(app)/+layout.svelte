<script lang="ts">
    import { authClient } from "$lib/auth-client";

    let { children } = $props();

    async function signOut() {
        await authClient.signOut();
        window.location.href = "/login";
    }
</script>

<div class="min-h-dvh bg-zinc-50">
    <header class="border-b border-zinc-200 bg-white">
        <div
            class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        >
            <a href="/dashboard" class="text-base/6 font-semibold text-zinc-950"
                >Redirects Wizard</a
            >
            <nav class="flex items-center gap-3 text-base/6 sm:text-sm/6">
                <button
                    type="button"
                    class="font-medium text-zinc-700 hover:text-zinc-950"
                    onclick={signOut}
                >
                    Sign out
                </button>
            </nav>
        </div>
    </header>

    {@render children()}
</div>
