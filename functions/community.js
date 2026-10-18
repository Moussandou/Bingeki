const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { FieldPath } = require('firebase-admin/firestore');
const { createHash } = require('node:crypto');
const { CALLABLE_REGIONS } = require('./regions');
const {
    WEEK_MS, REVIEW_XP, WEEKLY_XP_CAP, weekStart, weekId, validId,
    normalizeReview, concealed, canView, readingDelta, earnedDistinctions,
} = require('./communityCore');

const options = { cors: true, region: CALLABLE_REGIONS };
const emptyStats = () => ({ reviews: 0, shonen: 0, chapters: 0, useful: 0, explored: [], xp: 0 });
const userRef = (db, uid) => db.collection('users').doc(uid);
const stateRef = (db, uid) => db.collection('communityState').doc(uid);
const statsRef = (db, uid, week = weekId()) => db.collection('communityWeeks').doc(`${week}_${uid}`);
const relRef = (db, uid, kind, target) => userRef(db, uid).collection(`community${kind}`).doc(target);

async function active(db, uid, transaction) {
    const get = ref => transaction ? transaction.get(ref) : ref.get();
    const [profile, deletion] = await Promise.all([
        get(userRef(db, uid)), get(db.collection('accountDeletions').doc(uid)),
    ]);
    if (!profile.exists || deletion.exists || profile.data().deleting || profile.data().isBanned) {
        throw new HttpsError('permission-denied', 'Account unavailable.');
    }
    return profile.data();
}

async function context(db, uid) {
    const profile = await active(db, uid);
    const [friends, blocks, follows, library, state] = await Promise.all([
        userRef(db, uid).collection('friends').where('status', '==', 'accepted').get(),
        userRef(db, uid).collection('communityBlocks').get(),
        userRef(db, uid).collection('communityFollows').get(),
        userRef(db, uid).collection('data').doc('library').get(),
        stateRef(db, uid).get(),
    ]);
    return {
        uid, profile, friends: new Set(friends.docs.map(d => d.id)),
        blocks: new Set(blocks.docs.map(d => d.id)),
        follows: new Set(follows.docs.map(d => d.id)),
        works: library.data()?.works || [], state: state.data() || {}, authors: new Map(),
    };
}

async function author(db, ctx, uid) {
    if (!ctx.authors.has(uid)) {
        const [profile, block, deletion] = await Promise.all([
            userRef(db, uid).get(), relRef(db, uid, 'Blocks', ctx.uid).get(),
            db.collection('accountDeletions').doc(uid).get(),
        ]);
        ctx.authors.set(uid, {
            profile: deletion.exists ? null : profile.data(),
            blocked: block.exists || ctx.blocks.has(uid),
        });
    }
    return ctx.authors.get(uid);
}

async function visible(db, ctx, post) {
    const { profile, blocked } = await author(db, ctx, post.userId);
    return canView(post, profile, ctx.uid, ctx.friends, blocked);
}

async function present(db, ctx, document, reveal = false) {
    const post = { id: document.id, ...document.data() };
    if (!await visible(db, ctx, post)) return null;
    const { profile } = await author(db, ctx, post.userId);
    const work = ctx.works.find(w => `${w.type}:${w.id}` === post.workKey);
    const hidden = !reveal && concealed(post, work ? Number(work.currentChapter ?? work.currentEpisode ?? 0) : undefined, post.userId === ctx.uid);
    const reaction = await document.ref.collection('reactions').doc(ctx.uid).get();
    const title = profile.communityTitle;
    return {
        id: post.id, userId: post.userId, userName: profile.displayName || '',
        userPhoto: profile.photoURL || '', title: title && (!title.expiresAt || title.expiresAt > Date.now()) ? title.id : null,
        workId: post.workId, workType: post.workType, workKey: post.workKey,
        workTitle: post.workTitle, workImage: post.workImage, unit: post.unit,
        visibility: post.visibility, spoiler: post.spoiler, concealed: hidden,
        text: hidden ? null : post.text, rating: hidden ? null : post.rating,
        createdAt: post.createdAt, updatedAt: post.updatedAt, usefulCount: post.usefulCount || 0,
        replyCount: post.replyCount || 0, reacted: reaction.exists,
        following: ctx.follows.has(post.userId),
    };
}

