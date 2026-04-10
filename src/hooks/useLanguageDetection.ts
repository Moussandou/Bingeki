import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMounted } from './useMounted';

/**
 * Hook to handle language detection from URL, handle redirects to the detected language,
 * and ensure the i18next instance is in sync with the current URL parameter.
 */
export function useLanguageDetection() {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const location = useLocation();
  const isMounted = useMounted();

  useEffect(() => {
    if (lang && (lang === 'fr' || lang === 'en')) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    }
  }, [lang, i18n]);

  const handleRootRedirect = () => {
    if (!isMounted) return null;

    // Prevent redirect loops for static files that fell through
    if (/\.(xml|txt|json|png|jpg|jpeg|svg|ico)$/i.test(location.pathname)) {
      return '404';
    }

    const detectedLang = i18n.language === 'en' ? 'en' : 'fr';
    const currentPath = location.pathname;

    // If already prefixed, don't re-prefix
    if (currentPath.startsWith('/fr/') || currentPath.startsWith('/en/') || currentPath === '/fr' || currentPath === '/en') {
      return 'not_found';
    }

    const target = currentPath === '/' ? `/${detectedLang}` : `/${detectedLang}${currentPath}`;
    return { target, search: location.search };
  };

  const handleLanguageManagerRedirect = () => {
    if (!isMounted) return null;

    if (!lang || !['fr', 'en'].includes(lang)) {
      const detectedLang = i18n.language || 'fr';
      let cleanPath = location.pathname;

      if (cleanPath.startsWith('/fr/') || cleanPath.startsWith('/en/') || cleanPath === '/fr' || cleanPath === '/en') {
        return 'not_found';
      }

      if (cleanPath === '/') cleanPath = '';
      return { target: `/${detectedLang}${cleanPath}`, search: location.search };
    }

    return null;
  };

  return {
    lang,
    isMounted,
    handleRootRedirect,
    handleLanguageManagerRedirect
  };
}
