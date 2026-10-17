/**
 * Push delivery stays disabled until a real VAPID key, worker and token
 * lifecycle are deployed together. Never request permission for a no-op.
 */
export function usePushNotifications() {
    return {
        available: false as const,
        reason: 'push-not-configured',
        permission: typeof Notification === 'undefined' ? 'default' as const : Notification.permission,
        fcmToken: null,
        requestPermission: async (): Promise<never> => {
            throw new Error('Push notifications are not configured.');
        },
    };
}
