/**
 * Notification Tester component (debug)
 */
import { logger } from '@/utils/logger';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card } from '@/components/ui/Card';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';

export function NotificationTester() {
    const { permission, requestPermission, fcmToken } = usePushNotifications();
    const { user } = useAuthStore();
    const [sending, setSending] = useState(false);

    const handleTestNotification = async () => {
        if (permission !== 'granted') {
            alert('Enable notifications first!');
            return;
        }

        setSending(true);
        try {
            // 1. Show Local Notification
            new Notification('Bingeki Test', {
                body: 'This is a simulated push notification from the client.',
                icon: '/logo.png'
            });

                        if (user) {
                await addDoc(collection(db, 'users', user.uid, 'notifications'), {
                    type: 'system',
                    title: 'Bingeki Test',
                    body: 'This is a simulated push notification from the client.',
                    link: '/settings',
                    read: false,
                    createdAt: serverTimestamp()
                });
                logger.log('Notification saved to history!');
            }
        } catch (error) {
            logger.error(error);
        } finally {
            setSending(false);
        }
    };

    return (
        <Card className="p-4 space-y-4 border-2 border-red-500">
            <h3 className="font-heading text-xl">PUSH NOTIFICATION DEBUGGER</h3>

            <div className="flex flex-col gap-2">
                <div className="text-sm">
                    Status: <span className={permission === 'granted' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                        {permission}
                    </span>
                </div>

                {fcmToken && (
                    <div className="text-xs bg-gray-900 p-2 rounded overflow-auto max-h-20 break-all border border-gray-700">
                        {fcmToken}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <Button onClick={requestPermission} disabled={permission === 'granted'} variant="outline">
                    Request Permission
                </Button>

                <Button onClick={handleTestNotification} variant="manga" disabled={sending}>
                    {sending ? 'Sending...' : 'Simulate Notification'}
                </Button>
            </div>

            <p className="text-xs text-muted-foreground">
                To test REAL background push: Copy the token above, go to Firebase Console {'>'} Messaging {'>'} New Campaign, and target this device.
            </p>
        </Card>
    );
}
