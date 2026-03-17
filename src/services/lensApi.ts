/**
 * Anime Lens API Service
 * Uses trace.moe for anime screenshot identification.
 * Free, no API key required.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface TraceMoeResult {
    anilist: number;
    filename: string;
    episode: number | null;
    from: number;
    to: number;
    similarity: number;
    image: string;
}

export interface LensResult {
    title: string;
    malId: number | null;
    type: 'anime' | 'manga' | 'unknown';
    similarity: number;
    thumbnail: string;
    episode?: number | null;
    timestamp?: { from: number; to: number };
    source: 'trace.moe';
}

// ─── Image Compression ──────────────────────────────────────────────

export function compressImage(file: File, maxWidth = 640): Promise<File> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.width <= maxWidth) {
                resolve(file);
                return;
            }
            const canvas = document.createElement('canvas');
            const ratio = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                } else {
                    resolve(file);
                }
            }, 'image/jpeg', 0.85);
        };
        img.src = URL.createObjectURL(file);
    });
}

// ─── trace.moe ──────────────────────────────────────────────────────

async function searchTraceMoe(file: File): Promise<TraceMoeResult[]> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('https://api.trace.moe/search', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`trace.moe error: ${response.status}`);
    }

    const data = await response.json();
    return (data.result || []).slice(0, 5).map((r: any) => ({
        anilist: r.anilist,
        filename: r.filename || '',
        episode: r.episode,
        from: r.from,
        to: r.to,
        similarity: r.similarity,
        image: r.image,
    }));
}

// ─── AniList → MAL ID mapping ───────────────────────────────────────

const anilistCache = new Map<number, { malId: number | null; title: string; type: string }>();

async function getMALInfoFromAniList(anilistId: number): Promise<{ malId: number | null; title: string; type: string }> {
    if (anilistCache.has(anilistId)) {
        return anilistCache.get(anilistId)!;
    }

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query ($id: Int) {
                    Media(id: $id) {
                        idMal
                        title { romaji english }
                        type
                    }
                }`,
                variables: { id: anilistId },
            }),
        });

        const data = await response.json();
        const media = data?.data?.Media;
        const result = {
            malId: media?.idMal || null,
            title: media?.title?.english || media?.title?.romaji || 'Unknown',
            type: (media?.type || 'ANIME').toLowerCase(),
        };
        anilistCache.set(anilistId, result);
        return result;
    } catch {
        return { malId: null, title: 'Unknown', type: 'anime' };
    }
}

// ─── Main search function ───────────────────────────────────────────

export async function lensSearch(file: File): Promise<LensResult[]> {
    const compressed = await compressImage(file);
    const results = await searchTraceMoe(compressed);

    // Deduplicate by anilist ID (keep highest similarity)
    const seen = new Set<number>();
    const unique = results.filter(r => {
        if (seen.has(r.anilist)) return false;
        seen.add(r.anilist);
        return true;
    });

    // Map AniList IDs to MAL IDs in parallel
    const mapped = await Promise.all(
        unique.map(async (r) => {
            const info = await getMALInfoFromAniList(r.anilist);
            return {
                title: info.title,
                malId: info.malId,
                type: (info.type === 'manga' ? 'manga' : 'anime') as LensResult['type'],
                similarity: Math.round(r.similarity * 100),
                thumbnail: r.image,
                episode: r.episode,
                timestamp: { from: r.from, to: r.to },
                source: 'trace.moe' as const,
            };
        })
    );
    return mapped;
}
