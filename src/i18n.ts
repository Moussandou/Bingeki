import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// List of namespaces
export const namespaces = ['translation', 'landing', 'admin', 'changelog', 'legal', 'community'];

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'fr',
        // Default namespace for keys without a prefix
        defaultNS: 'translation',
        // Fallback to all namespaces to ensure compatibility with existing keys
        fallbackNS: namespaces,
        ns: namespaces,
        
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        // During hydration, we MUST match the static shell's language (fr)
        // to avoid React Error #418 mismatch.
        lng: typeof document !== 'undefined' && document.body.classList.contains('is-prerendered') ? 'fr' : undefined,
        
        detection: {
            order: ['htmlTag', 'path', 'localStorage', 'navigator'],
            lookupFromPathIndex: 0,
            htmlTag: typeof document !== 'undefined' ? document.documentElement : undefined
        },
        
        supportedLngs: ['fr', 'en'],
        
        interpolation: {
            escapeValue: false // react already safes from xss
        },

        // Production settings
        debug: false,
        
        react: {
            useSuspense: true
        }
    });

export default i18n;
