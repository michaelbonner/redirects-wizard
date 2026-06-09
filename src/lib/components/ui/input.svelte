<script lang="ts">
    import { cn } from "$lib/utils";

    let {
        class: className,
        type = "text",
        value = $bindable(),
        ...rest
    } = $props<{
        class?: string;
        type?: string;
        value?: string;
        [key: string]: unknown;
    }>();
</script>

<input
    {type}
    bind:value
    class={cn(
        "block w-full rounded-md bg-white px-3 py-2.5 text-base/6 text-zinc-900 ring-1 ring-zinc-200 transition outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-teal-600 sm:py-2 sm:text-sm/6",
        className,
    )}
    {...rest}
/>
