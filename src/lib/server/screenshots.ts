import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { env } from "$env/dynamic/private";
import type { Browser, Page } from "playwright";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { batches } from "./schema";

// Where captured screenshots live on disk. In production this should point at a
// persistent volume (see nixpacks.toml / Dokploy). Defaults to a repo-local
// folder for development.
const STORAGE_DIR = resolve(env.SCREENSHOTS_DIR || ".screenshots");

const VIEWPORT = { width: 1280, height: 720 };
const NAV_TIMEOUT = 20_000;
const LOAD_SETTLE_TIMEOUT = 3_000;
const FONT_SETTLE_TIMEOUT = 2_000;
const FINAL_SETTLE_MS = 1_000;
const JPEG_QUALITY = 72;
// Uploaded screenshots are normalized to the same dimensions/format as captured
// ones so the serving endpoint and storage path stay identical.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
];
const BLOCKED_VIDEO_HOSTS = [
    "youtube.com",
    "youtube-nocookie.com",
    "youtu.be",
    "googlevideo.com",
    "ytimg.com",
    "vimeo.com",
    "vimeocdn.com",
];
const CAPTURE_MODES = [
    {
        name: "standard",
        javaScriptEnabled: true,
        preparePage: true,
    },
    {
        name: "static",
        javaScriptEnabled: false,
        preparePage: false,
    },
];

type CaptureMode = (typeof CAPTURE_MODES)[number];

let browserPromise: Promise<Browser> | null = null;

