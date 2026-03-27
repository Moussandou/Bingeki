/**
 * Utility to proxy image URLs that are known to have strict hotlinking or CORS policies.
 * Primarily used for MyAnimeList (MAL) images.
 */

const PROXIED_DOMAINS = [
    'myanimelist.net',
    'cdn.myanimelist.net'
];

/**
 * Checks if a URL should be proxied and returns the proxied URL if necessary.
 * @param url The original image URL
 * @returns The proxied URL or the original if no proxy is needed
 */
export const getProxiedImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    
    // Check if the URL belongs to a domain we want to proxy
    const shouldProxy = PROXIED_DOMAINS.some(domain => url.includes(domain));
    
    if (shouldProxy) {
        // Use Google's image proxy which is reliable for bypassing MAL hotlinking
        return `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(url)}`;
    }
    
    return url;
};
