<template>
    <div>
        <h2 class="text-2xl text-gray-800 mt-8 mb-4 ml-4">
            Add New URLs to Test
        </h2>
        <div class="bg-white mx-auto overflow-hidden mb-4">
            <form class="w-full my-8 px-4" v-on:submit.prevent="onSubmit">
                <div class="md:flex md:items-center mb-6">
                    <div class="md:w-1/5">
                        <label
                            class="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
                            for="inline-full-name"
                        >
                            URLs (one url per line)
                        </label>
                    </div>
                    <div class="md:w-4/5">
                        <textarea
                            class="bg-gray-100 appearance-none rounded-sm w-full py-2 px-4 text-gray-700 leading-tight focus:outline-hidden focus:bg-white border-2 border-gray-100 focus:border-blue-500"
                            rows="10"
                            v-model="urls"
                            v-bind:disabled="submitting"
                        ></textarea>
                        <div v-if="countToAdd">
                            Added {{ countAdded }} / {{ countToAdd }}
                        </div>
                    </div>
                </div>
                <div class="md:flex md:items-center">
                    <div class="md:w-1/5"></div>
                    <div class="md:w-4/3">
                        <button
                            class="shadow-sm bg-blue-500 hover:bg-blue-400 focus:shadow-outline focus:outline-hidden text-white font-bold py-2 px-4 rounded-sm"
                            type="submit"
                            v-bind:disabled="submitting"
                        >
                            {{ submitText }}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    mounted() {},
    data: function() {
        return {
            urls: "",
            submitting: false,
            submitText: "Add URLs",
            countAdded: 0,
            countToAdd: 0
        };
    },
    props: ["batch_id"],
    computed: {
        uniqueUrls: function() {
            const urls = this.urls
                .split("\n")
                .filter(url => {
                    return this.validateUrl(url);
                })
                .filter((url, index, self) => {
                    return self.indexOf(url) === index;
                });

            const uniqueUrls = urls.filter(url => {
                return url.substring(url.length - 1) == "/"
                    ? !urls.includes(url.substring(url.length - 1))
                    : !urls.includes(url + "/");
            });

            this.urls = uniqueUrls.join("\n");

            return uniqueUrls;
        }
    },
    methods: {
        onSubmit: function(event) {
            if (this.uniqueUrls.length) {
                this.submitting = true;
                this.countToAdd = this.uniqueUrls.length;
                this.submitText = "Submitting...";
                let promises = [];
                for (let i = 0; i < this.uniqueUrls.length; i++) {
                    const url =
                        this.uniqueUrls[i].substring(0, 4) === "http"
                            ? this.uniqueUrls[i]
                            : `http://${this.uniqueUrls[i]}`;
                    promises.push(
                        axios
                            .post(`/api/batch/${this.batch_id}/url`, {
                                url
                            })
                            .then(() => {
                                this.countAdded++;
                            })
                            .catch(() => {
                                this.countAdded++;
                            })
                    );
                }
                axios.all(promises).then(() => {
                    this.submitting = false;
                    this.submitText = "Add URLs";
                    window.location.reload();
                });
            }
        },
        validateUrl: function(url) {
            const pattern = new RegExp(
                "^(https?:\\/\\/)" + // protocol
                "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" + // domain name
                "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
                "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
                "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
                    "(\\#[-a-z\\d_]*)?$",
                "i"
            ); // fragment locator
            return pattern.test(url);
        }
    }
};
</script>
