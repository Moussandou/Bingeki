/**
 * Firebase — Social Bot collections
 *
 * Front subscriptions for /admin/social. Backend writes to
 * `social_pending_posts` happen in Cloud Functions; the front only
 * reads pending posts, edits their draft, toggles the kill-switch,
 * and calls admin callables (Phase 4).
 */
import {
    collection, doc, query, orderBy, limit as fbLimit,
    onSnapshot, updateDoc, setDoc, getDoc,
} from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import type {
    PendingPost, PublishedPost, BotConfig, PostPlatforms, PostSourceData,
} from '@/shared/socialBot';
import { DEFAULT_BOT_CONFIG, FIRESTORE_COLLECTIONS } from '@/shared/socialBot';

const PENDING = FIRESTORE_COLLECTIONS.pendingPosts;
const PUBLISHED = FIRESTORE_COLLECTIONS.publishedPosts;
const CONFIG = FIRESTORE_COLLECTIONS.botConfig;
const CONFIG_DOC = FIRESTORE_COLLECTIONS.botConfigDoc;

/* ==========================================================================
   SUBSCRIPTIONS
   ========================================================================== */

// Preview mock hook — used by /_preview/admin-social to render the
// page without hitting Firestore. Writes also target the mock and
// re-fire any registered subscribe callbacks so the UI stays reactive
// end-to-end without touching the network.
type MockState = {
    pending: PendingPost[];
    published: PublishedPost[];
    config: BotConfig;
};
type WindowMock = { __BINGEKI_SOCIAL_MOCK__?: MockState };

const readMock = (): MockState | undefined => (typeof window !== 'undefined')
    ? (window as unknown as WindowMock).__BINGEKI_SOCIAL_MOCK__
    : undefined;

type MockKind = 'pending' | 'published' | 'config';
type MockSub =
    | { kind: 'pending'; cb: (posts: PendingPost[]) => void }
    | { kind: 'published'; cb: (posts: PublishedPost[]) => void }
    | { kind: 'config'; cb: (config: BotConfig) => void };

const mockSubs: MockSub[] = [];

function registerMockSub(sub: MockSub) {
    mockSubs.push(sub);
    return () => {
        const idx = mockSubs.indexOf(sub);
        if (idx >= 0) mockSubs.splice(idx, 1);
    };
}

function fireMock(kind: MockKind) {
    const mock = readMock();
    if (!mock) return;
    for (const sub of mockSubs) {
        if (sub.kind === 'pending' && kind === 'pending') sub.cb(mock.pending);
        else if (sub.kind === 'published' && kind === 'published') sub.cb(mock.published);
        else if (sub.kind === 'config' && kind === 'config') sub.cb(mock.config);
    }
}

export function subscribeToPendingPosts(
    callback: (posts: PendingPost[]) => void,
): () => void {
    const mock = readMock();
    if (mock) {
        setTimeout(() => callback(mock.pending), 0);
        return registerMockSub({ kind: 'pending', cb: callback });
    }
    const q = query(collection(db, PENDING), orderBy('scheduledAt', 'asc'));
    return onSnapshot(
        q,
        (snap) => {
            const posts: PendingPost[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<PendingPost, 'id'>),
            }));
            callback(posts);
        },
        (error) => {
            logger.error('[SocialBot] pending posts subscription error:', error);
            callback([]);
        },
    );
}

export function subscribeToPublishedPosts(
    callback: (posts: PublishedPost[]) => void,
    limit = 10,
): () => void {
    const mock = readMock();
    if (mock) {
        setTimeout(() => callback(mock.published), 0);
        return registerMockSub({ kind: 'published', cb: callback });
    }
    const q = query(
        collection(db, PUBLISHED),
        orderBy('publishedAt', 'desc'),
        fbLimit(limit),
    );
    return onSnapshot(
        q,
        (snap) => {
            const posts: PublishedPost[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<PublishedPost, 'id'>),
            }));
            callback(posts);
        },
        (error) => {
            logger.error('[SocialBot] published posts subscription error:', error);
            callback([]);
        },
    );
}

export function subscribeToBotConfig(
    callback: (config: BotConfig) => void,
): () => void {
    const mock = readMock();
    if (mock) {
        setTimeout(() => callback(mock.config), 0);
        return registerMockSub({ kind: 'config', cb: callback });
    }
    const ref = doc(db, CONFIG, CONFIG_DOC);
    return onSnapshot(
        ref,
        (snap) => {
            if (!snap.exists()) {
                callback(DEFAULT_BOT_CONFIG);
                return;
            }
            callback({ ...DEFAULT_BOT_CONFIG, ...(snap.data() as Partial<BotConfig>) });
        },
        (error) => {
            logger.error('[SocialBot] bot config subscription error:', error);
            callback(DEFAULT_BOT_CONFIG);
        },
    );
}

/* ==========================================================================
   WRITES (admin only — enforced by Firestore rules)
   ========================================================================== */

/**
 * Toggle the global kill-switch. superAdmin only per Firestore rules.
 * Creates the singleton doc with defaults if it doesn't exist yet.
 */
export async function setBotEnabled(enabled: boolean): Promise<void> {
    const mock = readMock();
    if (mock) {
        mock.config = { ...mock.config, enabled };
        fireMock('config');
        return;
    }
    const ref = doc(db, CONFIG, CONFIG_DOC);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, { ...DEFAULT_BOT_CONFIG, enabled });
        return;
    }
    await updateDoc(ref, { enabled });
}

/**
 * Toggle a single scheduled cron on/off. Effect is immediate: each
 * cron reads the config at the top and skips if disabled.
 * superAdmin only per Firestore rules.
 */
