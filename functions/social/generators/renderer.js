/**
 * generators/renderer.js — HTML → PNG rendering via Puppeteer.
 *
 * The mockup React components (SocialPostMockup.tsx) will be converted
 * to standalone HTML templates that Puppeteer can render at exact
 * 1080×1350 (feed) and 1080×1920 (story) resolutions, then upload to
 * Firebase Storage.
 *
 * Phase 1 stub.
 */

// const puppeteer = require('puppeteer');
// const { getStorage } = require('firebase-admin/storage');

async function renderSlides(_type, _data, _formats = ['feed']) {
    // TODO:
    // 1. For each format & each slide of this post type, build the HTML
    //    from a template + data.
    // 2. Launch Puppeteer, set viewport to target dimensions.
    // 3. Screenshot to PNG buffer.
    // 4. Upload to Storage bucket at `social/{postId}/slide-{n}-{format}.png`.
    // 5. Return array of PostSlide with public URLs.
    throw new Error('Not implemented — Phase 2');
}

module.exports = { renderSlides };
