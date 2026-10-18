/**
 * cron cultureNewsAuto — annonces anime/manga qui font réagir les fans.
 *
 * Trois filtres, du moins cher au plus cher :
 *   1. Sources 100 % anime/manga (MyAnimeList News, Adala News, Anime
 *      Corner) : plus de sites généralistes qui ramenaient GTA ou Netflix.
 *   2. Gemini classe la news : seules les annonces « waouh » passent
 *      (suite, adaptation, film, trailer/date, retour, fin, record).
 *      Casting, doubleurs, jeux vidéo, goodies, événements : rejetés.
 *   3. L'œuvre doit être connue : popularité AniList >= MIN_POPULARITY.
 *
 * Les candidats retenus sont classés (hype × popularité) et seul le
 * meilleur devient un post, au plus un par jour, et jamais deux fois la
 * même œuvre en une semaine. Tout ce qui a été lu est marqué vu dans
 * `social_culture_news_seen` pour ne pas le relire.
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { getModeForKey } = require('../shared/modes');
const { fetchFeed } = require('../generators/rssParser');
const { fetchOgMetadata, downloadAndReuploadImage } = require('../generators/ogScraper');
const { inferHypeNews } = require('../generators/gemini');
const { fetchWorkPopularity } = require('../generators/anilist');
const { runCultureNews } = require('./cultureNews');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const FEEDS = [
    // Toutes les news anime/manga, très complet, titres explicites.
    { name: 'MyAnimeList', url: 'https://myanimelist.net/rss/news.xml' },
    // Annonces anime en français (adaptations, trailers, dates).
    { name: 'Adala News', url: 'https://adala-news.fr/feed/' },
    // Visuels, teasers et annonces anime (EN).
    { name: 'Anime Corner', url: 'https://animecorner.me/feed/' },
];

// Œuvres suivies par au moins 30 000 membres AniList : Dr. Stone (~90k),
// Les Carnets de l'Apothicaire (~47k), Naruto (~730k) passent ; les
// isekai inconnus restent dehors.
const MIN_POPULARITY = 30_000;
const MIN_HYPE = 6;
// Gemini lit au plus ce nombre de news par passage (les plus récentes),
// en un seul appel.
const MAX_CLASSIFIED_PER_RUN = 25;
const ONE_DAY = 86_400_000;
// Une actu n'en est plus une après 2 jours : les flux gardent des news
// d'une semaine ou plus.
const MAX_AGE_MS = 2 * ONE_DAY;
// Au plus un post d'actu par jour, et pas deux fois la même œuvre en 7 jours.
const MIN_GAP_MS = 20 * 3600_000;
const SAME_WORK_GAP_MS = 7 * ONE_DAY;

// Filet avant Gemini : ce qui n'est jamais une annonce « waouh ».
const SKIP_TITLE_PATTERNS = [
    /\bepisode\s+\d+/i,
    /\bépisode\s+\d+/i,
    /\bchapter\s+\d+/i,
    /\bchapitre\s+\d+/i,
    /\brecap\b/i,
    /\breview\b/i,
    /\bcritique\b/i,
    /\bpreview guide\b/i,
    /\b(additional|main)\s+cast\b/i,
    /\bmarriage\b|\bmariage\b/i,
    /\bfigure\b|\bfigurine\b/i,
];

const COLLECTION_SEEN = 'social_culture_news_seen';

function urlKey(url) {
    return crypto.createHash('sha1').update(url).digest('hex').slice(0, 24);
}

async function isSeen(db, url) {
    const doc = await db.collection(COLLECTION_SEEN).doc(urlKey(url)).get();
    return doc.exists;
}

async function markSeen(db, url, title, extra = {}) {
    await db.collection(COLLECTION_SEEN).doc(urlKey(url)).set({
        url,
        title: title.slice(0, 200),
        seenAt: Date.now(),
        postId: null,
        ...extra,
    });
}

function isRelevantTitle(title) {
    if (!title || title.length < 5) return false;
    for (const re of SKIP_TITLE_PATTERNS) {
        if (re.test(title)) return false;
    }
    return true;
}

/**
 * Filtre 3 sur une news déjà classée par Gemini : vérifie la popularité
 * de l'œuvre. Retourne le candidat avec son score, ou { reject } avec la
 * raison (gardée dans les news vues pour comprendre les choix du bot).
 */
async function evaluateItem(item, news) {
    if (news.event === 'none') return { reject: 'pas une annonce' };
    if (typeof news.hype === 'number' && news.hype < MIN_HYPE) return { reject: `hype ${news.hype}` };
    if (!news.work) return { reject: 'œuvre inconnue' };

    const media = await fetchWorkPopularity(news.work).catch(() => null);
    if (!media) return { reject: `introuvable sur AniList (${news.work})` };
    if (media.popularity < MIN_POPULARITY) return { reject: `peu connu (${media.popularity})`, media };

    const score = (news.hype || MIN_HYPE) * Math.log10(media.popularity);
    return { item, news, media, score };
}

/** Image du post : celle de l'article, sinon la bannière AniList de l'œuvre. */
async function uploadImage(candidate) {
    const meta = await fetchOgMetadata(candidate.item.url).catch(() => null);
    const sources = [meta?.imageUrl, candidate.media.imageUrl].filter(Boolean);
    const today = new Date().toISOString().slice(0, 10);
    for (const src of sources) {
        const ext = (src.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1] || 'jpg').toLowerCase();
        const path = `social/${today}/culture_news/auto-${Math.random().toString(36).slice(2, 10)}.${ext}`;
        try {
            return { url: (await downloadAndReuploadImage(src, path)).url, siteName: meta?.siteName || '' };
        } catch (err) {
            console.warn(`[cultureNewsAuto] image ${src} failed:`, err.message);
        }
    }
    return null;
}