function requireId(id) {
    if (!validId(id)) throw new HttpsError('invalid-argument', 'Invalid identifier.');
    return id;
}

function pageQuery(query, cursor, size = 20) {
    query = query.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (cursor) {
        if (!Number.isSafeInteger(cursor.createdAt) || !validId(cursor.id)) {
            throw new HttpsError('invalid-argument', 'Invalid cursor.');
        }
        query = query.startAfter(cursor.createdAt, cursor.id);
    }
    return query.limit(size);
}

function cursorFor(page, size) {
    const last = page.docs.at(-1);
    return page.size === size && last ? { id: last.id, createdAt: last.data().createdAt } : null;
}

exports.communityRead = onCall(options, async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to join the community.');
    const db = admin.firestore();
    const ctx = await context(db, request.auth.uid);
    const data = request.data || {};
    if (data.action === 'feed') {
        let query = db.collection('communityPosts');
        if (data.workKey) {
            if (!/^(anime|manga):[1-9]\d*$/.test(data.workKey)) throw new HttpsError('invalid-argument', 'Invalid work.');
            query = query.where('workKey', '==', data.workKey);
        } else if (data.authorId) {
            query = query.where('userId', '==', requireId(data.authorId));
        }
        const page = await pageQuery(query, data.cursor, 30).get();
        const items = [];
        const ownWorks = new Set(ctx.works.map(w => `${w.type}:${w.id}`));
        for (const document of page.docs) {
            const post = document.data();
            if (data.unit !== undefined && data.unit !== null && post.unit !== data.unit) continue;
            if (data.filter === 'friends' && !ctx.friends.has(post.userId) && post.userId !== ctx.uid) continue;
            if (data.filter === 'following' && !ctx.follows.has(post.userId)) continue;
            if (data.filter === 'readings' && !ownWorks.has(post.workKey)) continue;
            const item = await present(db, ctx, document);
            if (item) items.push(item);
        }
        return { items, cursor: cursorFor(page, 30) };
    }
    if (data.action === 'thread') {
        const postRef = db.collection('communityPosts').doc(requireId(data.id));
        const snap = await postRef.get();
        const post = snap.exists ? await present(db, ctx, snap, data.reveal === true) : null;
        if (!post) throw new HttpsError('not-found', 'Discussion unavailable.');
        const page = await pageQuery(postRef.collection('replies'), data.cursor).get();
        const replies = [];
        for (const document of page.docs) {
            const reply = document.data();
            const { profile, blocked } = await author(db, ctx, reply.userId);
            if (!profile || blocked || profile.isBanned || profile.deleting
                || !canView({ ...snap.data(), userId: reply.userId, status: reply.status }, profile, ctx.uid, ctx.friends, false)) continue;
            replies.push({
                id: document.id, userId: reply.userId, userName: profile.displayName || '',
                createdAt: reply.createdAt, concealed: post.concealed, text: post.concealed ? null : reply.text,
            });
        }
        return { post, replies, cursor: cursorFor(page, 20) };
    }
    if (data.action === 'dashboard') {
        const week = weekId();
        const category = { reviews: 'reviews', shonen: 'shonen', chapters: 'chapters', explored: 'exploredCount', useful: 'useful' }[data.category] || 'reviews';
        const [mine, board] = await Promise.all([
            statsRef(db, ctx.uid).get(),
            db.collection('communityWeeks').where('week', '==', week).orderBy(category, 'desc').limit(50).get(),
        ]);
        const leaders = [];
        for (const doc of board.docs) {
            const stats = doc.data();
            const { profile, blocked } = await author(db, ctx, stats.userId);
            if (!profile || blocked || (profile.profileVisibility || 'public') !== 'public'
                || profile.isBanned || profile.deleting) continue;
            leaders.push({ userId: stats.userId, userName: profile.displayName || '', reviews: stats.reviews,
                shonen: stats.shonen || 0, chapters: stats.chapters || 0, useful: stats.useful || 0, explored: (stats.explored || []).length });
        }
        return {
            week, endsAt: weekStart() + WEEK_MS, stats: mine.data() || emptyStats(),
            leaders, distinctions: ctx.state.distinctions || [], equipped: ctx.profile.communityTitle || null,
            preferences: { replies: true, digest: false, ...ctx.state.preferences },
            blocked: [...ctx.blocks], following: [...ctx.follows],
        };
    }
    if (data.action === 'highlights') {
        const page = await db.collection('communityPosts').where('createdAt', '>=', Date.now() - WEEK_MS)
            .orderBy('createdAt', 'desc').limit(60).get();
        const grouped = new Map();
        for (const document of page.docs) {
            const post = document.data();
            if (!await visible(db, ctx, post)) continue;
            const key = `${post.workKey}:${post.unit ?? 'work'}`;
            const current = grouped.get(key) || { workKey: post.workKey, workTitle: post.workTitle, workType: post.workType,
                unit: post.unit, count: 0, responses: 0, related: ctx.works.some(w => `${w.type}:${w.id}` === post.workKey) };
            current.count++;
            current.responses += post.replyCount || 0;
            grouped.set(key, current);
        }
        return { items: [...grouped.values()].sort((a, b) => Number(b.related) - Number(a.related) || b.responses - a.responses || b.count - a.count).slice(0, 5) };
    }
    if (data.action === 'insights') {
        if (!ctx.profile.isAdmin) throw new HttpsError('permission-denied', 'Admin only.');
        const [visits, posts, weeks, reports] = await Promise.all([
            db.collection('communityVisits').where('week', '==', weekId()).limit(1000).get(),
            db.collection('communityPosts').where('createdAt', '>=', weekStart()).limit(1000).get(),
            db.collection('communityWeeks').where('week', '==', weekId()).limit(1000).get(),
            db.collection('communityReports').where('createdAt', '>=', weekStart()).limit(1000).get(),
        ]);
        const published = posts.docs.map(d => d.data()).filter(p => p.status === 'published');
        return {
            visitors: visits.size, emptyFeeds: visits.docs.filter(d => d.data().empty).length,
            returnedAfterSevenDays: visits.docs.filter(d => d.data().returned).length,
            activeReaders: weeks.docs.filter(d => d.data().activeReader).length,
            contributors: weeks.docs.filter(d => d.data().reviews > 0).length,
            reviews: published.length, answered: published.filter(p => (p.otherReplyCount || 0) > 0).length,
            reports: reports.size, limited: [visits, posts, weeks, reports].some(page => page.size === 1000),
        };
    }
    if (data.action === 'reports') {
        if (!ctx.profile.isAdmin) throw new HttpsError('permission-denied', 'Admin only.');
        const page = await pageQuery(db.collection('communityReports').where('status', '==', 'pending'), data.cursor).get();
        const items = await Promise.all(page.docs.map(async d => {
            const report = d.data();
            const postRef = db.collection('communityPosts').doc(report.postId);
            const post = await postRef.get();
            const content = report.replyId ? await postRef.collection('replies').doc(report.replyId).get() : post;
            return { id: d.id, ...report, text: content.data()?.text || null, workTitle: post.data()?.workTitle || '' };
        }));
        return { items, cursor: cursorFor(page, 20) };
    }
    throw new HttpsError('invalid-argument', 'Unknown community query.');
});

