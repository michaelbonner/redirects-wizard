/**
 * First we will load all of this project's JavaScript dependencies which
 * includes Vue and other libraries. It is a great starting point when
 * building robust, powerful web applications using Vue and Laravel.
 */
import Vue from "vue/dist/vue.common.js";

require("./bootstrap");

/**
 * Next, we will create a fresh Vue application instance and attach it to
 * the page. Then, you may begin adding components to this application
 * or customize the JavaScript scaffolding to fit your unique needs.
 */

Vue.component(
    "batch-component",
    require("./components/BatchComponent.vue").default
);
Vue.component(
    "batch-edit-component",
    require("./components/BatchEditComponent.vue").default
);
Vue.component(
    "url-component",
    require("./components/UrlComponent.vue").default
);
Vue.component(
    "add-urls-component",
    require("./components/AddUrlsComponent.vue").default
);

const app = new Vue({
    el: "#app"
});
