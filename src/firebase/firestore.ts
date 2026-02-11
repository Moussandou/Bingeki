import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc, deleteDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import type { Work, Folder } from '@/store/libraryStore';
import type { Badge } from '@/types/badge';
import type { FavoriteCharacter } from '@/types/character';
import type { ActivityEvent } from '@/types/activity';
export type { ActivityEvent };
import type { Comment, CommentWithReplies } from '@/types/comment';
import type { Challenge } from '@/types/challenge';
import { mergeGamificationData, mergeLibraryData, validateGamificationWrite, logDataBackup } from '@/utils/dataProtection';

// Types for Firestore data
interface LibraryData {
    works: Work[];
    folders?: Folder[];
    lastUpdated: number;
    version?: number;
}

interface GamificationData {
    level: number;
    xp: number;
    xpToNextLevel: number;
    streak: number;
    lastActivityDate: string | null;
    badges: Badge[];
    totalChaptersRead: number;
    totalAnimeEpisodesWatched: number;
    totalMoviesWatched: number;
    totalWorksAdded: number;
    totalWorksCompleted: number;
    lastUpdated: number;
    version?: number;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastLogin: number;
    xp?: number;
    level?: number;
    streak?: number;
    badges?: { id: string; name: string; description: string; icon: string; rarity: string; unlockedAt?: number }[];
    totalChaptersRead?: number;
    totalAnimeEpisodesWatched?: number;
    totalMoviesWatched?: number;
    totalWorksAdded?: number;
    totalWorksCompleted?: number;
    banner?: string;
    bio?: string;
    themeColor?: string;
    cardBgColor?: string;
    borderColor?: string;
    favoriteManga?: string;
    top3Favorites?: string[];
    favoriteCharacters?: FavoriteCharacter[];
    featuredBadge?: string;
    isAdmin?: boolean;
    isBanned?: boolean;
    createdAt?: number; // Added for new user stats
}

// Save user profile to Firestore
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

        // List of allowed fields to sync
        const allowedFields: (keyof UserProfile)[] = [
            'uid', 'email', 'displayName', 'photoURL', 'banner', 'bio',
            'themeColor', 'cardBgColor', 'borderColor',
            'favoriteManga', 'top3Favorites', 'featuredBadge',
            'favoriteCharacters'
        ];

        allowedFields.forEach(field => {
            // Prevent overwriting custom profile data with Auth provider data on subsequent logins
            // UNLESS forceUpdate is true (manual edit)
            if (exists && !forceUpdate && (field === 'displayName' || field === 'photoURL')) {
                return;
            }

            if (user[field] !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (dataToSave as any)[field] = user[field];
            }
        });

        await setDoc(docRef, dataToSave, { merge: true });
        console.log('[Firestore] User profile saved:', dataToSave);
    } catch (error) {
        console.error('[Firestore] Error saving user profile:', error);
        throw error; // Re-throw to let UI know
    }
}

// Update user profile fields (DisplayName, Bio, etc.)
export async function updateUserProfile(uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'photoURL' | 'banner'>>): Promise<void> {
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, { ...data, lastUpdated: Date.now() });
        console.log('[Firestore] User profile updated:', data);
    } catch (error) {
        console.error('[Firestore] Error updating user profile:', error);
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
        console.error('[Storage] Error uploading profile picture:', error);
        throw error;
    }
}

