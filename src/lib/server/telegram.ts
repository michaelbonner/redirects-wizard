import { env } from "$env/dynamic/private";

type ContactSubmission = {
    name: string;
    email: string;
    message: string;
};

type TelegramResult =
    | { kind: "sent" }
    | { kind: "missing_configuration" }
    | { kind: "request_failed" }
    | { kind: "api_rejected"; status: number; description: string };

type SendContactNotificationOptions = ContactSubmission & {
    fetch: typeof globalThis.fetch;
};

function getTelegramErrorDescription(value: unknown): string {
    if (
        typeof value === "object" &&
        value !== null &&
        "description" in value &&
        typeof value.description === "string"
    ) {
        return value.description;
    }

    return "Telegram rejected the request without a description.";
}

export async function sendContactNotification({
    name,
    email,
    message,
    fetch,
}: SendContactNotificationOptions): Promise<TelegramResult> {
    const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = env.TELEGRAM_CHAT_ID?.trim();

    if (!botToken || !chatId) {
        return { kind: "missing_configuration" };
    }

    let response: Response;

    try {
        response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: [
                    "New Redirects Wizard contact",
                    "",
                    `Name: ${name}`,
                    `Email: ${email}`,
                    "",
                    "Message:",
                    message,
                ].join("\n"),
            }),
        });
    } catch {
        return { kind: "request_failed" };
    }

    if (response.ok) {
        return { kind: "sent" };
    }

    let body: unknown;

    try {
        body = await response.json();
    } catch {
        body = undefined;
    }

    return {
        kind: "api_rejected",
        status: response.status,
        description: getTelegramErrorDescription(body),
    };
}