async function notify(db, transaction, uid, actorId, id, type, link, preferences) {
    if (uid === actorId || preferences?.replies === false) return;
    transaction.set(userRef(db, uid).collection('notifications').doc(id), {
        type, actorId, community: true, title: '', body: '',
        link, read: false, createdAt: Date.now(),
    });
}

exports.communityWrite = onCall(options, async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to contribute.');
    const db = admin.firestore();
    const uid = request.auth.uid;
    const data = request.data || {};
    const now = Date.now();
    return db.runTransaction(async tx => {
        const profile = await active(db, uid, tx);
        const stateDocument = stateRef(db, uid);
        const stateSnap = await tx.get(stateDocument);
        const state = stateSnap.data() || {};
        const action = data.action;
        if (['preferences', 'equip'].includes(action)) {
            if (action === 'preferences') {
                if (typeof data.replies !== 'boolean' || typeof data.digest !== 'boolean') throw new HttpsError('invalid-argument', 'Invalid preferences.');
                tx.set(stateDocument, { preferences: { replies: data.replies, digest: data.digest } }, { merge: true });
            } else {
                const distinction = (state.distinctions || []).find(d => d.id === data.title && (!d.expiresAt || d.expiresAt > now));
                if (data.title !== null && !distinction) throw new HttpsError('failed-precondition', 'Title unavailable.');
                tx.update(userRef(db, uid), { communityTitle: distinction || null });
            }
            return { success: true };
        }
        if (['block', 'follow'].includes(action)) {
            const target = requireId(data.userId);
            if (target === uid || typeof data.enabled !== 'boolean') throw new HttpsError('invalid-argument', 'Invalid relationship.');
            if (data.enabled) await active(db, target, tx);
            const reverse = await tx.get(relRef(db, target, 'Blocks', uid));
            const ownBlock = await tx.get(relRef(db, uid, 'Blocks', target));
            if (action === 'follow' && data.enabled && (reverse.exists || ownBlock.exists)) throw new HttpsError('permission-denied', 'Account blocked.');
            const ref = relRef(db, uid, action === 'block' ? 'Blocks' : 'Follows', target);
            if (data.enabled) tx.set(ref, { userId: target, createdAt: now });
            else tx.delete(ref);
            if (action === 'block' && data.enabled) {
                tx.delete(relRef(db, uid, 'Follows', target));
                tx.delete(relRef(db, target, 'Follows', uid));
            }
            return { success: true };
        }
        if (action === 'visit') {
            const ref = db.collection('communityVisits').doc(`${weekId()}_${uid}`);
            const snap = await tx.get(ref);
            const visit = snap.data() || {};
            tx.set(ref, { userId: uid, week: weekId(), firstAt: visit.firstAt || now, lastAt: now,
                returned: visit.returned === true || (state.firstVisitedAt && now - state.firstVisitedAt >= WEEK_MS) || false,
                empty: data.empty === true, contributed: visit.contributed === true }, { merge: true });
            tx.set(stateDocument, { firstVisitedAt: state.firstVisitedAt || now }, { merge: true });
            return { success: true };
        }
        if (action === 'publish') {
            let review;
            try { review = normalizeReview(data.review); }
            catch { throw new HttpsError('invalid-argument', 'Invalid review.'); }
            const postRef = db.collection('communityPosts').doc(requireId(data.id));
            const [library, weekSnap, claimSnap, meta, existing, gamification] = await Promise.all([
                tx.get(userRef(db, uid).collection('data').doc('library')),
                tx.get(statsRef(db, uid)),
                tx.get(userRef(db, uid).collection('communityClaims').doc(`${review.workKey}_${review.unit ?? 'work'}`)),
                tx.get(db.collection('apiCache').doc(`${review.workType}_details_${review.workId}`)),
                tx.get(postRef),
                tx.get(userRef(db, uid).collection('data').doc('gamification')),
            ]);
            if (existing.exists) {
                if (existing.data().userId !== uid) throw new HttpsError('already-exists', 'Review identifier already used.');
                return { success: true, id: postRef.id, xp: 0 };
            }
            if (now - (state.lastPublishedAt || 0) < 30000) throw new HttpsError('resource-exhausted', 'Wait before publishing again.');
            const work = (library.data()?.works || []).find(w => `${w.type}:${w.id}` === review.workKey);
            const details = meta.data()?.data;
            const title = details?.title || work?.title;
            if (!title) throw new HttpsError('failed-precondition', 'Choose an existing work.');
            const stats = { ...emptyStats(), ...weekSnap.data() };
            const readProgress = Number(work?.currentChapter ?? work?.currentEpisode ?? 0);
            const eligible = !claimSnap.exists && !!work && (review.unit === null ? readProgress > 0 : readProgress >= review.unit);
            const xp = eligible ? Math.min(REVIEW_XP, Math.max(0, WEEKLY_XP_CAP - stats.xp),
                Math.max(0, 50000 - (gamification.data()?.communityXp || 0))) : 0;
            stats.reviews += eligible ? 1 : 0;
            stats.xp += xp;
            const distinctions = new Map((state.distinctions || []).map(d => [d.id, d]));
            for (const item of earnedDistinctions(stats, now)) distinctions.set(item.id, item);
            tx.create(postRef, {
                ...review, userId: uid, workTitle: title,
                workImage: details?.images?.jpg?.image_url || work?.image || '',
                createdAt: now, updatedAt: now, status: 'published', usefulCount: 0, replyCount: 0, otherReplyCount: 0,
            });
            tx.set(stateDocument, { lastPublishedAt: now, distinctions: [...distinctions.values()] }, { merge: true });
            tx.set(statsRef(db, uid), { ...stats, exploredCount: stats.explored.length, userId: uid, week: weekId() }, { merge: true });
            tx.set(db.collection('communityVisits').doc(`${weekId()}_${uid}`), { userId: uid, contributed: true, week: weekId() }, { merge: true });
            if (eligible) {
                tx.create(userRef(db, uid).collection('communityClaims').doc(`${review.workKey}_${review.unit ?? 'work'}`), { createdAt: now });
            }
            if (xp) {
                const gamRef = userRef(db, uid).collection('data').doc('gamification');
                // Increment is server-owned and cannot be overwritten by the client's bonus XP sync.
                tx.set(gamRef, { communityXp: admin.firestore.FieldValue.increment(xp) }, { merge: true });
            }
            return { success: true, id: postRef.id, xp };
        }

        const postRef = db.collection('communityPosts').doc(requireId(data.id));
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) throw new HttpsError('not-found', 'Discussion unavailable.');
        const post = postSnap.data();
        const [ownerSnap, ownerDeletion, friend, block, reverseBlock] = await Promise.all([
            tx.get(userRef(db, post.userId)), tx.get(db.collection('accountDeletions').doc(post.userId)),
            tx.get(userRef(db, post.userId).collection('friends').doc(uid)),
            tx.get(relRef(db, uid, 'Blocks', post.userId)), tx.get(relRef(db, post.userId, 'Blocks', uid)),
        ]);
        const friends = new Set(friend.data()?.status === 'accepted' ? [post.userId] : []);
        const accessible = !ownerDeletion.exists && canView(post, ownerSnap.data(), uid, friends, block.exists || reverseBlock.exists);
        if (action === 'moderate') {
            if (!profile.isAdmin || !['hide', 'dismiss'].includes(data.resolution)) throw new HttpsError('permission-denied', 'Admin only.');
            const reportRef = db.collection('communityReports').doc(requireId(data.reportId));
            const report = await tx.get(reportRef);
            if (!report.exists || report.data().postId !== postRef.id) throw new HttpsError('invalid-argument', 'Report does not match.');
            if (report.data().status === 'resolved') return { success: true };
            const replyRef = report.data().replyId ? postRef.collection('replies').doc(report.data().replyId) : null;
            const reply = replyRef ? await tx.get(replyRef) : null;
            tx.update(reportRef, { status: 'resolved', resolution: data.resolution, resolvedBy: uid, resolvedAt: now });
            if (data.resolution === 'hide') {
                if (reply?.exists && reply.data().status === 'published') {
                    tx.update(replyRef, { status: 'hidden' });
                    tx.update(postRef, { replyCount: Math.max(0, (post.replyCount || 0) - 1),
                        otherReplyCount: Math.max(0, (post.otherReplyCount || 0) - (reply.data().userId === post.userId ? 0 : 1)) });
                } else if (!replyRef && post.status === 'published') tx.update(postRef, { status: 'hidden', updatedAt: now });
            }
            return { success: true };
        }
        if (!accessible) throw new HttpsError('not-found', 'Discussion unavailable.');
        if (action === 'edit') {
            if (post.userId !== uid) throw new HttpsError('permission-denied', 'Only the author can edit.');
            let review;
            try { review = normalizeReview(data.review); } catch { throw new HttpsError('invalid-argument', 'Invalid review.'); }
            if (review.workKey !== post.workKey || review.unit !== post.unit) throw new HttpsError('invalid-argument', 'Review target cannot change.');
            tx.update(postRef, { text: review.text, rating: review.rating, spoiler: review.spoiler, visibility: review.visibility, updatedAt: now });
        } else if (action === 'delete') {
            if (post.userId !== uid) throw new HttpsError('permission-denied', 'Only the author can delete.');
            tx.update(postRef, { status: 'deleted', text: '', rating: null, updatedAt: now });
        } else if (action === 'reply') {
            if (typeof data.text !== 'string' || !data.text.trim() || data.text.trim().length > 2000) throw new HttpsError('invalid-argument', 'Invalid reply.');
            const replyRef = postRef.collection('replies').doc(requireId(data.replyId));
            const [reply, ownerState] = await Promise.all([tx.get(replyRef), tx.get(stateRef(db, post.userId))]);
            if (reply.exists) return { success: true };
            if (now - (state.lastReplyAt || 0) < 10000) throw new HttpsError('resource-exhausted', 'Wait before replying again.');
            tx.create(replyRef, { userId: uid, text: data.text.trim(), status: 'published', createdAt: now });
            tx.update(postRef, { replyCount: (post.replyCount || 0) + 1,
                otherReplyCount: (post.otherReplyCount || 0) + (post.userId === uid ? 0 : 1) });
            tx.set(stateDocument, { lastReplyAt: now }, { merge: true });
            await notify(db, tx, post.userId, uid, `community_${data.replyId}`, 'community_reply', `/social?post=${postRef.id}`, ownerState.data()?.preferences);
        } else if (action === 'deleteReply') {
            const replyRef = postRef.collection('replies').doc(requireId(data.replyId));
            const reply = await tx.get(replyRef);
            if (!reply.exists || reply.data().userId !== uid) throw new HttpsError('permission-denied', 'Only the author can delete.');
            if (reply.data().status === 'published') {
                tx.update(replyRef, { status: 'deleted', text: '' });
                tx.update(postRef, { replyCount: Math.max(0, (post.replyCount || 0) - 1),
                    otherReplyCount: Math.max(0, (post.otherReplyCount || 0) - (post.userId === uid ? 0 : 1)) });
            } else if (reply.data().status === 'hidden') tx.update(replyRef, { status: 'deleted', text: '' });
        } else if (action === 'react') {
            if (post.userId === uid) throw new HttpsError('failed-precondition', 'Cannot mark your own review useful.');
            const reactionRef = postRef.collection('reactions').doc(uid);
            const [reaction, claim, week, ownerState, ownFriend] = await Promise.all([
                tx.get(reactionRef), tx.get(postRef.collection('reactionClaims').doc(uid)),
                tx.get(statsRef(db, post.userId)), tx.get(stateRef(db, post.userId)),
                tx.get(userRef(db, uid).collection('friends').doc(post.userId)),
            ]);
            if (typeof data.enabled !== 'boolean') throw new HttpsError('invalid-argument', 'Invalid reaction.');
            if (data.enabled === reaction.exists) return { success: true };
            if (data.enabled) tx.create(reactionRef, { userId: uid, createdAt: now });
            else tx.delete(reactionRef);
            tx.update(postRef, { usefulCount: Math.max(0, (post.usefulCount || 0) + (data.enabled ? 1 : -1)) });
            // Only established, distinct readers outside a reciprocal friend pair
            // contribute to weekly distinctions. Re-toggling never scores again.
            const eligible = data.enabled && !claim.exists && now - (profile.createdAt || now) >= WEEK_MS
                && ownFriend.data()?.status !== 'accepted' && post.createdAt >= weekStart();
            if (data.enabled && !claim.exists) tx.create(postRef.collection('reactionClaims').doc(uid), { userId: uid, createdAt: now });
            if (eligible) {
                const stats = { ...emptyStats(), ...week.data() };
                stats.useful += 1;
                const distinctions = new Map((ownerState.data()?.distinctions || []).map(d => [d.id, d]));
                for (const item of earnedDistinctions(stats, now)) distinctions.set(item.id, item);
                tx.set(statsRef(db, post.userId), { ...stats, exploredCount: stats.explored.length, userId: post.userId, week: weekId() }, { merge: true });
                tx.set(stateRef(db, post.userId), { distinctions: [...distinctions.values()] }, { merge: true });
            }
        } else if (action === 'report') {
            if (!['spoiler', 'harassment', 'spam', 'other'].includes(data.reason)) throw new HttpsError('invalid-argument', 'Invalid report reason.');
            if (data.replyId) {
                const reply = await tx.get(postRef.collection('replies').doc(requireId(data.replyId)));
                if (!reply.exists) throw new HttpsError('not-found', 'Reply unavailable.');
            }
            const reportId = createHash('sha256').update(JSON.stringify([postRef.id, data.replyId || null, uid])).digest('hex');
            const reportRef = db.collection('communityReports').doc(reportId);
            const report = await tx.get(reportRef);
            if (report.exists) return { success: true };
            tx.create(reportRef, { userId: uid, postId: postRef.id, replyId: data.replyId || null,
                reason: data.reason, status: 'pending', createdAt: now });
        } else {
            throw new HttpsError('invalid-argument', 'Unknown community action.');
        }
        return { success: true };
    });
});

