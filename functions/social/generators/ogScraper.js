/**
 * generators/ogScraper.js — extrait les métadonnées Open Graph d'une URL.
 *
 * Utilisé par le formulaire "actu culture anime" : l'admin colle une URL
 * (TikTok, article ANN, tweet, page produit officielle…) et on récupère
 * automatiquement l'image (og:image), le titre (og:title) et le nom du
 * site (og:site_name).
 *
 * L'image est ensuite téléchargée et re-uploadée sur Firebase Storage
 * (URL tokenised Meta-compatible) pour éviter les 404 ou les rejets Meta
 * sur les images externes.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { URL } = require('url');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Whitelist de domaines pour lesquels og:site_name est une source légitime
// à afficher (presse / éditeurs officiels). Pour les réseaux sociaux
// (TikTok, IG, Twitter, YouTube d'influenceurs), on ne pré-remplit PAS
// la source — pas de crédit gratuit aux influenceurs.
const LEGIT_SOURCE_DOMAINS = [
    // Presse anime référence
    'animenewsnetwork.com',
    'animecorner.me',
    'animeuknews.net',
    'otakuusamagazine.com',
    'mangamavericks.com',
    'kawaiikakkoiisugoi.com',
    // Éditeurs / studios
    'crunchyroll.com',
    'kadokawa.co.jp', 'kadokawa.com',
    'bandainamco.com', 'bandainamcoent.com', 'bandainamcoent.eu', 'bandaispirits.com',
    'toei-anim.co.jp', 'toei-animation.com',
    'aniplex.co.jp', 'aniplexusa.com',
    'shueisha.co.jp', 'shonenjump.com', 'mangaplus.shueisha.co.jp',
    'kodansha.us', 'kodansha.co.jp',
    'natalie.mu', 'animate.tv',
    // Presse FR
    'numerama.com', 'manga-news.com', 'journaldujapon.com',
    'adala-news.fr', 'mangamag.fr', 'nautiljon.com',
];

function isLegitDomain(host) {
    return LEGIT_SOURCE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

// Endpoints oEmbed publics : servent quand le HTML ne contient pas d'og:image
// (TikTok, IG, YouTube chargent leur contenu via JS).
const OEMBED_ENDPOINTS = {
    'tiktok.com': (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    'youtube.com': (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    'youtu.be':   (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    'vimeo.com':  (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
};

async function fetchOembed(url, host) {
    const builder = Object.entries(OEMBED_ENDPOINTS).find(([d]) => host === d || host.endsWith(`.${d}`))?.[1];
    if (!builder) return null;
    try {
        const res = await fetch(builder(url), {
            headers: { 'User-Agent': UA, Accept: 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return null;
        const json = await res.json();
        return {
            imageUrl: json.thumbnail_url || null,
            title: json.title || null,
            author: json.author_name || null,
        };
    } catch {
        return null;
    }
}

function extractMetaTag(html, prop) {
    // Cherche <meta property="og:xxx" content="..."> ou name="twitter:xxx"
    const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, 'i'),
    ];
    for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].trim();
    }
    return null;
}

function decodeHtmlEntities(s) {
    if (!s) return s;
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

/**
 * Fetch une URL et extrait les meta Open Graph / Twitter.
 * @returns {Promise<{ imageUrl: string|null, title: string|null, siteName: string|null }>}
 */
async function fetchOgMetadata(url) {
    let host;
    try {
        host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        throw new Error(`Invalid URL: ${url}`);
    }

    const res = await fetch(url, {
        headers: {
            'User-Agent': UA,
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Fetch ${url} failed: HTTP ${res.status}`);
    const html = await res.text();

    let rawImage = extractMetaTag(html, 'og:image')
        || extractMetaTag(html, 'twitter:image')
        || extractMetaTag(html, 'twitter:image:src');
    let rawTitle = extractMetaTag(html, 'og:title')
        || extractMetaTag(html, 'twitter:title');
    const rawSiteName = extractMetaTag(html, 'og:site_name');

    // Fallback oEmbed pour TikTok/YouTube/etc. dont le HTML est vide car
    // chargé en JS côté client.
    if (!rawImage) {
        const oembed = await fetchOembed(url, host);
        if (oembed?.imageUrl) {
            rawImage = oembed.imageUrl;
            if (!rawTitle && oembed.title) rawTitle = oembed.title;
        }
    }

    const isLegit = isLegitDomain(host);

    return {
        imageUrl: rawImage ? decodeHtmlEntities(rawImage) : null,
        title: rawTitle ? decodeHtmlEntities(rawTitle) : null,
        siteName: isLegit && rawSiteName ? decodeHtmlEntities(rawSiteName) : null,
        host,
    };
}

/**
 * Télécharge une image via son URL puis la re-upload dans Firebase Storage
 * avec une URL tokenisée Meta-compatible. Retourne { url, contentType, bytes }.
 */
async function downloadAndReuploadImage(imageUrl, storagePath) {
    const res = await fetch(imageUrl, {
        headers: { 'User-Agent': UA, Accept: 'image/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Image fetch failed: HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!/^image\//i.test(contentType)) {
        throw new Error(`Not an image (Content-Type: ${contentType})`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const token = uuidv4();
    await file.save(buffer, {
        metadata: {
            contentType,
            metadata: { firebaseStorageDownloadTokens: token },
        },
        resumable: false,
    });
    const encoded = encodeURIComponent(storagePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
    return { url, contentType, bytes: buffer.length };
}

module.exports = {
    fetchOgMetadata,
    downloadAndReuploadImage,
};
