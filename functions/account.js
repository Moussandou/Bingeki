const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { CALLABLE_REGIONS } = require("./regions");
const { cleanupAccount } = require("./accountCore");

exports.deleteOwnAccount = onCall({
    cors: true,
    region: CALLABLE_REGIONS,
    timeoutSeconds: 540,
}, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Must be logged in.");
    const authTime = Number(request.auth.token?.auth_time);
    if (!Number.isFinite(authTime) || Date.now() / 1000 - authTime > 300) {
        throw new HttpsError("failed-precondition", "Please sign in again before deleting your account.", {
            reason: "requires-recent-login",
        });
    }
    try {
        await cleanupAccount(admin.firestore(), admin.storage().bucket(), admin.auth(), uid);
    } catch (error) {
        console.error(`[deleteOwnAccount] cleanup failed for ${uid}:`, error);
        throw new HttpsError("internal", "Account cleanup failed. Retry to finish deletion.");
    }
    return { ok: true };
});
