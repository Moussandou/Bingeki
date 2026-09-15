/**
 * admin/callables.js — HTTPS callables triggered from /admin/social.
 *
 * All callables must verify `context.auth.token.admin` server-side.
 * The RequireAdmin check on the client is NOT enough.
 *
 * Phase 1 stub.
 */

// const { onCall, HttpsError } = require('firebase-functions/v2/https');

function assertAdmin(context) {
    if (!context?.auth?.token?.admin) {
        // throw new HttpsError('permission-denied', 'Admin only');
    }
}

// exports.publishNow = onCall(async (request) => {
//     assertAdmin(request);
//     const { postId } = request.data;
//     // Load pending, run publishers, move to published.
//     throw new Error('Not implemented — Phase 4');
// });

// exports.rejectPost = onCall(async (request) => {
//     assertAdmin(request);
//     const { postId, reason } = request.data;
//     // Delete pending post + audit log.
//     throw new Error('Not implemented — Phase 4');
// });

// exports.regeneratePost = onCall(async (request) => {
//     assertAdmin(request);
//     const { postId } = request.data;
//     // Re-run generateCaption for this post, update the pending doc.
//     throw new Error('Not implemented — Phase 4');
// });

module.exports = { assertAdmin };
