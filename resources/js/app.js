/**
 * First we will load all of this project's JavaScript dependencies which
 * includes Vue and other libraries. It is a great starting point when
 * building robust, powerful web applications using Vue and Laravel.
 */
import { createApp } from "vue/dist/vue.esm-bundler";
import "./bootstrap";
import AddUrlsComponent from "./components/AddUrlsComponent.vue";
import BatchComponent from "./components/BatchComponent.vue";
import BatchEditComponent from "./components/BatchEditComponent.vue";
import UrlComponent from "./components/UrlComponent.vue";

const app = createApp({});

app.component("batch-component", BatchComponent)
    .component("batch-edit-component", BatchEditComponent)
    .component("url-component", UrlComponent)
    .component("add-urls-component", AddUrlsComponent);

app.mount("#app");
