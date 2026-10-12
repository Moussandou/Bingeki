/**
 * Social Bot — shared types
 *
 * Types partagés entre le front (page /admin/social) et les Cloud
 * Functions (functions/social/*). Voir docs/03-Features/Social-Bot.md
 * pour le contexte et le schéma Firestore complet.
 */

export type PostType = 'daily' | 'weekly' | 'favorite' | 'newseason' | 'announcement' | 'announcement_digest' | 'season_preview' | 'culture_news';

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

    /** Validé par l'admin (mode Manuel) : prêt à être publié depuis le tel. */
    validatedAt?: number;
    /** Réseaux déjà publiés à la main (« J'ai publié »). */
    manualPublished?: { insta?: { publishedAt: number; by: string }; tiktok?: { publishedAt: number; by: string } };
    /** Mode Auto mais Buffer a échoué : le post repasse en Manuel. */
    manualFallback?: boolean;
}

export interface PublishedPost extends PendingPost {
    publishedAt: number;
    publishedBy: string;
    results: {
        insta: { id: string; permalink: string; publishedAt: number; provider?: 'buffer' | 'manual' } | null;
        tiktok: { id: string; publishedAt: number; provider?: 'buffer' | 'manual' } | null;
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

/** 'auto' = Buffer sans validation · 'manual' = validé puis publié à la main · 'off' = plus généré. */
export type PublishMode = 'auto' | 'manual' | 'off';

/** Clés de `config.schedules` pilotées par l'écran Automatisations. */
export type ModeKey = 'daily' | 'weekly' | 'favorite' | 'newseason' | 'announcement' | 'seasonPreview' | 'cultureNewsAuto';

export interface ScheduleEntry {
    enabled?: boolean;
    mode?: PublishMode;
    hour?: number;
    dayOfWeek?: number;
}

export interface BotConfig {
    enabled: boolean;
    schedules: {
        daily: { hour: number; enabled: boolean; mode?: PublishMode };
        weekly: { dayOfWeek: number; hour: number; enabled: boolean; mode?: PublishMode };
        favorite: { dayOfWeek: number; hour: number; enabled: boolean; mode?: PublishMode };
        newseason?: ScheduleEntry;
        announcement?: ScheduleEntry;
        seasonPreview?: ScheduleEntry;
        cultureNewsAuto?: ScheduleEntry;
    };
    /** Mode Auto : si Buffer échoue, le post repasse en Manuel (défaut : oui). */
    fallbackToManual?: boolean;
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
    announcement: 'Prochainement',
    announcement_digest: 'Prochainement · Digest',
    season_preview: 'Preview de saison',
    culture_news: 'Culture anime',
};

export const POST_TYPE_COLORS: Record<PostType, { bg: string; text: string }> = {
    daily: { bg: '#000000', text: '#ffffff' },
    weekly: { bg: '#FF2E63', text: '#ffffff' },
    favorite: { bg: '#08D9D6', text: '#000000' },
    newseason: { bg: '#FF0844', text: '#ffffff' },
    announcement: { bg: '#7c3aed', text: '#ffffff' },
    announcement_digest: { bg: '#7c3aed', text: '#ffffff' },
    season_preview: { bg: '#08D9D6', text: '#000000' },
    culture_news: { bg: '#FBBF24', text: '#000000' },
};

export const FIRESTORE_COLLECTIONS = {
    pendingPosts: 'social_pending_posts',
    publishedPosts: 'social_published_posts',
    botConfig: 'social_bot_config',
    botConfigDoc: 'singleton',
    cronHealth: 'social_cron_health',
    archivedPosts: 'social_archived_posts',
} as const;

export type CronId = 'dailyReleases' | 'weeklyRecap' | 'communityFavorite' | 'newSeasonDetector' | 'announcement' | 'pollReach' | 'cleanupPending' | 'cultureNewsAuto' | 'seasonPreviewAuto' | 'autoPublish' | 'tiktokStats';

export const TYPE_TO_MODE_KEY: Record<PostType, ModeKey> = {
    daily: 'daily',
    weekly: 'weekly',
    favorite: 'favorite',
    newseason: 'newseason',
    announcement: 'announcement',
    announcement_digest: 'announcement',
    season_preview: 'seasonPreview',
    culture_news: 'cultureNewsAuto',
};

export const DEFAULT_MODES: Record<ModeKey, PublishMode> = {
    daily: 'manual',
    weekly: 'manual',
    favorite: 'manual',
    newseason: 'manual',
    announcement: 'manual',
    seasonPreview: 'manual',
    cultureNewsAuto: 'off',
};

/** Même logique que functions/social/shared/modes.js. */
export function getMode(config: BotConfig, key: ModeKey): PublishMode {
    const sched = config.schedules?.[key] as ScheduleEntry | undefined;
    if (sched?.enabled === false) return 'off';
    if (sched?.mode === 'auto' || sched?.mode === 'manual' || sched?.mode === 'off') return sched.mode;
    return DEFAULT_MODES[key];
}

export const CRON_META: Record<CronId, { label: string; schedule: string; description: string }> = {
    dailyReleases:     { label: 'Sorties du jour',      schedule: 'Tous les jours · 10h',       description: 'Génère le carrousel des épisodes du jour.' },
    weeklyRecap:       { label: 'Récap hebdo',          schedule: 'Dimanche · 19h',             description: 'Top 3 anime notés par la communauté cette semaine.' },
    communityFavorite: { label: 'Coup de cœur',         schedule: 'Dimanche · 21h',             description: 'Top 3 épisodes les mieux notés sur MAL cette semaine.' },
    newSeasonDetector: { label: 'Nouvelle saison',      schedule: 'Tous les jours · 8h',        description: 'Détecte les nouvelles saisons qui démarrent aujourd\'hui.' },
    announcement:      { label: 'Prochainement',        schedule: 'Lun / Mer / Ven · 15h',      description: 'Digest des annonces d\'animes à venir.' },
    seasonPreviewAuto: { label: 'Preview de saison',    schedule: '21 mars, juin, sept., déc. · 18h', description: 'Preview de la saison suivante, une dizaine de jours avant.' },
    cultureNewsAuto:   { label: 'Actu culture anime',   schedule: 'Toutes les 6h',              description: 'Surveille des flux RSS et crée des posts d\'actu.' },
    autoPublish:       { label: 'Publication auto',     schedule: 'Toutes les 15 min',          description: 'Publie via Buffer les posts des types en mode Auto.' },
    tiktokStats:       { label: 'Stats TikTok',         schedule: 'Tous les jours · 6h30 et 18h30', description: 'Lit le compte TikTok pour les chiffres des posts publiés à la main.' },
    pollReach:         { label: 'Statistiques',         schedule: 'Tous les jours · 5h',        description: 'Récupère vues et likes des posts publiés via Buffer.' },
    cleanupPending:    { label: 'Nettoyage',            schedule: 'Tous les jours · 4h',        description: 'Archive les posts en attente depuis plus de 3 jours.' },
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
    /** lastRunAt déjà relancé par le watchdog (une seule relance par échec). */
    autoRetriedFor?: number | null;
    lastAutoRetryAt?: number;
}

/** Doc `social_bot_config/tiktok` : compte TikTok connecté (infos publiques). */
export interface TiktokStatus {
    connected?: boolean;
    connectedAt?: number;
    displayName?: string | null;
    avatarUrl?: string | null;
    followerCount?: number;
    likesCount?: number;
    videoCount?: number;
    lastSyncAt?: number;
    lastError?: string | null;
}

/** Doc `social_bot_config/buffer_usage` : appels à l'API Buffer comptés par jour. */
export interface BufferUsage {
    days?: Record<string, number>;
    lastCallAt?: number;
    lastRateLimitAt?: number | null;
    lastHeaders?: Record<string, string>;
}

export const BUFFER_LIMIT_30D = 3000;
export const BUFFER_LIMIT_24H = 250;

/** Doc `social_cron_health/_watchdog` écrit par le cron cronWatchdog. */
export interface WatchdogStatus {
    checkedAt?: number;
    retried?: string[];
    stuck?: string[];
}
