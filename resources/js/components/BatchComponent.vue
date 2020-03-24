<template>
    <div class="w-full md:w-1/3 px-4 my-8">
        <div class="rounded overflow-hidden shadow-lg bg-white">
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
                    <a class="text-blue no-underline" v-bind:href="url">
                        {{ dev_url }}
                    </a>
                </div>
                <p class="text-grey-darker text-sm mb-2">
                    Created: {{ date_created }}
                </p>
                <p class="text-grey-darker text-sm">
                    <i
                        v-if="needsAddressing"
                        class="fas fa-exclamation-circle text-red"
                    ></i>
                    {{ count_urls - count_remaining_urls }} /
                    {{ count_urls }} URLs addressed
                </p>
            </div>
            <div class="px-6 py-4">
                <a
                    v-bind:href="url"
                    class="no-underline text-xs font-semibold rounded px-4 py-1 leading-normal bg-white border border-blue text-blue hover:bg-blue hover:text-white"
                >
                    View/Edit Redirects
                </a>
                <a
                    target="_blank"
                    v-bind:href="dev_url"
                    class="no-underline text-xs font-semibold rounded px-4 py-1 leading-normal bg-white border border-green text-green hover:bg-green hover:text-white ml-2"
                >
                    Visit Site
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
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
            return `/batch-dev-url-screenshot/${this.batch_id}.jpg`;
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