exports.onCommunityLibraryUpdate = onDocumentWritten({ document: 'users/{userId}/data/library', retry: true }, async event => {
    if (!event.data?.after.exists) return;
    const db = admin.firestore();
    const uid = event.params.userId;
    const eventTime = event.data.after.updateTime.toMillis();
    const week = weekId(eventTime);
    await db.runTransaction(async tx => {
        const [profile, deletion] = await Promise.all([
            tx.get(userRef(db, uid)), tx.get(db.collection('accountDeletions').doc(uid)),
        ]);
        if (!profile.exists || deletion.exists || profile.data().deleting || profile.data().isBanned) return;
        const [library, state, weekly] = await Promise.all([
            tx.get(userRef(db, uid).collection('data').doc('library')),
            tx.get(stateRef(db, uid)), tx.get(statsRef(db, uid, week)),
        ]);
        if (!library.exists) return;
        const current = event.data.after.data()?.works || [];
        const previous = state.data()?.highWater || readingDelta(event.data.before.data()?.works || [], {}, true).highWater;
        const result = readingDelta(current, previous);
        const stats = { ...emptyStats(), ...weekly.data() };
        // Work classification comes from the server's API cache, never a client genre claim.
        const metadata = await Promise.all(result.changes.map(c => tx.get(db.collection('apiCache').doc(`${c.type}_details_${c.id}`))));
        result.changes.forEach((change, index) => {
            if (change.type === 'manga') stats.chapters += Math.min(change.delta, 50);
            if (change.type === 'manga' && metadata[index].data()?.data?.demographics?.some(d => d.mal_id === 27)) {
                stats.shonen += Math.min(change.delta, 50);
            }
            if (!stats.explored.includes(change.key)) stats.explored.push(change.key);
        });
        const distinctions = new Map((state.data()?.distinctions || []).map(d => [d.id, d]));
        for (const item of earnedDistinctions(stats, eventTime)) {
            const previous = distinctions.get(item.id);
            if (!previous || !item.expiresAt || item.expiresAt > (previous.expiresAt || 0)) distinctions.set(item.id, item);
        }
        tx.set(stateRef(db, uid), { highWater: result.highWater, distinctions: [...distinctions.values()] }, { merge: true });
        tx.set(statsRef(db, uid, week), { ...stats, activeReader: weekly.data()?.activeReader || result.changes.length > 0,
            exploredCount: stats.explored.length, userId: uid, week }, { merge: true });
    });
});

