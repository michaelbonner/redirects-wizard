<script lang="ts">
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Menu, X } from "lucide-svelte";

    let { data, children } = $props();

    let mobileOpen = $state(false);

    const nav = [
        { href: "/features", label: "Features" },
        { href: "/contact", label: "Contact" },
    ];

    const isActive = (href: string) => page.url.pathname === href;
</script>

<div class="flex min-h-dvh flex-col bg-white">
    <header
        class="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur"
    >
        <div
            class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8"
        >
            <a
                href="/"
                class="flex items-center gap-2 text-base/6 font-semibold text-zinc-950"
            >
                <img src="/favicon.svg" alt="" class="size-7" />
                Redirects Wizard
            </a>

            <nav class="hidden items-center gap-1 md:flex">
                {#each nav as item (item.href)}
                    <a
                        href={item.href}
                        class="rounded-md px-3 py-1.5 text-sm/6 font-medium hover:bg-zinc-100 {isActive(
                            item.href,
                        )
                            ? 'text-zinc-950'
                            : 'text-zinc-600 hover:text-zinc-950'}"
                    >
                        {item.label}
                    </a>
                {/each}
            </nav>

            <div class="hidden items-center gap-2 md:flex">
                {#if data.user}
                    <Button href="/dashboard">Go to dashboard</Button>
                {:else}
                    <a
                        href="/login"
                        class="rounded-md px-3 py-1.5 text-sm/6 font-medium text-zinc-700 hover:text-zinc-950"
                    >
                        Sign in
                    </a>
                    <Button href="/register">Get started</Button>
                {/if}
            </div>

            <button
                type="button"
                class="rounded-md p-2 text-zinc-700 hover:bg-zinc-100 md:hidden"
                aria-label="Toggle menu"
                onclick={() => (mobileOpen = !mobileOpen)}
            >
                {#if mobileOpen}
                    <X class="size-5" />
                {:else}
                    <Menu class="size-5" />
                {/if}
            </button>
        </div>

        {#if mobileOpen}
            <div class="border-t border-zinc-200 bg-white md:hidden">
                <nav class="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
                    {#each nav as item (item.href)}
                        <a
                            href={item.href}
                            class="rounded-md px-3 py-2 text-base/6 font-medium text-zinc-700 hover:bg-zinc-100"
                            onclick={() => (mobileOpen = false)}
                        >
                            {item.label}
                        </a>
                    {/each}
                    <div
                        class="mt-2 flex flex-col gap-2 border-t border-zinc-100 pt-3"
                    >
                        {#if data.user}
                            <Button href="/dashboard" class="w-full"
                                >Go to dashboard</Button
                            >
                        {:else}
                            <Button
                                href="/login"
                                variant="outline"
                                class="w-full">Sign in</Button
                            >
                            <Button href="/register" class="w-full"
                                >Get started</Button
                            >
                        {/if}
                    </div>
                </nav>
            </div>
        {/if}
    </header>

    <main class="flex-1">
        {@render children()}
    </main>

    <footer class="border-t border-zinc-200 bg-zinc-50">
        <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <div class="flex flex-col gap-10 md:flex-row md:justify-between">
                <div class="max-w-xs">
                    <a
                        href="/"
                        class="flex items-center gap-2 text-base/6 font-semibold text-zinc-950"
                    >
                        <img src="/favicon.svg" alt="" class="size-7" />
                        Redirects Wizard
                    </a>
                    <p class="mt-3 text-sm/6 text-zinc-600">
                        Verify every redirect and ship clean redirect rules
                        before your site migration goes live.
                    </p>
                </div>

                <div class="grid grid-cols-2 gap-10 sm:grid-cols-3">
                    <div>
                        <h3 class="text-sm/6 font-semibold text-zinc-950">
                            Product
                        </h3>
                        <ul class="mt-3 space-y-2 text-sm/6 text-zinc-600">
                            <li>
                                <a class="hover:text-zinc-950" href="/features"
                                    >Features</a
                                >
                            </li>
                            <li>
                                <a class="hover:text-zinc-950" href="/register"
                                    >Get started</a
                                >
                            </li>
                            <li>
                                <a class="hover:text-zinc-950" href="/login"
                                    >Sign in</a
                                >
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="text-sm/6 font-semibold text-zinc-950">
                            Company
                        </h3>
                        <ul class="mt-3 space-y-2 text-sm/6 text-zinc-600">
                            <li>
                                <a class="hover:text-zinc-950" href="/contact"
                                    >Contact</a
                                >
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="text-sm/6 font-semibold text-zinc-950">
                            Legal
                        </h3>
                        <ul class="mt-3 space-y-2 text-sm/6 text-zinc-600">
                            <li>
                                <a class="hover:text-zinc-950" href="/privacy"
                                    >Privacy</a
                                >
                            </li>
                            <li>
                                <a class="hover:text-zinc-950" href="/terms"
                                    >Terms</a
                                >
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div
                class="mt-10 border-t border-zinc-200 pt-6 text-sm/6 text-zinc-500"
            >
                © {new Date().getFullYear()} Redirects Wizard. All rights reserved.
            </div>
        </div>
    </footer>
</div>
