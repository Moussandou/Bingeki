import { logger } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';

// Retrieve from .env
// actually, for Web Push with Firebase, we need a VAPID Key (KeyPair).
// I will put a placeholder and ask the user to provide it or I will check if I can generate/find one.
// IMPORTANT: The user hasn't provided a VAPID key. I will use a placeholder and warn them.

export function usePushNotifications() {
    const { user } = useAuthStore();
    const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register SW if not already (Vite PWA plugin does this, but we ensure it's there for messaging)
            // navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }
    }, []);

    const requestPermission = async () => {
        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                const messaging = getMessaging();
                const currentToken = await getToken(messaging, {
                    // vapidKey is required for web push calls to getToken
                    vapidKey: 'BNUaXw8cI7yMv3Lg4tFZ8e2q9o1r0s3u5v7w9x0y2z4a6b8c0d2e4f6g8h0i2j4k' // Placeholder
                });

                if (currentToken) {
                    setFcmToken(currentToken);
                    if (user) {
                        // Save token to user profile
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            fcmTokens: arrayUnion(currentToken)
                        });
                        logger.log('FCM Token saved to profile.');
                    }
                } else {
                    logger.log('No registration token available. Request permission to generate one.');
                }
            }
        } catch (error) {
            logger.error('An error occurred while retrieving token. ', error);
        }
    };

    // Foreground listener
    useEffect(() => {
        if (permission === 'granted') {
            const messaging = getMessaging();
            const unsubscribe = onMessage(messaging, (payload) => {
                logger.log('Message received. ', payload);
                // We will hook this into our persistent notification store later
                // For now, simple alert or let component handle it
                new Notification(payload.notification?.title || 'New Message', {
                    body: payload.notification?.body,
                    icon: '/logo.png'
                });
            });
            return () => unsubscribe();
        }
    }, [permission]);

    return { permission, requestPermission, fcmToken };
}