exports.communityWeeklyDigest = onSchedule({ schedule: '0 9 * * 1', timeZone: 'Etc/UTC', retryCount: 3 }, async () => {
    const db = admin.firestore();
    const previousWeek = weekId(Date.now() - WEEK_MS);
    let cursor;
    do {
        let query = db.collection('communityState').orderBy(FieldPath.documentId()).limit(100);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        for (const doc of page.docs) {
            if (doc.data().preferences?.digest !== true) continue;
            await db.runTransaction(async tx => {
                const notification = userRef(db, doc.id).collection('notifications').doc(`community_digest_${previousWeek}`);
                const [profile, deletion, latest, existing] = await Promise.all([
                    tx.get(userRef(db, doc.id)), tx.get(db.collection('accountDeletions').doc(doc.id)),
                    tx.get(stateRef(db, doc.id)), tx.get(notification),
                ]);
                if (!profile.exists || deletion.exists || profile.data().isBanned || profile.data().deleting
                    || latest.data()?.preferences?.digest !== true || existing.exists) return;
                tx.create(notification, {
                    type: 'community_digest', community: true, title: '', body: '', read: false,
                    link: '/social?tab=distinctions', createdAt: Date.now(),
                });
            });
        }
        cursor = page.size === 100 ? page.docs.at(-1) : null;
    } while (cursor);
});
