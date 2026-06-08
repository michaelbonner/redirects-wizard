<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    let { class: className, children } = $props<{
        class?: string;
        children: Snippet;
    }>();
</script>

<span
    class={cn(
        "inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-sm/5 font-medium text-zinc-700 sm:text-xs/5",
        className,
    )}
>
    {@render children()}
</span>
