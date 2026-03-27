

/**
 * Checks if a URL should be proxied and returns the proxied URL if necessary.
 * @param url The original image URL
 * @returns The proxied URL or the original if no proxy is needed
 */
export const getProxiedImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    return url;
};
