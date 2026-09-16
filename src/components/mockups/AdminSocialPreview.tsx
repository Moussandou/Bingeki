/**
 * AdminSocialPreview — wrapper around AdminSocial pour la démo Bingeki.
 *
 * Injecte du mock data dans les stores Firestore le temps du preview,
 * puis démonte tout. Utilisé uniquement par /fr/_preview/admin-social
 * pour montrer l'UI à Mouss/l'équipe sans avoir besoin d'être admin
 * connecté ni d'avoir déjà des posts en Firestore.
 *
 * Ce composant sera SUPPRIMÉ avant merge production.
 */
import { useMemo } from 'react';
import AdminSocial from '@/pages/admin/AdminSocial';
import type { PendingPost, PublishedPost, BotConfig } from '@/shared/socialBot';

// Monkey-patch the subscribe helpers via jest.mock-style dynamic import.
// Simpler: re-export a mocked module by aliasing the import path
// through a wrapper. But easier here: intercept via window-scoped flag
// the real subscriptions read.
declare global {
    interface Window {
        __BINGEKI_SOCIAL_MOCK__?: {
            pending: PendingPost[];
            published: PublishedPost[];
            config: BotConfig;
        };
    }
}

const MOCK_PENDING: PendingPost[] = [
    {
        id: 'demo-1', type: 'daily',
        createdAt: Date.now() - 3600_000,
        scheduledAt: Date.now() + 3600_000 * 4,
        status: 'ready',
        title: "Sorties du jour · 12 mars",
        caption: `4 épisodes sont sortis aujourd'hui — et pas des moindres. MHA S8 continue sa dernière saison, Frieren se rapproche du final, One Piece dépasse les 1100 épisodes et Dandadan monte en puissance.

Vous suivez lesquels cette saison ? Dites-nous en commentaires 👇

Toute la liste et vos progressions sur https://bingeki.web.app`,
        hashtags: '#anime #mha #frieren #onepiece #dandadan #bingeki #animefr',
        slides: [
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg', index: 0 },
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', index: 1 },
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg', index: 2 },
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1584/143719l.jpg', index: 3 },
            { format: 'story', url: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg', index: 4 },
            { format: 'story', url: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', index: 5 },
        ],
        sourceData: {
            animeIds: [31964, 52991, 21, 57334],
            animes: [
                { mal_id: 31964, title: 'My Hero Academia', cover: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg', currentEpisode: 12 },
                { mal_id: 52991, title: 'Frieren', cover: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', currentEpisode: 24 },
                { mal_id: 21, title: 'One Piece', cover: 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg', currentEpisode: 1108 },
                { mal_id: 57334, title: 'Dandadan', cover: 'https://cdn.myanimelist.net/images/anime/1584/143719l.jpg', currentEpisode: 9 },
            ],
        },
        platforms: { insta: true, tiktok: true, x: false },
    },
    {
        id: 'demo-2', type: 'newseason',
        createdAt: Date.now() - 7200_000,
        scheduledAt: Date.now() + 3600_000 * 72,
        status: 'ready',
        title: "Chainsaw Man S2 · Announcement",
        caption: `Chainsaw Man revient. Le S2 débarque vendredi et on trépigne autant que vous.

12 épisodes prévus, MAPPA aux commandes, la barre est haute après une S1 à 8.7/10. On l'ajoute déjà à notre liste — et vous ?

Track la saison en direct : https://bingeki.web.app`,
        hashtags: '#chainsawman #mappa #anime2026 #newseason #bingeki',
        slides: [
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg', index: 0 },
        ],
        sourceData: {
            animeIds: [44511],
            animes: [
                { mal_id: 44511, title: 'Chainsaw Man', cover: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg', studios: ['MAPPA'], episodes: 12, score: 8.7 },
            ],
        },
        platforms: { insta: true, tiktok: true, x: false },
    },
    {
        id: 'demo-4', type: 'favorite',
        createdAt: Date.now() - 5400_000,
        scheduledAt: Date.now() + 3600_000 * 8,
        status: 'ready',
        title: 'Coup de cœur · Solo Leveling',
        caption: `Vous avez parlé — et le verdict est sans appel.

Solo Leveling S2 domine la semaine avec 9.6/10 chez nos 3 200 watchers. La barre est officiellement rehaussée pour tout le reste de la saison.

Vous l'avez déjà ajouté à votre liste ? Sinon, c'est ici : https://bingeki.web.app`,
        hashtags: '#sololeveling #coupdecoeur #anime2026 #bingeki #a1pictures',
        slides: [
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1448/147351l.jpg', index: 0 },
        ],
        sourceData: {
            animeIds: [58567],
            animes: [
                { mal_id: 58567, title: 'Solo Leveling', cover: 'https://cdn.myanimelist.net/images/anime/1448/147351l.jpg', avg: 9.6, count: 3200 },
            ],
        },
        platforms: { insta: true, tiktok: true, x: false },
    },
    {
        id: 'demo-3', type: 'weekly',
        createdAt: Date.now() - 10800_000,
        scheduledAt: Date.now() + 3600_000 * 96,
        status: 'ready',
        title: 'Récap semaine 11',
        caption: `Le TOP 3 de la semaine 11 selon vous.

🥇 Frieren — 9.4/10
🥈 Dandadan — 9.1/10
🥉 Blue Lock — 8.9/10

Merci aux 6 800+ watchers qui ont noté leurs épisodes cette semaine. Vous avez fait le classement.

Notez vos épisodes sur https://bingeki.web.app`,
        hashtags: '#animeweeklyrecap #frieren #dandadan #bluelock #bingeki',
        slides: [
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', index: 0 },
        ],
        sourceData: {
            weekNumber: 11,
            animeIds: [52991, 57334, 49596],
            animes: [
                { mal_id: 52991, title: 'Frieren', cover: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', avg: 9.4, count: 2847 },
                { mal_id: 57334, title: 'Dandadan', cover: 'https://cdn.myanimelist.net/images/anime/1584/143719l.jpg', avg: 9.1, count: 2103 },
                { mal_id: 49596, title: 'Blue Lock', cover: 'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg', avg: 8.9, count: 1876 },
            ],
        },
        platforms: { insta: true, tiktok: false, x: false },
    },
];

const MOCK_PUBLISHED: PublishedPost[] = [
    {
        id: 'x1', type: 'daily',
        createdAt: Date.now() - 86400_000,
        scheduledAt: Date.now() - 86400_000,
        status: 'ready',
        title: 'Sorties du jour · 11 mars',
        caption: '', hashtags: '',
        slides: [], sourceData: {},
        platforms: { insta: true, tiktok: false, x: false },
        publishedAt: Date.now() - 86400_000,
        publishedBy: 'demo',
        results: { insta: { id: 'ig1', permalink: '#', publishedAt: Date.now() }, tiktok: null },
        reach: { insta: { impressions: 2300, likes: 180, comments: 12, capturedAt: Date.now() } },
    },
];

const MOCK_CONFIG: BotConfig = {
    enabled: true,
    schedules: {
        daily: { hour: 19, enabled: true },
        weekly: { dayOfWeek: 0, hour: 19, enabled: true },
        favorite: { dayOfWeek: 3, hour: 12, enabled: false },
    },
    platforms: {
        insta: { accountId: 'demo', tokenRef: 'INSTA_PAGE_TOKEN', enabled: true },
        tiktok: { accountId: 'demo', tokenRef: 'TIKTOK_ACCESS_TOKEN', enabled: true },
    },
    gemini: { model: 'gemini-flash-latest', maxPromptTokens: 8000 },
    discordWebhook: '',
};

export default function AdminSocialPreview() {
    // Set the mock BEFORE AdminSocial mounts so subscribe helpers can read it.
    useMemo(() => {
        if (typeof window !== 'undefined') {
            window.__BINGEKI_SOCIAL_MOCK__ = {
                pending: MOCK_PENDING,
                published: MOCK_PUBLISHED,
                config: MOCK_CONFIG,
            };
        }
    }, []);

    return (
        <>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                background: '#FF2E63', color: '#fff', padding: '6px 16px',
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: '0.7rem', letterSpacing: '0.1em', textAlign: 'center',
                borderBottom: '2px solid #000',
            }}>
                MODE PREVIEW — DATA MOCKÉE · À RETIRER AVANT MERGE
            </div>
            <div style={{ paddingTop: '28px' }}>
                <AdminSocial />
            </div>
        </>
    );
}
