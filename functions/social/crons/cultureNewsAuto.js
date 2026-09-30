/**
 * cron cultureNewsAuto — surveille automatiquement les flux RSS de
 * sources anime/manga fiables et crée des posts "culture_news" pending
 * pour l'admin.
 *
 * Sources : ANN (US), Journal du Japon (FR), Anime UK News (UK).
 * Manga News (FR) est bloqué WAF (403 systématique) → écarté.
 *
 * Fréquence : toutes les 6h. Max 2 posts par run pour ne pas saturer
 * la queue admin. Dedup par URL via `social_culture_news_seen` en
 * Firestore.
 *
 * Filtre : skip les reviews d'épisodes / recaps / chapitres manga
 * (redondant avec le daily) — on garde les vraies news industrie,
 * jeux, films, goodies, licences.
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchFeed } = require('../generators/rssParser');
const { fetchOgMetadata, downloadAndReuploadImage } = require('../generators/ogScraper');
const { inferCultureNewsFields } = require('../generators/gemini');
const { runCultureNews } = require('./cultureNews');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const FEEDS = [
    // === Sources FR (priorité pour la commu FR) ===
    // Adala News : scoops anime FR ("adaptation annoncée", "S3 confirmée")
    { name: 'Adala News', url: 'https://adala-news.fr/feed/' },
    // Mangamag : anime/manga FR (dates films, formes DBZ, etc.)
    { name: 'Mangamag', url: 'https://mangamag.fr/feed/' },
    // Numerama pop culture : news culturelles FR (Netflix, films, séries)
    { name: 'Numerama pop', url: 'https://www.numerama.com/pop-culture/feed/' },
    // Journal du Japon : culture japonaise FR, plus analyse mais légit
    { name: 'Journal du Japon', url: 'https://www.journaldujapon.com/feed/' },
    // === Sources EN (compléments) ===
    // ANN parfois OK selon load Cloudflare
    { name: 'ANN', url: 'https://www.animenewsnetwork.com/all/rss.xml' },
    // Anime Corner : news anime EN (visuels, teasers)
    { name: 'Anime Corner', url: 'https://animecorner.me/feed/' },
    // MangaMavericks : interviews mangaka + sorties
    { name: 'MangaMavericks', url: 'https://mangamavericks.com/feed/' },
    // Anime UK News : reviews + news (filtré côté SKIP_PATTERNS)
    { name: 'Anime UK News', url: 'https://animeuknews.net/feed/' },
];

// Max posts créés par run. 5 = suffisant pour rattraper les news
// récentes sans trop saturer la queue (le cron tourne toutes les 6h).
const MAX_PER_RUN = 5;

// Items considérés comme non pertinents (review d'épisode, chapitre
// manga, recap…) : redondants avec le cron daily ou trop niches. On
// détecte via keywords dans le titre (case-insensitive).
const SKIP_TITLE_PATTERNS = [
    /\bepisode\s+\d+/i,
    /\bépisode\s+\d+/i,
    /\bchapter\s+\d+/i,
    /\bchapitre\s+\d+/i,
    /\brecap\b/i,
    /\bthis week in anime\b/i,
    /\bpreview guide\b/i,
    /manga review\b/i,
    /\banime review\b/i,
    // Reviews de volumes : "Volume 5 Review", "Volumes 4, 5 and 6 Review",
    // "Volumes 6 and 7 Review".
    /\bvol(?:ume)?s?\.?\s*\d+[\d,\s\-–]*\s*(?:and|et|&)?\s*\d*\s*review\b/i,
    // Sujets non-anime : culture japonaise générale, cuisine, tourisme,
    // opinion sociétale. Filet basique — Gemini "relevant: false" affine.
    /\bcéramique\b/i,
    /\btouristique\b/i,
    /\bséjour\s+au\s+japon\b/i,
    /\bappartient\s+la\s+voix\b/i,
];

const COLLECTION_SEEN = 'social_culture_news_seen';

function urlKey(url) {
    return crypto.createHash('sha1').update(url).digest('hex').slice(0, 24);
}

async function isSeen(db, url) {
    const doc = await db.collection(COLLECTION_SEEN).doc(urlKey(url)).get();
    return doc.exists;
}

async function markSeen(db, url, title, postId) {
    await db.collection(COLLECTION_SEEN).doc(urlKey(url)).set({
        url,
        title: title.slice(0, 200),
        seenAt: Date.now(),
        postId: postId || null,
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
 * Traite un item RSS : og scrape → download image → Gemini infer →
 * runCultureNews. Retourne le postId créé ou null si l'item a été
 * skippé (source non identifiable, image manquante, etc.).
 */
