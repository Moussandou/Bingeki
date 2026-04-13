/**
 * S E O component (layout)
 */
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { resolveSeoFromPath } from '@/seo/resolveSeo';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

export const SEO = ({ title, description, image, url }: SEOProps) => {
    const { i18n } = useTranslation();
    const location = useLocation();
    const resolved = useMemo(
        () => resolveSeoFromPath(location.pathname, i18n.language),
        [location.pathname, i18n.language]
    );
    const baseUrl = 'https://bingeki.web.app';

    useEffect(() => {
        const fullTitle = title || resolved.title;
        document.title = fullTitle;

        const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
            let element = document.querySelector(`meta[${attr}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attr, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const finalDesc = description || resolved.description;
        setMeta('description', finalDesc);
        setMeta('og:title', fullTitle, 'property');
        setMeta('og:description', finalDesc, 'property');
        setMeta('twitter:title', fullTitle);
        setMeta('twitter:description', finalDesc);
        setMeta('og:locale', resolved.locale, 'property');
        setMeta('og:locale:alternate', resolved.alternateLocale, 'property');
        setMeta('og:type', 'website', 'property');
        setMeta('twitter:card', 'summary_large_image');

        const finalImage = image || resolved.image;
        setMeta('og:image', finalImage, 'property');
        setMeta('twitter:image', finalImage);

        const pathWithSearch = `${location.pathname}${location.search}`;
        const finalUrl = url || `${baseUrl}${pathWithSearch}`;
        setMeta('og:url', finalUrl, 'property');
        setMeta('twitter:url', finalUrl);

        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', finalUrl);
    }, [title, description, image, url, resolved, location.pathname, location.search]);

    return null;
};
