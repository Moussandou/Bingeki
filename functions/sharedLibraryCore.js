// Explicit projection: newly added private fields must never become public by default.
const WORK_FIELDS = [
    'id', 'title', 'title_english', 'title_japanese', 'image', 'image_small', 'type', 'format',
    'totalChapters', 'currentChapter', 'totalEpisodes', 'currentEpisode', 'status', 'score',
    'synopsis', 'rating', 'genres', 'season', 'year', 'rank', 'popularity', 'duration',
    'ratingString', 'source',
];

function isPublicProfile(profile) {
    return !!profile && !profile.deleting
        && [undefined, null, 'public'].includes(profile.profileVisibility);
}

function canReadProfile(profile, acceptedFriend) {
    return isPublicProfile(profile)
        || (!!profile && !profile.deleting && profile.profileVisibility === 'friends' && acceptedFriend);
}

function canReadSharing(sharing, acceptedFriend) {
    return sharing?.enabled === true
        && (sharing.access === 'public' || (sharing.access === 'friends' && acceptedFriend));
}

function projectSharedLibrary(library, acceptedFriend, folderId) {
    const folders = Array.isArray(library.folders) ? library.folders : [];
    const sharedFolders = folders.filter(folder => canReadSharing(folder.sharing, acceptedFriend));
    const selected = folderId ? sharedFolders.filter(folder => folder.id === folderId) : sharedFolders;
    if (folderId ? selected.length !== 1 : !canReadSharing(library.sharing, acceptedFriend)) return null;
    const visibleIds = new Set(selected.map(folder => folder.id));
    const works = (Array.isArray(library.works) ? library.works : [])
        .filter(work => {
            const collections = Array.isArray(work.collections) ? work.collections : [];
            return folderId ? collections.includes(folderId)
                : collections.length === 0 || collections.some(id => visibleIds.has(id));
        })
        .map(work => {
            const projected = {};
            for (const field of WORK_FIELDS) {
                if (work[field] !== undefined) projected[field] = work[field];
            }
            projected.collections = (Array.isArray(work.collections) ? work.collections : [])
                .filter(id => visibleIds.has(id));
            return projected;
        });
    return {
        works,
        folders: selected.map(({ id, name, color, emoji, createdAt, sharing }) => ({
            id, name, color, emoji, createdAt, sharing: { enabled: true, access: sharing.access },
        })),
        sharing: folderId ? { enabled: true, access: selected[0].sharing.access }
            : { enabled: true, access: library.sharing.access },
        lastUpdated: typeof library.lastUpdated === 'number' ? library.lastUpdated : 0,
    };
}

module.exports = { isPublicProfile, canReadProfile, projectSharedLibrary };
