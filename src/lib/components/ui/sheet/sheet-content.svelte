<script lang="ts">
    import { Dialog as SheetPrimitive } from "bits-ui";
    import SheetOverlay from "./sheet-overlay.svelte";
    import SheetPortal from "./sheet-portal.svelte";
    import type { Snippet } from "svelte";
    import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
    import type { ComponentProps } from "svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import XIcon from "@lucide/svelte/icons/x";

    let {
        ref = $bindable(null),
        class: className,
        portalProps,
        children,
        showCloseButton = true,
        ...restProps
    }: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
        portalProps?: WithoutChildrenOrChild<
            ComponentProps<typeof SheetPortal>
        >;
        children: Snippet;
        showCloseButton?: boolean;
    } = $props();
</script>

<SheetPortal {...portalProps}>
    <SheetOverlay />
    <SheetPrimitive.Content
        bind:ref
        data-slot="sheet-content"
        class={cn(
            "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:slide-out-to-right data-open:slide-in-from-right ring-foreground/5 dark:ring-foreground/10 fixed inset-y-0 right-0 z-50 flex h-full w-3/4 flex-col gap-6 overflow-y-auto p-6 text-sm shadow-xl ring-1 duration-200 outline-none sm:max-w-md",
            className,
        )}
        {...restProps}
    >
        {@render children?.()}
        {#if showCloseButton}
            <SheetPrimitive.Close data-slot="sheet-close">
                {#snippet child({ props })}
                    <Button
                        variant="ghost"
                        class="bg-secondary absolute top-4 right-4"
                        size="icon-sm"
                        {...props}
                    >
                        <XIcon />
                        <span class="sr-only">Close</span>
                    </Button>
                {/snippet}
            </SheetPrimitive.Close>
        {/if}
    </SheetPrimitive.Content>
</SheetPortal>
