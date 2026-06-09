import adapter from "svelte-adapter-bun";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter(),
        alias: {
            "@/*": "./src/lib/*",
        },
        paths: {
            relative: false,
        },
    },
};

export default config;
