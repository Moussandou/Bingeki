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

export interface PostSourceData {
    animeIds?: number[];
    weekNumber?: number;
    stats?: Record<string, unknown>;
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
    reach?: {
        insta?: { impressions: number; likes: number; comments: number; capturedAt: number };
        tiktok?: { views: number; likes: number; capturedAt: number };
    };
}

export interface BotConfig {
    enabled: boolean;
    schedules: {
        daily: { hour: number; enabled: boolean };
        weekly: { dayOfWeek: number; hour: number; enabled: boolean };
        favorite: { dayOfWeek: number; hour: number; enabled: boolean };
    };
    platforms: {
        insta: { accountId: string; tokenRef: string; enabled: boolean };
        tiktok: { accountId: string; tokenRef: string; enabled: boolean };
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
        insta: { accountId: '', tokenRef: '', enabled: false },
        tiktok: { accountId: '', tokenRef: '', enabled: false },
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
} as const;
