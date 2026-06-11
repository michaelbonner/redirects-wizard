import { fail } from "@sveltejs/kit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const name = String(formData.get("name") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const message = String(formData.get("message") ?? "").trim();

        const values = { name, email, message };

        if (!name || !email || !message) {
            return fail(400, {
                ...values,
                message: "Please fill in your name, email, and a message.",
            });
        }

        if (!EMAIL_RE.test(email)) {
            return fail(400, {
                ...values,
                message: "Please enter a valid email address.",
            });
        }

        if (message.length < 10) {
            return fail(400, {
                ...values,
                message: "Your message is a little short — tell us a bit more.",
            });
        }

        // The submission is recorded server-side. Wire this up to your email
        // provider or a contact table to route it to the team.
        console.log("[contact] new submission", { name, email, message });

        return { success: true };
    },
};
