const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { CALLABLE_REGIONS } = require('./regions');

async function createInteraction(uid, collection, data) {
    const db = admin.firestore();
    const ref = db.collection(collection).doc();
    await db.runTransaction(async transaction => {
        const profile = await transaction.get(db.collection('users').doc(uid));
        const deleted = await transaction.get(db.collection('accountDeletions').doc(uid));
        if (!profile.exists || deleted.exists || profile.data().isBanned || profile.data().deleting) {
            throw new HttpsError('permission-denied', 'Account cannot create social invitations.');
        }
        transaction.create(ref, collection === 'watchparties' ? { ...data, id: ref.id } : data);
    });
    return { id: ref.id };
}

exports.createChallengeFn = onCall({ cors: true, region: CALLABLE_REGIONS }, async request => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const challenge = request.data;
    const fields = [
        'title', 'type', 'workId', 'workType', 'workTitle', 'workImage',
        'participants', 'participantIds', 'startDate', 'status', 'createdBy',
    ];
    if (!challenge || typeof challenge !== 'object' || Array.isArray(challenge)
        || Object.keys(challenge).some(key => !fields.includes(key))
        || challenge.createdBy !== uid
        || typeof challenge.title !== 'string' || !challenge.title.trim() || challenge.title.length > 200
        || !['race_to_finish', 'most_chapters', 'streak_battle'].includes(challenge.type)
        || !['pending', 'active'].includes(challenge.status)
        || !Number.isFinite(challenge.startDate) || challenge.startDate < 0
        || (challenge.workType !== undefined && !['anime', 'manga'].includes(challenge.workType))
        || !Array.isArray(challenge.participants) || challenge.participants.length < 2
        || !Array.isArray(challenge.participantIds)
        || challenge.participantIds.length !== challenge.participants.length
        || new Set(challenge.participantIds).size !== challenge.participantIds.length
        || challenge.participantIds[0] !== uid
        || challenge.participants.some((participant, index) =>
            !participant || participant.id !== challenge.participantIds[index]
            || typeof participant.id !== 'string' || !participant.id || participant.id.includes('/')
            || typeof participant.name !== 'string' || typeof participant.photo !== 'string'
            || !Number.isFinite(participant.joinedAt) || participant.joinedAt < 0
            || participant.progress !== 0
            || participant.status !== (index === 0 ? 'accepted' : 'pending'))) {
        throw new HttpsError('invalid-argument', 'Invalid challenge or invitations.');
    }
    return createInteraction(uid, 'challenges', challenge);
});

exports.createWatchPartyFn = onCall({ cors: true, region: CALLABLE_REGIONS }, async request => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const party = request.data;
    const fields = [
        'title', 'workId', 'workTitle', 'workImage', 'workType', 'hostId', 'hostName',
        'participants', 'currentEpisode', 'status', 'createdAt', 'lastActivity',
    ];
    if (!party || typeof party !== 'object' || Array.isArray(party)
        || Object.keys(party).some(key => !fields.includes(key))
        || party.hostId !== uid || typeof party.hostName !== 'string'
        || typeof party.title !== 'string' || !party.title.trim() || party.title.length > 200
        || !Number.isSafeInteger(party.workId) || party.workId <= 0
        || typeof party.workTitle !== 'string'
        || !['anime', 'manga'].includes(party.workType)
        || !['active', 'paused'].includes(party.status)
        || !Number.isSafeInteger(party.currentEpisode) || party.currentEpisode < 0
        || !Number.isFinite(party.createdAt) || party.createdAt < 0
        || !Number.isFinite(party.lastActivity) || party.lastActivity < 0
        || !Array.isArray(party.participants) || party.participants.length < 1
        || party.participants[0]?.id !== uid
        || party.participants.some((participant, index) =>
            !participant || typeof participant.id !== 'string' || !participant.id || participant.id.includes('/')
            || typeof participant.name !== 'string' || typeof participant.photo !== 'string'
            || !Number.isFinite(participant.joinedAt) || participant.joinedAt < 0
            || !Number.isSafeInteger(participant.currentProgress) || participant.currentProgress < 0
            || participant.isReady !== (index === 0)
            || (index > 0 && participant.currentProgress !== 0))
        || new Set(party.participants.map(participant => participant.id)).size !== party.participants.length) {
        throw new HttpsError('invalid-argument', 'Invalid watch party or invitations.');
    }
    return createInteraction(uid, 'watchparties', party);
});