// Save library data to Firestore (with safe merge)
export async function saveLibraryToFirestore(userId: string, works: Work[], folders?: Folder[]): Promise<void> {
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
            lastUpdated: Date.now(),
            version: (existing?.version || 0) + 1
        } as LibraryData);
        console.log('[Firestore] Library saved safely');
    } catch (error) {
        console.error('[Firestore] Error saving library:', error);
        if ((error as { code?: string }).code === 'permission-denied') {
            console.error('[Firestore] PERMISSION DENIED: Check your Firestore Security Rules in Firebase Console.');
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
            console.log('[Firestore] Library loaded');
            return data.works;
        }
        return null; // No data in Firestore
    } catch (error) {
        console.error('[Firestore] Error loading library:', error);
        return null;
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

        // 2. Validate write (prevent downgrades)
        if (!validateGamificationWrite(data, existing)) {
            console.warn('[Firestore] Gamification write blocked - would cause data downgrade');
            // Use safe merge instead
            const safeData = mergeGamificationData(data, existing);
            data = safeData;
        }

        // 3. Create backup before write
        if (existing) {
            logDataBackup(userId, 'gamification', existing);
        }

        // 4. Merge with existing data for safety
        const mergedData = mergeGamificationData(data, existing);

        // 5. Save merged data to sub-collection
        await setDoc(docRef, {
            ...mergedData,
            lastUpdated: Date.now()
        });

        // 6. Sync essential stats to root user document for Leaderboards & Profile Viewing
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, {
            xp: mergedData.xp,
            level: mergedData.level,
            streak: mergedData.streak,
            badges: mergedData.badges,
            totalChaptersRead: mergedData.totalChaptersRead,
            totalAnimeEpisodesWatched: mergedData.totalAnimeEpisodesWatched || 0,
            totalMoviesWatched: mergedData.totalMoviesWatched || 0,
            totalWorksAdded: mergedData.totalWorksAdded,
            totalWorksCompleted: mergedData.totalWorksCompleted
        }, { merge: true });

        console.log('[Firestore] Gamification saved safely');
    } catch (error) {
        console.error('[Firestore] Error saving gamification:', error);
        if ((error as { code?: string }).code === 'permission-denied') {
            console.error('[Firestore] PERMISSION DENIED: Check your Firestore Security Rules in Firebase Console.');
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
            console.log('[Firestore] Gamification loaded');
            return data;
        }
        return null; // No data in Firestore
    } catch (error) {
        console.error('[Firestore] Error loading gamification:', error);
        return null;
    }
}

// ADMIN: Manually update user gamification stats
export async function adminUpdateUserGamification(uid: string, level: number, xp: number): Promise<void> {
    try {
        // 1. Update root user doc (for leaderboards/UI)
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
            level,
            xp
        });

        // 2. Update gamification subcollection (for data integrity)
        const gamificationDocRef = doc(db, 'users', uid, 'data', 'gamification');

        // Use setDoc with merge to ensure we don't overwrite other fields if they exist,
        // or create the doc if it doesn't exist
        await setDoc(gamificationDocRef, {
            level,
            xp,
            lastUpdated: Date.now()
        }, { merge: true });

        console.log(`[Firestore] Admin updated gamification for ${uid}: Level ${level}, XP ${xp}`);
    } catch (error) {
        console.error('[Firestore] Error updating user gamification:', error);
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
        console.log('[Firestore] Uploaded local library to cloud');
    }

    if (!existingGamification && (gamification.level > 1 || gamification.totalWorksAdded > 0)) {
        await saveGamificationToFirestore(userId, gamification);
        console.log('[Firestore] Uploaded local gamification to cloud');
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
        console.error('[Firestore] Error searching user:', error);
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
        console.error('[Firestore] Error searching user by name:', error);
        return null;
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
        console.error('[Firestore] Error getting user profile:', error);
        return null;
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
        console.error('[Firestore] Error subscribing to user profile:', error);
        callback(null);
    });
}

// Send Friend Request
export async function sendFriendRequest(currentUserId: string, currentUserData: { displayName: string, photoURL: string }, targetUser: UserProfile): Promise<void> {
    try {
        // 1. Add to current user's friends list as 'outgoing'
        const myFriendRef = doc(db, 'users', currentUserId, 'friends', targetUser.uid);
        await setDoc(myFriendRef, {
            uid: targetUser.uid,
            displayName: targetUser.displayName,
            photoURL: targetUser.photoURL,
            status: 'pending',
            direction: 'outgoing'
        });

        // 2. Add to target user's friends list as 'incoming'
        const theirFriendRef = doc(db, 'users', targetUser.uid, 'friends', currentUserId);
        await setDoc(theirFriendRef, {
            uid: currentUserId,
            displayName: currentUserData.displayName,
            photoURL: currentUserData.photoURL,
            status: 'pending',
            direction: 'incoming'
        });

        console.log('[Firestore] Friend request sent');
    } catch (error) {
        console.error('[Firestore] Error sending friend request:', error);
        throw error;
    }
}

