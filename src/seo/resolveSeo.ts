import routeSeoConfig from '../../shared/seo/routes.json';

type Lang = 'fr' | 'en';

interface SeoResult {
  title: string;
  description: string;
  image: string;
  locale: string;
  alternateLocale: string;
  canonicalPath: string;
}

type RouteLangMeta = { title?: string; description?: string };
type DynamicLangMeta = { fallbackTitle?: string; fallbackDescription?: string };
const routeMap = routeSeoConfig.routes as Record<string, Record<Lang, RouteLangMeta>>;
const dynamicMap = routeSeoConfig.dynamic as Record<string, Record<Lang, DynamicLangMeta>>;

const DYNAMIC_ROUTE_PATTERNS: Array<{ regex: RegExp; key: string }> = [
  { regex: /^\/profile\/[^/]+$/, key: 'profile' },
  { regex: /^\/news\/article\/[^/]+$/, key: 'newsArticle' },
  { regex: /^\/work\/[^/]+$/, key: 'work' },
  { regex: /^\/character\/[^/]+$/, key: 'character' },
  { regex: /^\/person\/[^/]+$/, key: 'person' },
  { regex: /^\/tierlist\/[^/]+$/, key: 'tierlistItem' },
  { regex: /^\/users\/[^/]+\/library$/, key: 'library' }
];

function normalizeLang(input?: string): Lang {
  return input?.startsWith('en') ? 'en' : 'fr';
}

function stripLangPrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'fr' || segments[0] === 'en') {
    const result = `/${segments.slice(1).join('/')}`;
    return result === '/' ? '/' : result.replace(/\/+$/, '') || '/';
  }
  return pathname.replace(/\/+$/, '') || '/';
}

export function resolveSeoFromPath(pathname: string, langInput?: string): SeoResult {
  const lang = normalizeLang(langInput);
  const defaults = routeSeoConfig.defaults[lang];
  const localPath = stripLangPrefix(pathname);

  const staticConfig = routeMap[localPath]?.[lang];
  if (staticConfig) {
    return {
      title: staticConfig.title || defaults.title,
      description: staticConfig.description || defaults.description,
      image: defaults.image,
      locale: defaults.locale,
      alternateLocale: defaults.alternateLocale,
      canonicalPath: localPath
    };
  }

  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.regex.test(localPath)) {
      const dynamicConfig = dynamicMap[pattern.key]?.[lang];
      return {
        title: dynamicConfig?.fallbackTitle || defaults.title,
        description: dynamicConfig?.fallbackDescription || defaults.description,
        image: defaults.image,
        locale: defaults.locale,
        alternateLocale: defaults.alternateLocale,
        canonicalPath: localPath
      };
    }
  }

  return {
    title: defaults.title,
    description: defaults.description,
    image: defaults.image,
    locale: defaults.locale,
    alternateLocale: defaults.alternateLocale,
    canonicalPath: localPath
  };
}
