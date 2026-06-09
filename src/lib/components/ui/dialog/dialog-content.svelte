<script lang="ts">
    import { Dialog as DialogPrimitive } from "bits-ui";
    import { X } from "lucide-svelte";
    import DialogOverlay from "./dialog-overlay.svelte";
    import DialogPortal from "./dialog-portal.svelte";
    import {
        cn,
        type WithoutChild,
        type WithoutChildrenOrChild,
    } from "$lib/utils.js";
    import type { ComponentProps } from "svelte";

    let {
        ref = $bindable(null),
        class: className,
        portalProps,
        children,
        ...restProps
    }: WithoutChild<DialogPrimitive.ContentProps> & {
        portalProps?: WithoutChildrenOrChild<
            ComponentProps<typeof DialogPortal>
        >;
    } = $props();
</script>

<DialogPortal {...portalProps}>
    <DialogOverlay />
    <DialogPrimitive.Content
        bind:ref
        data-slot="dialog-content"
        class={cn(
            "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid max-h-[min(88vh,760px)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-hidden rounded-lg bg-white p-4 text-zinc-950 shadow-xl ring-1 ring-zinc-950/10 duration-100 outline-none sm:p-5",
            className,
        )}
        {...restProps}
    >
        {@render children?.()}
        <DialogPrimitive.Close
            class="absolute top-3 right-3 rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
            <X class="size-4" />
            <span class="sr-only">Close</span>
        </DialogPrimitive.Close>
    </DialogPrimitive.Content>
</DialogPortal>
