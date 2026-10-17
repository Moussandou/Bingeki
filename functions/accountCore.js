const PAGE_SIZE = 200;

async function visitDocuments(query, visit) {
    let cursor;
    while (true) {
        const page = await (cursor ? query.startAfter(cursor) : query).limit(PAGE_SIZE).get();
        for (const document of page.docs) await visit(document);
        if (page.docs.length < PAGE_SIZE) return;
        cursor = page.docs.at(-1);
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

    const owned = [
        ["activities", "userId"], ["tierLists", "userId"], ["comments", "userId"],
        ["watchparties", "hostId"], ["watchparties", "creatorId"],
        ["challenges", "createdBy"], ["feedback", "userId"], ["survey_responses", "userId"],
    ];
    for (const [collection, field] of owned) {
        await visitDocuments(db.collection(collection).where(field, "==", uid), async document => {
            if (collection === "feedback") {
                await bucket.deleteFiles({ prefix: `feedback-attachments/${document.id}/` });
            }
            await db.recursiveDelete(document.ref);
        });
    }

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
            })
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
        })
    );
    await visitDocuments(db.collection("challenges"), async document => {
        const challenge = document.data();
        if (challenge.participantIds?.includes(uid) || challenge.participants?.some(p => p.id === uid) || challenge.winnerId === uid) {
            await db.recursiveDelete(document.ref);
        }
    });

    // Scan parents as well as the caller's mirror: inconsistent/one-way
    // friendships must not retain names/photos on another user's account.
    await visitDocuments(db.collection("users"), async document => {
        await document.ref.collection("friends").doc(uid).delete();
        await visitDocuments(document.ref.collection("notifications"), async notification => {
            const data = notification.data();
            if ([data.userId, data.fromUserId, data.senderId, data.actorId].includes(uid)) {
                await notification.ref.delete();
            }
        });
    });

    for (const prefix of [`avatars/${uid}/`, `users/${uid}/`, `banners/${uid}_`]) {
        await bucket.deleteFiles({ prefix });
    }
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
