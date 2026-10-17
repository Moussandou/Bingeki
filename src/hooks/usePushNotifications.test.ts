import { describe, it, expect, vi } from 'vitest';
import { usePushNotifications } from './usePushNotifications';
describe('unconfigured push notifications', () => {
    it('reports unavailable and never asks browser permission or returns a pretend token', async () => {
        const requestPermission = vi.fn();
        vi.stubGlobal('Notification', { permission: 'default', requestPermission });
        const push = usePushNotifications();
        expect(push.available).toBe(false);
        expect(push.fcmToken).toBeNull();
        await expect(push.requestPermission()).rejects.toThrow('not configured');
        expect(requestPermission).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
