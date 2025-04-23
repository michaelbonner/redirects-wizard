<template>
    <div
        class="w-full h-full flex flex-col justify-between rounded overflow-hidden shadow-lg bg-white"
    >
        <a :href="url">
            <img
                style="min-height:200px"
                class="w-full"
                :src="screenshotUrl"
                :alt="screenshotAlt"
            />
        </a>
        <div class="px-6 py-4">
            <div class="font-bold text-lg mb-2 break-words">
                <a class="text-blue-500 no-underline" v-bind:href="url">{{
                    dev_url
                }}</a>
            </div>
            <p class="text-gray-700 text-sm mb-2">
                Created: {{ date_created }}
            </p>
            <p class="text-gray-700 text-sm">
                <i
                    v-if="needsAddressing"
                    class="fas fa-exclamation-circle text-red-500"
                ></i>
                {{ count_urls - count_remaining_urls }} / {{ count_urls }} URLs
                addressed
            </p>
        </div>
        <div class="px-6 py-4 flex justify-between">
            <a
                v-bind:href="url"
                class="no-underline text-xs font-semibold rounded px-4 py-1 leading-normal bg-white border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
            >
                Manage
            </a>
            <a
                target="_blank"
                v-bind:href="dev_url"
                class="no-underline text-xs font-semibold rounded px-4 py-1 leading-normal bg-white text-green-500 hover:text-green-700 ml-2"
            >
                Visit Site
                <i class="fas fa-external-link-alt"></i>
            </a>
        </div>
    </div>
</template>

<script>
export default {
    mounted() {},
    props: [
        "batch_id",
        "count_remaining_urls",
        "count_urls",
        "date_created",
        "dev_url"
    ],
    computed: {
        // a computed getter
        url: function() {
            return `/batch/${this.batch_id}`;
        },
        screenshotUrl: function() {
            const url = new URL('https://screenshot-maker.bootpack.dev/api/screenshot');
            url.searchParams.set('url', this.dev_url);
            return url.toString();
        },
        screenshotAlt: function() {
            return `${this.dev_url} screenshot`;
        },
        needsAddressing: function() {
            return this.count_remaining_urls > 0 ? true : false;
        }
    }
};
</script>
