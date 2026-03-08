import Parser from 'rss-parser';
import fetch from 'node-fetch';

const parser = new Parser({
    customFields: {
        item: ['media:content', 'media:thumbnail', 'content:encoded', 'category'],
    }
});

const ANN_FEED = "https://www.animenewsnetwork.com/news/rss.xml";
const selector = ".meat, #maincontent .meat, #maincontent";

async function testANN() {
    try {
        const feed = await parser.parseURL(ANN_FEED);
        const item = feed.items[0];
        console.log("Testing Item:", item.title);
        console.log("Link:", item.link);

        const response = await fetch(item.link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();
        console.log("HTML Length:", html.length);

        const selectors = selector.split(',').map((s) => s.trim());
        let foundBody = null;

        for (const sel of selectors) {
            const isClass = sel.startsWith('.');
            const isId = sel.startsWith('#');
            const name = sel.substring(1);
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Re-evaluating the regex logic
            const regex = isClass 
                ? new RegExp(`<div[^>]+class="[^"]*${escapedName}[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, 'i')
                : isId 
                    ? new RegExp(`<div[^>]+id="${escapedName}"[^>]*>([\\s\\S]*?)<\\/div>`, 'i')
                    : null;
            
            if (regex) {
                console.log("Testing Regex for:", sel);
                const match = html.match(regex);
                if (match) {
                    console.log("Match found for:", sel);
                    foundBody = match[1];
                    break;
                }
            }
        }

        if (foundBody) {
            console.log("Found Body Length:", foundBody.length);
            console.log("First 100 chars of body:", foundBody.substring(0, 100));
        } else {
            console.log("No body found with selectors");
        }

        // Image test
        const genericLogos = [
            'crunchyroll-logo', 'mal-logo', 'ann-logo', 'logo-full', 
            'default-meta', 'favicon', '96x96', 'default-image'
        ];
        
        let imageUrl = null;
        const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/) ||
            html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^">]+)"/);

        if (ogMatch) {
            console.log("OG/Twitter Image found:", ogMatch[1]);
        }

    } catch (e) {
        console.error(e);
    }
}

testANN();
