/**
 * Firebase Firestore module
 */
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc, deleteDoc, addDoc, onSnapshot, getAggregateFromServer, count, getCountFromServer, Timestamp, startAfter, type QueryDocumentSnapshot } from 'firebase/firestore';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { logger } from '@/utils/logger';
import { deleteUserStorage } from './storage';
import type { Work, Folder } from '@/store/libraryStore';
// import type { Badge } from '@/types/badge'; // Removed unused import, already in GamificationData
import type { FavoriteCharacter } from '@/types/character';
import type { ActivityEvent } from '@/types/activity';
export type { ActivityEvent };
import type { Comment, CommentWithReplies } from '@/types/comment';
import type { Challenge } from '@/types/challenge';
import {
    mergeGamificationData,
    mergeLibraryData,
    validateGamificationWrite,
    logDataBackup,
    type GamificationData // Import the unified type
} from '@/utils/dataProtection';

// Types for Firestore data
interface LibraryData {
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

// interface GamificationData { ... } - REMOVED, importing from dataProtection instead

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastLogin: number;
    xp?: number;
    level?: number;
    totalXp?: number; // Added for robust leaderboard sorting
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
    // New Settings & Privacy
    profileVisibility?: 'public' | 'friends' | 'private';
    showActivityStatus?: boolean;
    titlePriority?: 'romaji' | 'native' | 'english';
    hideScores?: boolean;
    dataSaver?: boolean;
    featuredBadge?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean; // New Super Admin role
    isBanned?: boolean;
    createdAt?: number;
}

// Types for analytics and charts
export interface EngagementBreakdown {
    watch: number;
    read: number;
    add_work: number;
    level_up: number;
    badge: number;
    complete: number;
}

export interface ContentStat {
    title: string;
    count: number;
    id: number;
    image?: string;
}

export interface FunnelStep {
    name: string;
    value: number;
}

export interface HistoricalTrend {
    date: string;
    inscriptions: number;
    activities: number;
    activeUsers: number;
}

