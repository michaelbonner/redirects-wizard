import adapter from "@sveltejs/adapter-bun";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit({
            adapter: adapter(),
            preprocess: vitePreprocess(),
            paths: {
                relative: false,
            },
        }),
    ],
});
