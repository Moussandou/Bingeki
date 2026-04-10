/**
 * Image source validation - allows only safe URL schemes
 */
import DOMPurify from 'dompurify';

export const isValidImageSrc = (src: string): boolean => {
    if (!src) return false;


    const cleanSrc = DOMPurify.sanitize(src, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    if (!cleanSrc || cleanSrc !== src) return false;


    if (src.startsWith('data:image/')) return true;


    if (src.startsWith('blob:')) return true;

    try {
        const url = new URL(src);

        return ['http:', 'https:'].includes(url.protocol);
    } catch {

        return false;
    }
};
