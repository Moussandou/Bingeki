/**
 * S E O component (layout)
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

export const SEO = ({ title, description, image, url }: SEOProps) => {
    const { t, i18n } = useTranslation();
    const defaultTitle = "Bingeki | Votre aventure Manga";
    const defaultDescription = t('seo.default_description', "Transformez votre passion manga en quête RPG ! Suivez vos lectures, gagnez de l'XP, débloquez des badges et affrontez vos amis.");
    const defaultImage = i18n.language === 'en'
        ? "https://bingeki.web.app/bingeki-preview-en.png"
        : "https://bingeki.web.app/bingeki-preview.png";

    useEffect(() => {
        const fullTitle = title ? `${title} | Bingeki` : defaultTitle;
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

        const finalDesc = description || defaultDescription;
        setMeta('description', finalDesc);
        setMeta('og:title', fullTitle, 'property');
        setMeta('og:description', finalDesc, 'property');
        setMeta('twitter:title', fullTitle);
        setMeta('twitter:description', finalDesc);

        const finalImage = image || defaultImage;
        setMeta('og:image', finalImage, 'property');
        setMeta('twitter:image', finalImage);

        if (url) {
            setMeta('og:url', url, 'property');
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) canonical.setAttribute('href', url);
        }
    }, [title, description, image, url, defaultDescription, defaultImage, t]);

    return null;
};
