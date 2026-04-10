/**
 * Real-time Firestore notifications listener
 */
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';

export interface AppNotification {
    id: string;
    type: 'episode_release' | 'friend_request' | 'system' | 'like';
    title: string;
    body: string;
    link?: string;
    read: boolean;
    createdAt: import('firebase/firestore').Timestamp | number;
}

export function useNotifications(limitCount = 20) {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(limitCount));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs: AppNotification[] = [];
            let unread = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as Omit<AppNotification, 'id'>;
                notifs.push({ id: doc.id, ...data });
                if (!data.read) unread++;
            });
            setNotifications(notifs);
            setUnreadCount(unread);
            setLoading(false);
        }, (error) => {
            console.error('[Firestore] Error fetching notifications:', error);
            setLoading(false);
        });



        return () => unsubscribe();
    }, [user, limitCount]);

    const markAsRead = async (id: string) => {
        if (!user) return;
        const ref = doc(db, 'users', user.uid, 'notifications', id);
        await updateDoc(ref, { read: true });
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const batch = writeBatch(db);
        const unreadParams = notifications.filter(n => !n.read);

        unreadParams.forEach(n => {
            const ref = doc(db, 'users', user.uid, 'notifications', n.id);
            batch.update(ref, { read: true });
        });

        if (unreadParams.length > 0) {
            await batch.commit();
        }
    };

    const deleteNotification = async (id: string) => {
        if (!user) return;
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification };
}
