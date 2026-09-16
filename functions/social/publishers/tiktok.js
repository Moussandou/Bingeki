/**
 * publishers/tiktok.js — TikTok Content Posting API (photo carousel).
 *
 * Requires:
 * - TikTok for Developers app with content.posting.write scope.
 * - App approved through the sandbox audit for production.
 * - OAuth 2.0 access token in Secret Manager (TIKTOK_ACCESS_TOKEN).
 *   Access tokens expire — refresh via TIKTOK_REFRESH_TOKEN.
 *
 * Photo carousel flow:
 * 1. POST /v2/post/publish/content/init/
 *      { post_info: {title, description, disable_comment: false, ...},
 *        source_info: {source: 'PULL_FROM_URL', photo_images: [urls], ...} }
 *    → returns { publish_id }
 * 2. Poll GET /v2/post/publish/status/fetch/?publish_id=...
 *    until status = PUBLISH_COMPLETE (or FAILED / timeout).
 *
 * TikTok pull-from-URL requires HTTPS URLs on a domain verified in the
 * developer portal (or the app must be published unaudited for dev
 * mode where the creator manually confirms in the app).
 */

const TIKTOK_API = 'https://open.tiktokapis.com';

async function postJson(url, body, accessToken) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error?.code !== 'ok') {
        throw new Error(`TikTok ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return json;
}

async function getJson(url, accessToken) {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`TikTok ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return json;
}

async function pollPublishStatus(publishId, accessToken, maxWaitMs = 60_000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        const res = await getJson(
            `${TIKTOK_API}/v2/post/publish/status/fetch/?publish_id=${encodeURIComponent(publishId)}`,
            accessToken,
        );
        const status = res?.data?.status;
        if (status === 'PUBLISH_COMPLETE') return res.data;
        if (status === 'FAILED') throw new Error(`TikTok publish failed: ${res.data?.fail_reason || 'unknown'}`);
        await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('TikTok publish timeout');
}

async function publishAsPhoto(slides, caption, accessToken) {
    // Prefer story-format (9:16) for TikTok, fall back to feed
    const preferred = slides.filter((s) => s.format === 'story');
    const items = (preferred.length ? preferred : slides).slice(0, 35);

    const init = await postJson(
        `${TIKTOK_API}/v2/post/publish/content/init/`,
        {
            post_info: {
                title: caption.slice(0, 90),
                description: caption,
                disable_comment: false,
                privacy_level: 'PUBLIC_TO_EVERYONE',
                auto_add_music: false,
            },
            source_info: {
                source: 'PULL_FROM_URL',
                photo_cover_index: 0,
                photo_images: items.map((s) => s.url),
            },
            post_mode: 'DIRECT_POST',
            media_type: 'PHOTO',
        },
        accessToken,
    );

    const publishId = init?.data?.publish_id;
    if (!publishId) throw new Error('TikTok init did not return publish_id');
    const status = await pollPublishStatus(publishId, accessToken);
    return { id: status.post_id || publishId, publishedAt: Date.now() };
}

async function publishAsVideo(slides, caption, accessToken) {
    // Lazy-require to avoid loading ffmpeg on cold starts that don't need video.
    const { renderSlideshowVideo } = require('../generators/videoRenderer');

    const storySlides = slides.filter((s) => s.format === 'story');
    if (storySlides.length === 0) {
        throw new Error('TikTok video mode requires story-format slides (1080x1920)');
    }
    // Order slides by index
    storySlides.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    const { url: videoUrl } = await renderSlideshowVideo(storySlides, {
        perSlideSeconds: 3,
    });

    const init = await postJson(
        `${TIKTOK_API}/v2/post/publish/video/init/`,
        {
            post_info: {
                title: caption.slice(0, 2200),
                privacy_level: 'PUBLIC_TO_EVERYONE',
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false,
                video_cover_timestamp_ms: 1000,
            },
            source_info: {
                source: 'PULL_FROM_URL',
                video_url: videoUrl,
            },
        },
        accessToken,
    );

    const publishId = init?.data?.publish_id;
    if (!publishId) throw new Error('TikTok video init did not return publish_id');
    const status = await pollPublishStatus(publishId, accessToken);
    return { id: status.post_id || publishId, publishedAt: Date.now(), videoUrl };
}

/**
 * @param {Array<{url:string, format:string, index?:number}>} slides
 * @param {string} caption
 * @param {{accessToken:string, mode?:'photo'|'video'}} auth
 */
async function publishToTikTok(slides, caption, auth) {
    if (!slides?.length) throw new Error('No slides to publish');
    if (!auth?.accessToken) throw new Error('Missing TikTok access token');

    const mode = auth.mode === 'video' ? 'video' : 'photo';
    if (mode === 'video') {
        return publishAsVideo(slides, caption, auth.accessToken);
    }
    return publishAsPhoto(slides, caption, auth.accessToken);
}

module.exports = { publishToTikTok };
