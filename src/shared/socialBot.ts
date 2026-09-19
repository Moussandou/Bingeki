/**
 * Social Bot — shared types
 *
 * Types partagés entre le front (page /admin/social) et les Cloud
 * Functions (functions/social/*). Voir docs/03-Features/Social-Bot.md
 * pour le contexte et le schéma Firestore complet.
 */

export type PostType = 'daily' | 'weekly' | 'favorite' | 'newseason';

export type PostStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type SlideFormat = 'feed' | 'story';

export interface PostSlide {
    format: SlideFormat;
    url: string;
    index: number;
}

export interface PostPlatforms {
    insta: boolean;
    tiktok: boolean;
    x: boolean;
}

export interface PostSourceAnime {
    mal_id?: number;
    title: string;
    cover?: string;
    currentEpisode?: number;
    avg?: number;
    count?: number;
    studios?: string[];
    episodes?: number;
    score?: number;
    airing_from?: string;
}

export interface PostSourceData {
    animeIds?: number[];
    weekNumber?: number;
    stats?: Record<string, unknown>;
    /** Complete anime info snapshotted at cron time so the admin panel can
     *  re-render the slides live (feature added in phase-1 polish v3). */
    animes?: PostSourceAnime[];
}

export interface CaptionVariant {
    caption: string;
    hashtags: string;
    generatedAt: number;
}

export interface PendingPost {
    id: string;
    type: PostType;
    createdAt: number;
    scheduledAt: number;
    status: PostStatus;

    title: string;
    caption: string;
    hashtags: string;

    /** Previous caption+hashtags, kept for A/B comparison after a regenerate. */
    variantB?: CaptionVariant;

    slides: PostSlide[];
    sourceData: PostSourceData;
    platforms: PostPlatforms;

    error?: string;
}

export interface PublishedPost extends PendingPost {
    publishedAt: number;
    publishedBy: string;
    results: {
        insta: { id: string; permalink: string; publishedAt: number } | null;
        tiktok: { id: string; publishedAt: number } | null;
    };
    /** Per-platform error messages from a partial publish. Empty/absent
     *  when everything published cleanly. Present values mean at least
     *  one platform failed and can be retried via socialRetryPublish. */
    errors?: { insta?: string; tiktok?: string } | null;
    lastRetryAt?: number;
    lastRetryBy?: string;
    reach?: {
        insta?: PlatformReach;
        tiktok?: PlatformReach;
    };
}

/** Metrics captured from Buffer's postMetrics query. Buffer returns a
 *  generic `metrics[]` array — we keep the raw list and also flatten
 *  each metric by name for cheap lookup (impressions, reach, likes,
 *  comments, shares, saves, views, etc — set of names depends on the
 *  platform). */
export interface PlatformReach {
    [metric: string]: number | string | BufferMetric[] | null | undefined;
    raw?: BufferMetric[];
    capturedAt?: number;
    metricsUpdatedAt?: string | null;
}

export interface BufferMetric {
    type?: string;
    name: string;
    value: number;
    unit?: string;
}

export interface BotConfig {
    enabled: boolean;
    schedules: {
        daily: { hour: number; enabled: boolean };
        weekly: { dayOfWeek: number; hour: number; enabled: boolean };
        favorite: { dayOfWeek: number; hour: number; enabled: boolean };
    };
    platforms: {
        insta: {
            accountId: string;
            tokenRef: string;
            enabled: boolean;
            /** 'photo' = carousel of feed images (default, fast).
             *  'video' = Reel from a story-slides MP4 (ffmpeg + slower). */
            mode?: 'photo' | 'video';
            /** Buffer channel id for this Instagram account. Required when
             *  publishing via Buffer (BUFFER_API_KEY secret). */
            bufferChannelId?: string;
        };
        tiktok: {
            accountId: string;
            tokenRef: string;
            enabled: boolean;
            /** 'photo' = photo carousel (default, fast, no ffmpeg).
             *  'video' = slideshow MP4 rendered via ffmpeg (heavier). */
            mode?: 'photo' | 'video';
            /** Buffer channel id for this TikTok account. Required when
             *  publishing via Buffer (BUFFER_API_KEY secret). */
            bufferChannelId?: string;
        };
    };
    gemini: {
        model: string;
        maxPromptTokens: number;
    };
    discordWebhook: string;
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
    enabled: false,
    schedules: {
        daily: { hour: 19, enabled: true },
        weekly: { dayOfWeek: 0, hour: 19, enabled: true },
        favorite: { dayOfWeek: 3, hour: 12, enabled: true },
    },
    platforms: {
        insta: { accountId: '', tokenRef: '', enabled: false, mode: 'photo' },
        tiktok: { accountId: '', tokenRef: '', enabled: false, mode: 'photo' },
    },
    gemini: {
        model: 'gemini-flash-latest',
        maxPromptTokens: 8000,
    },
    discordWebhook: '',
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
    daily: 'Sorties du jour',
    weekly: 'Récap hebdo',
    favorite: 'Coup de cœur',
    newseason: 'Nouvelle saison',
};

export const POST_TYPE_COLORS: Record<PostType, { bg: string; text: string }> = {
    daily: { bg: '#000000', text: '#ffffff' },
    weekly: { bg: '#FF2E63', text: '#ffffff' },
    favorite: { bg: '#08D9D6', text: '#000000' },
    newseason: { bg: '#FF0844', text: '#ffffff' },
};

export const FIRESTORE_COLLECTIONS = {
    pendingPosts: 'social_pending_posts',
    publishedPosts: 'social_published_posts',
    botConfig: 'social_bot_config',
    botConfigDoc: 'singleton',
    cronHealth: 'social_cron_health',
    archivedPosts: 'social_archived_posts',
} as const;

export type CronId = 'dailyReleases' | 'weeklyRecap' | 'communityFavorite' | 'newSeasonDetector' | 'pollReach' | 'cleanupPending';

export const CRON_META: Record<CronId, { label: string; schedule: string; description: string }> = {
    dailyReleases:     { label: 'Sorties du jour',      schedule: 'Tous les jours · 10h',       description: 'Top 5 des épisodes qui sortent aujourd\'hui.' },
    weeklyRecap:       { label: 'Récap hebdo',          schedule: 'Dimanche · 19h',             description: 'Top 3 anime notés par la communauté cette semaine.' },
    communityFavorite: { label: 'Coup de cœur',         schedule: 'Dimanche · 21h',             description: 'Top 3 épisodes les mieux notés sur MAL cette semaine.' },
    newSeasonDetector: { label: 'Nouvelle saison',      schedule: 'Tous les jours · 8h',        description: 'Détecte les nouvelles saisons qui démarrent aujourd\'hui.' },
    pollReach:         { label: 'Analytics reach',      schedule: 'Toutes les 6h',              description: 'Poll Buffer pour les métriques à J+1, J+7, J+30.' },
    cleanupPending:    { label: 'Cleanup pending',      schedule: 'Tous les jours · 4h',        description: 'Archive les posts en attente non validés depuis 3 jours.' },
};

export interface CronHealth {
    cronId: CronId;
    lastRunAt?: number;
    lastRunEndAt?: number;
    lastDurationMs?: number;
    lastStatus?: 'running' | 'success' | 'error';
    lastError?: string | null;
    lastPostId?: string | null;
    lastNote?: string | null;
    successCount?: number;
    errorCount?: number;
}
