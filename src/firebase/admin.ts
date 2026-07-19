import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc, addDoc, getAggregateFromServer, count } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import type { UserProfile } from './users';
import { getUserEmails } from './users';

// ==================== FEEDBACK SYSTEM ====================

export interface AdminResponse {
    adminId: string;
    adminName: string;
    message: string;
    timestamp: number;
}

export interface FeedbackData {
    id: string;
    rating: number;
    category: 'bug' | 'feature' | 'general';
    message: string;
    userId?: string;
    userName?: string;
    contactEmail?: string;
    timestamp: number;
    userAgent: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    attachments: string[];
    adminResponses: AdminResponse[];
    lastUpdated: number;
    tags?: string[];
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
            status: 'in_progress'
        });

        logger.log('[Firestore] Admin response added to feedback:', feedbackId);
        return true;
    } catch (error) {
        logger.error('[Firestore] Error adding admin response:', error);
        return false;
    }
}

export async function updateFeedbackDetails(
    feedbackId: string,
    updates: { status?: FeedbackData['status']; priority?: FeedbackData['priority']; tags?: string[] }
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

// ==================== ADMIN AUDIT LOG ====================

export interface AuditLogEntry {
    id: string;
    action: string;
    adminId: string;
    adminName: string;
    adminEmail?: string;
    targetId?: string;
    targetName?: string;
    details?: string;
    timestamp: number;
}

export async function logAdminAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
        await addDoc(collection(db, 'adminAuditLog'), {
            ...entry,
            timestamp: Date.now()
        });
    } catch (error) {
        logger.error('[Firestore] Failed to log admin action:', error);
    }
}

export async function getAuditLogs(limitCount = 50): Promise<AuditLogEntry[]> {
    try {
        const q = query(
            collection(db, 'adminAuditLog'),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLogEntry));
    } catch (error) {
        logger.error('[Firestore] Failed to get audit logs:', error);
        return [];
    }
}

// ==================== ADMIN DASHBOARD FUNCTIONS ====================

export async function getAdminStats() {
    try {
        const now = Date.now();
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

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
            timestamp: d.data().timestamp?.toMillis?.() || Date.now()
        })).reverse();
    } catch (error) {
        logger.error('[Firestore] Error getting health history:', error);
        return [];
    }
}

export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

        // Email is no longer on the public doc — hydrate it from the private
        // subcollection for the admin panel (admins may read it per Firestore rules).
        const emails = await getUserEmails(users.map(u => u.uid));
        return users.map(u => ({ ...u, email: emails[u.uid] ?? u.email ?? null }));
    } catch (error) {
        logger.error('[Firestore] Error getting all users:', error);
        return [];
    }
}

export async function getRecentMembers(count = 10): Promise<UserProfile[]> {
    try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(count));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

        return users;
    } catch (error) {
        logger.error('[Firestore] Error getting recent members by createdAt:', error);
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(count));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    }
}

export async function toggleUserBan(uid: string, isBanned: boolean): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', uid), { isBanned });
        logger.log(`[Firestore] User ${uid} ban status set to ${isBanned}`);
    } catch (error) {
        logger.error('[Firestore] Error toggling user ban:', error);
        throw error;
    }
}

export async function toggleUserAdmin(uid: string, isAdmin: boolean): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', uid), { isAdmin });
        logger.log(`[Firestore] User ${uid} admin status set to ${isAdmin}`);
    } catch (error) {
        logger.error('[Firestore] Error toggling user admin:', error);
        throw error;
    }
}

export async function updateFeedbackStatus(id: string, status: 'resolved' | 'open'): Promise<void> {
    await updateFeedbackDetails(id, { status: status === 'resolved' ? 'resolved' : 'open' });
}

export async function deleteFeedback(id: string): Promise<void> {
    try {
        const { deleteFeedbackImages } = await import('./storage');
        await deleteFeedbackImages(id);
        const { deleteDoc, doc } = await import('firebase/firestore');
        const { db } = await import('./config');
        await deleteDoc(doc(db, 'feedback', id));
    } catch (error) {
        // use logger if imported, else console.error
        logger.error('[Firestore] Error deleting feedback:', error);
        throw error;
    }
}
