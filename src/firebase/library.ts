import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import { mergeLibraryData, logDataBackup } from '@/utils/dataProtection';
import type { Work, Folder, Tombstone } from '@/store/libraryStore';

export interface LibraryData {
    works: Work[];
    folders?: Folder[];
    viewMode?: 'grid' | 'list';
    sortBy?: string;
    lastUpdated: number;
    version?: number;
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
}

export async function saveLibraryToFirestore(
    userId: string,
    works: Work[],
    folders?: Folder[],
    viewMode?: 'grid' | 'list',
    sortBy?: string,
    options: SaveLibraryOptions = {}
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');

        const existingDoc = await getDoc(docRef);
        const existing = existingDoc.exists() ? existingDoc.data() as LibraryData : null;

        if (existing) {
            logDataBackup(userId, 'library', existing);
        }

        const mergedWorks = options.replace
            ? works
            : mergeLibraryData(works, existing?.works || null, options.tombstones);

        await setDoc(docRef, {
            works: mergedWorks,
            folders: folders ?? existing?.folders ?? [],
            viewMode: viewMode ?? existing?.viewMode ?? 'grid',
            sortBy: sortBy ?? existing?.sortBy ?? 'updated',
            lastUpdated: Date.now(),
            version: (existing?.version || 0) + 1
        } as LibraryData);
        logger.log('[Firestore] Library saved safely');
    } catch (error) {
        logger.error('[Firestore] Error saving library:', error);
        if ((error as { code?: string }).code === 'permission-denied') {
            logger.error('[Firestore] PERMISSION DENIED: Check your Firestore Security Rules in Firebase Console.');
        }
        throw error;
    }
}

export async function loadLibraryFromFirestore(userId: string): Promise<Work[] | null> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as LibraryData;
            logger.log('[Firestore] Library loaded');
            return data.works;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error loading library:', error);
        return null;
    }
}

export async function loadFullLibraryData(userId: string): Promise<LibraryData | null> {
    try {
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
        return null;
    }
}

export async function updateFolderSharing(
    userId: string,
    folderId: string,
    sharing: { enabled: boolean; access: 'public' | 'friends' }
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;

        const data = docSnap.data() as LibraryData;
        const folders = data.folders || [];
        const updatedFolders = folders.map(f =>
            f.id === folderId
                ? { ...f, sharing: { ...sharing, sharedAt: Date.now() } }
                : f
        );
        await updateDoc(docRef, { folders: updatedFolders });
        logger.log('[Firestore] Folder sharing updated');
    } catch (error) {
        logger.error('[Firestore] Error updating folder sharing:', error);
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
    }
}

export async function getUserLibrary(userId: string): Promise<Work[]> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return (docSnap.data() as LibraryData).works;
        }
        return [];
    } catch (error) {
        logger.error('[Firestore] Error loading user library:', error);
        return [];
    }
}

export async function compareLibraries(userId1: string, userId2: string): Promise<{ common: Work[]; count: number }> {
    try {
        const [lib1, lib2] = await Promise.all([
            getUserLibrary(userId1),
            getUserLibrary(userId2)
        ]);

        const lib2Ids = new Set(lib2.map(w => w.id));
        const common = lib1.filter(w => lib2Ids.has(w.id));

        return { common, count: common.length };
    } catch (error) {
        logger.error('[Firestore] Error comparing libraries:', error);
        return { common: [], count: 0 };
    }
}
