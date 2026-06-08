import adapter from "svelte-adapter-bun";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter({ out: "build" }),
        alias: {
            "@/*": "./src/lib/*",
        },
    },
};

export default config;
