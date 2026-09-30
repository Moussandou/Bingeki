/**
 * generators/rssParser.js — parse simple des flux RSS/Atom.
 *
 * Utilisé par le cron cultureNewsAuto pour lire ANN, Manga News et
 * Journal du Japon sans dépendance lourde. Regex-based pour rester
 * léger — pas parfait mais suffisant pour nos 3 sources.
 */

// UA Chrome complet : certains sites (Manga News p.ex.) bloquent les
// User-Agents "bot" évidents avec du 403 côté Cloudflare/WAF.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function stripHtml(s) {
    if (!s) return '';
    return s
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTag(xml, tag) {
    // Ordre : essaie <tag>…</tag>, puis <tag …>…</tag>
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = xml.match(re);
    return m ? m[1] : null;
}

function extractItems(xml) {
    // RSS classique : <item>…</item>, Atom : <entry>…</entry>
    const items = [];
    const itemRe = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = itemRe.exec(xml)) !== null) {
        items.push(match[2]);
    }
    return items;
}

function itemUrl(item) {
    // RSS : <link>…</link>. Atom : <link href="…"/>.
    const linkTag = extractTag(item, 'link');
    if (linkTag) return stripHtml(linkTag);
    const hrefMatch = item.match(/<link[^>]+href=["']([^"']+)["']/i);
    return hrefMatch ? hrefMatch[1] : null;
}

function itemPubDate(item) {
    return stripHtml(
        extractTag(item, 'pubDate')
        || extractTag(item, 'published')
        || extractTag(item, 'updated')
        || ''
    );
}

/**
 * Fetch et parse un flux RSS/Atom.
 * @returns {Promise<Array<{ url: string, title: string, description: string, pubDate: string, category?: string }>>}
 */
async function fetchFeed(feedUrl) {
    const res = await fetch(feedUrl, {
        headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Feed ${feedUrl} failed: HTTP ${res.status}`);
    const xml = await res.text();
    const items = extractItems(xml);
    return items.map((raw) => ({
        url: itemUrl(raw) || '',
        title: stripHtml(extractTag(raw, 'title') || ''),
        description: stripHtml(extractTag(raw, 'description') || extractTag(raw, 'summary') || ''),
        pubDate: itemPubDate(raw),
        category: stripHtml(extractTag(raw, 'category') || ''),
    })).filter((it) => it.url && it.title);
}

module.exports = { fetchFeed };
