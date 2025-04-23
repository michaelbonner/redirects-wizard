<template>
    <div
        class="bg-white mx-auto overflow-hidden mb-6 w-full"
        :class="{ hidden: !visible, 'opacity-50': testingUrl }"
    >
        <div class="text-center sm:text-left p-4">
            <div class="mb-4">
                <p class="text-l leading-tight mb-2 break-words flex items-center gap-1">
                    <span
                        v-if="isAddressed"
                        class="fa fa-check-square text-blue-500"
                    ></span>
                    <a
                        :href="url"
                        target="_blank"
                        class="text-blue-500 text-sm"
                        :class="{ 'line-through': isAddressed, 'underline': !isAddressed }"
                    >
                        {{ url }}<br />
                    </a>
                </p>
                <div class="mb-6" v-if="!isAddressed">
                    <div>
                        <label
                            class="block font-bold mb-1 md:mb-0 pr-4 text-sm text-gray-800"
                            for="inline-full-name"
                        >
                            Redirect To
                        </label>
                    </div>
                    <div class="md:flex mb-2">
                        <div class="flex-auto">
                            <input
                                class="bg-gray-100 appearance-none border-2 border-gray-200 rounded-sm w-full py-3 px-4 text-gray-700 leading-tight focus:outline-hidden focus:bg-white focus:border-green-500 text-xs"
                                v-bind:disabled="submitting"
                                @focus="clearUpdatable"
                                v-model="updatedRedirectTo"
                                placeholder="/"
                            />
                        </div>
                    </div>
                    <div class="md:flex mb-6" v-if="!isAddressed">
                        <span class="text-xs">
                            <a
                                :href="getDevRedirectUrl"
                                target="_blank"
                                class="text-blue-500 no-underline"
                                >Verify 'Redirect To' URL</a
                            >
                        </span>
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
                    <div class="md:flex my-6" v-if="success">
                        <div class="flex-auto text-green-500">
                            {{ success }}
                        </div>
                    </div>
                </div>
                <div>
                    <p class="my-2">
                        <button
                            v-on:click.stop.prevent="testUrl"
                            class="no-underline text-sm font-semibold rounded-sm px-4 py-1 leading-normal bg-white border border-green-500 text-green-500 hover:bg-green-500 hover:text-white mr-1"
                        >
                            Test Live Redirect
                        </button>
                        <button
                            v-on:click.stop.prevent="removeUrl"
                            class="no-underline text-sm font-semibold rounded-sm px-4 py-1 leading-normal bg-white border border-red-500 text-red-500 hover:bg-red-500 hover:text-white mx-1"
                        >
                            Remove
                        </button>
                    </p>
                    <p class="text-gray-500-600">
                        {{ this.message }}
                    </p>
                    <div v-if="redirectPath && redirectPath.length > 1">
                        <ul>
                            <li
                                v-for="(redirect, index) in redirectPath"
                                :key="index"
                            >
                                {{ redirect }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import _ from "lodash";

export default {
    mounted() {
        this.updatedRedirectTo = this.redirect_to;
        this.getDevRedirectUrl = this.devRedirectUrl;
        // if(!this.updatedRedirectTo && !this.addressed){
        //     this.updatable = true;
        // }
        // setTimeout(() => {
        //     this.updateSelf();
        // }, 10000);
    },
    data: function() {
        return {
            message: "",
            redirectPath: [],
            isAddressed: this.addressed,
            visible: true,
            submitting: false,
            updatedRedirectTo: "",
            error: {},
            success: "",
            getDevRedirectUrl: "",
            testingUrl: false,
            updatable: false
        };
    },
    props: [
        "id",
        "batch_id",
        "url",
        "devRedirectUrl",
        "redirect_to",
        "addressed",
        "hideSuccessful",
        "hidePending",
        "doRecheck",
        "doRecheckUnaddressed"
    ],
    computed: {
        responseMessage: () => {
            return this.message;
        }
    },
    watch: {
        hideSuccessful: function() {
            this.showOrHide();
        },
        hidePending: function() {
            this.showOrHide();
        },
        doRecheck: function() {
            this.testUrl();
        },
        doRecheckUnaddressed: function() {
            if (!this.isAddressed) {
                this.testUrl();
            }
        },
        updatedRedirectTo: function(value) {
            this.updateRedirectTo();
        }
    },
    methods: {
        testUrl: function() {
            this.testingUrl = true;
            this.resetMessages();
            axios
                .get(`/api/url/${this.id}`)
                .then(result => {
                    this.isAddressed = result.data.addressed;
                    if (result.data.http_response.status_code == 200) {
                        this.message = "Received successful result: 200";
                    } else {
                        this.message = `Received status code: ${result.data.http_response.status_code}. Be sure to add the rewrites to the server that you get from the "View Rewrites" button above.`;
                    }
                    this.redirectPath = result.data.http_response.redirect_path;
                    this.testingUrl = false;
                })
                .catch(() => {
                    this.testingUrl = false;
                });
        },
        removeUrl: function() {
            axios
                .post(`/api/url/${this.id}`, {
                    _method: "DELETE"
                })
                .then(result => {
                    window.location.reload();
                });
        },
        showOrHide: function() {
            if (!this.hideSuccessful && !this.hidePending) {
                this.visible = true;
                return;
            }

            if (this.hideSuccessful && this.addressed) {
                this.visible = false;
                return;
            }

            if (this.hidePending && this.updatedRedirectTo) {
                this.visible = false;
                return;
            }

            this.visible = true;
        },
        updateRedirectTo: _.debounce(function() {
            this.submitting = true;
            this.resetMessages();
            if (
                this.updatedRedirectTo == this.url ||
                `${this.getBaseUrlFromString(this.url)}${
                    this.updatedRedirectTo
                }` == this.url ||
                `${this.getBaseUrlFromString(this.url)}/${
                    this.updatedRedirectTo
                }` == this.url
            ) {
                this.error = {
                    message:
                        "Redirect URL cannot be the same as the url to redirect"
                };
                this.submitting = false;
                return true;
            }
            axios
                .patch(`/api/url/${this.id}`, {
                    redirect_to: this.updatedRedirectTo
                })
                .then(result => {
                    this.submitting = false;
                    this.success = "Successfully updated Dev URL";
                    this.getDevRedirectUrl = result.data.devRedirectUrl;

                    setTimeout(() => {
                        this.success = "";
                    }, 2000);
                })
                .catch(error => {
                    this.error = error.response.data;
                    this.submitting = false;
                });
        }, 1000),
        resetMessages: function() {
            this.error = {};
            this.success = "";
            this.message = "";
            this.redirectPath = [];
        },
        getBaseUrlFromString: function(string) {
            const urlParts = string.split("/");
            return `${urlParts[0]}//${urlParts[2]}`;
        },
        updateSelf: function() {
            if (this.updatable && !this.updatedRedirectTo && !this.addressed) {
                axios.get(`/api/url/${this.id}/details`).then(result => {
                    if (this.updatable) {
                        this.updatedRedirectTo = result.data.redirect_to;
                        this.getDevRedirectUrl = result.data.devRedirectUrl;
                        setTimeout(() => {
                            this.updateSelf();
                        }, 10000);
                    }
                });
            }
        },
        clearUpdatable: function() {
            this.updatable = false;
        }
    }
};
</script>