/** Œuvres déjà postées récemment et heure du dernier post d'actu. */
async function recentPosts(db, now) {
    const snap = await db.collection(COLLECTION_SEEN)
        .where('seenAt', '>=', now - SAME_WORK_GAP_MS)
        .get();
    const works = new Set();
    let lastPostAt = 0;
    for (const doc of snap.docs) {
        const d = doc.data();
        if (!d.postId) continue;
        if (d.anilistId) works.add(d.anilistId);
        lastPostAt = Math.max(lastPostAt, d.seenAt || 0);
    }
    return { works, lastPostAt };
}

async function runCultureNewsAuto() {
    return withCronHealth('cultureNewsAuto', async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) return { note: 'skipped: kill-switch' };
        if (getModeForKey(config, 'cultureNewsAuto') === 'off') return { note: 'skipped: disabled in config' };

        const db = admin.firestore();
        const now = Date.now();

        // 1) Sources anime/manga
        const allItems = [];
        for (const feed of FEEDS) {
            try {
                const items = await fetchFeed(feed.url);
                for (const it of items) allItems.push({ ...it, feedName: feed.name });
            } catch (err) {
                console.warn(`[cultureNewsAuto] ${feed.name} failed:`, err.message);
            }
        }
        if (allItems.length === 0) return { note: 'aucune news lue' };

        const fresh = [];
        for (const it of allItems) {
            if (!it.url || !isRelevantTitle(it.title)) continue;
            const published = Date.parse(it.pubDate);
            if (published && now - published > MAX_AGE_MS) continue;
            if (await isSeen(db, it.url)) continue;
            fresh.push(it);
        }
        fresh.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
        const batch = fresh.slice(0, MAX_CLASSIFIED_PER_RUN);
        if (batch.length === 0) return { note: `0 nouvelle news sur ${allItems.length}` };

        // 2) + 3) Classement Gemini et popularité AniList
        const candidates = [];
        const rejected = [];
        let classified;
        try {
            classified = await inferHypeNews(
                batch.map((it) => ({ title: it.title, description: it.description, siteName: it.feedName })),
                config,
            );
        } catch (err) {
            // Gemini indisponible (quota…) : rien n'est marqué vu, le passage suivant reprendra.
            console.warn('[cultureNewsAuto] Gemini classification failed:', err.message);
            return { note: `tri Gemini impossible, réessai au prochain passage · ${err.message.slice(0, 80)}` };
        }
        let failed = 0;
        for (const [i, item] of batch.entries()) {
            if (!classified[i]) { failed += 1; continue; }
            const res = await evaluateItem(item, classified[i]);
            if (res.reject) {
                rejected.push(item);
                await markSeen(db, item.url, item.title, { verdict: res.reject, anilistId: res.media?.id || null });
            } else {
                candidates.push(res);
            }
        }

        // 4) Le meilleur seulement, une fois par jour, jamais la même œuvre en 7 jours
        const { works, lastPostAt } = await recentPosts(db, now);
        candidates.sort((a, b) => b.score - a.score);
        const waitDay = now - lastPostAt < MIN_GAP_MS;
        let created = null;
        for (const c of candidates) {
            const verdict = { anilistId: c.media.id, popularity: c.media.popularity, event: c.news.event, hype: c.news.hype };
            if (created || waitDay || works.has(c.media.id)) {
                await markSeen(db, c.item.url, c.item.title, {
                    ...verdict,
                    verdict: works.has(c.media.id) ? 'œuvre déjà postée cette semaine' : 'une meilleure news passe avant',
                });
                continue;
            }
            const image = await uploadImage(c);
            if (!image) {
                await markSeen(db, c.item.url, c.item.title, { ...verdict, verdict: 'pas d\'image' });
                continue;
            }
            const result = await runCultureNews({
                category: c.news.event,
                title: c.news.headline || c.item.title.slice(0, 140),
                description: c.news.description,
                imageUrl: image.url,
                source: c.news.source || image.siteName || c.item.feedName,
            });
            created = result.postId || null;
            await markSeen(db, c.item.url, c.item.title, { ...verdict, verdict: 'retenue', postId: created });
        }

        const best = candidates[0];
        return {
            postId: created,
            note: created
                ? `retenue : ${best.news.headline} (${best.media.popularity} suiveurs) · ${candidates.length - 1} autre(s) candidate(s) · ${rejected.length} rejetée(s)`
                : `aucun post · ${candidates.length} candidate(s)${waitDay ? ' (déjà une actu aujourd\'hui)' : ''} · ${rejected.length} rejetée(s) sur ${batch.length}${failed ? ` · ${failed} non lue(s) (Gemini)` : ''}`,
        };
    });
}

exports.runCultureNewsAuto = runCultureNewsAuto;
exports.cultureNewsAuto = onSchedule(
    {
        // Toutes les 6h (00:15, 06:15, 12:15, 18:15 Europe/Paris)
        schedule: '15 */6 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
        memory: '1GiB',
        timeoutSeconds: 540,
    },
    runCultureNewsAuto,
);
