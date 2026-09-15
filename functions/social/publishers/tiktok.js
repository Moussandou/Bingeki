/**
 * publishers/tiktok.js — TikTok Content Posting API
 *
 * Requires:
 * - TikTok for Developers app + Content Posting scope
 * - App must pass audit for prod usage
 * - OAuth 2.0 access token stored in Secret Manager
 *
 * Phase 1 stub. TikTok publishes either video or photo slideshow — for
 * V1 we'll do photo slideshow (same slides as Insta carousel).
 */

// const TIKTOK_TOKEN = defineSecret('TIKTOK_ACCESS_TOKEN');

async function publishToTikTok(_slides, _caption, _hashtags) {
    // TODO:
    // 1. Init upload session:
    //    POST /v2/post/publish/content/init/  { post_info, source_info }
    // 2. Upload each slide via PUT to upload_url returned.
    // 3. Poll status until 'PUBLISH_COMPLETE'.
    // 4. Return { id, publishedAt }.
    throw new Error('Not implemented — Phase 4');
}

module.exports = { publishToTikTok };
