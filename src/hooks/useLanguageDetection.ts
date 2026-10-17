/**
 * URL-based language detection and redirect logic
 */
import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMounted } from './useMounted';
import { resolveSeoFromPath } from '@/seo/resolveSeo';
import { logger } from '@/utils/logger';
export function useLanguageDetection() {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const location = useLocation();
  const isMounted = useMounted();

  useEffect(() => {
    let active = true;
    if (lang && (lang === 'fr' || lang === 'en')) {
      document.documentElement.lang = lang;
      document.title = resolveSeoFromPath(location.pathname, lang).title;
      delete document.documentElement.dataset.languageReady;
      void i18n.changeLanguage(lang).then(() => {
        if (active) document.documentElement.dataset.languageReady = lang;
      }).catch(error => logger.error('Cannot load page language', error));
    }
    return () => { active = false; };
  }, [lang, i18n, location.pathname]);

  const handleRootRedirect = () => {
    if (!isMounted) return null;

    // Skip redirects for static file paths
    if (/\.(xml|txt|json|png|jpg|jpeg|svg|ico)$/i.test(location.pathname)) {
      return '404';
    }

    const detectedLang = i18n.language === 'en' ? 'en' : 'fr';
    const currentPath = location.pathname;


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
