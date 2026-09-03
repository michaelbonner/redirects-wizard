import { fail } from "@sveltejs/kit";
import { sendContactNotification } from "$lib/server/telegram";
import type { Actions } from "./$types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 3_500;

export const actions = {
    default: async ({ request, fetch }) => {
        const formData = await request.formData();
        const name = String(formData.get("name") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const message = String(formData.get("message") ?? "").trim();

        const values = { name, email, message };

        if (!name || !email || !message) {
            return fail(400, {
                ...values,
                error: "Please fill in your name, email, and a message.",
            });
        }

        if (!EMAIL_RE.test(email)) {
            return fail(400, {
                ...values,
                error: "Please enter a valid email address.",
            });
        }

        if (message.length < 10) {
            return fail(400, {
                ...values,
                error: "Your message is a little short. Tell us a bit more.",
            });
        }

        if (
            name.length > MAX_NAME_LENGTH ||
            email.length > MAX_EMAIL_LENGTH ||
            message.length > MAX_MESSAGE_LENGTH
        ) {
            return fail(400, {
                ...values,
                error: "Your submission is too long. Please shorten it and try again.",
            });
        }

        const result = await sendContactNotification({ name, email, message, fetch });

        if (result.kind !== "sent") {
            if (result.kind === "api_rejected") {
                console.error("[contact] Telegram rejected notification", {
                    status: result.status,
                    description: result.description,
                });
            } else {
                console.error("[contact] Telegram notification failed", {
                    reason: result.kind,
                });
            }

            return fail(502, {
                ...values,
                error: "We couldn't send your message. Please try again in a moment.",
            });
        }

        return { success: true };
    },
} satisfies Actions;
