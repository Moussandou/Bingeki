/**
 * Helpers partagés par les vues du Social Bot (dates, stats, slides).
 */
import type {
    PendingPost, PublishedPost, PostType, PostSourceAnime, PlatformReach, CronHealth, CronId,
} from '@/shared/socialBot';
import type { AnimeSlideData, SlideInputData } from '@/shared/socialTemplates';

const DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export const hourLabel = (d: Date): string =>
    `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : '00'}`;

/** « Aujourd'hui 22h00 », « Demain 19h00 », « mer. 14 oct. · 21h00 ». */
export function formatWhen(ts: number): string {
    if (!ts) return '—';
    const d = new Date(ts);
    const now = new Date();
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDiff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
    if (dayDiff === 0) return `Aujourd'hui ${hourLabel(d)}`;
    if (dayDiff === 1) return `Demain ${hourLabel(d)}`;
    if (dayDiff === -1) return `Hier ${hourLabel(d)}`;
    const dm = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${DAY_NAMES[d.getDay()]} ${dm} · ${hourLabel(d)}`;
}

/** « il y a 4 min », « il y a 2 h », « il y a 3 j ». */
export function formatAgo(ts: number | undefined): string {
    if (!ts) return 'jamais';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'à l\'instant';
    if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
    return `il y a ${Math.floor(diff / 86_400_000)} j`;
}

export const formatCount = (n: number): string =>
    n >= 10_000 ? `${(n / 1000).toFixed(0)} k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} k` : String(n);

/** Données à passer au template HTML des slides (même logique que l'ancien admin). */
export function templateDataFor(post: PendingPost): SlideInputData | null {
    const animes: PostSourceAnime[] | undefined = post.sourceData?.animes;
    const source = post.sourceData as Record<string, unknown>;
    const type: PostType = post.type;
    if (type === 'culture_news') return (source || {}) as unknown as SlideInputData;
    if (!animes || animes.length === 0) return null;
    if (type === 'newseason' || type === 'announcement') return animes[0] as AnimeSlideData;
    if (type === 'announcement_digest') return { animes: animes as unknown as AnimeSlideData[] };
    if (type === 'season_preview') {
        return (source || { animes, seasonLabelFr: 'Saison', year: new Date().getFullYear() }) as unknown as SlideInputData;
    }
    return animes as unknown as AnimeSlideData[];
}

/** « Partie 1/2 » dans le titre des posts daily découpés. */
export function partInfoFor(title: string | undefined): { index: number; total: number } | undefined {
    const m = title?.match(/Partie\s+(\d+)\/(\d+)/i);
    return m ? { index: parseInt(m[1], 10), total: parseInt(m[2], 10) } : undefined;
}

/* --------------------------------------------------------------------------
   Stats
   -------------------------------------------------------------------------- */

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Valeur d'une métrique Buffer. Buffer range ses métriques dans `raw`
 * avec un `type` stable (views, reactions…) et un `name` d'affichage qui
 * change selon le réseau (« Views », « Video Views »…) : on lit d'abord
 * le type, puis les clés à plat en ignorant la casse.
 */
function metric(reach: PlatformReach | undefined, types: string[], names: string[]): number {
    if (!reach) return 0;
    const raw = Array.isArray(reach.raw) ? reach.raw : [];
    for (const t of types) {
        const m = raw.find((x) => x?.type?.toLowerCase() === t.toLowerCase());
        if (m) return num(m.value);
    }
    const wanted = names.map((n) => n.toLowerCase());
    for (const [k, v] of Object.entries(reach)) {
        if (wanted.includes(k.toLowerCase())) return num(v);
    }
    return 0;
}

export const viewsOf = (reach: PlatformReach | undefined): number =>
    metric(reach, ['views', 'videoViews', 'impressions'], ['views', 'video views', 'video_views', 'impressions']);

export const likesOf = (reach: PlatformReach | undefined): number =>
    metric(reach, ['reactions', 'likes'], ['reactions', 'likes']);

export const isManualPost = (p: PublishedPost): boolean =>
    p.results?.insta?.provider === 'manual' || p.results?.tiktok?.provider === 'manual';

/** Paliers de relecture des stats Buffer, comme functions/social/crons/pollReach.js. */
const REACH_MILESTONES = [1, 7];

/** Requêtes Buffer que coûterait un relevé des stats maintenant (Insta seulement,
 *  TikTok est lu via le compte connecté). */
export function pendingReachCalls(posts: PublishedPost[], now = Date.now()): number {
    let calls = 0;
    for (const p of posts) {
        const platforms = p.results?.insta?.id && p.results.insta.provider !== 'manual' ? 1 : 0;
        if (platforms === 0) continue;
        const age = (now - p.publishedAt) / 86_400_000;
        const done = p.reachMilestones ?? [];
        if (REACH_MILESTONES.some((m) => age >= m && !done.includes(m))) calls += platforms;
    }
    return calls;
}

export interface WeekStats {
    published: number;
    byHand: number;
    auto: number;
    tiktokViews: number;
    tiktokViewsPrev: number;
    instaLikes: number;
    instaLikesPrev: number;
    bestHour: { hour: number; avg: number } | null;
}

/** Chiffres des 7 derniers jours, comparés aux 7 jours d'avant. */
export function weekStats(posts: PublishedPost[], now = Date.now()): WeekStats {
    const WEEK = 7 * 86_400_000;
    const cur = posts.filter((p) => p.publishedAt >= now - WEEK);
    const prev = posts.filter((p) => p.publishedAt < now - WEEK && p.publishedAt >= now - 2 * WEEK);
    const sum = (list: PublishedPost[], f: (p: PublishedPost) => number) => list.reduce((acc, p) => acc + f(p), 0);

    const byHour = new Map<number, number[]>();
    for (const p of posts) {
        const v = viewsOf(p.reach?.tiktok);
        if (!v) continue;
        const h = new Date(p.publishedAt).getHours();
        byHour.set(h, [...(byHour.get(h) || []), v]);
    }
    let bestHour: WeekStats['bestHour'] = null;
    for (const [hour, values] of byHour) {
        if (values.length < 2) continue;
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        if (!bestHour || avg > bestHour.avg) bestHour = { hour, avg };
    }

    const byHand = cur.filter(isManualPost).length;
    return {
        published: cur.length,
        byHand,
        auto: cur.length - byHand,
        tiktokViews: sum(cur, (p) => viewsOf(p.reach?.tiktok)),
        tiktokViewsPrev: sum(prev, (p) => viewsOf(p.reach?.tiktok)),
        instaLikes: sum(cur, (p) => likesOf(p.reach?.insta)),
        instaLikesPrev: sum(prev, (p) => likesOf(p.reach?.insta)),
        bestHour,
    };
}

/** « +38 % » / « -12 % » / null si pas de base de comparaison. */
export function trend(cur: number, prev: number): { label: string; up: boolean } | null {
    if (!prev) return null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { label: `${pct >= 0 ? '+' : ''}${pct} %`, up: pct >= 0 };
}

/* --------------------------------------------------------------------------
   Santé des crons
   -------------------------------------------------------------------------- */

export const HEALTH_ORDER: CronId[] = [
    'dailyReleases', 'weeklyRecap', 'communityFavorite', 'newSeasonDetector', 'announcement',
    'seasonPreviewAuto', 'cultureNewsAuto', 'autoPublish', 'pollReach', 'tiktokStats', 'cleanupPending',
];

export function healthSummary(health: Record<string, CronHealth>) {
    const failing = HEALTH_ORDER.filter((id) => health[id]?.lastStatus === 'error');
    return { failing, ok: failing.length === 0 };
}

/* --------------------------------------------------------------------------
   Son suggéré
   -------------------------------------------------------------------------- */

/** « 1: "Same Blue" by Official HiGE DANdism (eps 1-12) » → « "Same Blue" · Official HiGE DANdism ». */
export function cleanThemeLabel(raw: string): string {
    return raw
        .replace(/^\s*\d+\s*:\s*/, '')
        .replace(/\s*\((eps?|episodes?)[^)]*\)\s*$/i, '')
        .replace(/\s+by\s+/i, ' · ')
        .trim();
}
