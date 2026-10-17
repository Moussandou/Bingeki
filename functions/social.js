const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { CALLABLE_REGIONS } = require("./regions");

async function assertActiveUsers(db, transaction, ids) {
    const profiles = [];
    for (const uid of ids) {
        const [profile, deletion] = await Promise.all([
            transaction.get(db.collection('users').doc(uid)),
            transaction.get(db.collection('accountDeletions').doc(uid)),
        ]);
        if (!profile.exists || profile.data().deleting || profile.data().isBanned || deletion.exists) {
            throw new HttpsError('failed-precondition', 'Account is unavailable for social actions.');
        }
        profiles.push(profile.data());
    }
    return profiles;
}

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

    await db.runTransaction(async batch => {
        const [currentUserData, targetData] = await assertActiveUsers(db, batch, [currentUserId, targetUserId]);
        const existingRef = db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId);
        const existingSnap = await batch.get(existingRef);
        if (existingSnap.exists) {
            throw new HttpsError('already-exists', 'A friend request already exists.');
        }

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

    });
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
    await db.runTransaction(async batch => {
        await assertActiveUsers(db, batch, [currentUserId, friendUid]);
        const myFriendSnap = await batch.get(myFriendRef);

        if (!myFriendSnap.exists) {
            throw new HttpsError('not-found', 'No friend request found.');
        }

        const myFriendData = myFriendSnap.data();
        if (myFriendData.status !== 'pending' || myFriendData.direction !== 'incoming') {
            throw new HttpsError('failed-precondition', 'This request cannot be accepted.');
        }

        batch.update(myFriendRef, { status: 'accepted' });
        batch.update(db.collection('users').doc(friendUid).collection('friends').doc(currentUserId), { status: 'accepted' });
    });

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

    await db.runTransaction(async batch => {
        await assertActiveUsers(db, batch, [currentUserId]);
        batch.delete(db.collection('users').doc(currentUserId).collection('friends').doc(friendUid));
        batch.delete(db.collection('users').doc(friendUid).collection('friends').doc(currentUserId));
    });

    console.log(`[Friends] ${currentUserId} rejected/removed ${friendUid}`);
    return { success: true };
});
