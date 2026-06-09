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
const BLOCKED_VIDEO_HOSTS = [
    "youtube.com",
    "youtube-nocookie.com",
    "youtu.be",
    "googlevideo.com",
    "ytimg.com",
    "vimeo.com",
    "vimeocdn.com",
];

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
        args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
        ],
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
        (blockedHost) =>
            hostname === blockedHost || hostname.endsWith(`.${blockedHost}`),
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

async function captureOnce(batchId: number, devUrl: string): Promise<void> {
    const browser = await getBrowser();
    const context = await browser.newContext({ viewport: VIEWPORT });

    // Block video/audio and common video embeds: they're the most common
    // renderer-memory hogs (autoplay hero videos) and never add anything useful
    // to a static thumbnail. Heavy media has crashed the renderer ("Target
    // crashed") on some pages, and iframe players can keep load from settling.
    await context.route("**/*", (route) => {
        const request = route.request();
        if (
            request.resourceType() === "media" ||
            isBlockedVideoRequest(request.url())
        ) {
            return route.abort();
        }
        return route.continue();
    });

    try {
        const page = await context.newPage();

        try {
            await page.goto(devUrl, {
                waitUntil: "domcontentloaded",
                timeout: NAV_TIMEOUT,
            });
        } catch {
            // Navigation timed out or partially failed — screenshot the
            // current state rather than giving up entirely.
        }

        await waitForPageToSettle(page);
        const buffer = await page.screenshot({
            type: "jpeg",
            quality: JPEG_QUALITY,
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

// Capture devUrl to disk and stamp the batch so the UI knows a screenshot
// exists (and can cache-bust on the new timestamp). Best-effort on navigation:
// if the page never fully settles we still capture whatever rendered. Some
// pages crash the renderer ("Target crashed") on the first attempt; relaunching
// the browser and retrying once almost always succeeds.
export async function captureScreenshot(
    batchId: number,
    devUrl: string,
): Promise<void> {
    console.log(
        `[screenshot] capturing batch ${batchId} (${devUrl}) → ${screenshotFilePath(batchId)}; chromium=${env.CHROMIUM_PATH || "(bundled)"}`,
    );

    const MAX_ATTEMPTS = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await captureOnce(batchId, devUrl);
            return;
        } catch (error) {
            lastError = error;
            console.warn(
                `[screenshot] attempt ${attempt}/${MAX_ATTEMPTS} failed for batch ${batchId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            // The browser may have crashed — drop it so the next attempt
            // launches a fresh one.
            await resetBrowser();
        }
    }

    throw lastError;
}
