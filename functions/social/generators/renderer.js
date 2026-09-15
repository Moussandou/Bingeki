/**
 * generators/renderer.js — render HTML slides to PNG via Puppeteer +
 * @sparticuz/chromium, upload to Firebase Storage.
 *
 * Sizes:
 * - feed:  1080×1350 (Instagram Feed portrait 4:5)
 * - story: 1080×1920 (Story / Reels / TikTok 9:16)
 *
 * The Storage path is `social/{yyyy-mm-dd}/{type}/{name}-{format}.png`,
 * with a random suffix on the filename to avoid collisions when the
 * same post gets regenerated.
 */

const admin = require('firebase-admin');
const { buildSlidesHTML } = require('./templates');

const DIMS = {
    feed: { width: 1080, height: 1350 },
    story: { width: 1080, height: 1920 },
};

let cachedBrowser = null;

async function getBrowser() {
    if (cachedBrowser && cachedBrowser.isConnected()) return cachedBrowser;
    const chromium = require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');
    cachedBrowser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });
    return cachedBrowser;
}

async function renderHtmlToPng(html, { width, height }) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20_000 });
        return await page.screenshot({ type: 'png', omitBackground: false });
    } finally {
        await page.close();
    }
}

async function uploadPng(buffer, storagePath) {
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, {
        metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * @param {'daily'|'weekly'|'favorite'|'newseason'} type
 * @param {object|Array} data
 * @param {Array<'feed'|'story'>} formats
 * @returns {Promise<Array<{format, url, index}>>}
 */
async function renderSlides(type, data, formats = ['feed']) {
    const htmlSlides = buildSlidesHTML(type, data);
    if (htmlSlides.length === 0) return [];

    const today = new Date().toISOString().slice(0, 10);
    const suffix = Math.random().toString(36).slice(2, 8);
    const slides = [];
    let index = 0;

    for (const format of formats) {
        const dims = DIMS[format];
        if (!dims) continue;
        for (const s of htmlSlides) {
            try {
                const png = await renderHtmlToPng(s.html, dims);
                const path = `social/${today}/${type}/${s.name}-${format}-${suffix}.png`;
                const url = await uploadPng(png, path);
                slides.push({ format, url, index });
                index += 1;
            } catch (err) {
                console.error(`[renderer] failed ${type}/${s.name}/${format}:`, err.message);
            }
        }
    }

    return slides;
}

module.exports = { renderSlides, renderHtmlToPng };
