const { randomUUID } = require('node:crypto');
const PLATFORMS = ['insta', 'tiktok'];
// Longer than the callable/cron's maximum execution time.
const LEASE_MS = 15 * 60_000;

function assertUnlocked(post) {
    if (post.publishLease?.expiresAt > Date.now()) {
        throw new Error('Publication already in progress');
    }
}

/**
 * The transport has no documented idempotency key. Persist intent BEFORE
 * sending, and never resend an ambiguous attempt (timeout/crash). An admin
 * must reconcile it with Buffer; an expired lease alone is not proof of failure.
 */
async function publishPost(db, collections, publishers, postId, { config, apiKey, publishedBy, retry = false }) {
    const pendingRef = db.collection(collections.pending).doc(postId);
    const publishedRef = db.collection(collections.published).doc(postId);
    const owner = randomUUID();
    const claim = await db.runTransaction(async tx => {
        const [pending, published] = await Promise.all([tx.get(pendingRef), tx.get(publishedRef)]);
        if (published.exists && !retry) return { completed: published.data() };
        const snap = retry ? published : pending;
        if (!snap.exists) throw new Error(`post ${postId} not found`);
        const post = snap.data();
        assertUnlocked(post);
        if (post.status === 'processing' && !post.publishLease) {
            throw new Error('Legacy processing post requires manual reconciliation before publishing');
        }
        const attempts = { ...(post.publishAttempts || {}) };
        // A prior worker may have sent the request before crashing; an expired
        // lease cannot prove failure, so never turn an unreceipted send into a retry.
        for (const platform of PLATFORMS) {
            if (attempts[platform]?.state === 'started') {
                attempts[platform] = { ...attempts[platform], state: 'unknown' };
            }
        }
        tx.update(snap.ref, {
            publishLease: { owner, expiresAt: Date.now() + LEASE_MS },
            publishAttempts: attempts,
            ...(retry ? {} : { status: 'processing' }),
        });
        return { ref: snap.ref, post, attempts };
    });
    if (claim.completed) {
        const post = claim.completed;
        return { ok: true, results: post.results || {}, errors: post.errors || {}, post };
    }

    const { ref, post, attempts } = claim;
    const results = { insta: null, tiktok: null, ...(post.results || {}) };
    const errors = { ...(post.errors || {}) };
    const save = patch => db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (!current.exists || current.data().publishLease?.owner !== owner) {
            throw new Error('Publication lease lost; manual reconciliation required');
        }
        tx.update(ref, patch);
    });
    const caption = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
    for (const platform of PLATFORMS) {
        if (!post.platforms?.[platform] || results[platform]) continue;
        if (attempts[platform]?.state === 'unknown') {
            errors[platform] = 'Publication outcome unknown; reconcile with Buffer before retrying';
            continue;
        }
        const channelId = config.platforms?.[platform]?.bufferChannelId;
        if (!apiKey || !channelId) {
            errors[platform] = 'missing apiKey or bufferChannelId in config';
            continue;
        }
        attempts[platform] = { state: 'started', startedAt: Date.now(), attemptId: randomUUID() };
        await save({ publishAttempts: attempts });
        let result;
        try {
            result = await publishers[platform](post.slides, caption, {
                apiKey, channelId, mode: config.platforms?.[platform]?.mode || 'photo',
            });
            if (!result?.id) throw new Error('Publisher returned no receipt');
        } catch (error) {
            attempts[platform] = {
                ...attempts[platform],
                state: error.definitive === true ? 'failed' : 'unknown',
            };
            errors[platform] = error.definitive === true
                ? error.message
                : `Publication outcome unknown; reconcile with Buffer before retrying: ${error.message}`;
            await save({ publishAttempts: attempts, results, errors });
            continue;
        }
        results[platform] = result;
        delete errors[platform];
        attempts[platform] = { ...attempts[platform], state: 'succeeded' };
        // A failed checkpoint must escape: keeping the durable "started"
        // intent prevents a later invocation from resending this platform.
        await save({ publishAttempts: attempts, results, errors });
    }

    if (!PLATFORMS.some(platform => post.platforms?.[platform])) {
        errors.configuration = 'No target platform selected';
    }
    const ok = Object.values(results).some(Boolean);
    await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (!current.exists || current.data().publishLease?.owner !== owner) throw new Error('Publication lease lost');
        const completed = {
            ...current.data(), results, errors, publishAttempts: attempts, publishLease: null,
            status: ok ? 'published' : 'failed',
        };
        if (ok && !retry) {
            tx.set(publishedRef, { ...completed, publishedAt: Date.now(), publishedBy });
            tx.delete(pendingRef);
        } else {
            tx.update(ref, {
                ...completed,
                ...(retry ? { lastRetryAt: Date.now(), lastRetryBy: publishedBy } : {}),
            });
        }
    });
    return { ok, results, errors, post };
}

module.exports = { publishPost, assertUnlocked, LEASE_MS };
