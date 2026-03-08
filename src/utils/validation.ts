import DOMPurify from 'dompurify';

/**
 * Validates if an image source URL is safe to use in an img tag.
 * Allows ONLY data:image URIs and http/https URLs.
 * Rejects javascript: URIs and other potentially dangerous schemes.
 */
export const isValidImageSrc = (src: string): boolean => {
    if (!src) return false;

    // Sanitize the input string first to prevent any embedded injection
    const cleanSrc = DOMPurify.sanitize(src, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    if (!cleanSrc || cleanSrc !== src) return false;

    // Allow data URIs for image previews (from file uploads)
    if (src.startsWith('data:image/')) return true;

    // Allow blob URIs for local file previews (URL.createObjectURL)
    if (src.startsWith('blob:')) return true;

    try {
        const url = new URL(src);
        // Strictly allow only http and https protocols
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        // If URL parsing fails, it's not a valid URL
        return false;
    }
};
