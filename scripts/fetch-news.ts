import Parser from 'rss-parser';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const parser = new Parser({
    customFields: {
        item: ['media:content', 'media:thumbnail', 'content:encoded', 'category'],
    }
});

const FEEDS = [
    {
        name: "Anime News Network",
        url: "https://www.animenewsnetwork.com/news/rss.xml",
    },
    {
        name: "Crunchyroll News",
        url: "https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss",
    }
];

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

async function fetchAndSaveNews() {
    console.log(`Starting news fetch at ${new Date().toISOString()}`);

    for (const feedConfig of FEEDS) {
        console.log(`Fetching feed: ${feedConfig.name}`);
        try {
            const feed = await parser.parseURL(feedConfig.url);

            for (const item of feed.items) {
                // Skip items that might not have a title or link
                if (!item.title || !item.link) continue;

                const slug = generateSlug(item.title);

                // Check if article already exists
                const docRef = db.collection('news').doc(slug);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    console.log(` - Skipped: ${item.title} (already exists)`);
                    continue;
                }

                // Try extracting an image
                let imageUrl = null;
                if (item['media:content'] && item['media:content'].$) {
                    imageUrl = item['media:content'].$.url;
                } else if (item['media:thumbnail'] && item['media:thumbnail'].$) {
                    imageUrl = item['media:thumbnail'].$.url;
                } else if (item['content:encoded']) {
                    // Basic regex to find first image tag in encoded content
                    const imgMatch = item['content:encoded'].match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) imageUrl = imgMatch[1];
                } else if (item.content) {
                    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) imageUrl = imgMatch[1];
                }

                // fallback: if no image found (common for ANN), try to fetch og:image from the source URL
                if (!imageUrl && item.link) {
                    try {
                        console.log(`   - Scraping og:image for: ${item.link}`);
                        const response = await fetch(item.link);
                        const html = await response.text();
                        const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/);
                        if (ogImageMatch) {
                            imageUrl = ogImageMatch[1];
                            console.log(`     + Found og:image: ${imageUrl}`);
                        }
                    } catch (scrapeError) {
                        console.error(`     ! Error scraping image for ${item.link}:`, scrapeError);
                    }
                }

                // Clean HTML content
                const rawContent = item['content:encoded'] || item.content || item.contentSnippet || '';
                const cleanContent = sanitizeHtml(rawContent, {
                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
                    allowedAttributes: {
                        ...sanitizeHtml.defaults.allowedAttributes,
                        img: ['src', 'alt', 'width', 'height']
                    }
                });

                // Basic Tags extraction
                const tags = item.categories || [];
                // Optional default tag
                if (tags.length === 0) tags.push('News');

                const articleData = {
                    title: item.title,
                    slug: slug,
                    content: cleanContent,
                    contentSnippet: item.contentSnippet || item.title,
                    sourceUrl: item.link,
                    sourceName: feedConfig.name,
                    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
                    tags: tags,
                    imageUrl: imageUrl,
                    createdAt: new Date().toISOString()
                };

                await docRef.set(articleData);
                console.log(` + Saved: ${item.title}`);
            }
        } catch (error) {
            console.error(`Error fetching feed ${feedConfig.name}:`, error);
        }
    }

    console.log('News fetch completed.');
}

fetchAndSaveNews().catch(console.error);
