const admin = require('firebase-admin');
const { COLLECTIONS } = require('../shared/firestore');
const { publishPost } = require('./publicationCore');
const { publishToInstagram, publishToTikTok } = require('./buffer');

async function publishPendingPost(postId, options) {
    return publishPost(admin.firestore(), COLLECTIONS, {
        insta: publishToInstagram, tiktok: publishToTikTok,
    }, postId, options);
}

module.exports = { publishPendingPost };
