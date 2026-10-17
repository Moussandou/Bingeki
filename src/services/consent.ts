import { logger } from '@/utils/logger';

export type Consent = 'accepted' | 'rejected' | null;
const KEY = 'bingeki:optional-consent:v1';
const listeners = new Set<() => void>();

export function getConsent(): Consent {
    try {
        const value = localStorage.getItem(KEY);
        return value === 'accepted' || value === 'rejected' ? value : null;
    } catch (error) {
        logger.error('Cannot read privacy preferences', error);
        return null;
    }
}

export function subscribeConsent(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function setConsent(value: Exclude<Consent, null>) {
    try {
        localStorage.setItem(KEY, value);
    } catch (error) {
        logger.error('Cannot save privacy preferences; optional services remain disabled', error);
        return false;
    }
    listeners.forEach(listener => listener());
    return true;
}

window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) listeners.forEach(listener => listener());
});
