/**
 * publishers/buffer.js — Buffer GraphQL API (single endpoint for all
 * platforms: Instagram, TikTok, X, LinkedIn, Threads, ...).
 *
 * Why this exists:
 *   Meta App Review + TikTok Content Posting API approval take weeks and
 *   require a running production website. Buffer wraps every platform
 *   behind a single Bearer-token GraphQL endpoint — one integration
 *   instead of one per network. Free plan supports 3 channels with a
 *   rolling queue of 10 unpublished posts per channel, which fits us
 *   since Firebase Cron triggers publication at the intended moment
 *   (queue depth stays ~0-1).
 *
 * Endpoint / auth:
 *   POST https://api.buffer.com  (Bearer <BUFFER_API_KEY>)
 *
 * Post flow (single mutation, assets referenced by public URL):
 *   mutation {
 *     createPost(input: {
 *       text: "caption + hashtags",
 *       channelId: "<buffer-channel-id>",
 *       schedulingType: automatic,
 *       mode: customScheduled,
 *       dueAt: "<iso-utc>",
 *       assets: [{ image: { url: "https://..." } }, ...]
 *     }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } }
 *   }
 *
 * Assets:
 *   - Slide PNGs must live at a publicly reachable HTTPS URL (Firebase
 *     Storage default public bucket works — same URLs we already store
 *     in Firestore for each slide).
 *   - Videos: same rule; upload the ffmpeg-generated MP4 to Storage and
 *     pass its public URL.
 *
 * Errors:
 *   Buffer always returns HTTP 200 for GraphQL. Two failure shapes:
 *     - top-level `errors` array → transport / auth / schema issue
 *     - `data.createPost.__typename === 'MutationError'` → validation
 */

const BUFFER_ENDPOINT = 'https://api.buffer.com';

const CREATE_POST_MUTATION = /* GraphQL */ `
    mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
            __typename
            ... on PostActionSuccess {
                post {
                    id
                    dueAt
                    channel { id service }
                }
            }
            ... on MutationError {
                message
            }
        }
    }
`;

async function graphql(query, variables, apiKey) {
    // Buffer's TikTok integration internally uploads to TikTok's servers
    // during createPost; that can push well past 30s. Give it 90s.
    const res = await fetch(BUFFER_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(90_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.errors?.length) {
        const msg = body?.errors?.[0]?.message || `HTTP ${res.status}`;
        throw new Error(`Buffer API error: ${msg}`);
    }
    return body?.data || {};
}

function buildImageAssets(slides, format) {
    const filtered = slides.filter((s) => s.format === format);
    if (filtered.length === 0) {
        throw new Error(`Buffer: no ${format} slides to publish`);
    }
    filtered.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return filtered.slice(0, 10).map((s) => ({ image: { url: s.url } }));
}

async function buildVideoAssets(slides, format, thumbnailOffsetMs = 500) {
    const { renderSlideshowVideo } = require('../generators/videoRenderer');
    const filtered = slides.filter((s) => s.format === format);
    if (filtered.length === 0) {
        throw new Error(`Buffer video: no ${format} slides to render`);
    }
    filtered.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const { url } = await renderSlideshowVideo(filtered, { perSlideSeconds: 3 });
    return [{ video: { url, metadata: { thumbnailOffset: thumbnailOffsetMs } } }];
}

function toIsoDueAt(scheduleAt) {
    if (!scheduleAt) return new Date(Date.now() + 30_000).toISOString();
    if (scheduleAt instanceof Date) return scheduleAt.toISOString();
    if (typeof scheduleAt === 'number') return new Date(scheduleAt).toISOString();
    return String(scheduleAt);
}

async function createBufferPost({ channelId, text, assets, dueAt, apiKey, metadata }) {
    const input = {
        text,
        channelId,
        schedulingType: 'automatic',
        mode: 'customScheduled',
        dueAt,
        assets,
    };
    if (metadata) input.metadata = metadata;
    const data = await graphql(CREATE_POST_MUTATION, { input }, apiKey);
    const payload = data.createPost;
    if (!payload) throw new Error('Buffer: empty createPost response');
    if (payload.__typename === 'MutationError' || payload.__typename === 'InvalidInputError') {
        throw new Error(`Buffer validation (${payload.__typename}): ${payload.message}`);
    }
    if (payload.__typename !== 'PostActionSuccess' || !payload.post?.id) {
        throw new Error(`Buffer: unexpected response ${JSON.stringify(payload).slice(0, 200)}`);
    }
    return payload.post;
}

/**
 * Publish an Instagram post via Buffer.
 *   auth: { apiKey, channelId, mode?: 'photo'|'video', scheduleAt? }
 * Returns { id, permalink, publishedAt } to stay compatible with the
 * existing publishToInstagram contract used by the admin callable.
 */
async function publishToInstagram(slides, caption, auth) {
    if (!slides?.length) throw new Error('No slides to publish');
    if (!auth?.apiKey || !auth?.channelId) {
        throw new Error('Buffer: missing apiKey or channelId (Instagram)');
    }
    const mode = auth.mode === 'video' ? 'video' : 'photo';
    const assets = mode === 'video'
        ? await buildVideoAssets(slides, 'story')
        : buildImageAssets(slides, 'feed');

    // Buffer requires an Instagram post type: 'post' (feed image/carousel),
    // 'reel' (video), or 'story'. shouldShareToFeed is enabled by default
    // so Reels also appear on the profile grid.
    const metadata = {
        instagram: {
            type: mode === 'video' ? 'reel' : 'post',
            shouldShareToFeed: true,
        },
    };

    const post = await createBufferPost({
        channelId: auth.channelId,
        text: caption,
        assets,
        dueAt: toIsoDueAt(auth.scheduleAt),
        apiKey: auth.apiKey,
        metadata,
    });

    return {
        id: post.id,
        permalink: '',
        publishedAt: Date.now(),
        provider: 'buffer',
        dueAt: post.dueAt,
    };
}

/**
 * Publish a TikTok post via Buffer. Same auth shape as Instagram.
 * TikTok on Buffer accepts photo carousels and videos; we build the
 * same asset set as Instagram from story-format slides for parity
 * with the existing publishToTikTok contract.
 */
async function publishToTikTok(slides, caption, auth) {
    if (!slides?.length) throw new Error('No slides to publish');
    if (!auth?.apiKey || !auth?.channelId) {
        throw new Error('Buffer: missing apiKey or channelId (TikTok)');
    }
    const mode = auth.mode === 'video' ? 'video' : 'photo';
    // TikTok photo carousels post as a slideshow that gets letterboxed
    // whatever ratio we upload, but Hugo prefers the 4:5 feed cards over
    // the 9:16 story cards for visual parity with the Instagram post.
    // Videos still use story (9:16) since that's TikTok's native ratio.
    const assets = mode === 'video'
        ? await buildVideoAssets(slides, 'story')
        : buildImageAssets(slides, 'feed');

    const post = await createBufferPost({
        channelId: auth.channelId,
        text: caption,
        assets,
        dueAt: toIsoDueAt(auth.scheduleAt),
        apiKey: auth.apiKey,
    });

    return {
        id: post.id,
        permalink: '',
        publishedAt: Date.now(),
        provider: 'buffer',
        dueAt: post.dueAt,
    };
}

module.exports = {
    publishToInstagram,
    publishToTikTok,
    createBufferPost,
    graphql,
};
