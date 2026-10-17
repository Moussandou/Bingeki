import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, addDoc, deleteDoc, startAfter, getCountFromServer } from 'firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from './config';
import { logger } from '@/utils/logger';

export interface TierList {
    id: string;
    userId: string;
    authorName: string;
    authorPhoto?: string;
    title: string;
    description?: string;
    category: 'anime' | 'manga' | 'characters';
    likes: string[];
    likesCount?: number;
    createdAt: number;
    isPublic: boolean;
    tiers: {
        id: string;
        label: string;
        color: string;
        items: {
            id: number | string;
            name: string;
            image: string | {
                jpg: {
                    image_url: string;
                    small_image_url?: string;
                    large_image_url?: string;
                }
            };
        }[];
    }[];
}

export async function createTierList(tierList: Omit<TierList, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'tierLists'), {
            ...tierList,
            likes: [],
            likesCount: 0,
            createdAt: Date.now()
        });
        logger.log('[Firestore] Tier list created:', docRef.id);
        return docRef.id;
    } catch (error) {
        logger.error('[Firestore] Error creating tier list:', error);
        throw error;
    }
}

export async function getTierListById(id: string): Promise<TierList | null> {
    try {
        const docRef = doc(db, 'tierLists', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as TierList;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error getting tier list:', error);
        return null;
    }
}

export async function getPublicTierLists(
    limitCount: number = 20, 
    lastDoc?: QueryDocumentSnapshot,
    filter: 'recent' | 'popular' | 'trending' = 'recent'
): Promise<{ lists: TierList[], lastVisible: QueryDocumentSnapshot | null }> {
    try {
        let q = query(
            collection(db, 'tierLists'),
            where('isPublic', '==', true)
        );

        if (filter === 'popular') {
            q = query(q, orderBy('likesCount', 'desc'), orderBy('createdAt', 'desc'));
        } else if (filter === 'trending') {
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            q = query(q, where('createdAt', '>=', weekAgo), orderBy('createdAt', 'desc'), orderBy('likesCount', 'desc'));
        } else {
            q = query(q, orderBy('createdAt', 'desc'));
        }

        q = query(q, limit(limitCount));

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const querySnapshot = await getDocs(q);
        const lists: TierList[] = [];
        querySnapshot.forEach((doc) => {
            lists.push({ id: doc.id, ...doc.data() } as TierList);
        });

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        
        return { lists, lastVisible };
    } catch (error) {
        logger.error('[Firestore] Error getting public tier lists:', error);
        return { lists: [], lastVisible: null };
    }
}

export async function getUserTierLists(userId: string): Promise<TierList[]> {
    try {
        const q = query(
            collection(db, 'tierLists'),
            where('userId', '==', userId),
            ...(auth.currentUser?.uid === userId ? [] : [where('isPublic', '==', true)]),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const lists: TierList[] = [];
        querySnapshot.forEach((doc) => {
            lists.push({ id: doc.id, ...doc.data() } as TierList);
        });
        return lists;
    } catch (error) {
        logger.error('[Firestore] Error getting user tier lists:', error);
        return [];
    }
}

export async function getUserTierListsCount(userId: string): Promise<number> {
    try {
        const q = query(
            collection(db, 'tierLists'),
            where('userId', '==', userId),
            ...(auth.currentUser?.uid === userId ? [] : [where('isPublic', '==', true)])
        );
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        logger.error('[Firestore] Error getting user tier lists count:', error);
        return 0;
    }
}

export async function deleteTierList(listId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'tierLists', listId));
        logger.log('[Firestore] Tier list deleted:', listId);
    } catch (error) {
        logger.error('[Firestore] Error deleting tier list:', error);
        throw error;
    }
}

export async function toggleTierListLike(listId: string, userId: string): Promise<void> {
    try {
        const listRef = doc(db, 'tierLists', listId);
        await runTransaction(db, async transaction => {
            const listSnap = await transaction.get(listRef);
            if (!listSnap.exists()) throw new Error('Tier list not found');
            const list = listSnap.data() as TierList;
            const likes = list.likes || [];
            const nextLikes = likes.includes(userId)
                ? likes.filter(id => id !== userId)
                : [...likes, userId];
            transaction.update(listRef, { likes: nextLikes, likesCount: nextLikes.length });
        });
    } catch (error) {
        logger.error('[Firestore] Error toggling tier list like:', error);
        throw error;
    }
}
