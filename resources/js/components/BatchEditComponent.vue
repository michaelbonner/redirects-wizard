<template>
    <div class="bg-white mx-auto shadow-md rounded overflow-hidden mb-4">
        <div class="p-4 border-gray-300 border-b mb-6" v-if="dev_url">
            <button
                class="no-underline text-base font-semibold rounded px-4 py-1 leading-normal text-blue-500 mx-1"
                @click.prevent="toggleSuccessful(true)"
                v-if="!hideSuccessful"
            >
                <i class="fas fa-eye-slash"></i>
                Hide Addressed URLs
            </button>
            <button
                class="no-underline text-base font-semibold rounded px-4 py-1 leading-normal bg-blue-500 border border-blue-800 text-white hover:bg-blue-800 mx-1"
                @click.prevent="toggleSuccessful(false)"
                v-else
            >
                <i class="fas fa-eye-slash"></i>
                Show Addressed URLs
            </button>

            <button
                class="no-underline text-base font-semibold rounded px-4 py-1 leading-normal text-blue-500 mx-1"
                @click.prevent="togglePending(true)"
                v-if="!hidePending"
            >
                <i class="fas fa-eye-slash"></i>
                Hide Pending URLs
            </button>
            <button
                class="no-underline text-base font-semibold rounded px-4 py-1 leading-normal bg-blue-500 border border-blue-800 text-white hover:bg-blue-800 mx-1"
                @click.prevent="togglePending(false)"
                v-else
            >
                <i class="fas fa-eye-slash"></i>
                Show Pending URLs
            </button>

            <button
                class="no-underline text-base font-semibold rounded px-4 py-1 leading-normal text-blue-500 mx-1"
                @click.prevent="recheckUnaddressed()"
                :disabled="submittingRecheckUnaddressed"
                :class="{
                    'cursor-not-allowed': submittingRecheckUnaddressed,
                    'opacity-50': submittingRecheckUnaddressed
                }"
            >
                <i
                    class="fas fa-sync-alt"
                    :class="{ spin: submittingRecheckUnaddressed }"
                ></i>
                Recheck Unaddressed
            </button>
            <button
                class="no-underline text-base font-semibold rounded px-4 py-1 leading-normal text-blue-500 mx-1"
                @click.prevent="recheckAll()"
                :disabled="submittingRecheckAll"
                :class="{
                    'cursor-not-allowed': submittingRecheckAll,
                    'opacity-50': submittingRecheckAll
                }"
            >
                <i
                    class="fas fa-sync-alt"
                    :class="{ spin: submittingRecheckAll }"
                ></i>
                Recheck All
            </button>
            <a
                :href="rewriteUrl"
                target="_blank"
                class="float-right no-underline text-base font-semibold rounded px-4 py-1 leading-normal text-blue-500 mx-1"
            >
                View Rewrites
                <i class="fas fa-external-link-alt"></i>
            </a>
        </div>
        <div class="sm:flex sm:items-center px-6 py-4">
            <div class="sm:text-left sm:flex-grow w-full">
                <div class="mb-6">
                    <div>
                        <label
                            class="block font-bold mb-1 md:mb-0 pr-4"
                            for="inline-full-name"
                        >
                            Dev URL
                        </label>
                    </div>
                    <div class="md:flex mb-6 w-full">
                        <div class="flex-auto">
                            <input
                                class="bg-gray-100 appearance-none border-2 border-gray-200 rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-green-500"
                                rows="10"
                                v-bind:disabled="submitting"
                                v-model="updatedDevUrl"
                                placeholder="https://www.redolive.com"
                            />
                        </div>
                        <div class="flex-initial pl-4 pt-1">
                            <button
                                class="shadow bg-green-500 hover:bg-green-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
                                type="submit"
                                v-bind:disabled="submitting"
                                v-on:click.stop.prevent="updateDevUrl"
                            >
                                Update URL
                            </button>
                        </div>
                    </div>
                    <div class="md:flex mb-6" v-if="error.message">
                        <div class="flex-auto text-red-500">
                            {{ error.message }}
                            <ul>
                                <li
                                    v-for="(errorMessage, key) in error.errors"
                                    v-bind:key="key"
                                >
                                    {{ errorMessage[0] }}
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="md:flex mb-6" v-if="success">
                        <div class="flex-auto text-green-500">
                            {{ success }}
                        </div>
                    </div>
                </div>
                <div class="mb-8" v-if="!validUrl">
                    <div
                        class="bg-blue-400est border-t-4 border-blue-500 rounded-b text-blue-800 px-4 py-3 shadow-md"
                        role="alert"
                    >
                        <div class="flex">
                            <div class="py-1">
                                <svg
                                    class="fill-current h-6 w-6 text-blue-500 mr-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p class="font-bold">
                                    You must enter a valid dev url before you
                                    can start
                                </p>
                                <p class="text-sm">
                                    The dev URL is where we are actively
                                    developing the site. Generally this will be
                                    https://{yoursite}.redolive.co
                                </p>
                                <p class="text-sm">
                                    Be sure to include the https:// part
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mb-8">
                    <p class="text-sm leading-tight text-gray-500-600">
                        {{ urlCount }} URLs
                    </p>
                </div>
                <div
                    class="grid grid-cols-2 gap-4 my-2"
                    v-if="validUrl && submittedDevUrl"
                >
                    <url-component
                        v-for="url in urls"
                        :key="url.id"
                        :id="url.id"
                        :batch_id="url.batch_id"
                        :url="url.url"
                        :devRedirectUrl="url.devRedirectUrl"
                        :redirect_to="url.redirect_to"
                        :addressed="url.addressed"
                        :hideSuccessful="hideSuccessful"
                        :hidePending="hidePending"
                        :doRecheck="doRecheck"
                        :doRecheckUnaddressed="doRecheckUnaddressed"
                    >
                        {{ url.url }}
                    </url-component>
                </div>
            </div>
        </div>
        <add-urls-component
            :batch_id="batch_id"
            v-if="validUrl && submittedDevUrl"
        >
            Add Url
        </add-urls-component>
        <div class="float-right p-4 text-right">
            <button
                class="text-red-700 no-underline"
                @click.prevent="toggleArchive()"
            >
                Archive
            </button>
            <p class="py-4" v-if="showArchiveLink">
                <a
                    class="text-red-500 no-underline"
                    href="#"
                    @click.prevent="archive()"
                >
                    For real, archive this
                </a>
            </p>
        </div>
    </div>
