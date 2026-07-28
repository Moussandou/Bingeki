const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { CALLABLE_REGIONS } = require("./regions");

/**
 * Send a friend request. Creates entries in both users' friend subcollections atomically.
 */
exports.sendFriendRequestFn = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const currentUserId = request.auth.uid;
    const targetUserId = request.data.targetUserId;

    if (!targetUserId || typeof targetUserId !== 'string') {
        throw new HttpsError('invalid-argument', 'targetUserId is required.');
    }

    if (currentUserId === targetUserId) {
        throw new HttpsError('invalid-argument', 'Cannot send a friend request to yourself.');
    }

    const db = admin.firestore();

    // Check target user exists
    const targetDoc = await db.collection('users').doc(targetUserId).get();
    if (!targetDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
    }

    // Check no existing relationship
    const existingRef = db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId);
    const existingSnap = await existingRef.get();
    if (existingSnap.exists) {
        throw new HttpsError('already-exists', 'A friend request already exists.');
    }

    // Get current user data for the friend entry
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUserData = currentUserDoc.data() || {};
    const targetData = targetDoc.data() || {};

    // Atomic batch write
    const batch = db.batch();

    batch.set(db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId), {
        uid: targetUserId,
        displayName: targetData.displayName || null,
        photoURL: targetData.photoURL || null,
        status: 'pending',
        direction: 'outgoing'
    });

    batch.set(db.collection('users').doc(targetUserId).collection('friends').doc(currentUserId), {
        uid: currentUserId,
        displayName: currentUserData.displayName || null,
        photoURL: currentUserData.photoURL || null,
        status: 'pending',
        direction: 'incoming'
    });

    await batch.commit();
    console.log(`[Friends] ${currentUserId} sent friend request to ${targetUserId}`);
    return { success: true };
});

/**
 * Accept a friend request. Updates both entries atomically.
 */
exports.acceptFriendRequestFn = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const currentUserId = request.auth.uid;
    const friendUid = request.data.friendUid;

    if (!friendUid || typeof friendUid !== 'string') {
        throw new HttpsError('invalid-argument', 'friendUid is required.');
    }

    const db = admin.firestore();

    const myFriendRef = db.collection('users').doc(currentUserId).collection('friends').doc(friendUid);
    const myFriendSnap = await myFriendRef.get();

    if (!myFriendSnap.exists) {
        throw new HttpsError('not-found', 'No friend request found.');
    }

    const myFriendData = myFriendSnap.data();
    if (myFriendData.status !== 'pending' || myFriendData.direction !== 'incoming') {
        throw new HttpsError('failed-precondition', 'This request cannot be accepted.');
    }

    const batch = db.batch();
    batch.update(myFriendRef, { status: 'accepted' });
    batch.update(db.collection('users').doc(friendUid).collection('friends').doc(currentUserId), { status: 'accepted' });
    await batch.commit();

    console.log(`[Friends] ${currentUserId} accepted friend request from ${friendUid}`);
    return { success: true };
});

/**
 * Reject or remove a friend. Deletes both entries atomically.
 */
exports.rejectFriendRequestFn = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const currentUserId = request.auth.uid;
    const friendUid = request.data.friendUid;

    if (!friendUid || typeof friendUid !== 'string') {
        throw new HttpsError('invalid-argument', 'friendUid is required.');
    }

    const db = admin.firestore();

    const batch = db.batch();
    batch.delete(db.collection('users').doc(currentUserId).collection('friends').doc(friendUid));
    batch.delete(db.collection('users').doc(friendUid).collection('friends').doc(currentUserId));
    await batch.commit();

    console.log(`[Friends] ${currentUserId} rejected/removed ${friendUid}`);
    return { success: true };
});
