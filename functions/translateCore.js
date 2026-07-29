/**
 * Pure helpers for the translation pipeline.
 *
 * Kept free of firebase-admin / network imports so they can be unit-tested
 * directly (see functions/__tests__/translateCore.test.js).
 */

// MyMemory rejects `q` longer than 500 bytes, so every provider is fed chunks
// below that. Headroom is left for URL-encoding expansion.
const MAX_CHUNK_CHARS = 450;

/** Matches an HTML tag, so we can keep markup verbatim and translate only text. */
const TAG_SPLIT_RE = /(<[^>]*>)/g;

/** A segment worth sending to a translator: it must contain an actual letter. */
function isTranslatableText(segment) {
    return typeof segment === 'string' && /\p{L}/u.test(segment);
}

/**
 * Splits text into chunks under `maxChars`, preferring sentence then word
 * boundaries so translators receive coherent input.
 */
function chunkText(text, maxChars = MAX_CHUNK_CHARS) {
    if (typeof text !== 'string' || text.length === 0) return [];
    if (text.length <= maxChars) return [text];

    const chunks = [];
    let rest = text;

    while (rest.length > maxChars) {
        const window = rest.slice(0, maxChars);

        // Prefer the last sentence end, then the last whitespace, then a hard cut.
        let cut = Math.max(
            window.lastIndexOf('. '),
            window.lastIndexOf('! '),
            window.lastIndexOf('? '),
            window.lastIndexOf('\n')
        );
        if (cut > 0) {
            cut += 1; // keep the punctuation with the chunk it belongs to
        } else {
            cut = window.lastIndexOf(' ');
            if (cut <= 0) cut = maxChars; // single very long token: hard split
        }

        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut);
    }

    if (rest.length > 0) chunks.push(rest);
    return chunks;
}

/**
 * Splits an HTML string into segments, flagging which ones are translatable text.
 * Tags are preserved verbatim so markup (and DOMPurify's later sanitisation)
 * survives a round-trip.
 */
function splitHtmlSegments(html) {
    if (typeof html !== 'string' || html.length === 0) return [];
    return html
        .split(TAG_SPLIT_RE)
        .filter((part) => part.length > 0)
        .map((part) => ({
            value: part,
            translatable: !part.startsWith('<') && isTranslatableText(part),
        }));
}

/** True when the payload looks like markup rather than plain prose. */
function looksLikeHtml(text) {
    return typeof text === 'string' && /<[a-z/][^>]*>/i.test(text);
}

/**
 * MyMemory returns HTML-escaped text (&#39;, &amp;, ...). Undo the common ones
 * so we never store double-escaped content.
 */
function decodeHtmlEntities(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        // &amp; last, otherwise it would re-introduce the entities decoded above
        .replace(/&amp;/g, '&');
}

/** Strips control characters that have no business in rendered copy. */
function stripControlChars(text) {
    if (typeof text !== 'string') return '';
    // C0 controls (tab/newline/CR kept), DEL and C1 controls.
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

/**
 * Translation providers trim their input, which silently welds words to adjacent
 * markup ("The " + <strong> becomes "Le<strong>"). Re-apply the source segment's
 * leading/trailing whitespace to the translated output.
 */
function preserveEdgeWhitespace(source, translated) {
    if (typeof translated !== 'string') return translated;
    if (typeof source !== 'string' || source.trim().length === 0) return translated;

    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    return leading + translated.trim() + trailing;
}

/**
 * Decides which target languages still need work for this document.
 * Returning an empty array is what stops the write-trigger-write loop.
 */
function missingLanguages(data, targetLangs) {
    if (!data || typeof data.input !== 'string' || data.input.trim().length === 0) return [];

    const translated = data.translated || {};
    // Translations produced for a previous `input` are stale and must be redone.
    const isStale = data.translatedInput !== data.input;

    return targetLangs.filter((lang) => isStale || typeof translated[lang] !== 'string' || translated[lang].length === 0);
}

module.exports = {
    MAX_CHUNK_CHARS,
    chunkText,
    splitHtmlSegments,
    looksLikeHtml,
    decodeHtmlEntities,
    stripControlChars,
    isTranslatableText,
    preserveEdgeWhitespace,
    missingLanguages,
};
