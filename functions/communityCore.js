const WEEK_MS = 7 * 86400000;
const REVIEW_XP = 10;
const WEEKLY_XP_CAP = 30;

function weekStart(now = Date.now()) {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return date.getTime();
}

function weekId(now = Date.now()) {
    return new Date(weekStart(now)).toISOString().slice(0, 10);
}

function validId(value) {
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function normalizeReview(input) {
    if (!input || !['anime', 'manga'].includes(input.workType)
        || !Number.isSafeInteger(input.workId) || input.workId <= 0
        || (input.unit !== null && (!Number.isSafeInteger(input.unit) || input.unit < 1 || input.unit > 5000))
        || !['public', 'friends'].includes(input.visibility)
        || typeof input.spoiler !== 'boolean'
        || typeof input.text !== 'string' || !input.text.trim() || input.text.trim().length > 4000
        || (input.rating !== null && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10))) {
        throw new Error('invalid-review');
    }
    return {
        workId: input.workId, workType: input.workType,
        workKey: `${input.workType}:${input.workId}`,
        unit: input.unit, visibility: input.visibility, spoiler: input.spoiler,
        text: input.text.trim(), rating: input.rating,
    };
}

function concealed(post, progress, owner = false) {
    if (owner) return false;
    return post.spoiler || (post.unit !== null && (progress === undefined || progress < post.unit));
}

function canView(post, profile, viewerId, friends, blocked) {
    if (!profile || profile.isBanned || profile.deleting || post.status !== 'published'
        || blocked || profile.deletedAt) return false;
    if (post.userId === viewerId) return true;
    const visibility = profile.profileVisibility || 'public';
    return visibility !== 'private'
        && (visibility !== 'friends' || friends.has(post.userId))
        && (post.visibility !== 'friends' || friends.has(post.userId));
}

function readingDelta(works, previousHighWater = {}, baseline = false) {
    const highWater = { ...previousHighWater };
    const changes = [];
    for (const work of works) {
        if (!['anime', 'manga'].includes(work.type) || !Number.isSafeInteger(Number(work.id))) continue;
        const key = `${work.type}:${work.id}`;
        const raw = Number(work.currentChapter ?? work.currentEpisode ?? 0);
        const cap = work.type === 'anime' ? 2500 : 5000;
        const total = Number(work.totalChapters || work.totalEpisodes || cap);
        const progress = Math.min(cap, total > 0 ? total : cap, Math.max(0, Math.floor(raw) || 0));
        const before = highWater[key] ?? 0;
        highWater[key] = Math.max(before, progress);
        // New/imported works establish a baseline; lowering, removing and re-adding
        // a work never earns the same chapters twice.
        if (!baseline && Object.hasOwn(previousHighWater, key) && progress > before) {
            changes.push({ key, type: work.type, id: Number(work.id), delta: progress - before });
        }
    }
    return { highWater, changes };
}

function earnedDistinctions(stats, now = Date.now()) {
    const expiresAt = weekStart(now) + 2 * WEEK_MS;
    return [
        ...(stats.reviews >= 1 ? [{ id: 'first_voice', permanent: true, expiresAt: null }] : []),
        ...(stats.reviews >= 3 ? [{ id: 'weekly_voice', permanent: false, expiresAt }] : []),
        ...((stats.explored || []).length >= 3 ? [{ id: 'explorer', permanent: true, expiresAt: null }] : []),
        ...(stats.shonen >= 20 ? [{ id: 'shonen_scout', permanent: false, expiresAt }] : []),
        ...(stats.useful >= 5 ? [{ id: 'sharp_eye', permanent: false, expiresAt }] : []),
    ];
}

module.exports = {
    WEEK_MS, REVIEW_XP, WEEKLY_XP_CAP, weekStart, weekId, validId,
    normalizeReview, concealed, canView, readingDelta, earnedDistinctions,
};
