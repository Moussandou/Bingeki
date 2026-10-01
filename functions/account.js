const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { CALLABLE_REGIONS } = require("./regions");

// Top-level collections whose documents belong to one user.
const OWNED_COLLECTIONS = [
    { name: "activities", field: "userId" },
    { name: "tierLists", field: "userId" },
    { name: "comments", field: "userId" },
    { name: "watchparties", field: "creatorId" },
];

async function deleteQueryInBatches(query) {
    const db = admin.firestore();
    let snap = await query.limit(400).get();
    while (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        snap = await query.limit(400).get();
    }
}

/**
 * Self-service account deletion (App Store guideline 5.1.1(v)): the caller's
 * data and Auth account, in one server-side step. Clients can't do this
 * themselves — firestore.rules only lets admins delete `/users/{uid}` and
 * `data/gamification`.
 */
exports.deleteOwnAccount = onCall({ cors: true, region: CALLABLE_REGIONS }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Must be logged in.");

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    // Friendships are mirrored on the other user's side.
    const friends = await userRef.collection("friends").get();
    await Promise.all(friends.docs.map((d) =>
        db.collection("users").doc(d.id).collection("friends").doc(uid).delete().catch(() => {})
    ));

    for (const { name, field } of OWNED_COLLECTIONS) {
        await deleteQueryInBatches(db.collection(name).where(field, "==", uid));
    }

    // Profile + every subcollection (data/library, data/gamification,
    // private/contact, friends, notifications).
    await db.recursiveDelete(userRef);

    const bucket = admin.storage().bucket();
    for (const prefix of [`avatars/${uid}/`, `users/${uid}/`]) {
        await bucket.deleteFiles({ prefix }).catch((err) => {
            console.warn(`[deleteOwnAccount] storage cleanup ${prefix}:`, err.message);
        });
    }

    await admin.auth().deleteUser(uid);
    console.log(`[deleteOwnAccount] deleted ${uid}`);
    return { ok: true };
});