</template>

<script>
export default {
    mounted() {
        this.updatedDevUrl = this.dev_url;
        if (this.dev_url) {
            this.submittedDevUrl = true;
        }
    },
    data: function() {
        return {
            hideSuccessful: false,
            hidePending: false,
            submitting: false,
            updatedDevUrl: "",
            error: {},
            success: "",
            doRecheck: false,
            doRecheckUnaddressed: false,
            submittingRecheckAll: false,
            submittingRecheckUnaddressed: false,
            showArchiveLink: false,
            submittedDevUrl: false
        };
    },
    props: ["dev_url", "batch_id", "urls"],
    computed: {
        urlCount: function() {
            return this.urls ? Object.keys(this.urls).length : 0;
        },
        rewriteUrl: function() {
            return `/api/batch/${this.batch_id}/redirects`;
        },
        validUrl: function() {
            const pattern = new RegExp(
                "^(https?:\\/\\/)" + // protocol
                "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" + // domain name
                "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
                "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
                "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
                    "(\\#[-a-z\\d_]*)?$",
                "i"
            ); // fragment locator
            return pattern.test(this.updatedDevUrl);
        }
    },
    methods: {
        toggleSuccessful: function(toggle) {
            if (toggle) {
                this.hideSuccessful = true;
                this.$emit("hideSuccessful");
            } else {
                this.hideSuccessful = false;
                this.$emit("hideSuccessful");
            }
        },
        togglePending: function(toggle) {
            if (toggle) {
                this.hidePending = true;
                this.$emit("hidePending");
            } else {
                this.hidePending = false;
                this.$emit("hidePending");
            }
        },
        recheckAll: function() {
            this.submittingRecheckAll = true;
            this.doRecheck = true;
            this.$emit("doRecheck");
        },
        recheckUnaddressed: function() {
            this.submittingRecheckUnaddressed = true;
            this.doRecheckUnaddressed = true;
            this.$emit("doRecheckUnaddressed");
        },
        updateDevUrl: function() {
            if (!this.updatedDevUrl) {
                this.error = {
                    message: "Dev URL cannot be empty"
                };
                return false;
            }

            this.submitting = true;
            this.error = {};
            this.success = "";
            axios
                .patch(`/api/batch/${this.batch_id}`, {
                    dev_url: this.updatedDevUrl
                })
                .then(data => {
                    this.submitting = false;
                    this.submittedDevUrl = true;
                    this.success = "Sucessfully updated Dev URL";
                })
                .catch(error => {
                    this.error = error.response.data;
                    this.submitting = false;
                });
        },
        toggleArchive: function() {
            this.showArchiveLink = !this.showArchiveLink;
        },
        archive: function() {
            axios
                .delete(`/api/batch/${this.batch_id}`)
                .then(data => {
                    alert("Archived");
                    window.location.href = "/";
                })
                .catch(error => {
                    alert("Something went wrong archiving this");
                });
        }
    }
};
</script>
