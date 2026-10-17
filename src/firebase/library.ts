import { doc, getDoc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './config';
import { logger } from '@/utils/logger';
import { logDataBackup } from '@/utils/dataProtection';
import { assertLibrarySize, cleanLibraryData, mergeLibrarySnapshot } from '@/utils/librarySync';
import { workKey } from '@/utils/workIdentity';
import type { Work, Folder, Tombstone } from '@/store/libraryStore';

export interface LibraryData {
    works: Work[];
    folders?: Folder[];
    viewMode?: 'grid' | 'list';
    sortBy?: string;
    lastUpdated: number;
    version?: number;
    deletedWorks?: Tombstone[];
    metadataUpdatedAt?: number;
    sharing?: {
        enabled: boolean;
        access: 'public' | 'friends';
        sharedAt?: number;
    };
}

export interface SaveLibraryOptions {
    /** Deletions made on this device, so the cloud copy cannot resurrect them. */
    tombstones?: Tombstone[];
    /** Skips the merge entirely. Only for an explicit user-requested wipe. */
    replace?: boolean;
    metadataUpdatedAt?: number;
}

export async function saveLibraryToFirestore(
    userId: string,
    works: Work[],
    folders?: Folder[],
    viewMode?: 'grid' | 'list',
    sortBy?: string,
    options: SaveLibraryOptions = {}
): Promise<LibraryData> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');

        const saved = await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            const existing = snapshot.exists() ? snapshot.data() as LibraryData : null;
            if (existing) logDataBackup(userId, 'library', existing);
            const now = Date.now();
            const local: LibraryData = {
                works,
                folders: folders ?? existing?.folders ?? [],
                viewMode: viewMode ?? existing?.viewMode ?? 'grid',
                sortBy: sortBy ?? existing?.sortBy ?? 'updated',
                deletedWorks: options.tombstones || [],
                metadataUpdatedAt: options.metadataUpdatedAt ?? now,
                lastUpdated: now,
            };
            const data = cleanLibraryData({
                ...mergeLibrarySnapshot(local, existing),
                ...(options.replace ? {
                    works,
                    folders: local.folders,
                    deletedWorks: [
                        ...(existing?.deletedWorks || []),
                        ...(options.tombstones || []),
                        ...(existing?.works || []).filter(w => !works.some(item => workKey(item) === workKey(w)))
                            .map(w => ({ id: w.id, type: w.type, deletedAt: Math.max(now, (w.lastUpdated || 0) + 1) })),
                    ],
                    metadataUpdatedAt: now,
                } : {}),
                lastUpdated: now,
                version: (existing?.version || 0) + 1,
            });
            assertLibrarySize(data);
            transaction.set(docRef, data, { merge: true });
            return data;
        });
        logger.log('[Firestore] Library saved safely');
        return saved;
    } catch (error) {
        logger.error('[Firestore] Error saving library:', error);
        if ((error as { code?: string }).code === 'permission-denied') {
            logger.error('[Firestore] PERMISSION DENIED: Check your Firestore Security Rules in Firebase Console.');
        }
        throw error;
    }
}

export async function loadLibraryFromFirestore(userId: string): Promise<Work[] | null> {
    return (await loadFullLibraryData(userId))?.works ?? null;
}

export async function loadFullLibraryData(userId: string, folderId?: string): Promise<LibraryData | null> {
    try {
        if (auth.currentUser?.uid !== userId) {
            const getSharedLibrary = httpsCallable<{ userId: string; folderId?: string }, LibraryData>(
                functions, 'getSharedLibraryFn',
            );
            return (await getSharedLibrary({ userId, ...(folderId ? { folderId } : {}) })).data;
        }
        const docRef = doc(db, 'users', userId, 'data', 'library');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as LibraryData;
            logger.log('[Firestore] Full library data loaded');
            return data;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error loading full library data:', error);
        throw error;
    }
}

export function subscribeToLibrary(
    userId: string,
    onData: (data: LibraryData | null) => void,
    onError: (error: Error) => void,
): () => void {
    return onSnapshot(doc(db, 'users', userId, 'data', 'library'),
        snapshot => onData(snapshot.exists() ? snapshot.data() as LibraryData : null),
        onError,
    );
}

export async function updateFolderSharing(
    userId: string,
    folderId: string,
    sharing: { enabled: boolean; access: 'public' | 'friends' }
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');
        await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(docRef);
            if (!snapshot.exists()) throw new Error('Library does not exist');
            const data = snapshot.data() as LibraryData;
            if (!data.folders?.some(f => f.id === folderId)) throw new Error('Folder does not exist');
            const folders = data.folders.map(f => f.id === folderId
                ? { ...f, sharing: { ...sharing, sharedAt: Date.now() } } : f);
            assertLibrarySize({ ...data, folders });
            transaction.update(docRef, { folders });
        });
        logger.log('[Firestore] Folder sharing updated');
    } catch (error) {
        logger.error('[Firestore] Error updating folder sharing:', error);
        throw error;
    }
}

export async function updateLibrarySharing(
    userId: string,
    sharing: { enabled: boolean; access: 'public' | 'friends' }
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');
        await updateDoc(docRef, { sharing: { ...sharing, sharedAt: Date.now() } });
        logger.log('[Firestore] Library sharing updated');
    } catch (error) {
        logger.error('[Firestore] Error updating library sharing:', error);
        throw error;
    }
}

export async function getUserLibrary(userId: string): Promise<Work[]> {
    try {
        return (await loadFullLibraryData(userId))?.works || [];
    } catch (error) {
        logger.error('[Firestore] Error loading user library:', error);
        throw error;
    }
}

export async function compareLibraries(userId1: string, userId2: string): Promise<{ common: Work[]; count: number }> {
    try {
        const [lib1, lib2] = await Promise.all([
            getUserLibrary(userId1),
            getUserLibrary(userId2)
        ]);

        const lib2Ids = new Set(lib2.map(workKey));
        const common = lib1.filter(w => lib2Ids.has(workKey(w)));

        return { common, count: common.length };
    } catch (error) {
        logger.error('[Firestore] Error comparing libraries:', error);
        throw error;
    }
}
