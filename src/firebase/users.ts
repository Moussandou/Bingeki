import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { logger } from '@/utils/logger';
import { deleteUserStorage } from './storage';
import type { FavoriteCharacter } from '@/types/character';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastLogin: number;
    xp?: number;
    level?: number;
    totalXp?: number;
    streak?: number;
    badges?: { id: string; name: string; description: string; icon: string; rarity: string; unlockedAt?: number }[];
    totalChaptersRead?: number;
    totalAnimeEpisodesWatched?: number;
    totalMoviesWatched?: number;
    totalWorksAdded?: number;
    totalWorksCompleted?: number;
    banner?: string;
    bannerPosition?: string;
    bio?: string;
    themeColor?: string;
    cardBgColor?: string;
    borderColor?: string;
    favoriteManga?: string;
    top3Favorites?: string[];
    favoriteCharacters?: FavoriteCharacter[];
    profileVisibility?: 'public' | 'friends' | 'private';
    showActivityStatus?: boolean;
    titlePriority?: 'romaji' | 'native' | 'english';
    hideScores?: boolean;
    dataSaver?: boolean;
    featuredBadge?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    isBanned?: boolean;
    createdAt?: number;
    deletedAt?: number;
}

export async function saveUserProfileToFirestore(user: Partial<UserProfile>, forceUpdate: boolean = false): Promise<void> {
    try {
        if (!user.uid) return;

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        const exists = docSnap.exists();

        const dataToSave: Partial<UserProfile> = {
            lastLogin: Date.now()
        };

        if (!exists) {
            dataToSave.createdAt = Date.now();
        }

        const allowedFields: (keyof UserProfile)[] = [
            'uid', 'email', 'displayName', 'photoURL', 'banner', 'bannerPosition', 'bio',
            'themeColor', 'cardBgColor', 'borderColor',
            'favoriteManga', 'top3Favorites', 'featuredBadge',
            'favoriteCharacters', 'isAdmin', 'isSuperAdmin',
            'profileVisibility', 'showActivityStatus'
        ];

        allowedFields.forEach(field => {
            if (exists && !forceUpdate && (field === 'displayName' || field === 'photoURL')) {
                return;
            }

            const value = user[field];
            if (value !== undefined) {
                (dataToSave as Record<string, unknown>)[field] = value;
            }
        });

        await setDoc(docRef, dataToSave, { merge: true });
        logger.log('[Firestore] User profile saved:', dataToSave);
    } catch (error) {
        logger.error('[Firestore] Error saving user profile:', error);
        throw error;
    }
}

export async function updateUserProfile(uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'photoURL' | 'banner'>>): Promise<void> {
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, { ...data, lastUpdated: Date.now() });
        logger.log('[Firestore] User profile updated:', data);
    } catch (error) {
        logger.error('[Firestore] Error updating user profile:', error);
        throw error;
    }
}

export async function uploadProfilePicture(uid: string, file: File): Promise<string> {
    try {
        const storageRef = ref(storage, `users/${uid}/avatar_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await updateUserProfile(uid, { photoURL: downloadURL });
        return downloadURL;
    } catch (error) {
        logger.error('[Storage] Error uploading profile picture:', error);
        throw error;
    }
}

export async function getThumbnailDownloadURL(originalPath: string, size: '200x200' | '400x400' = '200x200'): Promise<string> {
    try {
        const thumbPath = `thumbnails/${originalPath}_${size}.webp`;
        const thumbRef = ref(storage, thumbPath);
        return await getDownloadURL(thumbRef);
    } catch {
        try {
            const originalRef = ref(storage, originalPath);
            return await getDownloadURL(originalRef);
        } catch (fallbackError) {
            logger.error('[Storage] Error fetching original/thumbnail URL:', fallbackError);
            throw fallbackError;
        }
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error getting user profile:', error);
        return null;
    }
}

export async function getUserProfiles(uids: string[]): Promise<UserProfile[]> {
    try {
        if (!uids || uids.length === 0) return [];

        const results: UserProfile[] = [];
        for (let i = 0; i < uids.length; i += 30) {
            const batch = uids.slice(i, i + 30);
            const q = query(collection(db, 'users'), where('__name__', 'in', batch));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                results.push({ uid: doc.id, ...doc.data() } as UserProfile);
            });
        }
        return results;
    } catch (error) {
        logger.error('[Firestore] Error getting multiple user profiles:', error);
        return [];
    }
}

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void): () => void {
    const docRef = doc(db, 'users', uid);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
            callback(null);
        }
    }, (error) => {
        logger.error('[Firestore] Error subscribing to user profile:', error);
        callback(null);
    });
}

export async function searchUserByEmail(email: string): Promise<UserProfile | null> {
    try {
        const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { uid: doc.id, ...doc.data() } as UserProfile;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error searching user:', error);
        return null;
    }
}

export async function searchUserByName(name: string): Promise<UserProfile | null> {
    try {
        const q = query(collection(db, 'users'), where('displayName', '==', name), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { uid: doc.id, ...doc.data() } as UserProfile;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error searching user by name:', error);
        return null;
    }
}

export async function searchUsersByPrefix(prefix: string, limitCount: number = 5): Promise<UserProfile[]> {
    try {
        if (!prefix) return [];
        const q = query(
            collection(db, 'users'),
            where('displayName', '>=', prefix),
            where('displayName', '<=', prefix + '\uf8ff'),
            orderBy('displayName'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        return users;
    } catch (error) {
        logger.error('[Firestore] Error searching users by prefix:', error);
        return [];
    }
}

export async function deleteUserData(userId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'users', userId, 'data', 'library'));
        await deleteDoc(doc(db, 'users', userId, 'data', 'gamification'));

        const activitiesQuery = query(collection(db, 'activities'), where('userId', '==', userId));
        const activitiesSnap = await getDocs(activitiesQuery);
        const activityDeletions = activitiesSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(activityDeletions);

        const tierListsQuery = query(collection(db, 'tierLists'), where('userId', '==', userId));
        const tierListsSnap = await getDocs(tierListsQuery);
        const tierListDeletions = tierListsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(tierListDeletions);

        const commentsQuery = query(collection(db, 'comments'), where('userId', '==', userId));
        const commentsSnap = await getDocs(commentsQuery);
        const commentDeletions = commentsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(commentDeletions);

        const partiesQuery = query(collection(db, 'watchparties'), where('creatorId', '==', userId));
        const partiesSnap = await getDocs(partiesQuery);
        const partyDeletions = partiesSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(partyDeletions);

        const subcollections = ['friends', 'notifications'];
        for (const sub of subcollections) {
            const snap = await getDocs(collection(db, 'users', userId, sub));
            const deletions = snap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletions);
        }

        try {
            await deleteUserStorage(userId);
        } catch (storageError) {
            logger.error('[Firestore] Error cleaning up storage during deletion:', storageError);
        }

        await deleteDoc(doc(db, 'users', userId));

        logger.log('[Firestore] All user data deleted for:', userId);
    } catch (error) {
        logger.error('[Firestore] Error deleting user data:', error);
        throw error;
    }
}