// Accept Friend Request
export async function acceptFriendRequest(currentUserId: string, friendUid: string): Promise<void> {
    try {
        // Update my status
        await updateDoc(doc(db, 'users', currentUserId, 'friends', friendUid), {
            status: 'accepted'
        });

        // Update their status
        await updateDoc(doc(db, 'users', friendUid, 'friends', currentUserId), {
            status: 'accepted'
        });
        console.log('[Firestore] Friend request accepted');
    } catch (error) {
        console.error('[Firestore] Error accepting friend request:', error);
        throw error;
    }
}

// Reject/Remove Friend Request
export async function rejectFriendRequest(currentUserId: string, friendUid: string): Promise<void> {
    try {
        // Remove from my list
        await deleteDoc(doc(db, 'users', currentUserId, 'friends', friendUid));

        // Remove from their list
        await deleteDoc(doc(db, 'users', friendUid, 'friends', currentUserId));

        console.log('[Firestore] Friend request rejected/removed');
    } catch (error) {
        console.error('[Firestore] Error rejecting friend request:', error);
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
        console.error('[Firestore] Error checking friendship:', error);
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
        console.error('[Firestore] Error loading friends:', error);
        return [];
    }
}

// Get Global Leaderboard
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getLeaderboard = async (limitCount = 10, _period: 'week' | 'month' | 'all-time' = 'all-time'): Promise<UserProfile[]> => {
    try {
        const q = query(
            collection(db, 'users'),
            orderBy('xp', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        return users;
    } catch (error) {
        console.error('[Firestore] Error loading leaderboard:', error);
        return [];
    }
}

// ==================== ACTIVITY FEED FUNCTIONS ====================

// Log an activity event
export async function logActivity(_userId: string, event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
        const activityRef = doc(collection(db, 'activities'));
        const activity: ActivityEvent = {
            ...event,
            id: activityRef.id,
            timestamp: Date.now()
        };
        await setDoc(activityRef, activity);
        console.log('[Firestore] Activity logged:', event.type);
    } catch (error) {
        console.error('[Firestore] Error logging activity:', error);
    }
}

// Get activities from friends
export async function getFriendsActivity(userId: string, limitCount: number = 20): Promise<ActivityEvent[]> {
    try {
        // First get friends list
        const friends = await getFriends(userId);
        const friendIds = friends.filter(f => f.status === 'accepted').map(f => f.uid);

        if (friendIds.length === 0) return [];

        // Get activities from friends (Firestore 'in' query limited to 10 items)
        const batchedIds = friendIds.slice(0, 10); // Take first 10 friends
        const q = query(
            collection(db, 'activities'),
            where('userId', 'in', batchedIds),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const activities: ActivityEvent[] = [];
        querySnapshot.forEach((doc) => {
            activities.push(doc.data() as ActivityEvent);
        });
        return activities;
    } catch (error) {
        console.error('[Firestore] Error loading friends activity:', error);
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
        console.error('[Firestore] Error loading user library:', error);
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
        console.error('[Firestore] Error comparing libraries:', error);
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
            'xp': 'xp',
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
        console.error('[Firestore] Error loading filtered leaderboard:', error);
        return [];
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
        console.log('[Firestore] Comment added:', commentRef.id);
        return commentRef.id;
    } catch (error) {
        console.error('[Firestore] Error adding comment:', error);
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
        console.error('[Firestore] Error loading comments:', error);
        return [];
    }
}

// Get comments organized with replies
// Get comments organized with replies (Recursive)
export async function getCommentsWithReplies(workId: number): Promise<CommentWithReplies[]> {
    const allComments = await getComments(workId, 200);

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
        console.error('[Firestore] Error toggling comment like:', error);
    }
}

// ==================== CHALLENGES SYSTEM ====================

// Create a new challenge
export async function createChallenge(challenge: Omit<Challenge, 'id'>): Promise<string | null> {
    try {
        const challengeRef = await addDoc(collection(db, 'challenges'), challenge);
        console.log('[Firestore] Challenge created:', challengeRef.id);
        return challengeRef.id;
    } catch (error) {
        console.error('[Firestore] Error creating challenge:', error);
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
        console.error('[Firestore] Error loading challenges:', error);
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
        console.error('[Firestore] Error updating challenge progress:', error);
    }
}

// ==================== FRIEND RECOMMENDATIONS ====================

// Get how many friends are reading a specific work
export async function getFriendsReadingWork(userId: string, workId: number): Promise<{ count: number; friends: UserProfile[] }> {
    try {
        const friends = await getFriends(userId);
        const acceptedFriends = friends.filter(f => f.status === 'accepted');

        const friendsReading: UserProfile[] = [];

        for (const friend of acceptedFriends.slice(0, 10)) {
            const library = await getUserLibrary(friend.uid);
            if (library.some(w => w.id === workId)) {
                const profile = await getUserProfile(friend.uid);
                if (profile) friendsReading.push(profile);
            }
        }

        return { count: friendsReading.length, friends: friendsReading };
    } catch (error) {
        console.error('[Firestore] Error getting friends reading work:', error);
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
        console.log('[Firestore] Watch party created:', partyData.id);
        return partyRef.id;
    } catch (error) {
        console.error('[Firestore] Error creating watch party:', error);
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

        // Also get parties where user is a participant (simplified - would need more complex query in production)
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
        console.error('[Firestore] Error getting user watch parties:', error);
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
        console.log('[Firestore] Joined watch party:', partyId);
    } catch (error) {
        console.error('[Firestore] Error joining watch party:', error);
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
        console.error('[Firestore] Error updating party progress:', error);
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
            console.log('[Firestore] Challenge invitation accepted');
        }
    } catch (error) {
        console.error('[Firestore] Error accepting challenge:', error);
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
            console.log('[Firestore] Challenge invitation declined');
        }
    } catch (error) {
        console.error('[Firestore] Error declining challenge:', error);
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
        console.log('[Firestore] Challenge cancelled');
    } catch (error) {
        console.error('[Firestore] Error cancelling challenge:', error);
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
        console.log('[Firestore] Challenge completed');
    } catch (error) {
        console.error('[Firestore] Error completing challenge:', error);
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
        console.log('[Firestore] Watch party ended');
    } catch (error) {
        console.error('[Firestore] Error ending watch party:', error);
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
            console.log('[Firestore] Left watch party');
        }
    } catch (error) {
        console.error('[Firestore] Error leaving watch party:', error);
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
        console.log('[Firestore] Feedback submitted:', feedbackRef.id);
        return feedbackRef.id;
    } catch (error) {
        console.error('[Firestore] Error submitting feedback:', error);
        return null;
    }
}

