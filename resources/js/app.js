/**
 * First we will load all of this project's JavaScript dependencies which
 * includes Vue and other libraries. It is a great starting point when
 * building robust, powerful web applications using Vue and Laravel.
 */
import Vue from "vue/dist/vue.common.js";

import "./bootstrap";

import BatchComponent from "./components/BatchComponent.vue";
import BatchEditComponent from "./components/BatchEditComponent.vue";
import UrlComponent from "./components/UrlComponent.vue";
import AddUrlsComponent from "./components/AddUrlsComponent.vue";

/**
 * Next, we will create a fresh Vue application instance and attach it to
 * the page. Then, you may begin adding components to this application
 * or customize the JavaScript scaffolding to fit your unique needs.
 */

Vue.component("batch-component", BatchComponent);
Vue.component("batch-edit-component", BatchEditComponent);
Vue.component("url-component", UrlComponent);
Vue.component("add-urls-component", AddUrlsComponent);

const app = new Vue({
    el: "#app",
});
