import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import type { Comment, CommentWithReplies } from '@/types/comment';
import type { Challenge } from '@/types/challenge';
import type { WatchParty, PartyParticipant } from '@/types/watchparty';

// ==================== COMMENTS SYSTEM ====================

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

export async function getCommentsWithReplies(workId: number): Promise<CommentWithReplies[]> {
    const allComments = await getComments(workId, 50);

    const buildTree = (comments: Comment[], parentId: string | undefined): CommentWithReplies[] => {
        return comments
            .filter(c => c.replyTo === parentId)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(c => ({
                ...c,
                replies: buildTree(comments, c.id)
            }));
    };

    const topLevel = allComments
        .filter(c => !c.replyTo)
        .sort((a, b) => b.timestamp - a.timestamp);

    return topLevel.map(c => ({
        ...c,
        replies: buildTree(allComments, c.id)
    }));
}

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
        throw error;
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

export async function acceptChallengeInvitation(challengeId: string, participantId: string): Promise<void> {
    try {
        const challengeRef = doc(db, 'challenges', challengeId);
        const challengeSnap = await getDoc(challengeRef);

        if (challengeSnap.exists()) {
            const challenge = challengeSnap.data() as Challenge;
            const participants = challenge.participants.map(p =>
                p.id === participantId ? { ...p, status: 'accepted' as const } : p
            );

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

// ==================== WATCH PARTY FUNCTIONS ====================

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

export async function getUserWatchParties(userId: string): Promise<WatchParty[]> {
    try {
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