// Reuse a single Chromium instance across captures. Launching a browser per
// request is slow and memory-heavy, so we keep one alive and relaunch only if
// it has disconnected (crash, OOM, etc.).
async function getBrowser(): Promise<Browser> {
    if (browserPromise) {
        const existing = await browserPromise.catch(() => null);
        if (existing?.isConnected()) return existing;
        browserPromise = null;
    }

    // Imported lazily so read paths (page loads, serving the stored image)
    // never pull Playwright into their module graph — only an actual capture
    // loads the browser library.
    const { chromium } = await import("playwright");
    browserPromise = chromium.launch({
        // In production CHROMIUM_PATH points at the Nix-provided chromium. When
        // unset (local dev) Playwright uses its bundled download.
        executablePath: env.CHROMIUM_PATH || undefined,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    return browserPromise;
}

// Tear down the current browser (e.g. after a renderer crash) so the next
// getBrowser() call launches a fresh one.
async function resetBrowser(): Promise<void> {
    const current = browserPromise;
    browserPromise = null;
    try {
        const browser = await current?.catch(() => null);
        await browser?.close();
    } catch {
        // Already gone — nothing to clean up.
    }
}

export function screenshotFilePath(batchId: number): string {
    return join(STORAGE_DIR, `${batchId}.jpg`);
}

function isBlockedVideoRequest(url: string): boolean {
    let hostname: string;

    try {
        hostname = new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return false;
    }

    return BLOCKED_VIDEO_HOSTS.some(
        (blockedHost) => hostname === blockedHost || hostname.endsWith(`.${blockedHost}`),
    );
}

async function waitForPageToSettle(page: Page): Promise<void> {
    await Promise.allSettled([
        page.waitForLoadState("load", { timeout: LOAD_SETTLE_TIMEOUT }),
        page.evaluate(async (timeoutMs) => {
            if (!("fonts" in document)) return;

            await Promise.race([
                document.fonts.ready,
                new Promise((resolve) => setTimeout(resolve, timeoutMs)),
            ]);
        }, FONT_SETTLE_TIMEOUT),
    ]);

    await page.waitForTimeout(FINAL_SETTLE_MS);
}

async function preparePageForScreenshot(page: Page): Promise<void> {
    await page.addStyleTag({
        content: `
            *,
            *::before,
            *::after {
                animation: none !important;
                transition: none !important;
                scroll-behavior: auto !important;
            }

            iframe[src*="youtube"],
            iframe[src*="youtube-nocookie"],
            iframe[src*="youtu.be"],
            iframe[src*="vimeo"],
            video,
            audio {
                visibility: hidden !important;
            }
        `,
    });

    await page.evaluate(() => {
        for (const media of document.querySelectorAll("video, audio")) {
            media.removeAttribute("autoplay");
            media.removeAttribute("src");
            media.replaceChildren();
        }
    });
}

async function captureOnce(batchId: number, baseUrl: string, mode: CaptureMode): Promise<void> {
    const browser = await getBrowser();
    const context = await browser.newContext({
        viewport: VIEWPORT,
        javaScriptEnabled: mode.javaScriptEnabled,
    });

    // Block video/audio and common video embeds: they're the most common
    // renderer-memory hogs (autoplay hero videos) and never add anything useful
    // to a static thumbnail. Heavy media has crashed the renderer ("Target
    // crashed") on some pages, and iframe players can keep load from settling.
    await context.route("**/*", (route) => {
        const request = route.request();
        if (request.resourceType() === "media" || isBlockedVideoRequest(request.url())) {
            return route.abort();
        }
        return route.continue();
    });

    try {
        const page = await context.newPage();

        try {
            await page.goto(baseUrl, {
                waitUntil: "domcontentloaded",
                timeout: NAV_TIMEOUT,
            });
        } catch {
            // Navigation timed out or partially failed — screenshot the
            // current state rather than giving up entirely.
        }

        await waitForPageToSettle(page);
        if (mode.preparePage) {
            await preparePageForScreenshot(page);
        }
        const buffer = await page.screenshot({
            type: "jpeg",
            quality: JPEG_QUALITY,
            animations: "disabled",
            caret: "hide",
        });

        await mkdir(STORAGE_DIR, { recursive: true });
        await writeFile(screenshotFilePath(batchId), buffer);

        await db
            .update(batches)
            .set({ screenshotUpdatedAt: new Date() })
            .where(eq(batches.id, batchId));
    } finally {
        await context.close();
    }
}

// Capture baseUrl to disk and stamp the batch so the UI knows a screenshot
// exists (and can cache-bust on the new timestamp). Best-effort on navigation:
// if the page never fully settles we still capture whatever rendered. Some
// pages crash the renderer ("Target crashed") with their own scripts running,
// so the fallback retries as a static document with JavaScript disabled.
export async function captureScreenshot(batchId: number, baseUrl: string): Promise<void> {
    console.log(
        `[screenshot] capturing batch ${batchId} (${baseUrl}) → ${screenshotFilePath(batchId)}; chromium=${env.CHROMIUM_PATH || "(bundled)"}`,
    );

    let lastError: unknown;

    for (let attempt = 1; attempt <= CAPTURE_MODES.length; attempt++) {
        const mode = CAPTURE_MODES[attempt - 1];

        try {
            await captureOnce(batchId, baseUrl, mode);
            console.log(`[screenshot] captured batch ${batchId} using ${mode.name} mode`);
            return;
        } catch (error) {
            lastError = error;
            console.warn(
                `[screenshot] attempt ${attempt}/${CAPTURE_MODES.length} (${mode.name}) failed for batch ${batchId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            // The browser may have crashed — drop it so the next attempt
            // launches a fresh one.
            await resetBrowser();
        }
    }

    throw lastError;
}

// Store a user-uploaded image as the batch's screenshot, overriding whatever was
// generated. The upload is re-encoded to a JPEG at the standard viewport width
// (reusing the capture browser) so it lives at the same path and is served by the
// same endpoint as a generated screenshot. Throws on an undecodable image.
export async function storeUploadedScreenshot(
    batchId: number,
    bytes: Uint8Array,
    mimeType: string,
): Promise<void> {
    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        throw new Error("Image is too large.");
    }

    const browser = await getBrowser();
    const context = await browser.newContext({ viewport: VIEWPORT });

    try {
        const page = await context.newPage();
        const dataUrl = `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;

        // Decode and re-encode in the page: Chromium handles every accepted type
        // and a canvas gives us a normalized JPEG without an image library.
        const jpegBase64 = await page.evaluate(
            async ({ src, quality, maxWidth }) => {
                const img = new Image();
                img.src = src;
                await img.decode();

                const scale = Math.min(1, maxWidth / img.naturalWidth);
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("Canvas 2D context unavailable.");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                return canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
            },
            { src: dataUrl, quality: JPEG_QUALITY / 100, maxWidth: VIEWPORT.width },
        );

        if (!jpegBase64) throw new Error("Image could not be decoded.");

        await mkdir(STORAGE_DIR, { recursive: true });
        await writeFile(screenshotFilePath(batchId), Buffer.from(jpegBase64, "base64"));

        await db
            .update(batches)
            .set({ screenshotUpdatedAt: new Date() })
            .where(eq(batches.id, batchId));
    } finally {
        await context.close();
    }
}