export async function getAllFeedback(): Promise<FeedbackData[]> {
    try {
        const q = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as FeedbackData));
    } catch (error) {
        console.error('[Firestore] Error getting feedback:', error);
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
        console.error('[Firestore] Error getting user feedback:', error);
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
        console.error('[Firestore] Error getting feedback by ID:', error);
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

        console.log('[Firestore] Admin response added to feedback:', feedbackId);
        return true;
    } catch (error) {
        console.error('[Firestore] Error adding admin response:', error);
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
        console.log('[Firestore] Feedback updated:', feedbackId, updates);
        return true;
    } catch (error) {
        console.error('[Firestore] Error updating feedback:', error);
        return false;
    }
}


export async function deleteUserData(userId: string): Promise<void> {
    try {
        // We use individual deletions or batch for safety
        // Delete user libraries
        await deleteDoc(doc(db, 'libraries', userId));

        // Delete user gamification
        await deleteDoc(doc(db, 'gamification', userId));

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

        // Delete user profile (Delete this last to ensure we can still find the user if needed during process)
        await deleteDoc(doc(db, 'users', userId));

        console.log('[Firestore] All user data deleted for:', userId);
    } catch (error) {
        console.error('[Firestore] Error deleting user data:', error);
        throw error;
    }
}

// ==================== ADMIN DASHBOARD FUNCTIONS ====================

