const routeSeoConfig = require('../shared/seo/routes.json');

const dynamicPatterns = [
  { regex: /^\/profile\/[^/]+$/, key: 'profile' },
  { regex: /^\/news\/article\/[^/]+$/, key: 'newsArticle' },
  { regex: /^\/work\/[^/]+$/, key: 'work' },
  { regex: /^\/character\/[^/]+$/, key: 'character' },
  { regex: /^\/person\/[^/]+$/, key: 'person' },
  { regex: /^\/tierlist\/[^/]+$/, key: 'tierlistItem' },
  { regex: /^\/users\/[^/]+\/library$/, key: 'library' }
];

function normalizeLang(lang) {
  return lang === 'en' ? 'en' : 'fr';
}

function removeLangFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'fr' || segments[0] === 'en') {
    const nextPath = `/${segments.slice(1).join('/')}`;
    return nextPath === '/' ? '/' : nextPath.replace(/\/+$/, '') || '/';
  }
  return pathname.replace(/\/+$/, '') || '/';
}

function getPathContext(urlPath) {
  const cleanPath = urlPath.split('?')[0].replace(/\/+$/, '') || '/';
  const segments = cleanPath.split('/').filter(Boolean);

  let lang = 'fr';
  if (segments[0] === 'fr' || segments[0] === 'en') {
    lang = segments[0];
  }

  const localPath = removeLangFromPath(cleanPath);
  return { lang: normalizeLang(lang), localPath, cleanPath };
}

function resolveStaticSeo(localPath, lang) {
  const defaults = routeSeoConfig.defaults[lang];
  const staticEntry = routeSeoConfig.routes[localPath]?.[lang];
  if (staticEntry) {
    return {
      title: staticEntry.title || defaults.title,
      description: staticEntry.description || defaults.description,
      image: defaults.image,
      locale: defaults.locale,
      alternateLocale: defaults.alternateLocale,
      pageType: 'generic'
    };
  }

  for (const pattern of dynamicPatterns) {
    if (pattern.regex.test(localPath)) {
      const dynamicEntry = routeSeoConfig.dynamic[pattern.key]?.[lang];
      return {
        title: dynamicEntry?.fallbackTitle || defaults.title,
        description: dynamicEntry?.fallbackDescription || defaults.description,
        image: defaults.image,
        locale: defaults.locale,
        alternateLocale: defaults.alternateLocale,
        pageType: pattern.key
      };
    }
  }

  return {
    title: defaults.title,
    description: defaults.description,
    image: defaults.image,
    locale: defaults.locale,
    alternateLocale: defaults.alternateLocale,
    pageType: 'generic'
  };
}

module.exports = {
  getPathContext,
  resolveStaticSeo
};
