/**
 * generators/renderer.js — HTML → PNG rendering.
 *
 * Phase 3 shortcut: uses Jikan cover URLs directly as slide images to
 * unblock the pipeline end-to-end without a Puppeteer dep. The real
 * templated renderer (with the manga-style overlays from the mockups)
 * will land in a follow-up when we're happy with the pipeline.
 */

/**
 * @param {'daily'|'weekly'|'favorite'|'newseason'} type
 * @param {object|Array} data — output of generators/jikan or stats
 * @param {Array<'feed'|'story'>} formats
 * @returns {Promise<Array<{format, url, index}>>}
 */
async function renderSlides(type, data, formats = ['feed']) {
    // Normalize input into a list of anime with cover URLs
    let animes = [];
    if (type === 'daily' || type === 'weekly' || type === 'favorite') {
        animes = Array.isArray(data) ? data : [data];
    } else if (type === 'newseason') {
        animes = [data];
    }

    const slides = [];
    let index = 0;

    for (const format of formats) {
        for (const anime of animes) {
            const url = anime.cover || anime.image || '';
            if (!url) continue;
            slides.push({ format, url, index });
            index += 1;
        }
    }

    return slides;
}

module.exports = { renderSlides };
