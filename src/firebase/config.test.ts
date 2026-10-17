import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    consent: null as string | null,
    listener: (() => {}) as () => void,
    getAnalytics: vi.fn(() => ({ app: {} })),
    supported: vi.fn(async () => true),
    error: vi.fn(),
    auth: vi.fn(), firestore: vi.fn(), storage: vi.fn(), functions: vi.fn(),
}));
vi.mock('@/services/consent', () => ({
    getConsent: () => mocks.consent,
    subscribeConsent: (listener: () => void) => { mocks.listener = listener; },
}));
vi.mock('@/utils/logger', () => ({ logger: { error: mocks.error } }));
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({}), connectAuthEmulator: mocks.auth }));
vi.mock('firebase/firestore', () => ({
    initializeFirestore: () => ({}), memoryLocalCache: () => ({}), connectFirestoreEmulator: mocks.firestore,
}));
vi.mock('firebase/storage', () => ({ getStorage: () => ({}), connectStorageEmulator: mocks.storage }));
vi.mock('firebase/functions', () => ({ getFunctions: () => ({}), connectFunctionsEmulator: mocks.functions }));
vi.mock('firebase/messaging', () => ({ getMessaging: () => ({}) }));
vi.mock('firebase/analytics', () => ({
    getAnalytics: mocks.getAnalytics, isSupported: mocks.supported,
}));

describe('Firebase optional services and isolation', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mocks.consent = null;
        mocks.supported.mockResolvedValue(true);
        document.querySelectorAll('[data-bingeki-ads]').forEach(el => el.remove());
        vi.stubEnv('DEV', false);
        vi.stubEnv('VITE_USE_EMULATORS', 'false');
        vi.stubEnv('VITE_FIREBASE_MEASUREMENT_ID', 'G-DEMO');
    });
    it('does not initialize analytics or ads without explicit consent', async () => {
        await import('./config');
        await vi.waitFor(() => expect(mocks.getAnalytics).not.toHaveBeenCalled());
        expect(document.querySelector('[data-bingeki-ads]')).toBeNull();
    });
    it('loads optional services only after acceptance', async () => {
        await import('./config');
        mocks.consent = 'accepted';
        mocks.listener();
        await vi.waitFor(() => expect(mocks.getAnalytics).toHaveBeenCalledOnce());
        expect(document.querySelectorAll('[data-bingeki-ads]')).toHaveLength(1);
        mocks.listener();
        expect(document.querySelectorAll('[data-bingeki-ads]')).toHaveLength(1);
    });
    it('handles asynchronous analytics failures', async () => {
        mocks.consent = 'accepted';
        mocks.supported.mockRejectedValue(new Error('offline'));
        await import('./config');
        await vi.waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
        expect(mocks.getAnalytics).not.toHaveBeenCalled();
    });
    it('does not initialize after consent changes during support detection', async () => {
        let finish!: (supported: boolean) => void;
        mocks.supported.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        mocks.consent = 'accepted';
        await import('./config');
        await vi.waitFor(() => expect(mocks.supported).toHaveBeenCalled());
        mocks.consent = 'rejected';
        finish(true);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mocks.getAnalytics).not.toHaveBeenCalled();
        expect(document.querySelector('[data-bingeki-ads]')).toBeNull();
    });
    it('connects all four emulators and disables optional services in isolated builds', async () => {
        mocks.consent = 'accepted';
        vi.stubEnv('VITE_USE_EMULATORS', 'true');
        vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-bingeki-quality');
        await import('./config');
        for (const connect of [mocks.auth, mocks.firestore, mocks.storage, mocks.functions]) {
            expect(connect).toHaveBeenCalledOnce();
        }
        expect(mocks.getAnalytics).not.toHaveBeenCalled();
        expect(document.querySelector('[data-bingeki-ads]')).toBeNull();
    });
    it('refuses a real project in emulator mode', async () => {
        vi.stubEnv('VITE_USE_EMULATORS', 'true');
        vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'bingeki');
        await expect(import('./config')).rejects.toThrow('demo-');
    });
});
