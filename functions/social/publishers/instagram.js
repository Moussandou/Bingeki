/**
 * publishers/instagram.js — Meta Graph API (Content Publishing).
 *
 * Requires:
 * - Instagram Business/Creator linked to a Facebook Page.
 * - Long-lived Page Access Token in Secret Manager (INSTA_PAGE_TOKEN).
 * - IG User ID in bot_config.platforms.insta.accountId.
 * - Scopes: instagram_content_publish, pages_read_engagement, instagram_basic.
 *
 * Carousel flow:
 * 1. For each slide: POST /{ig-user-id}/media
 *      { image_url, is_carousel_item: true, access_token }
 *    → returns { id } (container id)
 * 2. POST /{ig-user-id}/media
 *      { media_type: 'CAROUSEL', children: [id1, id2, ...], caption, access_token }
 *    → returns { id } (carousel container)
 * 3. POST /{ig-user-id}/media_publish
 *      { creation_id, access_token }
 *    → returns { id } (published media id)
 * 4. Fetch permalink: GET /{media-id}?fields=permalink,timestamp
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

async function postJson(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Meta ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return json;
}

async function getJson(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Meta ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return json;
}

/**
 * @param {Array<{url:string}>} slides — must have at least 1 slide.
 * @param {string} caption — combined caption + hashtags.
 * @param {{accountId:string, accessToken:string}} auth
 */
async function publishToInstagram(slides, caption, auth) {
    if (!slides?.length) throw new Error('No slides to publish');
    if (!auth?.accountId || !auth?.accessToken) throw new Error('Missing Instagram credentials');

    const feedSlides = slides.filter((s) => s.format === 'feed');
    if (feedSlides.length === 0) throw new Error('No feed slides for Instagram');

    const { accountId, accessToken } = auth;
    const igUrl = `${GRAPH}/${accountId}`;

    // Instagram supports up to 10 carousel items
    const items = feedSlides.slice(0, 10);

    // Step 1 & 2: create item containers (single-image posts use no carousel)
    let creationId;
    if (items.length === 1) {
        const container = await postJson(`${igUrl}/media`, {
            image_url: items[0].url,
            caption,
            access_token: accessToken,
        });
        creationId = container.id;
    } else {
        const containerIds = [];
        for (const s of items) {
            const c = await postJson(`${igUrl}/media`, {
                image_url: s.url,
                is_carousel_item: true,
                access_token: accessToken,
            });
            containerIds.push(c.id);
        }
        const carousel = await postJson(`${igUrl}/media`, {
            media_type: 'CAROUSEL',
            children: containerIds.join(','),
            caption,
            access_token: accessToken,
        });
        creationId = carousel.id;
    }

    // Step 3: publish
    const publish = await postJson(`${igUrl}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken,
    });
    const mediaId = publish.id;

    // Step 4: get permalink
    const detail = await getJson(
        `${GRAPH}/${mediaId}?fields=permalink,timestamp&access_token=${accessToken}`,
    );

    return {
        id: mediaId,
        permalink: detail.permalink || '',
        publishedAt: Date.now(),
    };
}

module.exports = { publishToInstagram };
