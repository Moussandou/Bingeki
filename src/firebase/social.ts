import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import { getUserProfile, type UserProfile } from './users';
import { getUserLibrary } from './library';
import type { ActivityEvent } from '@/types/activity';
import type { Work } from '@/store/libraryStore';

function isUnavailableSharedData(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    return code === 'permission-denied' || code === 'functions/permission-denied'
        || code === 'not-found' || code === 'functions/not-found';
}

export interface Friend {
    uid: string;
    displayName: string;
    photoURL: string;
    status: 'pending' | 'accepted';
    direction?: 'incoming' | 'outgoing';
}

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

export async function getFriendsReadingWork(userId: string, workId: number, type?: Work['type']): Promise<{ count: number; friends: { profile: UserProfile; work: Work }[] }> {
    try {
        const friends = await getFriends(userId);
        const acceptedFriends = friends.filter(f => f.status === 'accepted');

        const friendSlice = acceptedFriends.slice(0, 15);

        const sharedData = await Promise.allSettled(friendSlice.map(async friend => {
            const [library, profile] = await Promise.all([getUserLibrary(friend.uid), getUserProfile(friend.uid)]);
            return { library, profile };
        }));

        const friendsData = sharedData
            .map((result, i) => {
                if (result.status === 'rejected') {
                    if (!isUnavailableSharedData(result.reason)) throw result.reason;
                    logger.log('[Firestore] Friend library not shared:', friendSlice[i].uid);
                    return null;
                }
                const friendWork = result.value.library.find(w => Number(w.id) === workId && (!type || w.type === type));
                const profile = result.value.profile;
                if (friendWork && profile) {
                    return { profile, work: friendWork };
                }
                return null;
            })
            .filter((item): item is { profile: UserProfile; work: Work } => item !== null);

        return { count: friendsData.length, friends: friendsData };
    } catch (error) {
        logger.error('[Firestore] Error getting friends reading work:', error);
        throw error;
    }
}

export async function logActivity(): Promise<void> {
    logger.warn('[Firestore] logActivity is deprecated. Activities are now logged server-side.');
}

export async function getFriendsActivity(userId: string, limitCount: number = 20, friendsList?: Friend[]): Promise<ActivityEvent[]> {
    try {
        let friends = friendsList;
        if (!friends) {
            friends = await getFriends(userId);
        }
        
        const friendIds = friends.filter(f => f.status === 'accepted').map(f => f.uid);
        if (friendIds.length === 0) return [];

        // Preflight individually: one private friend must not deny the entire feed query.
        const profiles = await Promise.allSettled(friendIds.map(uid => getUserProfile(uid)));
        const visibleProfiles: UserProfile[] = [];
        profiles.forEach((result, index) => {
            if (result.status === 'rejected') {
                if (isUnavailableSharedData(result.reason)) {
                    logger.log('[Firestore] Friend profile not shared:', friendIds[index]);
                    return;
                }
                throw result.reason;
            }
            if (result.value && result.value.profileVisibility !== 'private' && result.value.showActivityStatus !== false) {
                visibleProfiles.push(result.value);
            }
        });
        const visibleIds = visibleProfiles.map(profile => profile.uid);
        const allActivities: ActivityEvent[] = [];
        
        // Three profiles per query stays within the rules' document-access budget.
        for (let i = 0; i < visibleIds.length; i += 3) {
            const batch = visibleIds.slice(i, i + 3);
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

        const activities: ActivityEvent[] = sortedActivities.map(data => {
            const profile = visibleProfiles.find(p => p.uid === data.userId);
            if (profile) {
                data.userName = profile.displayName || data.userName;
                data.userPhoto = profile.photoURL || data.userPhoto;
            } else if (friendsList) {
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
        logger.error('[Firestore] Error loading friends activity:', error);
        throw error;
    }
}
