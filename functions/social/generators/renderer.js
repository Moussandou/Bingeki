/**
 * generators/renderer.js — render HTML slides to JPEG via Puppeteer +
 * @sparticuz/chromium, upload to Firebase Storage.
 *
 * JPEG (not PNG) because Instagram Graph API's carousel endpoint only
 * accepts JPEG for photo carousels — PNG returns "Only photo or video
 * can be accepted as media type." at publish time even when the URL
 * serves a valid image/png.
 *
 * Sizes:
 * - feed:  1080×1350 (Instagram Feed portrait 4:5)
 * - story: 1080×1920 (Story / Reels / TikTok 9:16)
 *
 * The Storage path is `social/{yyyy-mm-dd}/{type}/{name}-{format}.jpg`,
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

async function renderHtmlToJpeg(html, { width, height }) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20_000 });
        return await page.screenshot({ type: 'jpeg', quality: 92, omitBackground: false });
    } finally {
        await page.close();
    }
}

async function uploadJpeg(buffer, storagePath) {
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, {
        metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' },
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * @param {'daily'|'weekly'|'favorite'|'newseason'|'announcement'} type
 * @param {object|Array} data
 * @param {Array<'feed'|'story'>} formats
 * @param {object} [opts]
 * @param {{index:number,total:number}} [opts.partInfo] — signal a
 *   multi-part release so the intro slide can show "PARTIE 1/N".
 * @returns {Promise<Array<{format, url, index}>>}
 */
async function renderSlides(type, data, formats = ['feed'], opts = {}) {
    const htmlSlides = buildSlidesHTML(type, data, opts);
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
                const jpeg = await renderHtmlToJpeg(s.html, dims);
                const path = `social/${today}/${type}/${s.name}-${format}-${suffix}.jpg`;
                const url = await uploadJpeg(jpeg, path);
                slides.push({ format, url, index });
                index += 1;
            } catch (err) {
                console.error(`[renderer] failed ${type}/${s.name}/${format}:`, err.message);
            }
        }
    }

    return slides;
}

module.exports = { renderSlides, renderHtmlToJpeg };
