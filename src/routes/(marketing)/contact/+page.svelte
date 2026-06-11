<script lang="ts">
    import { enhance } from "$app/forms";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import Textarea from "$lib/components/ui/textarea/textarea.svelte";
    import { Mail, MessageSquare, CheckCircle2 } from "lucide-svelte";

    let { form } = $props();

    let submitting = $state(false);
</script>

<svelte:head>
    <title>Contact — Redirects Wizard</title>
    <meta
        name="description"
        content="Questions about redirects, migrations, or pricing? Get in touch with the Redirects Wizard team."
    />
</svelte:head>

<section
    class="border-b border-zinc-200 bg-linear-to-b from-teal-50/70 to-white"
>
    <div class="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1
            class="text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl"
        >
            Get in touch
        </h1>
        <p class="mx-auto mt-5 max-w-2xl text-lg/8 text-pretty text-zinc-600">
            Have a question about checking redirects, migrating a site, or
            getting your team set up? We'd love to hear from you.
        </p>
    </div>
</section>

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="grid gap-12 lg:grid-cols-5">
        <!-- Info -->
        <div class="lg:col-span-2">
            <h2 class="text-lg/7 font-semibold text-zinc-950">
                Talk to the team
            </h2>
            <p class="mt-2 text-base/7 text-zinc-600">
                Fill out the form and we'll get back to you. For anything
                urgent, email is the fastest way to reach us.
            </p>

            <dl class="mt-8 space-y-6">
                <div class="flex gap-4">
                    <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"
                    >
                        <Mail class="size-5" />
                    </div>
                    <div>
                        <dt class="text-sm/6 font-semibold text-zinc-950">
                            Email
                        </dt>
                        <dd class="mt-0.5 text-base/7 text-zinc-600">
                            <a
                                class="text-teal-700 hover:text-teal-900"
                                href="mailto:hello@redirectswizard.com"
                                >hello@redirectswizard.com</a
                            >
                        </dd>
                    </div>
                </div>
                <div class="flex gap-4">
                    <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"
                    >
                        <MessageSquare class="size-5" />
                    </div>
                    <div>
                        <dt class="text-sm/6 font-semibold text-zinc-950">
                            Support
                        </dt>
                        <dd class="mt-0.5 text-base/7 text-zinc-600">
                            Already using Redirects Wizard? Use the in-app
                            feedback button and we'll see it right away.
                        </dd>
                    </div>
                </div>
            </dl>
        </div>

        <!-- Form -->
        <div class="lg:col-span-3">
            <div class="rounded-2xl bg-white p-6 ring-1 ring-zinc-200 sm:p-8">
                {#if form?.success}
                    <div class="flex flex-col items-center py-10 text-center">
                        <div
                            class="flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700"
                        >
                            <CheckCircle2 class="size-6" />
                        </div>
                        <h2 class="mt-4 text-lg/7 font-semibold text-zinc-950">
                            Thanks — we got your message
                        </h2>
                        <p class="mt-1 max-w-sm text-base/7 text-zinc-600">
                            We'll get back to you at the email you provided as
                            soon as we can.
                        </p>
                    </div>
                {:else}
                    <form
                        method="POST"
                        class="space-y-5"
                        use:enhance={() => {
                            submitting = true;
                            return async ({ update }) => {
                                await update();
                                submitting = false;
                            };
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
                                value={form?.name ?? ""}
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
                                value={form?.email ?? ""}
                                required
                            />
                        </div>
                        <div>
                            <label
                                for="message"
                                class="mb-1 block text-base/6 font-medium text-zinc-900 sm:text-sm/6"
                                >Message</label
                            >
                            <Textarea
                                id="message"
                                name="message"
                                rows={5}
                                placeholder="Tell us what you're working on…"
                                value={form?.message ?? ""}
                                required
                            />
                        </div>
                        {#if form?.error}
                            <p class="text-base/7 text-red-700 sm:text-sm/6">
                                {form.error}
                            </p>
                        {/if}
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Sending…" : "Send message"}
                        </Button>
                    </form>
                {/if}
            </div>
        </div>
    </div>
</section>
