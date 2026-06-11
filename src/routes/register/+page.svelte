<script lang="ts">
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import { authClient } from "$lib/auth-client";

    let name = $state("");
    let email = $state("");
    let password = $state("");
    let error = $state("");
    let submitting = $state(false);

    async function submit() {
        submitting = true;
        error = "";

        const result = await authClient.signUp.email({
            name,
            email,
            password,
        });

        submitting = false;

        if (result.error) {
            error = result.error.message ?? "Registration failed.";
            return;
        }

        window.location.href = "/dashboard";
    }
</script>

<main
    class="mx-auto flex min-h-dvh max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8"
>
    <section
        class="w-full max-w-xs rounded-lg bg-white p-5 ring-1 ring-zinc-200"
    >
        <h1 class="text-xl/7 font-semibold text-zinc-950">Create account</h1>
        <form
            class="mt-5 space-y-4"
            onsubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <div>
                <label
                    for="name"
                    class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                    >Name</label
                >
                <Input
                    id="name"
                    name="name"
                    autocomplete="name"
                    bind:value={name}
                    required
                />
            </div>
            <div>
                <label
                    for="email"
                    class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                    >Email</label
                >
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    bind:value={email}
                    required
                />
            </div>
            <div>
                <label
                    for="password"
                    class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                    >Password</label
                >
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    bind:value={password}
                    required
                />
            </div>
            {#if error}
                <p class="text-base/7 text-red-700 sm:text-sm/6">{error}</p>
            {/if}
            <Button type="submit" class="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create account"}
            </Button>
        </form>
        <p class="mt-4 text-center text-base/7 text-zinc-600 sm:text-sm/6">
            Already have an account? <a
                href="/login"
                class="font-medium text-teal-700">Sign in</a
            >
        </p>
    </section>
</main>
