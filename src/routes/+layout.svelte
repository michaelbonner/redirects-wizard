<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";

    let { data, children } = $props();

    onMount(() => {
        if (!data.user) return;

        const script = document.createElement("script");
        script.async = true;
        script.src =
            "https://easycustomerfeedback.com/widget/d496de302110410cb05eb1b436b7e53e/embed";
        script.dataset.label = "Send feedback";
        script.dataset.position = "right";
        script.dataset.color = "#007595";
        script.dataset.name = data.user.name;
        script.dataset.email = data.user.email;
        script.dataset.userId = data.user.id;
        document.body.appendChild(script);

        return () => {
            script.remove();
        };
    });
</script>

<svelte:head>
    <title>Redirects Wizard</title>
</svelte:head>

{@render children()}
