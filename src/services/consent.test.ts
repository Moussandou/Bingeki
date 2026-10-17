import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getConsent, setConsent, subscribeConsent } from './consent';
import { logger } from '@/utils/logger';

describe('optional service consent', () => {
    beforeEach(() => localStorage.clear());
    it('defaults to no consent and rejects unrecognized stored values', () => {
        expect(getConsent()).toBeNull();
        localStorage.setItem('bingeki:optional-consent:v1', 'true');
        expect(getConsent()).toBeNull();
    });
    it('persists both acceptance and withdrawal and notifies subscribers', () => {
        const listener = vi.fn();
        const stop = subscribeConsent(listener);
        expect(setConsent('accepted')).toBe(true);
        expect(getConsent()).toBe('accepted');
        expect(setConsent('rejected')).toBe(true);
        expect(getConsent()).toBe('rejected');
        expect(listener).toHaveBeenCalledTimes(2);
        stop();
        setConsent('accepted');
        expect(listener).toHaveBeenCalledTimes(2);
    });
    it('propagates changes from another tab', () => {
        const listener = vi.fn();
        const stop = subscribeConsent(listener);
        window.dispatchEvent(new StorageEvent('storage', { key: 'bingeki:optional-consent:v1' }));
        expect(listener).toHaveBeenCalledOnce();
        stop();
    });
    it('fails closed and reports storage errors', () => {
        const log = vi.spyOn(logger, 'error').mockImplementation(() => {});
        const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(setConsent('accepted')).toBe(false);
        expect(getConsent()).toBeNull();
        expect(log).toHaveBeenCalledOnce();
        write.mockRestore();
        log.mockRestore();
    });
});
