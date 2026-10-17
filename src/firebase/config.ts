/**
 * Firebase SDK initialization. Isolated builds may only use demo projects.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import type { Analytics } from 'firebase/analytics';
import { getConsent, subscribeConsent } from '@/services/consent';
import { logger } from '@/utils/logger';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
const isolated = import.meta.env.VITE_USE_EMULATORS === 'true';
if (isolated && !firebaseConfig.projectId?.startsWith('demo-')) {
    throw new Error('Emulator mode requires a demo- Firebase project');
}
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });
export const storage = getStorage(app);
export const FUNCTIONS_REGION = 'europe-west9';
export const functions = getFunctions(app, FUNCTIONS_REGION);

if (isolated) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export let analytics: Analytics | undefined;
let optionalServicesStarted = false;
let initializing = false;

async function applyConsent() {
    if (getConsent() !== 'accepted') {
        if (optionalServicesStarted) {
            // Reload unloads both third-party SDKs, including existing ad frames.
            document.querySelector('[data-bingeki-ads]')?.remove();
            for (const cookie of document.cookie.split(';')) {
                const name = cookie.trim().split('=')[0];
                if (name.startsWith('_ga') || name === '_gid' || name.startsWith('_gat')) {
                    for (const domain of ['', location.hostname, `.${location.hostname}`]) {
                        document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
                    }
                }
            }
            window.location.reload();
        }
        return;
    }
    if (isolated || import.meta.env.DEV || initializing || optionalServicesStarted) return;
    initializing = true;
    try {
        const { getAnalytics, isSupported } = await import('firebase/analytics');
        const supported = await isSupported();
        if (getConsent() !== 'accepted') return;
        optionalServicesStarted = true;
        if (supported && firebaseConfig.measurementId) analytics = getAnalytics(app);
        const script = document.createElement('script');
        script.dataset.bingekiAds = 'true';
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4069337726482631';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () => logger.error('Advertising service could not be loaded');
        document.head.appendChild(script);
    } catch (error) {
        logger.error('Optional services could not be initialized', error);
    } finally {
        initializing = false;
    }
}

subscribeConsent(() => { void applyConsent(); });
void applyConsent();
