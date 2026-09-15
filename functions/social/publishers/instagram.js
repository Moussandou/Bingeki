/**
 * publishers/instagram.js — Meta Graph API (Content Publishing)
 *
 * Requires:
 * - Instagram Business/Creator account linked to a Facebook Page
 * - Long-lived Page Access Token stored in Secret Manager
 * - `pages_read_engagement`, `instagram_content_publish`, `instagram_basic` scopes
 *
 * Phase 1 stub.
 */

// const INSTA_TOKEN = defineSecret('INSTA_PAGE_TOKEN');
// const INSTA_ACCOUNT_ID = defineSecret('INSTA_ACCOUNT_ID');

async function publishToInstagram(_slides, _caption, _hashtags) {
    // TODO:
    // 1. Create a carousel container:
    //    POST /{ig-user-id}/media  { media_type: 'CAROUSEL', children: [containerIds] }
    // 2. For each slide, create an image container first.
    // 3. Publish container:
    //    POST /{ig-user-id}/media_publish  { creation_id }
    // 4. Return { id, permalink, publishedAt }.
    throw new Error('Not implemented — Phase 4');
}

module.exports = { publishToInstagram };
