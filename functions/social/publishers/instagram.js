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

async function fetchPermalink(igUrl, mediaId, accessToken) {
    const detail = await getJson(
        `${GRAPH}/${mediaId}?fields=permalink,timestamp&access_token=${accessToken}`,
    );
    return detail.permalink || '';
}

/**
 * Photo carousel (up to 10 items). Uses the FEED slides (4:5).
 */
async function publishAsPhotoCarousel(slides, caption, auth) {
    const feedSlides = slides.filter((s) => s.format === 'feed');
    if (feedSlides.length === 0) throw new Error('No feed slides for Instagram');

    const { accountId, accessToken } = auth;
    const igUrl = `${GRAPH}/${accountId}`;
    const items = feedSlides.slice(0, 10);

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

    const publish = await postJson(`${igUrl}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken,
    });
    const mediaId = publish.id;
    const permalink = await fetchPermalink(igUrl, mediaId, accessToken);

    return { id: mediaId, permalink, publishedAt: Date.now() };
}

/**
 * Reel (video). Renders a 9:16 slideshow MP4 from the story slides
 * via the shared videoRenderer, then publishes as REELS.
 *
 * Polling required: Meta returns status_code='FINISHED' when the video
 * is ready to publish (typically 20–60s for short reels).
 */
async function publishAsReel(slides, caption, auth) {
    const { renderSlideshowVideo } = require('../generators/videoRenderer');

    const storySlides = slides.filter((s) => s.format === 'story');
    if (storySlides.length === 0) {
        throw new Error('Instagram Reel mode requires story-format slides (1080x1920)');
    }
    storySlides.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    const { url: videoUrl } = await renderSlideshowVideo(storySlides, {
        perSlideSeconds: 3,
    });

    const { accountId, accessToken } = auth;
    const igUrl = `${GRAPH}/${accountId}`;

    // Create the reel container
    const container = await postJson(`${igUrl}/media`, {
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: accessToken,
    });
    const creationId = container.id;

    // Poll until Meta has finished processing
    const start = Date.now();
    const maxWait = 180_000; // 3 min
    while (Date.now() - start < maxWait) {
        const status = await getJson(
            `${GRAPH}/${creationId}?fields=status_code,status&access_token=${accessToken}`,
        );
        if (status.status_code === 'FINISHED') break;
        if (status.status_code === 'ERROR') {
            throw new Error(`Meta reel processing failed: ${status.status || 'unknown'}`);
        }
        await new Promise((r) => setTimeout(r, 5000));
    }

    // Publish
    const publish = await postJson(`${igUrl}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken,
    });
    const mediaId = publish.id;
    const permalink = await fetchPermalink(igUrl, mediaId, accessToken);

    return { id: mediaId, permalink, publishedAt: Date.now(), videoUrl };
}

/**
 * @param {Array<{url:string, format:string, index?:number}>} slides
 * @param {string} caption
 * @param {{accountId:string, accessToken:string, mode?:'photo'|'video'}} auth
 */
async function publishToInstagram(slides, caption, auth) {
    if (!slides?.length) throw new Error('No slides to publish');
    if (!auth?.accountId || !auth?.accessToken) throw new Error('Missing Instagram credentials');
    const mode = auth.mode === 'video' ? 'video' : 'photo';
    if (mode === 'video') return publishAsReel(slides, caption, auth);
    return publishAsPhotoCarousel(slides, caption, auth);
}

module.exports = { publishToInstagram };