// Save user profile to Firestore
export async function saveUserProfileToFirestore(user: Partial<UserProfile>, forceUpdate: boolean = false): Promise<void> {
    try {
        if (!user.uid) return;

        const docRef = doc(db, 'users', user.uid);

        const docSnap = await getDoc(docRef);
        const exists = docSnap.exists();

        // Prepare data to save - filter out undefined but Keep null/empty strings to allow clearing
        const dataToSave: Partial<UserProfile> = {
            lastLogin: Date.now()
        };

        // Set createdAt only on first registration
        if (!exists) {
            dataToSave.createdAt = Date.now();
        }

        // List of allowed fields to sync
        const allowedFields: (keyof UserProfile)[] = [
            'uid', 'email', 'displayName', 'photoURL', 'banner', 'bannerPosition', 'bio',
            'themeColor', 'cardBgColor', 'borderColor',
            'favoriteManga', 'top3Favorites', 'featuredBadge',
            'favoriteCharacters', 'isAdmin', 'isSuperAdmin',
            'profileVisibility', 'showActivityStatus'
        ];

        allowedFields.forEach(field => {
            // Prevent overwriting custom profile data with Auth provider data on subsequent logins
            // UNLESS forceUpdate is true (manual edit)
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
        throw error; // Re-throw to let UI know
    }
}

// Update user profile fields (DisplayName, Bio, etc.)
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

// Upload profile picture to Firebase Storage
export async function uploadProfilePicture(uid: string, file: File): Promise<string> {
    try {
        // Create a unique reference to avoid caching issues
        const storageRef = ref(storage, `users/${uid}/avatar_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Update user profile with new photoURL
        await updateUserProfile(uid, { photoURL: downloadURL });

        return downloadURL;
    } catch (error) {
        logger.error('[Storage] Error uploading profile picture:', error);
        throw error;
    }
}

/**
 * Robust way to get a thumbnail URL using the Firebase SDK.
 * This handles cases where the thumbnail has a different access token than the original.
 * @param originalPath The path in Storage (e.g. 'users/123/avatar_456')
 * @param size The size suffix (default 200x200)
 */
export async function getThumbnailDownloadURL(originalPath: string, size: '200x200' | '400x400' = '200x200'): Promise<string> {
    try {
        // The extension is configured to put thumbnails in the 'thumbnails' prefix
        const thumbPath = `thumbnails/${originalPath}_${size}.webp`;
        const thumbRef = ref(storage, thumbPath);
        return await getDownloadURL(thumbRef);
    } catch (error) {
        // Fallback to original if thumbnail isn't found or still generating
        try {
            const originalRef = ref(storage, originalPath);
            return await getDownloadURL(originalRef);
        } catch (fallbackError) {
            logger.error('[Storage] Error fetching original/thumbnail URL:', fallbackError);
            throw fallbackError;
        }
    }
}

// Save library data to Firestore (with safe merge)
export async function saveLibraryToFirestore(
    userId: string, 
    works: Work[], 
    folders?: Folder[],
    viewMode?: 'grid' | 'list',
    sortBy?: string
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');

        // Load existing data
        const existingDoc = await getDoc(docRef);
        const existing = existingDoc.exists() ? existingDoc.data() as LibraryData : null;

        // Create backup
        if (existing) {
            logDataBackup(userId, 'library', existing);
        }

        // Merge with existing data
        const mergedWorks = mergeLibraryData(works, existing?.works || null);

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

// Load library data from Firestore
export async function loadLibraryFromFirestore(userId: string): Promise<Work[] | null> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'library');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as LibraryData;
            logger.log('[Firestore] Library loaded');
            return data.works;
        }
        return null; // No data in Firestore
    } catch (error) {
        logger.error('[Firestore] Error loading library:', error);
        return null;
    }
}

// Load full library data including folders and sharing settings
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

// Update folder sharing settings
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

// Update library-level sharing settings
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

// Save gamification data to Firestore (with validation and safe merge)
export async function saveGamificationToFirestore(
    userId: string,
    data: Omit<GamificationData, 'lastUpdated'>
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'gamification');

        // 1. Load existing data first
        const existingDoc = await getDoc(docRef);
        const existing = existingDoc.exists() ? existingDoc.data() as GamificationData : null;

                if (!validateGamificationWrite(data, existing)) {
            logger.warn('[Firestore] Gamification write blocked - would cause data downgrade');
            // Use safe merge instead
            const safeData = mergeGamificationData(data, existing);
            data = safeData;
        }

        // 3. Create backup before write
        if (existing) {
            logDataBackup(userId, 'gamification', existing);
        }

                const mergedData = mergeGamificationData(data, existing);

                await setDoc(docRef, {
            ...mergedData,
            lastUpdated: Date.now()
        });

                // Include lastActivityDate and bonusXp so cross-device streak sync works
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, {
            xp: mergedData.xp,
            level: mergedData.level,
            totalXp: mergedData.totalXp, // Crucial for ranking
            streak: mergedData.streak,
            lastActivityDate: mergedData.lastActivityDate || null,
            bonusXp: mergedData.bonusXp || 0,
            badges: mergedData.badges,
            totalChaptersRead: mergedData.totalChaptersRead,
            totalAnimeEpisodesWatched: mergedData.totalAnimeEpisodesWatched || 0,
            totalMoviesWatched: mergedData.totalMoviesWatched || 0,
            totalWorksAdded: mergedData.totalWorksAdded,
            totalWorksCompleted: mergedData.totalWorksCompleted
        }, { merge: true });

        logger.log('[Firestore] Gamification saved safely');
    } catch (error) {
        logger.error('[Firestore] Error saving gamification:', error);
        if ((error as { code?: string }).code === 'permission-denied') {
            logger.error('[Firestore] PERMISSION DENIED: Check your Firestore Security Rules in Firebase Console.');
        }
        throw error;
    }
}

// Load gamification data from Firestore
export async function loadGamificationFromFirestore(userId: string): Promise<Omit<GamificationData, 'lastUpdated'> | null> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'gamification');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { lastUpdated: _ignored, ...data } = docSnap.data() as GamificationData;
            logger.log('[Firestore] Gamification loaded');
            return data;
        }
        return null; // No data in Firestore
    } catch (error) {
        logger.error('[Firestore] Error loading gamification:', error);
        return null;
    }
}

// ADMIN: Manually update user gamification stats
export async function adminUpdateUserGamification(uid: string, level: number, xp: number): Promise<void> {
    try {
                const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
            level,
            xp
        });

                const gamificationDocRef = doc(db, 'users', uid, 'data', 'gamification');

        // Use setDoc with merge to ensure we don't overwrite other fields if they exist,
        // or create the doc if it doesn't exist
        await setDoc(gamificationDocRef, {
            level,
            xp,
            lastUpdated: Date.now()
        }, { merge: true });

        logger.log(`[Firestore] Admin updated gamification for ${uid}: Level ${level}, XP ${xp}`);
    } catch (error) {
        logger.error('[Firestore] Error updating user gamification:', error);
        throw error;
    }
}

// Sync local data to Firestore (for first-time sync)
export async function syncLocalDataToFirestore(
    userId: string,
    library: Work[],
    gamification: Omit<GamificationData, 'lastUpdated'>
): Promise<void> {
    // Check if user has data in Firestore
    const existingLibrary = await loadLibraryFromFirestore(userId);
    const existingGamification = await loadGamificationFromFirestore(userId);

    // If no Firestore data but local data exists, upload local data
    if (!existingLibrary && library.length > 0) {
        await saveLibraryToFirestore(userId, library);
        logger.log('[Firestore] Uploaded local library to cloud');
    }

    if (!existingGamification && (gamification.level > 1 || gamification.totalWorksAdded > 0)) {
        await saveGamificationToFirestore(userId, gamification);
        logger.log('[Firestore] Uploaded local gamification to cloud');
    }
}

// --- SOCIAL FEATURES ---

export interface Friend {
    uid: string;
    displayName: string;
    photoURL: string;
    status: 'pending' | 'accepted';
    direction?: 'incoming' | 'outgoing';
}

// Search user by email (for adding friends)
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

// Search user by exact display name
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

// Search users by display name prefix (for auto-completion)
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

// Get User Profile by UID
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

// Get Multiple User Profiles by UIDs (Batch fetch)
export async function getUserProfiles(uids: string[]): Promise<UserProfile[]> {
    try {
        if (!uids || uids.length === 0) return [];

        // Firestore 'in' query is limited to 30 items
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

// Subscribe to User Profile (Real-time)
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

// Send Friend Request (via Cloud Function)
export async function sendFriendRequest(_currentUserId: string, _currentUserData: { displayName: string, photoURL: string }, targetUser: UserProfile): Promise<void> {
    try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('./config');
        const sendFn = httpsCallable(functions, 'sendFriendRequestFn');
        await sendFn({ targetUserId: targetUser.uid });
        logger.log('[Firestore] Friend request sent via Cloud Function');
    } catch (error) {
        logger.error('[Firestore] Error sending friend request:', error);
        throw error;
    }
}

// Accept Friend Request (via Cloud Function)
export async function acceptFriendRequest(_currentUserId: string, friendUid: string): Promise<void> {
    try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('./config');
        const acceptFn = httpsCallable(functions, 'acceptFriendRequestFn');
        await acceptFn({ friendUid });
        logger.log('[Firestore] Friend request accepted via Cloud Function');
    } catch (error) {
        logger.error('[Firestore] Error accepting friend request:', error);
        throw error;
    }
}

// Reject/Remove Friend Request (via Cloud Function)
export async function rejectFriendRequest(_currentUserId: string, friendUid: string): Promise<void> {
    try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('./config');
        const rejectFn = httpsCallable(functions, 'rejectFriendRequestFn');
        await rejectFn({ friendUid });
        logger.log('[Firestore] Friend request rejected/removed via Cloud Function');
    } catch (error) {
        logger.error('[Firestore] Error rejecting friend request:', error);
        throw error;
    }
}

// Check friendship status between two users
export async function checkFriendship(userId1: string, userId2: string): Promise<'accepted' | 'pending' | 'none'> {
    try {
        const docRef = doc(db, 'users', userId1, 'friends', userId2);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().status || 'none';
        }
        return 'none';
    } catch (error) {
        logger.error('[Firestore] Error checking friendship:', error);
        return 'none';
    }
}

// Get Friends List
export async function getFriends(userId: string): Promise<Friend[]> {
    try {
        const q = query(collection(db, 'users', userId, 'friends'));
        const querySnapshot = await getDocs(q);
        const friends: Friend[] = [];
        querySnapshot.forEach((doc) => {
            friends.push({ uid: doc.id, ...doc.data() } as Friend);
        });
        return friends;
    } catch (error) {
        logger.error('[Firestore] Error loading friends:', error);
        return [];
    }
}

// Get Global Leaderboard
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getLeaderboard = async (limitCount = 10, _period: 'week' | 'month' | 'all-time' = 'all-time'): Promise<UserProfile[]> => {
    try {
        const q = query(
            collection(db, 'users'),
            orderBy('totalXp', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        return users;
    } catch (error) {
        logger.error('[Firestore] Error loading leaderboard:', error);
        return [];
    }
}

// ==================== ACTIVITY FEED FUNCTIONS ====================

// Log an activity event
// DEPRECATED: Activity logging is now handled server-side by onLibraryUpdate trigger.
// Firestore rules block client writes to /activities. This function is kept for reference.
export async function logActivity(): Promise<void> {
    logger.warn('[Firestore] logActivity is deprecated. Activities are now logged server-side.');
}

// Get activities from friends
export async function getFriendsActivity(userId: string, limitCount: number = 20, friendsList?: Friend[]): Promise<ActivityEvent[]> {
    try {
                let friends = friendsList;
        if (!friends) {
            friends = await getFriends(userId);
        }
        
        const friendIds = friends.filter(f => f.status === 'accepted').map(f => f.uid);
        if (friendIds.length === 0) return [];

                const allActivities: ActivityEvent[] = [];
        
        // Loop through friends in chunks of 30
        for (let i = 0; i < friendIds.length; i += 30) {
            const batch = friendIds.slice(i, i + 30);
            const q = query(
                collection(db, 'activities'),
                where('userId', 'in', batch),
                where('isVisible', '==', true),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );
            
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
                allActivities.push({ ...(doc.data() as ActivityEvent), id: doc.id });
            });
        }
        
                const sortedActivities = allActivities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limitCount);

                const activeUserIds = Array.from(new Set(sortedActivities.map(a => a.userId)));
        let freshProfiles: UserProfile[] = [];
        if (activeUserIds.length > 0) {
            freshProfiles = await getUserProfiles(activeUserIds);
        }

        const activities: ActivityEvent[] = sortedActivities.map(data => {
                        const profile = freshProfiles.find(p => p.uid === data.userId);
            if (profile) {
                data.userName = profile.displayName || data.userName;
                data.userPhoto = profile.photoURL || data.userPhoto;
            } else if (friendsList) {
                // If profiles failed for some reason, fallback to provided list
                const friend = friendsList.find(f => f.uid === data.userId);
                if (friend) {
                    data.userName = friend.displayName || data.userName;
                    data.userPhoto = friend.photoURL || data.userPhoto;
                }
            }
            
            return { ...data };
        });
        
        return activities;
    } catch (error) {
        // Silently handle permission errors during auth transitions (logout/deletion)
        const err = error as { code?: string };
        if (err.code === 'permission-denied') {
            return [];
        }
        logger.error('[Firestore] Error loading friends activity:', error);
        return [];
    }
}

// ==================== LIBRARY COMPARISON ====================

// Get user's library (for comparison)
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

// Compare two users' libraries
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

// ==================== ENHANCED LEADERBOARD ====================

export type LeaderboardPeriod = 'week' | 'month' | 'all';
export type LeaderboardCategory = 'xp' | 'chapters' | 'streak';

// Get filtered leaderboard
export async function getFilteredLeaderboard(
    category: LeaderboardCategory = 'xp',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _period: LeaderboardPeriod = 'all',
    limitCount: number = 10
): Promise<UserProfile[]> {
    try {
        // Map category to Firestore field
        const fieldMap: Record<LeaderboardCategory, string> = {
            'xp': 'totalXp', // Use totalXp for fair ranking
            'chapters': 'totalChaptersRead',
            'streak': 'streak'
        };

        const field = fieldMap[category];

        const q = query(
            collection(db, 'users'),
            orderBy(field, 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        return users;
    } catch (error) {
        logger.error('[Firestore] Error loading filtered leaderboard:', error);
        return [];
    }
}

// Get current user's rank for a specific category
export async function getUserRank(
    userId: string,
    category: LeaderboardCategory = 'xp'
): Promise<{ rank: number; profile: UserProfile } | null> {
    try {
        const fieldMap: Record<LeaderboardCategory, string> = {
            'xp': 'totalXp',
            'chapters': 'totalChaptersRead',
            'streak': 'streak'
        };
        const field = fieldMap[category];

        // Get user profile
        const userDocSnap = await getDoc(doc(db, 'users', userId));
        if (!userDocSnap.exists()) return null;
        const userProfile = { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
        const userScore = (userProfile[field as keyof UserProfile] as number) || 0;

        // Run both rank queries in parallel
        const qHigher = query(collection(db, 'users'), where(field, '>', userScore));
        const qEqual = query(collection(db, 'users'), where(field, '==', userScore));

        const [higherSnapshot, equalSnapshot] = await Promise.all([
            getAggregateFromServer(qHigher, { count: count() }),
            getDocs(qEqual)
        ]);

        const higherCount = higherSnapshot.data().count || 0;
        let tiesBefore = 0;
        equalSnapshot.forEach((docSnap) => {
            if (docSnap.id < userId) tiesBefore++;
        });

        const rank = higherCount + tiesBefore + 1;

        return { rank, profile: userProfile };
    } catch (error) {
        logger.error('[Firestore] Error getting user rank:', error);
        return null;
    }
}

// ==================== COMMENTS SYSTEM ====================

// Add a comment to a work
export async function addComment(comment: Omit<Comment, 'id' | 'timestamp' | 'likes'>): Promise<string | null> {
    try {
        const commentRef = await addDoc(collection(db, 'comments'), {
            ...comment,
            timestamp: Date.now(),
            likes: []
        });
        logger.log('[Firestore] Comment added:', commentRef.id);
        return commentRef.id;
    } catch (error) {
        logger.error('[Firestore] Error adding comment:', error);
        return null;
    }
}

// Get comments for a work
export async function getComments(workId: number, limitCount: number = 50): Promise<Comment[]> {
    try {
        const q = query(
            collection(db, 'comments'),
            where('workId', '==', workId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const comments: Comment[] = [];
        querySnapshot.forEach((doc) => {
            comments.push({ id: doc.id, ...doc.data() } as Comment);
        });
        return comments;
    } catch (error) {
        logger.error('[Firestore] Error loading comments:', error);
        return [];
    }
}

// Get comments organized with replies
// Get comments organized with replies (Recursive)
export async function getCommentsWithReplies(workId: number): Promise<CommentWithReplies[]> {
    const allComments = await getComments(workId, 50);

    // Helper to build tree
    const buildTree = (comments: Comment[], parentId: string | undefined): CommentWithReplies[] => {
        return comments
            .filter(c => c.replyTo === parentId) // Find direct children
            .sort((a, b) => a.timestamp - b.timestamp) // Oldest first
            .map(c => ({
                ...c,
                replies: buildTree(comments, c.id) // Recursively find children of this child
            }));
    };

    // Start with top-level comments (replyTo is undefined or null or empty)
    const topLevel = allComments
        .filter(c => !c.replyTo)
        .sort((a, b) => b.timestamp - a.timestamp); // Newest top-level first

    return topLevel.map(c => ({
        ...c,
        replies: buildTree(allComments, c.id)
    }));
}

// Like/unlike a comment
export async function toggleCommentLike(commentId: string, userId: string): Promise<void> {
    try {
        const commentRef = doc(db, 'comments', commentId);
        const commentSnap = await getDoc(commentRef);

        if (commentSnap.exists()) {
            const comment = commentSnap.data() as Comment;
            const likes = comment.likes || [];

            if (likes.includes(userId)) {
                await updateDoc(commentRef, { likes: likes.filter(id => id !== userId) });
            } else {
                await updateDoc(commentRef, { likes: [...likes, userId] });
            }
        }
    } catch (error) {
        logger.error('[Firestore] Error toggling comment like:', error);
    }
}

// ==================== CHALLENGES SYSTEM ====================

export async function createChallenge(challenge: Omit<Challenge, 'id'>): Promise<string | null> {
    try {
        const challengeRef = await addDoc(collection(db, 'challenges'), challenge);
        logger.log('[Firestore] Challenge created:', challengeRef.id);
        return challengeRef.id;
    } catch (error) {
        logger.error('[Firestore] Error creating challenge:', error);
        return null;
    }
}

// Get user's challenges
export async function getUserChallenges(userId: string): Promise<Challenge[]> {
    try {
        const q = query(
            collection(db, 'challenges'),
            where('participantIds', 'array-contains', userId)
        );

        const querySnapshot = await getDocs(q);
        const challenges: Challenge[] = [];
        querySnapshot.forEach((doc) => {
            challenges.push({ id: doc.id, ...doc.data() } as Challenge);
        });
        return challenges;
    } catch (error) {
        logger.error('[Firestore] Error loading challenges:', error);
        return [];
    }
}

// Update challenge progress
export async function updateChallengeProgress(challengeId: string, participantId: string, progress: number): Promise<void> {
    try {
        const challengeRef = doc(db, 'challenges', challengeId);
        const challengeSnap = await getDoc(challengeRef);

        if (challengeSnap.exists()) {
            const challenge = challengeSnap.data() as Challenge;
            const participants = challenge.participants.map(p =>
                p.id === participantId ? { ...p, progress } : p
            );
            await updateDoc(challengeRef, { participants });
        }
    } catch (error) {
        logger.error('[Firestore] Error updating challenge progress:', error);
    }
}

// ==================== FRIEND RECOMMENDATIONS ====================

// Get how many friends are reading a specific work
export async function getFriendsReadingWork(userId: string, workId: number): Promise<{ count: number; friends: { profile: UserProfile; work: Work }[] }> {
    try {
        const friends = await getFriends(userId);
        const acceptedFriends = friends.filter(f => f.status === 'accepted');

        // We'll limit to a manageable number for performance on this quick-fetch
        const friendSlice = acceptedFriends.slice(0, 15);

        // Batch fetch all libraries and profiles in parallel
        const [libraries, profiles] = await Promise.all([
            Promise.all(friendSlice.map(f => getUserLibrary(f.uid))),
            Promise.all(friendSlice.map(f => getUserProfile(f.uid)))
        ]);

        const friendsData = friendSlice
            .map((_, i) => {
                const friendWork = libraries[i]?.find(w => Number(w.id) === workId);
                const profile = profiles[i];
                if (friendWork && profile) {
                    return { profile, work: friendWork };
                }
                return null;
            })
            .filter((item): item is { profile: UserProfile; work: Work } => item !== null);

        return { count: friendsData.length, friends: friendsData };
    } catch (error) {
        logger.error('[Firestore] Error getting friends reading work:', error);
        return { count: 0, friends: [] };
    }
}

// ==================== WATCH PARTY FUNCTIONS ====================

import type { WatchParty, PartyParticipant } from '@/types/watchparty';

// Create a watch party
export async function createWatchParty(party: Omit<WatchParty, 'id'>): Promise<string> {
    try {
        const partyRef = doc(collection(db, 'watchparties'));
        const partyData: WatchParty = {
            ...party,
            id: partyRef.id
        };
        await setDoc(partyRef, partyData);
        logger.log('[Firestore] Watch party created:', partyData.id);
        return partyRef.id;
    } catch (error) {
        logger.error('[Firestore] Error creating watch party:', error);
        throw error;
    }
}

// Get user's watch parties
export async function getUserWatchParties(userId: string): Promise<WatchParty[]> {
    try {
        // Get parties where user is host or participant
        const hostQuery = query(
            collection(db, 'watchparties'),
            where('hostId', '==', userId),
            orderBy('lastActivity', 'desc')
        );
        const hostSnap = await getDocs(hostQuery);

        const parties: WatchParty[] = hostSnap.docs.map(doc => doc.data() as WatchParty);

                const allParties = query(
            collection(db, 'watchparties'),
            where('status', '==', 'active'),
            orderBy('lastActivity', 'desc'),
            limit(50)
        );
        const allSnap = await getDocs(allParties);

        allSnap.docs.forEach(doc => {
            const party = doc.data() as WatchParty;
            if (party.participants.some(p => p.id === userId) && !parties.find(p => p.id === party.id)) {
                parties.push(party);
            }
        });

        return parties.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (error) {
        logger.error('[Firestore] Error getting user watch parties:', error);
        return [];
    }
}

// Join a watch party
export async function joinWatchParty(partyId: string, participant: PartyParticipant): Promise<void> {
    try {
        const partyRef = doc(db, 'watchparties', partyId);
        const partySnap = await getDoc(partyRef);

        if (!partySnap.exists()) throw new Error('Party not found');

        const party = partySnap.data() as WatchParty;
        if (!party.participants.find(p => p.id === participant.id)) {
            await updateDoc(partyRef, {
                participants: [...party.participants, participant],
                lastActivity: Date.now()
            });
        }
        logger.log('[Firestore] Joined watch party:', partyId);
    } catch (error) {
        logger.error('[Firestore] Error joining watch party:', error);
        throw error;
    }
}

// Update party progress
export async function updateWatchPartyProgress(partyId: string, newEpisode: number): Promise<void> {
    try {
        await updateDoc(doc(db, 'watchparties', partyId), {
            currentEpisode: newEpisode,
            lastActivity: Date.now()
        });
    } catch (error) {
        logger.error('[Firestore] Error updating party progress:', error);
    }
}

// ==================== CHALLENGE INVITATION SYSTEM ====================

// Accept challenge invitation
export async function acceptChallengeInvitation(challengeId: string, participantId: string): Promise<void> {
    try {
        const challengeRef = doc(db, 'challenges', challengeId);
        const challengeSnap = await getDoc(challengeRef);

        if (challengeSnap.exists()) {
            const challenge = challengeSnap.data() as Challenge;
            const participants = challenge.participants.map(p =>
                p.id === participantId ? { ...p, status: 'accepted' as const } : p
            );

            // Check if all participants have accepted
            const allAccepted = participants.every(p => p.status === 'accepted');

            await updateDoc(challengeRef, {
                participants,
                status: allAccepted ? 'active' : 'pending'
            });
            logger.log('[Firestore] Challenge invitation accepted');
        }
    } catch (error) {
        logger.error('[Firestore] Error accepting challenge:', error);
        throw error;
    }
}

// Decline challenge invitation
export async function declineChallengeInvitation(challengeId: string, participantId: string): Promise<void> {
    try {
        const challengeRef = doc(db, 'challenges', challengeId);
        const challengeSnap = await getDoc(challengeRef);

        if (challengeSnap.exists()) {
            const challenge = challengeSnap.data() as Challenge;
            const participants = challenge.participants.map(p =>
                p.id === participantId ? { ...p, status: 'declined' as const } : p
            );
            const participantIds = challenge.participantIds.filter(id => id !== participantId);

            await updateDoc(challengeRef, { participants, participantIds });
            logger.log('[Firestore] Challenge invitation declined');
        }
    } catch (error) {
        logger.error('[Firestore] Error declining challenge:', error);
        throw error;
    }
}

// Cancel/End a challenge (only creator can do this)
export async function cancelChallenge(challengeId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'challenges', challengeId), {
            status: 'cancelled',
            endDate: Date.now()
        });
        logger.log('[Firestore] Challenge cancelled');
    } catch (error) {
        logger.error('[Firestore] Error cancelling challenge:', error);
        throw error;
    }
}

// Complete a challenge
export async function completeChallenge(challengeId: string, winnerId?: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'challenges', challengeId), {
            status: 'completed',
            endDate: Date.now(),
            winnerId: winnerId || null
        });
        logger.log('[Firestore] Challenge completed');
    } catch (error) {
        logger.error('[Firestore] Error completing challenge:', error);
        throw error;
    }
}

// ==================== WATCH PARTY CONTROLS ====================

// End a watch party (only host can do this)
export async function endWatchParty(partyId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'watchparties', partyId), {
            status: 'completed',
            lastActivity: Date.now()
        });
        logger.log('[Firestore] Watch party ended');
    } catch (error) {
        logger.error('[Firestore] Error ending watch party:', error);
        throw error;
    }
}

// Leave a watch party (for participants)
export async function leaveWatchParty(partyId: string, participantId: string): Promise<void> {
    try {
        const partyRef = doc(db, 'watchparties', partyId);
        const partySnap = await getDoc(partyRef);

        if (partySnap.exists()) {
            const party = partySnap.data() as WatchParty;
            const participants = party.participants.filter(p => p.id !== participantId);

            await updateDoc(partyRef, {
                participants,
                lastActivity: Date.now()
            });
            logger.log('[Firestore] Left watch party');
        }
    } catch (error) {
        logger.error('[Firestore] Error leaving watch party:', error);
        throw error;
    }
}
// ==================== FEEDBACK SYSTEM ====================

export interface AdminResponse {
    adminId: string;
    adminName: string;
    message: string;
    timestamp: number;
}

export interface FeedbackData {
    id: string;
    rating: number; // 1-10
    category: 'bug' | 'feature' | 'general';
    message: string;
    userId?: string;
    userName?: string; // Optional if guest
    contactEmail?: string; // Optional for guests
    timestamp: number;
    userAgent: string;
    // Enhanced fields
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    attachments: string[]; // Storage URLs
    adminResponses: AdminResponse[];
    lastUpdated: number;
}

export async function submitFeedback(feedback: Omit<FeedbackData, 'id' | 'timestamp' | 'status' | 'adminResponses' | 'lastUpdated'> & { attachments?: string[], priority?: FeedbackData['priority'] }): Promise<string | null> {
    try {
        const now = Date.now();
        const feedbackRef = await addDoc(collection(db, 'feedback'), {
            ...feedback,
            timestamp: now,
            lastUpdated: now,
            status: 'open',
            priority: feedback.priority || 'medium',
            attachments: feedback.attachments || [],
            adminResponses: []
        });
        logger.log('[Firestore] Feedback submitted:', feedbackRef.id);
        return feedbackRef.id;
    } catch (error) {
        logger.error('[Firestore] Error submitting feedback:', error);
        return null;
    }
}

export async function getAllFeedback(): Promise<FeedbackData[]> {
    try {
        const q = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as FeedbackData));
    } catch (error) {
        logger.error('[Firestore] Error getting feedback:', error);
        return [];
    }
}

// Get feedback for a specific user (ticket tracking)
export async function getUserFeedback(userId: string): Promise<FeedbackData[]> {
    try {
        const q = query(
            collection(db, 'feedback'),
            where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const feedback = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as FeedbackData));
        return feedback.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        logger.error('[Firestore] Error getting user feedback:', error);
        return [];
    }
}

// Get a single feedback by ID
export async function getFeedbackById(feedbackId: string): Promise<FeedbackData | null> {
    try {
        const docRef = doc(db, 'feedback', feedbackId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as unknown as FeedbackData;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error getting feedback by ID:', error);
        return null;
    }
}

// Add admin response to feedback
export async function addAdminResponse(feedbackId: string, response: Omit<AdminResponse, 'timestamp'>): Promise<boolean> {
    try {
        const docRef = doc(db, 'feedback', feedbackId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return false;

        const currentResponses = (docSnap.data() as FeedbackData).adminResponses || [];
        const newResponse: AdminResponse = {
            ...response,
            timestamp: Date.now()
        };

        await updateDoc(docRef, {
            adminResponses: [...currentResponses, newResponse],
            lastUpdated: Date.now(),
            status: 'in_progress' // Auto-update status when admin responds
        });

        logger.log('[Firestore] Admin response added to feedback:', feedbackId);
        return true;
    } catch (error) {
        logger.error('[Firestore] Error adding admin response:', error);
        return false;
    }
}

// Update feedback status and/or priority
export async function updateFeedbackDetails(
    feedbackId: string,
    updates: { status?: FeedbackData['status']; priority?: FeedbackData['priority'] }
): Promise<boolean> {
    try {
        await updateDoc(doc(db, 'feedback', feedbackId), {
            ...updates,
            lastUpdated: Date.now()
        });
        logger.log('[Firestore] Feedback updated:', feedbackId, updates);
        return true;
    } catch (error) {
        logger.error('[Firestore] Error updating feedback:', error);
        return false;
    }
}


export async function deleteUserData(userId: string): Promise<void> {
    try {
        // We use individual deletions or batch for safety
        // Delete user libraries
        await deleteDoc(doc(db, 'users', userId, 'data', 'library'));

        // Delete user gamification
        await deleteDoc(doc(db, 'users', userId, 'data', 'gamification'));

        // Delete activities related to user
        const activitiesQuery = query(collection(db, 'activities'), where('userId', '==', userId));
        const activitiesSnap = await getDocs(activitiesQuery);
        const activityDeletions = activitiesSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(activityDeletions);

        // Delete tier lists related to user
        const tierListsQuery = query(collection(db, 'tierLists'), where('userId', '==', userId));
        const tierListsSnap = await getDocs(tierListsQuery);
        const tierListDeletions = tierListsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(tierListDeletions);

        // Delete comments related to user
        const commentsQuery = query(collection(db, 'comments'), where('userId', '==', userId));
        const commentsSnap = await getDocs(commentsQuery);
        const commentDeletions = commentsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(commentDeletions);

        // Delete watch parties created by user
        const partiesQuery = query(collection(db, 'watchparties'), where('creatorId', '==', userId));
        const partiesSnap = await getDocs(partiesQuery);
        const partyDeletions = partiesSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(partyDeletions);

        // Delete subcollections manually (Firestore doesn't auto-delete subcollections)
        const subcollections = ['friends', 'notifications'];
        for (const sub of subcollections) {
            const snap = await getDocs(collection(db, 'users', userId, sub));
            const deletions = snap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletions);
        }

        // Delete Storage assets
        try {
            await deleteUserStorage(userId);
        } catch (storageError) {
            logger.error('[Firestore] Error cleaning up storage during deletion:', storageError);
            // Non-critical, continue
        }

        // Delete user profile (Delete this last)
        await deleteDoc(doc(db, 'users', userId));

        logger.log('[Firestore] All user data deleted for:', userId);
    } catch (error) {
        logger.error('[Firestore] Error deleting user data:', error);
        throw error;
    }
}

// ==================== ADMIN DASHBOARD FUNCTIONS ====================

// Get system stats for dashboard (High Performance with Aggregates)
export async function getAdminStats() {
    try {
        const now = Date.now();
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        // Optimized counts using Firestore Aggregates (1 read per count instead of 1 read per doc)
        const [
            totalUsersSnap, totalFeedbackSnap, totalSurveySnap,
            dauSnap, wauSnap, mauSnap, newUsersTodaySnap,
            pendingFeedbackSnap
        ] = await Promise.all([
            getAggregateFromServer(collection(db, 'users'), { count: count() }),
            getAggregateFromServer(collection(db, 'feedback'), { count: count() }),
            getAggregateFromServer(collection(db, 'survey_responses'), { count: count() }),
            getAggregateFromServer(query(collection(db, 'users'), where('lastLogin', '>=', twentyFourHoursAgo)), { count: count() }),
            getAggregateFromServer(query(collection(db, 'users'), where('lastLogin', '>=', sevenDaysAgo)), { count: count() }),
            getAggregateFromServer(query(collection(db, 'users'), where('lastLogin', '>=', thirtyDaysAgo)), { count: count() }),
            getAggregateFromServer(query(collection(db, 'users'), where('createdAt', '>=', startOfDay)), { count: count() }),
            getAggregateFromServer(query(collection(db, 'feedback'), where('status', 'in', ['open', 'in_progress'])), { count: count() })
        ]);

        const totalUsers = totalUsersSnap.data().count;
        const wau = wauSnap.data().count;
        const engagementRate = totalUsers > 0 ? (wau / totalUsers) * 100 : 0;

        return {
            totalUsers,
            totalFeedback: totalFeedbackSnap.data().count,
            totalSurveyResponses: totalSurveySnap.data().count,
            newUsersToday: newUsersTodaySnap.data().count,
            pendingFeedback: pendingFeedbackSnap.data().count,
            dau: dauSnap.data().count,
            wau,
            mau: mauSnap.data().count,
            engagementRate
        };
    } catch (error) {
        logger.error('[Firestore] Error getting optimized admin stats:', error);
        return {
            totalUsers: 0, totalFeedback: 0, totalSurveyResponses: 0,
            newUsersToday: 0, pendingFeedback: 0,
            dau: 0, wau: 0, mau: 0, engagementRate: 0
        };
    }
}

// Get recent health history for sparklines
export async function getHealthHistory(maxEntries = 20) {
    try {
        const q = query(
            collection(db, 'admin_health_history'), 
            orderBy('timestamp', 'desc'), 
            limit(maxEntries)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            // Convert Firestore Timestamp to JS number for compatibility
            timestamp: d.data().timestamp?.toMillis?.() || Date.now()
        })).reverse(); // Order chronically for the chart
    } catch (error) {
        logger.error('[Firestore] Error getting health history:', error);
        return [];
    }
}

// Get all users for admin table
export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
        logger.error('[Firestore] Error getting all users:', error);
        return [];
    }
}

// Get recent members sorted by creation date (newest first)
export async function getRecentMembers(count = 10): Promise<UserProfile[]> {
    try {
        // First try ordering by createdAt
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(count));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

        // If some users don't have createdAt, they might be missing. 
        // We'll filter but realistically most should have it.
        return users;
    } catch (error) {
        logger.error('[Firestore] Error getting recent members by createdAt:', error);
        // Fallback to lastLogin for older users
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(count));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    }
}

// Toggle User Ban Status
export async function toggleUserBan(uid: string, isBanned: boolean): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', uid), { isBanned });
        logger.log(`[Firestore] User ${uid} ban status set to ${isBanned}`);
    } catch (error) {
        logger.error('[Firestore] Error toggling user ban:', error);
        throw error;
    }
}

// Toggle User Admin Status
export async function toggleUserAdmin(uid: string, isAdmin: boolean): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', uid), { isAdmin });
        logger.log(`[Firestore] User ${uid} admin status set to ${isAdmin}`);
    } catch (error) {
        logger.error('[Firestore] Error toggling user admin:', error);
        throw error;
    }
}

// Update Feedback Status (Replaced by updateFeedbackDetails in enhanced system)
// Keeping for backward compatibility but redirecting to new function
export async function updateFeedbackStatus(id: string, status: 'resolved' | 'open'): Promise<void> {
    await updateFeedbackDetails(id, { status: status === 'resolved' ? 'resolved' : 'open' });
}

// Delete Feedback
export async function deleteFeedback(id: string): Promise<void> {
    try {
        const { deleteFeedbackImages } = await import('./storage');
        // Delete images first
        await deleteFeedbackImages(id);
        // Then delete doc
        await deleteDoc(doc(db, 'feedback', id));
    } catch (error) {
        logger.error('[Firestore] Error deleting feedback:', error);
        throw error;
    }
}

// Stats Aggregation for Chart
export async function getSevenDayActivityStats() {
    try {
        // Fetch last 500 activities to get a good sample size
        const q = query(
            collection(db, 'activities'),
            orderBy('timestamp', 'desc'),
            limit(500)
        );
        const snapshot = await getDocs(q);
        const activities = snapshot.docs.map(doc => doc.data() as ActivityEvent);

        // Group by day
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const statsMap = new Map<string, { name: string, active: number, new: number, activities: number, index: number }>();

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = days[d.getDay()];
            statsMap.set(dayName, { name: dayName, active: 0, new: 0, activities: 0, index: 6 - i });
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startTime = sevenDaysAgo.getTime();

        // Fetch new users in last 7 days
        const usersQuery = query(
            collection(db, 'users'),
            where('createdAt', '>=', startTime)
        );
        const usersSnap = await getDocs(usersQuery);
        const newUsers = usersSnap.docs.map(doc => doc.data() as UserProfile);

        activities.forEach(act => {
            const date = new Date(act.timestamp);
            const dayName = days[date.getDay()];

            if (date > sevenDaysAgo && statsMap.has(dayName)) {
                const stat = statsMap.get(dayName)!;
                stat.activities += 1;
                // Active users estimation: increment active for each unique activity user per day
                // Count activities as 'active' volume
                stat.active += 1;
            }
        });

        // Add real new user counts
        newUsers.forEach(u => {
            const date = new Date(u.createdAt || 0);
            const dayName = days[date.getDay()];
            if (statsMap.has(dayName)) {
                statsMap.get(dayName)!.new += 1;
            }
        });

        // Convert to array and sort by logical order (today is last)
        // Since we iterated 6..0, the map insertions might not be ordered if we just .values().
        // We added an index. Rely on the map initialization order or sort.
        // Create the array based on the last 7 days logic again.
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = days[d.getDay()];
            result.push(statsMap.get(dayName));
        }

        return result;

    } catch (error) {
        logger.error('Error fetching chart stats:', error);
        return [];
    }
}

// Get detailed engagement breakdown
export async function getEngagementBreakdown(daysCount = 7): Promise<EngagementBreakdown> {

    try {
        const startTime = Date.now() - (daysCount * 24 * 60 * 60 * 1000);
        const q = query(
            collection(db, 'activities'),
            where('timestamp', '>=', startTime)
        );
        const snapshot = await getDocs(q);
        const activities = snapshot.docs.map(doc => doc.data() as ActivityEvent);

        const breakdown = {
            watch: activities.filter(a => a.type === 'watch').length,
            read: activities.filter(a => a.type === 'read').length,
            add_work: activities.filter(a => a.type === 'add_work').length,
            level_up: activities.filter(a => a.type === 'level_up').length,
            badge: activities.filter(a => a.type === 'badge').length,
            complete: activities.filter(a => a.type === 'complete').length,
        };

        return breakdown;
    } catch (error) {
        logger.error('[Firestore] Error getting engagement breakdown:', error);
        return { watch: 0, read: 0, add_work: 0, level_up: 0, badge: 0, complete: 0 };
    }
}

// Get Top Content from activities
export async function getTopContentStats(limitCount = 5, daysCount = 30): Promise<ContentStat[]> {

    try {
        const startTime = Date.now() - (daysCount * 24 * 60 * 60 * 1000);
                // without composite indexes.
        const q = query(
            collection(db, 'activities'),
            where('timestamp', '>=', startTime)
        );
        const snapshot = await getDocs(q);
        const counts: Record<string, { title: string, count: number, id: number, image?: string }> = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data() as ActivityEvent;
            // Only count target types
            if (['add_work', 'watch', 'read', 'complete'].includes(data.type)) {
                // Determine title/id even if missing from activity (fallback to activity info)
                const workId = data.workId?.toString();
                const workTitle = data.workTitle || 'Unknow Work';

                if (workId) {
                    if (!counts[workId]) {
                        counts[workId] = { title: workTitle, count: 0, id: Number(workId), image: data.workImage };
                    }
                    counts[workId].count += 1;
                }
            }
        });

        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, limitCount);
    } catch (error) {
        logger.error('[Firestore] Error getting top content stats:', error);
        return [];
    }
}

// Get Funnel Stats (Simplified)
export async function getFunnelStats(): Promise<FunnelStep[]> {

    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const total = usersSnap.size;

        // Steps:
        // 1. Registered (Total)
                // 3. Updated progress
        // 4. Social (Friend or Comment)

        const activitiesSnap = await getDocs(collection(db, 'activities'));
        const activities = activitiesSnap.docs.map(d => d.data() as ActivityEvent);
        const userIdsWithActivity = new Set(activities.map(a => a.userId));

        const usersWithAdd = new Set(activities.filter(a => a.type === 'add_work').map(a => a.userId));
        const usersWithProgress = new Set(activities.filter(a => ['watch', 'read', 'complete'].includes(a.type)).map(a => a.userId));

        return [
            { name: 'Inscription', value: total },
            { name: 'Ajout Premier Work', value: usersWithAdd.size },
            { name: 'Mise à jour Progression', value: usersWithProgress.size },
            { name: 'Engagement Actif', value: userIdsWithActivity.size }
        ];
    } catch (error) {
        logger.error('[Firestore] Error getting funnel stats:', error);
        return [];
    }
}

// Get historical trends for various metrics
export async function getHistoricalTrends(daysCount = 30): Promise<HistoricalTrend[]> {

    try {
        const now = Date.now();
        const startTime = now - (daysCount * 24 * 60 * 60 * 1000);

        // Fetch activities and users from the period
        // For performance in large datasets, we should use pagination or better indexing,
        // but for < 1000 users this is acceptable.
        const activitiesQuery = query(
            collection(db, 'activities'),
            where('timestamp', '>=', startTime),
            orderBy('timestamp', 'asc')
        );
        const usersQuery = query(
            collection(db, 'users'),
            where('createdAt', '>=', startTime),
            orderBy('createdAt', 'asc')
        );

        const [activitiesSnap, usersSnap] = await Promise.all([
            getDocs(activitiesQuery),
            getDocs(usersQuery)
        ]);

        const activities = activitiesSnap.docs.map(d => d.data() as ActivityEvent);
        const users = usersSnap.docs.map(d => d.data() as UserProfile);

        // Group by day
        const dailyData: Record<string, { date: string, inscriptions: number, activities: number, activeUsers: number, uniqueUsers: Set<string> }> = {};

                for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            dailyData[dateStr] = { date: dateStr, inscriptions: 0, activities: 0, activeUsers: 0, uniqueUsers: new Set() };
        }

        users.forEach(u => {
            const dateStr = new Date(u.createdAt || 0).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (dailyData[dateStr]) dailyData[dateStr].inscriptions += 1;
        });

        activities.forEach(a => {
            const dateStr = new Date(a.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (dailyData[dateStr]) {
                dailyData[dateStr].activities += 1;
                dailyData[dateStr].uniqueUsers.add(a.userId);
            }
        });

        return Object.values(dailyData).map(day => ({
            date: day.date,
            inscriptions: day.inscriptions,
            activities: day.activities,
            activeUsers: day.uniqueUsers.size
        }));
    } catch (error) {
        logger.error('[Firestore] Error getting historical trends:', error);
        return [];
    }
}

// ==================== ADMIN REAL-TIME CONSOLE ====================

// Get all activities (for admin console)
export async function getAllActivities(limitCount: number = 50): Promise<ActivityEvent[]> {
    try {
        const q = query(
            collection(db, 'activities'),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as ActivityEvent);
    } catch (error) {
        logger.error('[Firestore] Error getting all activities:', error);
        return [];
    }
}

// ==================== GLOBAL CONFIG / ANNOUNCEMENTS ====================

export interface GlobalConfig {
    announcement: {
        message: string;
        active: boolean;
        type: 'info' | 'warning' | 'alert';
        lastUpdated: number;
    };
    maintenance: boolean;
    registrationsOpen: boolean;
}

export async function getGlobalConfig(): Promise<GlobalConfig | null> {
    try {
        const docRef = doc(db, 'config', 'global');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as GlobalConfig : null;
    } catch (error) {
        logger.error('[Firestore] Error getting global config:', error);
        return null;
    }
}

export async function setGlobalAnnouncement(message: string, type: 'info' | 'warning' | 'alert', active: boolean): Promise<void> {
    try {
        await setDoc(doc(db, 'config', 'global'), {
            announcement: {
                message,
                type,
                active,
                lastUpdated: Date.now()
            }
        }, { merge: true });
        logger.log('[Firestore] Announcement updated');
    } catch (error) {
        logger.error('[Firestore] Error setting announcement:', error);
        throw error;
    }
}

export async function setGlobalConfig(config: Partial<Omit<GlobalConfig, 'announcement'>>): Promise<void> {
    try {
        await setDoc(doc(db, 'config', 'global'), config, { merge: true });
        logger.log('[Firestore] Global config updated');
    } catch (error) {
        logger.error('[Firestore] Error setting config:', error);
        throw error;
    }
}
// Subscribe to global config updates (Real-time)
export function subscribeToGlobalConfig(callback: (config: GlobalConfig | null) => void): () => void {
    const docRef = doc(db, 'config', 'global');
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as GlobalConfig);
        } else {
            callback(null);
        }
    }, (error) => {
        logger.error('[Firestore] Error subscribing to global config:', error);
        callback(null);
    });
}

// ==================== TIER LIST FUNCTIONS ====================

export interface TierList {
    id: string;
    userId: string;
    authorName: string;
    authorPhoto?: string;
    title: string;
    description?: string;
    category: 'anime' | 'manga' | 'characters';
    likes: string[]; // Array of user IDs
    createdAt: number;
    isPublic: boolean;
    tiers: {
        id: string; // Unique ID for dnd-kit
        label: string;
        color: string;
        items: {
            id: number | string; // MAL ID for characters, "work-{id}" for anime/manga items
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
            createdAt: Date.now()
        });
        logger.log('[Firestore] Tier list created:', docRef.id);
        return docRef.id;
    } catch (error) {
        logger.error('[Firestore] Error creating tier list:', error);
        throw error;
    }
}

// Get a specific tier list
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

// Get public tier lists (feed) with pagination and filtering
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

        // Sorting based on filter
        if (filter === 'popular') {
            q = query(q, orderBy('likesCount', 'desc'), orderBy('createdAt', 'desc'));
        } else if (filter === 'trending') {
            // Trending could be a mix of likes and recency, for now just high likes among recent
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

// Get user's tier lists
export async function getUserTierLists(userId: string): Promise<TierList[]> {
    try {
        const q = query(
            collection(db, 'tierLists'),
            where('userId', '==', userId),
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

// Get user's tier lists count (optimized)
export async function getUserTierListsCount(userId: string): Promise<number> {
    try {
        const q = query(
            collection(db, 'tierLists'),
            where('userId', '==', userId)
        );
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        logger.error('[Firestore] Error getting user tier lists count:', error);
        return 0;
    }
}

// Delete a tier list
export async function deleteTierList(listId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'tierLists', listId));
        logger.log('[Firestore] Tier list deleted:', listId);
    } catch (error) {
        logger.error('[Firestore] Error deleting tier list:', error);
        throw error;
    }
}

// Toggle like on a tier list
export async function toggleTierListLike(listId: string, userId: string): Promise<void> {
    try {
        const listRef = doc(db, 'tierLists', listId);
        const listSnap = await getDoc(listRef);

        if (listSnap.exists()) {
            const list = listSnap.data() as TierList;
            const likes = list.likes || [];

            if (likes.includes(userId)) {
                await updateDoc(listRef, { likes: likes.filter(id => id !== userId) });
            } else {
                await updateDoc(listRef, { likes: [...likes, userId] });
            }
        }
    } catch (error) {
        logger.error('[Firestore] Error toggling tier list like:', error);
    }
}

// --- DEPLOYMENTS ---

export interface DeploymentEvent {
    id: string;
    channelId: string;
    url: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    type: 'preview' | 'live';
    status: 'active' | 'expired';
}


export async function getDeployments(limitCount = 10): Promise<DeploymentEvent[]> {
    try {
        const q = query(
            collection(db, 'deployments'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as DeploymentEvent));
    } catch (error) {
        logger.error('[Firestore] Error fetching deployments:', error);
        return [];
    }
}

// ==================== SURVEY DASHBOARD ====================

export interface SurveyResponse {
    id: string;
    surveyId: string;
    answers: Record<string, unknown>;
    submittedAt: number;
    userAgent: string;
    language: string;
}


export async function getSurveyResponses(): Promise<SurveyResponse[]> {
    try {
        const q = query(collection(db, 'survey_responses'), orderBy('submittedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SurveyResponse));
    } catch (error) {
        logger.error('[Firestore] Error getting survey responses:', error);
        return [];
    }
}

export async function deleteSurveyResponse(id: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'survey_responses', id));
        logger.log('[Firestore] Survey response deleted:', id);
    } catch (error) {
        logger.error('[Firestore] Error deleting survey response:', error);
        throw error;
    }
}

