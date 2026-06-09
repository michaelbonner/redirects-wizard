<script lang="ts">
    import { cn, type WithElementRef } from "$lib/utils.js";
    import type { HTMLAttributes } from "svelte/elements";
    import { Dialog as SheetPrimitive } from "bits-ui";
    import { Button } from "$lib/components/ui/button/index.js";

    let {
        ref = $bindable(null),
        class: className,
        children,
        showCloseButton = false,
        ...restProps
    }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
        showCloseButton?: boolean;
    } = $props();
</script>

<div
    bind:this={ref}
    data-slot="sheet-footer"
    class={cn(
        "mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
    )}
    {...restProps}
>
    {@render children?.()}
    {#if showCloseButton}
        <SheetPrimitive.Close>
            {#snippet child({ props })}
                <Button variant="outline" {...props}>Close</Button>
            {/snippet}
        </SheetPrimitive.Close>
    {/if}
</div>
