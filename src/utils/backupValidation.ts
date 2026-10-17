import type { Work, Folder, Tombstone } from '@/store/libraryStore';
import type { FavoriteCharacter } from '@/types/character';
import type { Badge } from '@/types/badge';

type RecordValue = Record<string, unknown>;
export function record(value: unknown): RecordValue {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object in backup');
    return value as RecordValue;
}
function check(condition: boolean, field: string): asserts condition {
    if (!condition) throw new Error(`Invalid backup field: ${field}`);
}
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const strings = (value: unknown) => Array.isArray(value) && value.every(v => typeof v === 'string');
function optionalFields(data: RecordValue, keys: string[], valid: (value: unknown) => boolean) {
    for (const key of keys) if (data[key] !== undefined) check(valid(data[key]), key);
}
function state(value: unknown): RecordValue {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return { works: parsed };
    const data = record(parsed);
    return data.state === undefined ? data : record(data.state);
}
function works(value: unknown): Work[] {
    check(Array.isArray(value), 'works');
    const identities = new Set<string>();
    return value.map(item => {
        const work = record(item);
        check((typeof work.id === 'string' && work.id.length > 0) || number(work.id), 'work.id');
        check(typeof work.title === 'string' && typeof work.image === 'string', 'work.title/image');
        check(work.type === 'manga' || work.type === 'anime', 'work.type');
        check(['reading', 'completed', 'on_hold', 'dropped', 'plan_to_read'].includes(String(work.status)), 'work.status');
        optionalFields(work, ['title_english', 'title_japanese'], v => v === null || typeof v === 'string');
        optionalFields(work, ['image_small', 'format', 'synopsis', 'notes', 'season', 'duration', 'ratingString', 'source'], v => typeof v === 'string');
        optionalFields(work, ['totalChapters', 'totalEpisodes'], v => v === null || number(v));
        optionalFields(work, ['currentChapter', 'currentEpisode', 'score', 'rating', 'lastUpdated', 'dateAdded', 'year', 'rank', 'popularity'], number);
        optionalFields(work, ['collections'], strings);
        optionalFields(work, ['genres'], v => Array.isArray(v) && v.every(g => typeof record(g).name === 'string'));
        const key = `${work.type}:${work.id}`;
        check(!identities.has(key), 'duplicate work identity');
        identities.add(key);
        return item as Work;
    });
}
function folders(value: unknown): Folder[] {
    check(Array.isArray(value), 'folders');
    const ids = new Set<string>();
    return value.map(item => {
        const folder = record(item);
        check(['id', 'name', 'color', 'emoji'].every(k => typeof folder[k] === 'string'), 'folder');
        check(number(folder.createdAt) && !ids.has(String(folder.id)), 'folder.createdAt/id');
        ids.add(String(folder.id));
        if (folder.sharing !== undefined) {
            const sharing = record(folder.sharing);
            check(typeof sharing.enabled === 'boolean' && ['public', 'friends'].includes(String(sharing.access)), 'folder.sharing');
            optionalFields(sharing, ['sharedAt'], number);
        }
        return item as Folder;
    });
}
function characters(value: unknown): FavoriteCharacter[] {
    check(Array.isArray(value), 'favoriteCharacters');
    return value.map(item => {
        const character = record(item);
        check(number(character.id) && typeof character.name === 'string' && typeof character.image === 'string', 'favoriteCharacter');
        optionalFields(character, ['role', 'workTitle'], v => typeof v === 'string');
        optionalFields(character, ['workId'], number);
        return item as FavoriteCharacter;
    });
}
function tombstones(value: unknown): Tombstone[] {
    check(Array.isArray(value), 'deletedWorks');
    return value.map(item => {
        const tombstone = record(item);
        check((typeof tombstone.id === 'string' || number(tombstone.id)) && number(tombstone.deletedAt), 'tombstone');
        optionalFields(tombstone, ['type'], v => v === 'anime' || v === 'manga');
        return item as Tombstone;
    });
}
function badges(value: unknown): Badge[] {
    check(Array.isArray(value), 'badges');
    return value.map(item => {
        const badge = record(item);
        check(['id', 'name', 'description', 'icon'].every(k => typeof badge[k] === 'string'), 'badge');
        check(['common', 'rare', 'epic', 'legendary'].includes(String(badge.rarity)), 'badge.rarity');
        optionalFields(badge, ['unlockedAt'], number);
        return item as Badge;
    });
}

export function validateBackup(value: unknown) {
    const backup = record(value);
    check(['library', 'gamification', 'settings'].some(key => backup[key] != null), 'empty backup');
    const library = backup.library == null ? undefined : (() => {
        const data = state(backup.library);
        optionalFields(data, ['viewMode'], v => v === 'grid' || v === 'list');
        optionalFields(data, ['sortBy'], v => typeof v === 'string');
        optionalFields(data, ['metadataUpdatedAt'], number);
        return {
            works: works(data.works),
            folders: folders(data.folders ?? []),
            favoriteCharacters: characters(data.favoriteCharacters ?? []),
            deletedWorks: tombstones(data.deletedWorks ?? []),
            viewMode: data.viewMode === 'list' ? 'list' as const : 'grid' as const,
            sortBy: typeof data.sortBy === 'string' ? data.sortBy : 'updated',
        };
    })();
    const gamification = backup.gamification == null ? undefined : (() => {
        const data = state(backup.gamification);
        const numericFields = ['level', 'xp', 'totalXp', 'xpToNextLevel', 'bonusXp', 'streak', 'lastLevel',
            'totalChaptersRead', 'totalAnimeEpisodesWatched', 'totalMoviesWatched', 'totalWorksAdded', 'totalWorksCompleted'];
        optionalFields(data, numericFields, number);
        optionalFields(data, ['lastActivityDate'], v => v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v))));
        check(numericFields.some(key => data[key] !== undefined), 'gamification');
        return {
            ...Object.fromEntries(numericFields.filter(key => data[key] !== undefined).map(key => [key, data[key] as number])),
            ...(data.lastActivityDate !== undefined ? { lastActivityDate: data.lastActivityDate as string | null } : {}),
            ...(data.badges !== undefined ? { badges: badges(data.badges) } : {}),
        };
    })();
    const settings = backup.settings == null ? undefined : (() => {
        const data = state(backup.settings);
        const booleans = ['reducedMotion', 'soundEnabled', 'notifications', 'spoilerMode', 'nsfwMode', 'hideScores', 'dataSaver', 'showActivityStatus'];
        optionalFields(data, booleans, v => typeof v === 'boolean');
        optionalFields(data, ['accentColor', 'streamingUrlPattern'], v => typeof v === 'string');
        const enums = {
            theme: ['dark', 'light'], titleLanguage: ['romaji', 'english', 'native'],
            profileVisibility: ['public', 'friends', 'private'],
        };
        for (const [key, values] of Object.entries(enums)) optionalFields(data, [key], v => values.includes(String(v)));
        const keys = [...booleans, 'accentColor', 'streamingUrlPattern', ...Object.keys(enums)];
        check(keys.some(key => data[key] !== undefined), 'settings');
        return Object.fromEntries(keys.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
    })();
    return { library, gamification, settings };
}
