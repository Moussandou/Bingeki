/**
 * Image proxy passthrough (no-op for now)
 */
export const getProxiedImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    return url;
};
