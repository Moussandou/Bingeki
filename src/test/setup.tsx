import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// --- Mocks ---

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            changeLanguage: () => Promise.resolve(),
            language: 'en',
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => { },
    },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useLocation: () => ({
            pathname: '/',
            search: '',
            hash: '',
            state: null,
        }),
        useParams: () => ({ lang: 'en' }),
        Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>,
    };
});

// Mock Firebase
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn((_auth, cb) => {
        cb(null);
        return () => { };
    }),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    memoryLocalCache: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    addDoc: vi.fn(),
    onSnapshot: vi.fn(() => () => { }),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
}));

// In-memory Web Storage: Node >= 22 defines an experimental global
// localStorage that is undefined without --localstorage-file and shadows
// jsdom's implementation, breaking zustand/persist in tests
const createMemoryStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
        get length() { return store.size; },
        clear: () => { store.clear(); },
        getItem: (key: string) => store.has(key) ? store.get(key)! : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => { store.delete(key); },
        setItem: (key: string, value: string) => { store.set(key, String(value)); },
    };
};
for (const target of [window, globalThis]) {
    Object.defineProperty(target, 'localStorage', {
        writable: true,
        configurable: true,
        value: createMemoryStorage(),
    });
    Object.defineProperty(target, 'sessionStorage', {
        writable: true,
        configurable: true,
        value: createMemoryStorage(),
    });
}

// Mock matchMedia (for responsive components)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
});
