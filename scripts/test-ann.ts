import Parser from 'rss-parser';

const parser = new Parser({
    customFields: {
        item: ['media:content', 'media:thumbnail', 'content:encoded', 'category'],
    }
});

async function main() {
    const feed = await parser.parseURL('https://www.animenewsnetwork.com/news/rss.xml');
    console.log(JSON.stringify(feed.items[0], null, 2));
}

main().catch(console.error);
