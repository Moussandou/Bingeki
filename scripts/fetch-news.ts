import Parser from 'rss-parser';
import admin from 'firebase-admin';
import sanitizeHtml from 'sanitize-html';
import * as dotenv from 'dotenv';

dotenv.config();

// We need a service account key to write to Firestore from a Node script.
// In GitHub Actions, this will be passed via environment variables.
const serviceAccountKeyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_BINGEKI;

if (!serviceAccountKeyStr) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_BINGEKI in environment variables.");
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKeyStr);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const parser = new Parser({
    customFields: {
        item: ['media:content', 'media:thumbnail', 'content:encoded', 'category'],
    }
});

const FEEDS = [
    {
        name: "Anime News Network",
        url: "https://www.animenewsnetwork.com/news/rss.xml",
        selector: ".meat, #maincontent .meat, #maincontent",
        limit: 15
    },
    {
        name: "Crunchyroll News",
        url: "https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss",
        selector: ".article_mainlayout__MokpK, .article_view__content, .article-body",
        limit: 15
    },
    {
        name: "MyAnimeList News",
        url: "https://myanimelist.net/rss/news.xml",
        limit: 15
    }
];

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

async function processItem(item: any, feedConfig: any, forceUpdate: boolean) {
    if (!item.title || !item.link) return;

    const slug = generateSlug(item.title);
    const docRef = db.collection('news').doc(slug);
    const docSnap = await docRef.get();

    if (docSnap.exists && !forceUpdate) {
        console.log(` - Skipped: ${item.title}`);
        return;
    }

    // 0. High Priority: RSS Metadata Image (media:thumbnail or media:content)
    // Crunchyroll provides high-quality images directly in the feed
    let imageUrl: string | null = null;
    if (item['media:thumbnail'] && item['media:thumbnail'].$) imageUrl = item['media:thumbnail'].$.url;
    else if (item['media:content'] && item['media:content'].$) imageUrl = item['media:content'].$.url;

    let fullContent = item['content:encoded'] || item.content || item.contentSnippet || '';

    // Content & Image Extraction via Scraping
    try {
        const response = await fetch(item.link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();

        // 1. Better Image Scraping (og:image or twitter:image)
        const genericLogos = [
            'crunchyroll-logo', 'mal-logo', 'ann-logo', 'logo-full', 
            'default-meta', 'favicon', '96x96', 'default-image'
        ];
        
        // Only try scraping if we don't have an image OR the current one looks generic
        const currentIsGeneric = !!(imageUrl && genericLogos.some(logo => imageUrl!.toLowerCase().includes(logo)));
        
        if (!imageUrl || currentIsGeneric) {
            const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/) ||
                html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^">]+)"/);

            if (ogMatch) {
                const foundUrl = ogMatch[1];
                const isGeneric = genericLogos.some(logo => foundUrl.toLowerCase().includes(logo));
                if (!isGeneric) {
                    imageUrl = foundUrl;
                }
            }
        }

        // 2. Full Content Scraping
        if (feedConfig.selector) {
            // Try specific selectors first
            const selectors = feedConfig.selector.split(',').map((s: string) => s.trim());
            let foundBody = null;

            for (const selector of selectors) {
                const isClass = selector.startsWith('.');
                const isId = selector.startsWith('#');
                const name = selector.substring(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                // Use a non-greedy match for the content and allow more flexibility in the div attributes
                const regex = isClass 
                    ? new RegExp(`<div[^>]+class="[^"]*${name}[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, 'i')
                    : isId 
                        ? new RegExp(`<div[^>]+id="${name}"[^>]*>([\\s\\S]*?)<\\/div>`, 'i')
                        : null;
                
                if (regex) {
                    const match = html.match(regex);
                    if (match) {
                        foundBody = match[1];
                        // If it's a very short body, keep looking for a better match
                        if (foundBody.length > 200) break;
                    }
                }
            }

            if (foundBody) {
                let scrapedBody = foundBody
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
                    .replace(/<div class="ad-container"[\s\S]*?<\/div>/gi, '');

                // ANN specific: restore data-src images if they exist
                scrapedBody = scrapedBody.replace(/<img[^>]+data-src="([^">]+)"[^>]*>/gi, '<img src="$1">');

                if (scrapedBody.length > fullContent.length) {
                    fullContent = scrapedBody;
                }
            } else if (html.includes('id="maincontent"') || html.includes('class="meat"')) {
                // Fallback for ANN specifically if the regex above fails
                const bodyMatch = html.match(/<div[^>]+class="meat"[^>]*>([\s\S]*?)<\/div>/) ||
                    html.match(/<div[^>]+id="maincontent"[^>]*>([\s\S]*?)<\/div>/);

                if (bodyMatch) {
                    let scrapedBody = bodyMatch[1]
                        .replace(/<script[\s\S]*?<\/script>/gi, '')
                        .replace(/<aside[\s\S]*?<\/aside>/gi, '')
                        .replace(/<div class="ad-container"[\s\S]*?<\/div>/gi, '');

                    scrapedBody = scrapedBody.replace(/<img[^>]+data-src="([^">]+)"[^>]*>/gi, '<img src="$1">');

                    if (scrapedBody.length > fullContent.length) {
                        fullContent = scrapedBody;
                    }
                }
            }
        }

        // 3. Fallback Image from body if metadata was generic or missing
        if (!imageUrl || genericLogos.some(logo => imageUrl!.toLowerCase().includes(logo))) {
            // Priority to non-spacer images
            const imgMatches = fullContent.match(/<img[^>]+src="([^">]+)"/g);
            if (imgMatches) {
                for (const imgTag of imgMatches) {
                    const srcMatch = imgTag.match(/src="([^">]+)"/);
                    if (srcMatch && !srcMatch[1].includes('spacer.gif')) {
                        imageUrl = srcMatch[1];
                        break;
                    }
                }
            }
        }

    } catch (scrapeError) {
        console.error(`     ! Error scraping ${item.link}`);
    }

    function formatContent(html: string): string {
        // Remove hidden spans used for layout preservation (common in ANN)
        let clean = html.replace(/<span[^>]+style="display:\s*none;?"[^>]*>[\s\S]*?<\/span>/gi, '');
        // Remove fr-mk spans (Froala editor markers) that leak into content
        clean = clean.replace(/<span[^>]*class="fr-mk"[^>]*>[\s\S]*?<\/span>/gi, '');
        // Remove any empty spans
        clean = clean.replace(/<span[^>]*>\s*(&nbsp;)?\s*<\/span>/gi, '');
        // Remove images with broken/missing src or tiny tracking pixels
        clean = clean.replace(/<img[^>]*src=""[^>]*>/gi, '');
        clean = clean.replace(/<img[^>]*src="data:[^"]*"[^>]*>/gi, '');
        clean = clean.replace(/<img[^>]*(width="1"|height="1")[^>]*>/gi, '');
        clean = clean.replace(/\r\n/g, '\n');

        // If it's already structured with MANY paragraphs, return it
        const pCount = (clean.match(/<p>/g) || []).length;
        if (pCount > 3) return clean;

        // Otherwise, it might be a block of text or poorly structured
        // Strip existing basic tags that might interfere with block splitting
        const textOnly = clean.replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');

        return textOnly
            .split(/\n+/)
            .map(para => {
                const trimmed = para.trim()
                    .replace(/^<[^>]+>/, '') // Strip leading tags
                    .replace(/<[^>]+>$/, ''); // Strip trailing tags
                if (!trimmed || trimmed.length < 5) return '';

                // If it looks like a heading (short, no period, starts with caps)
                if (trimmed.length < 100 && !trimmed.endsWith('.') && trimmed.match(/^[A-Z]/)) {
                    return `<h2>${trimmed}</h2>`;
                }
                return `<p>${trimmed}</p>`;
            })
            .filter(p => p !== '')
            .join('\n');
    }

    const structuredContent = formatContent(fullContent);
    const cleanContent = sanitizeHtml(structuredContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h2', 'h3', 'blockquote', 'div']),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt', 'width', 'height'],
            div: ['class', 'id']
        }
    });

    const tags = item.categories || [];
    if (tags.length === 0) tags.push('News');

    const articleData = {
        title: item.title,
        slug: slug,
        content: cleanContent,
        contentSnippet: (item.contentSnippet || item.title).substring(0, 300),
        sourceUrl: item.link,
        sourceName: feedConfig.name,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        tags: tags,
        imageUrl: imageUrl,
        createdAt: docSnap.exists ? (docSnap.data()?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await docRef.set(articleData);
    console.log(` + ${docSnap.exists ? 'Refreshed' : 'Saved'}: ${item.title}`);
}

async function cleanupOldSources() {
    console.log('Starting cleanup of legacy sources...');
    const currentSources = FEEDS.map(f => f.name);
    const snapshot = await db.collection('news').get();

    let deletedCount = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (!currentSources.includes(data.sourceName)) {
            batch.delete(doc.ref);
            deletedCount++;
        }
    });

    if (deletedCount > 0) {
        await batch.commit();
        console.log(`Successfully deleted ${deletedCount} legacy articles.`);
    } else {
        console.log('No legacy articles to clean up.');
    }
}

async function fetchAndSaveNews() {
    // FORCE_UPDATE is now true by default to ensure quality refresh, but can be overridden
    const forceUpdate = process.env.FORCE_UPDATE_NEWS !== 'false';
    console.log(`Starting optimized news fetch (Force Update: ${forceUpdate})`);

    // Clean up old sources first
    await cleanupOldSources();

    for (const feedConfig of FEEDS) {
        console.log(`Processing feed: ${feedConfig.name}`);
        try {
            const feed = await parser.parseURL(feedConfig.url);
            const itemsToProcess = feed.items.slice(0, feedConfig.limit || 15);

            // Parallel processing for speed
            await Promise.all(itemsToProcess.map(item => processItem(item, feedConfig, forceUpdate)));

        } catch (error) {
            console.error(`Error processing feed ${feedConfig.name}:`, error);
        }
    }
    console.log('News fetch completed successfully.');
    
    // Explicitly close the admin app to release its resources/connections
    await admin.app().delete();
    process.exit(0);
}

fetchAndSaveNews().catch(async (error) => {
    console.error('Fatal error in fetchAndSaveNews:', error);
    try {
        await admin.app().delete();
    } catch (e) {}
    process.exit(1);
});