export async function setScheduleEnabled(
    kind: 'daily' | 'weekly' | 'favorite',
    enabled: boolean,
): Promise<void> {
    const mock = readMock();
    if (mock) {
        mock.config = {
            ...mock.config,
            schedules: {
                ...mock.config.schedules,
                [kind]: { ...mock.config.schedules[kind], enabled },
            },
        };
        fireMock('config');
        return;
    }
    const ref = doc(db, CONFIG, CONFIG_DOC);
    const snap = await getDoc(ref);
    const key = `schedules.${kind}.enabled`;
    if (!snap.exists()) {
        await setDoc(ref, {
            ...DEFAULT_BOT_CONFIG,
            schedules: {
                ...DEFAULT_BOT_CONFIG.schedules,
                [kind]: { ...DEFAULT_BOT_CONFIG.schedules[kind], enabled },
            },
        });
        return;
    }
    await updateDoc(ref, { [key]: enabled });
}

/**
 * Set the publish mode of a platform (photo carousel vs Reel/video).
 * Read at publish time by socialPublishNow.
 * superAdmin only per Firestore rules.
 */
export async function setPlatformMode(
    platform: 'insta' | 'tiktok',
    mode: 'photo' | 'video',
): Promise<void> {
    const mock = readMock();
    if (mock) {
        mock.config = {
            ...mock.config,
            platforms: {
                ...mock.config.platforms,
                [platform]: { ...mock.config.platforms[platform], mode },
            },
        };
        fireMock('config');
        return;
    }
    const ref = doc(db, CONFIG, CONFIG_DOC);
    const snap = await getDoc(ref);
    const key = `platforms.${platform}.mode`;
    if (!snap.exists()) {
        await setDoc(ref, {
            ...DEFAULT_BOT_CONFIG,
            platforms: {
                ...DEFAULT_BOT_CONFIG.platforms,
                [platform]: { ...DEFAULT_BOT_CONFIG.platforms[platform], mode },
            },
        });
        return;
    }
    await updateDoc(ref, { [key]: mode });
}

/**
 * Update a schedule's hour (0-23) and — for weekly/favorite — dayOfWeek (0-6).
 * These are stored in Firestore but do NOT alter the deployed Cloud
 * Scheduler cron itself; the scheduler expression lives in the cron
 * source file and requires a redeploy to change. The values here are
 * consumed by the crons as a *soft* schedule (they still run at the
 * hardcoded time but skip if the config says a different hour).
 * TL;DR: this is informational until we move to `dynamicSchedule`.
 */
export async function setScheduleTime(
    kind: 'daily' | 'weekly' | 'favorite',
    patch: { hour?: number; dayOfWeek?: number },
): Promise<void> {
    const mock = readMock();
    if (mock) {
        mock.config = {
            ...mock.config,
            schedules: {
                ...mock.config.schedules,
                [kind]: { ...mock.config.schedules[kind], ...patch },
            },
        };
        fireMock('config');
        return;
    }
    const ref = doc(db, CONFIG, CONFIG_DOC);
    const snap = await getDoc(ref);
    const updates: Record<string, number> = {};
    if (typeof patch.hour === 'number') updates[`schedules.${kind}.hour`] = patch.hour;
    if (typeof patch.dayOfWeek === 'number') updates[`schedules.${kind}.dayOfWeek`] = patch.dayOfWeek;
    if (Object.keys(updates).length === 0) return;
    if (!snap.exists()) {
        await setDoc(ref, {
            ...DEFAULT_BOT_CONFIG,
            schedules: {
                ...DEFAULT_BOT_CONFIG.schedules,
                [kind]: { ...DEFAULT_BOT_CONFIG.schedules[kind], ...patch },
            },
        });
        return;
    }
    await updateDoc(ref, updates);
}

/**
 * Save inline edits (caption / hashtags / platforms / sourceData) on
 * a pending post. Admin can call this while validating a post before
 * publish.
 */
export async function updatePendingPostDraft(
    postId: string,
    patch: {
        caption?: string;
        hashtags?: string;
        platforms?: PostPlatforms;
        sourceData?: PostSourceData;
    },
): Promise<void> {
    const mock = readMock();
    if (mock) {
        mock.pending = mock.pending.map((p) =>
            p.id === postId ? { ...p, ...patch } : p
        );
        fireMock('pending');
        return;
    }
    const ref = doc(db, PENDING, postId);
    await updateDoc(ref, patch);
}

/* ==========================================================================
   ADMIN CALLABLES (Phase 4 backend, wrappers ready now)
   ========================================================================== */

async function callAdminFn<TIn extends object, TOut>(
    name: string,
    payload: TIn,
): Promise<TOut> {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./config');
    const fn = httpsCallable(functions, name);
    const result = await fn(payload);
    return result.data as TOut;
}

export const publishPostNow = (postId: string) =>
    callAdminFn<{ postId: string }, { ok: true; results: PublishedPost['results'] }>(
        'socialPublishNow',
        { postId },
    );

export const rejectPost = (postId: string, reason?: string) => {
    // Preview mock: skip network, just remove from local mock so the UI updates.
    const mock = readMock();
    if (mock) {
        mock.pending = mock.pending.filter((p) => p.id !== postId);
        fireMock('pending');
        return Promise.resolve({ ok: true as const });
    }
    return callAdminFn<{ postId: string; reason?: string }, { ok: true }>(
        'socialRejectPost',
        { postId, reason },
    );
};

export const regeneratePost = (postId: string) =>
    callAdminFn<{ postId: string }, { ok: true }>(
        'socialRegeneratePost',
        { postId },
    );