// Get system stats for dashboard
export async function getAdminStats(): Promise<{
    totalUsers: number;
    totalFeedback: number;
    newUsersToday: number;
    pendingFeedback: number;
}> {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const feedbackSnap = await getDocs(collection(db, 'feedback'));

        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();

        const newUsersToday = usersSnap.docs.filter(doc => {
            const data = doc.data() as UserProfile;
            // Use lastLogin as proxy if createdAt missing
            const joinDate = data.createdAt || data.lastLogin || 0;
            return joinDate > startOfDay;
        }).length;

        const pendingFeedback = feedbackSnap.docs.filter(doc => {
            const data = doc.data() as FeedbackData;
            return data.status === 'open' || data.status === 'in_progress';
        }).length;

        return {
            totalUsers: usersSnap.size,
            totalFeedback: feedbackSnap.size,
            newUsersToday,
            pendingFeedback
        };
    } catch (error) {
        console.error('[Firestore] Error getting admin stats:', error);
        return { totalUsers: 0, totalFeedback: 0, newUsersToday: 0, pendingFeedback: 0 };
    }
}

// Get all users for admin table
export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
        console.error('[Firestore] Error getting all users:', error);
        return [];
    }
}

// Toggle User Ban Status
export async function toggleUserBan(uid: string, isBanned: boolean): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', uid), { isBanned });
        console.log(`[Firestore] User ${uid} ban status set to ${isBanned}`);
    } catch (error) {
        console.error('[Firestore] Error toggling user ban:', error);
        throw error;
    }
}

// Toggle User Admin Status
export async function toggleUserAdmin(uid: string, isAdmin: boolean): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', uid), { isAdmin });
        console.log(`[Firestore] User ${uid} admin status set to ${isAdmin}`);
    } catch (error) {
        console.error('[Firestore] Error toggling user admin:', error);
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
        console.error('[Firestore] Error deleting feedback:', error);
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
        console.error('Error fetching chart stats:', error);
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
        console.error('[Firestore] Error getting all activities:', error);
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
        console.error('[Firestore] Error getting global config:', error);
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
        console.log('[Firestore] Announcement updated');
    } catch (error) {
        console.error('[Firestore] Error setting announcement:', error);
        throw error;
    }
}

export async function setGlobalConfig(config: Partial<Omit<GlobalConfig, 'announcement'>>): Promise<void> {
    try {
        await setDoc(doc(db, 'config', 'global'), config, { merge: true });
        console.log('[Firestore] Global config updated');
    } catch (error) {
        console.error('[Firestore] Error setting config:', error);
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
        console.error('[Firestore] Error subscribing to global config:', error);
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
            id: number; // MAL ID
            name: string;
            image: string;
        }[];
    }[];
}

// Create a new tier list
export async function createTierList(tierList: Omit<TierList, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'tierLists'), {
            ...tierList,
            createdAt: Date.now()
        });
        console.log('[Firestore] Tier list created:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[Firestore] Error creating tier list:', error);
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
        console.error('[Firestore] Error getting tier list:', error);
        return null;
    }
}

// Get public tier lists (feed)
export async function getPublicTierLists(limitCount: number = 20): Promise<TierList[]> {
    try {
        const q = query(
            collection(db, 'tierLists'),
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        const lists: TierList[] = [];
        querySnapshot.forEach((doc) => {
            lists.push({ id: doc.id, ...doc.data() } as TierList);
        });
        return lists;
    } catch (error) {
        console.error('[Firestore] Error getting public tier lists:', error);
        return [];
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
        console.error('[Firestore] Error getting user tier lists:', error);
        return [];
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
        console.error('[Firestore] Error toggling tier list like:', error);
    }
}

// --- DEPLOYMENTS ---

export interface DeploymentEvent {
    id: string;
    channelId: string;
    url: string;
    createdAt: any; // Timestamp
    expiresAt: any; // Timestamp
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
        console.error('[Firestore] Error fetching deployments:', error);
        return [];
    }
}
