/**
 * Firebase SDK initialization and emulator setup
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
// getAnalytics is imported dynamically below for safe initialization
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Memory cache avoids IndexedDB corruption crashes
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});
export const storage = getStorage(app);

// Safe Analytics initialization
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let analytics: any;
if (typeof window !== 'undefined') {
    import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
        isSupported().then(supported => {
            if (supported) {
                try {
                    analytics = getAnalytics(app);
                } catch {
                    // Silently fail if blocked by ad-blocker
                }
            }
        });
    }).catch(() => {
        // Script itself might be blocked
    });

    // Dynamic AdSense loader to prevent hard errors in index.html
    const loadAdSense = () => {
        if (import.meta.env.DEV) return;
        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4069337726482631";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
    };
    
    // Use a small delay to prioritize main content
    setTimeout(loadAdSense, 2000);
}

export const messaging = getMessaging(app);
export const functions = getFunctions(app);

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectFirestoreEmulator(db, 'localhost', 8080);
}