async function processItem(item) {
    console.log(`[cultureNewsAuto] processing: ${item.title.slice(0, 80)}`);

    const meta = await fetchOgMetadata(item.url).catch((err) => {
        console.warn(`[cultureNewsAuto] og fetch failed for ${item.url}:`, err.message);
        return null;
    });
    if (!meta?.imageUrl) {
        console.log(`[cultureNewsAuto] skip: no image on ${item.url}`);
        return null;
    }

    const inferred = await inferCultureNewsFields({
        title: meta.title || item.title,
        description: item.description,
        host: meta.host,
        siteName: meta.siteName,
    }).catch((err) => {
        console.warn(`[cultureNewsAuto] Gemini infer failed:`, err.message);
        return { category: 'other', source: '', description: '', relevant: null, hype: null };
    });

    // Skip si Gemini a explicitement marqué non pertinent (only when Gemini
    // succeeded — relevant=null means Gemini failed, we let it pass with
    // the fallback below).
    if (inferred.relevant === false) {
        console.log(`[cultureNewsAuto] skip: Gemini marked as non-relevant → ${item.title.slice(0, 60)}`);
        return null;
    }

    // Skip si le sujet n'a pas assez d'impact (hype < 6). Un fan qui
    // scrolle Insta doit s'arrêter sur le post → on garde que ce qui
    // vaut la peine. hype=null (Gemini raté) laisse passer pour
    // dégrader gracieusement — les autres garde-fous continuent.
    const MIN_HYPE = 6;
    if (typeof inferred.hype === 'number' && inferred.hype < MIN_HYPE) {
        console.log(`[cultureNewsAuto] skip: hype=${inferred.hype} < ${MIN_HYPE} → ${item.title.slice(0, 60)}`);
        return null;
    }

    const finalSource = (meta.siteName || inferred.source || '').trim();
    if (!finalSource) {
        console.log(`[cultureNewsAuto] skip: no reliable source for ${item.url}`);
        return null;
    }

    // Si Gemini a raté, on utilise la description RSS de l'item comme
    // fallback : mieux que rien, souvent 1-2 phrases utiles écrites par
    // la rédaction du site source. On nettoie les suffixes WordPress
    // classiques ("L'article X est apparu en premier sur Y", "The post
    // X appeared first on Y").
    let finalDescription = inferred.description || '';
    if (!finalDescription && item.description) {
        finalDescription = item.description
            .replace(/L[’']article\s+.+?est apparu en premier sur.*$/is, '')
            .replace(/The post\s+.+?appeared first on.*$/is, '')
            .replace(/Cet article\s+.+?est apparu en premier sur.*$/is, '')
            .replace(/\s*\[[\s\S]*?\]\s*$/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240);
    }

    const ext = (meta.imageUrl.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1] || 'jpg').toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const suffix = Math.random().toString(36).slice(2, 10);
    const path = `social/${today}/culture_news/auto-${suffix}.${ext}`;
    let uploaded;
    try {
        uploaded = await downloadAndReuploadImage(meta.imageUrl, path);
    } catch (err) {
        console.warn(`[cultureNewsAuto] image upload failed:`, err.message);
        return null;
    }

    const cleanTitle = (meta.title || item.title || '')
        .replace(/#\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);

    const result = await runCultureNews({
        category: inferred.category,
        title: cleanTitle,
        description: finalDescription,
        imageUrl: uploaded.url,
        source: finalSource,
    });
    return result.postId || null;
}

async function runCultureNewsAuto() {
    return withCronHealth('cultureNewsAuto', async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) {
            console.log('[social/cultureNewsAuto] skipped — kill-switch');
            return { note: 'skipped: kill-switch' };
        }
        if (config?.schedules?.cultureNewsAuto?.enabled === false) {
            console.log('[social/cultureNewsAuto] skipped — disabled in config');
            return { note: 'skipped: disabled in config' };
        }

        const db = admin.firestore();

        // 1) Collecte tous les items de tous les feeds
        const allItems = [];
        for (const feed of FEEDS) {
            try {
                const items = await fetchFeed(feed.url);
                console.log(`[cultureNewsAuto] ${feed.name}: ${items.length} items`);
                for (const it of items) {
                    allItems.push({ ...it, feedName: feed.name });
                }
            } catch (err) {
                console.warn(`[cultureNewsAuto] ${feed.name} failed:`, err.message);
            }
        }
        if (allItems.length === 0) {
            return { note: 'no items from any feed' };
        }

        // 2) Filtre pertinence + dedup
        const eligible = [];
        for (const it of allItems) {
            if (!isRelevantTitle(it.title)) continue;
            if (await isSeen(db, it.url)) continue;
            eligible.push(it);
        }
        console.log(`[cultureNewsAuto] eligible after filter+dedup: ${eligible.length}/${allItems.length}`);

        if (eligible.length === 0) {
            return { note: 'no eligible items' };
        }

        // 3) Prend les N plus récents (tri par pubDate desc si possible)
        eligible.sort((a, b) => {
            const ta = Date.parse(a.pubDate) || 0;
            const tb = Date.parse(b.pubDate) || 0;
            return tb - ta;
        });
        const picks = eligible.slice(0, MAX_PER_RUN);

        // 4) Traite chaque pick (og + gemini + create), marque comme seen
        //    quoi qu'il arrive pour éviter de retenter en boucle.
        const created = [];
        for (const item of picks) {
            let postId = null;
            try {
                postId = await processItem(item);
            } catch (err) {
                console.warn(`[cultureNewsAuto] processItem failed for ${item.url}:`, err.message);
            }
            await markSeen(db, item.url, item.title, postId);
            if (postId) created.push(postId);
        }

        return {
            postId: created[0] || null,
            note: `${created.length}/${picks.length} posts créés (${eligible.length - picks.length} en attente pour le prochain run)`,
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
