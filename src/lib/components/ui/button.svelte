<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    type Variant = "primary" | "secondary" | "ghost" | "danger";

    let {
        type = "button",
        variant = "secondary",
        class: className,
        children,
        ...rest
    }: {
        type?: "button" | "submit" | "reset";
        variant?: Variant;
        class?: string;
        children: Snippet;
        [key: string]: unknown;
    } = $props();

    const variants: Record<Variant, string> = {
        primary:
            "bg-teal-700 text-white ring-1 ring-teal-700 hover:bg-teal-800 focus-visible:outline-teal-600",
        secondary:
            "bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 focus-visible:outline-teal-600",
        ghost: "text-zinc-700 hover:bg-zinc-100 focus-visible:outline-teal-600",
        danger: "text-red-700 hover:bg-red-50 focus-visible:outline-red-600",
    };
</script>

<button
    {type}
    class={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-base/6 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:py-1.5 sm:text-sm/6",
        variants[variant],
        className,
    )}
    {...rest}
>
    {@render children()}
</button>
