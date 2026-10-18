const { FieldPath, FieldValue } = require("firebase-admin/firestore");
const PAGE_SIZE = 200;

async function visitDocuments(query, visit, deletionRef, phase) {
    const progress = deletionRef ? (await deletionRef.get()).data()?.cleanupProgress?.[phase] : undefined;
    if (progress?.done) return;
    let cursor = progress?.lastId;
    query = query.orderBy(FieldPath.documentId());
    while (true) {
        const page = await (cursor ? query.startAfter(cursor) : query).limit(PAGE_SIZE).get();
        for (const document of page.docs) {
            await visit(document);
            cursor = document.id;
            if (deletionRef) {
                await deletionRef.set({ cleanupProgress: { [phase]: { lastId: cursor, done: false } } }, { merge: true });
            }
        }
        if (page.docs.length < PAGE_SIZE) {
            if (deletionRef) {
                await deletionRef.set({ cleanupProgress: { [phase]: { done: true } } }, { merge: true });
            }
            return;
        }
    }
}

async function cleanupAccount(db, bucket, auth, uid) {
    const userRef = db.collection("users").doc(uid);
    const deletionRef = db.collection("accountDeletions").doc(uid);
    // A permanent server-only tombstone also blocks stale clients after the
    // profile is gone. Retrying a partial cleanup reuses the same tombstone.
    await db.runTransaction(async transaction => {
        const profile = await transaction.get(userRef);
        transaction.set(deletionRef, { deleting: true }, { merge: true });
        if (profile.exists) transaction.update(userRef, { deleting: true });
    });

    await visitDocuments(db.collection("pushTokenBindings").where("uid", "==", uid), document =>
        db.runTransaction(async transaction => {
            const current = await transaction.get(document.ref);
            if (current.exists && current.data().uid === uid) transaction.delete(document.ref);
        }), deletionRef, "push-token-bindings"
    );
    await db.collection("pushDeviceState").doc(uid).delete();

    const owned = [
        ["activities", "userId"], ["tierLists", "userId"], ["comments", "userId"],
        ["watchparties", "hostId"], ["watchparties", "creatorId"],
        ["challenges", "createdBy"], ["feedback", "userId"], ["survey_responses", "userId"],
        ["communityPosts", "userId"], ["communityReports", "userId"],
        ["communityWeeks", "userId"], ["communityVisits", "userId"],
    ];
    for (const [collection, field] of owned) {
        await visitDocuments(db.collection(collection).where(field, "==", uid), async document => {
            if (collection === "feedback") {
                await bucket.deleteFiles({ prefix: `feedback-attachments/${document.id}/` });
            }
            await db.recursiveDelete(document.ref);
        }, deletionRef, `owned-${collection}-${field}`);
    }

    await visitDocuments(db.collection("communityPosts"), async document => {
        await visitDocuments(document.ref.collection("replies").where("userId", "==", uid), async reply => {
            await db.runTransaction(async transaction => {
                const [post, current] = await Promise.all([transaction.get(document.ref), transaction.get(reply.ref)]);
                if (!current.exists) return;
                transaction.delete(reply.ref);
                if (post.exists && current.data().status === "published") {
                    transaction.update(document.ref, { replyCount: Math.max(0, (post.data().replyCount || 0) - 1),
                        otherReplyCount: Math.max(0, (post.data().otherReplyCount || 0) - (post.data().userId === uid ? 0 : 1)) });
                }
            });
        });
        const reactionRef = document.ref.collection("reactions").doc(uid);
        await db.runTransaction(async transaction => {
            const [post, reaction] = await Promise.all([transaction.get(document.ref), transaction.get(reactionRef)]);
            if (!reaction.exists) return;
            transaction.delete(reactionRef);
            if (post.exists) transaction.update(document.ref, { usefulCount: Math.max(0, (post.data().usefulCount || 0) - 1) });
        });
        await document.ref.collection("reactionClaims").doc(uid).delete();
    }, deletionRef, "community-references");
    await db.recursiveDelete(db.collection("communityState").doc(uid));

    for (const collection of ["comments", "tierLists"]) {
        await visitDocuments(db.collection(collection).where("likes", "array-contains", uid), document =>
            db.runTransaction(async transaction => {
                const current = await transaction.get(document.ref);
                if (!current.exists) return;
                const likes = (current.data().likes || []).filter(id => id !== uid);
                transaction.update(document.ref, {
                    likes,
                    ...(collection === "tierLists" ? { likesCount: likes.length } : {}),
                });
            }), deletionRef, `likes-${collection}`
        );
    }

    // Participants are embedded maps, not queryable array-contains values.
    await visitDocuments(db.collection("watchparties"), document =>
        db.runTransaction(async transaction => {
            const current = await transaction.get(document.ref);
            if (!current.exists) return;
            const participants = current.data().participants || [];
            if (participants.some(participant => participant.id === uid)) {
                transaction.update(document.ref, { participants: participants.filter(p => p.id !== uid) });
            }
        }), deletionRef, "watchparty-participants"
    );
    await visitDocuments(db.collection("challenges"), document =>
        db.runTransaction(async transaction => {
            const current = await transaction.get(document.ref);
            if (!current.exists) return;
            const challenge = current.data();
            const participants = (challenge.participants || []).filter(participant => participant.id !== uid);
            const participantIds = (challenge.participantIds || []).filter(id => id !== uid);
            if (participants.length === (challenge.participants || []).length &&
                participantIds.length === (challenge.participantIds || []).length && challenge.winnerId !== uid) return;
            if (!participants.length && !participantIds.length) {
                transaction.delete(document.ref);
                return;
            }
            transaction.update(document.ref, {
                ...(challenge.participants ? { participants } : {}),
                ...(challenge.participantIds ? { participantIds } : {}),
                ...(challenge.winnerId === uid ? { winnerId: FieldValue.delete() } : {}),
            });
        }), deletionRef, "challenge-participants"
    );

    // Scan parents as well as the caller's mirror: inconsistent/one-way
    // friendships must not retain names/photos on another user's account.
    await visitDocuments(db.collection("users"), async document => {
        await document.ref.collection("friends").doc(uid).delete();
        await document.ref.collection("communityFollows").doc(uid).delete();
        await document.ref.collection("communityBlocks").doc(uid).delete();
        for (const field of ["userId", "fromUserId", "senderId", "actorId"]) {
            await visitDocuments(document.ref.collection("notifications").where(field, "==", uid),
                notification => notification.ref.delete());
        }
    }, deletionRef, "user-references");

    for (const prefix of [`avatars/${uid}/`, `users/${uid}/`, `banners/${uid}_`]) {
        await bucket.deleteFiles({ prefix });
    }
    await bucket.file(`avatars/${uid}`).delete({ ignoreNotFound: true });
    await db.recursiveDelete(userRef);
    await deletionRef.set({ dataCleanedAt: Date.now() }, { merge: true });
    // Auth is last: no fallible data write after the client loses its ability
    // to authenticate and retry the operation.
    try {
        await auth.deleteUser(uid);
    } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
    }
}

module.exports = { cleanupAccount };
