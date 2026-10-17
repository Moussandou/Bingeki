const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { CALLABLE_REGIONS } = require('./regions');
const { canReadProfile, projectSharedLibrary } = require('./sharedLibraryCore');

exports.getSharedLibraryFn = onCall({ cors: true, region: CALLABLE_REGIONS }, async request => {
    const { userId, folderId } = request.data || {};
    if (typeof userId !== 'string' || !userId || userId.includes('/')
        || (folderId !== undefined && (typeof folderId !== 'string' || !folderId || folderId.includes('/')))) {
        throw new HttpsError('invalid-argument', 'Valid userId and optional folderId are required.');
    }
    const db = admin.firestore();
    // Read permissions and source together so a concurrent privacy change retries the read.
    return db.runTransaction(async transaction => {
        const userRef = db.collection('users').doc(userId);
        const profileSnap = await transaction.get(userRef);
        const deleted = await transaction.get(db.collection('accountDeletions').doc(userId));
        if (!profileSnap.exists || deleted.exists || profileSnap.data().deleting) {
            throw new HttpsError('not-found', 'Library not found.');
        }
        let acceptedFriend = false;
        if (request.auth) {
            const viewer = await transaction.get(db.collection('users').doc(request.auth.uid));
            const viewerDeleted = await transaction.get(db.collection('accountDeletions').doc(request.auth.uid));
            if (!viewer.exists || viewerDeleted.exists || viewer.data().isBanned || viewer.data().deleting) {
                throw new HttpsError('permission-denied', 'Account cannot access shared libraries.');
            }
            const friendship = await transaction.get(userRef.collection('friends').doc(request.auth.uid));
            acceptedFriend = friendship.exists && friendship.data().status === 'accepted';
        }
        if (!canReadProfile(profileSnap.data(), acceptedFriend)) {
            throw new HttpsError('permission-denied', 'Profile is not shared.');
        }
        const library = await transaction.get(userRef.collection('data').doc('library'));
        if (!library.exists) throw new HttpsError('not-found', 'Library not found.');
        const projection = projectSharedLibrary(library.data(), acceptedFriend, folderId);
        if (!projection) throw new HttpsError('permission-denied', 'Library or folder is not shared.');
        return projection;
    });
});
