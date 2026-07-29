import { describe, it, expect } from 'vitest';
import {
    chunkText,
    splitHtmlSegments,
    looksLikeHtml,
    decodeHtmlEntities,
    stripControlChars,
    preserveEdgeWhitespace,
    missingLanguages,
} from '../translateCore.js';

describe('chunkText', () => {
    it('keeps short text in a single chunk', () => {
        expect(chunkText('Short synopsis.', 450)).toEqual(['Short synopsis.']);
    });

    it('returns nothing for empty input', () => {
        expect(chunkText('', 450)).toEqual([]);
        expect(chunkText(undefined, 450)).toEqual([]);
    });

    it('never emits a chunk above the provider limit', () => {
        const text = 'Lorem ipsum dolor sit amet. '.repeat(200);
        for (const chunk of chunkText(text, 450)) {
            expect(chunk.length).toBeLessThanOrEqual(450);
        }
    });

    it('loses no characters when reassembled', () => {
        const text = 'Alpha beta. Gamma delta! Epsilon zeta? Eta theta.\n'.repeat(40);
        expect(chunkText(text, 450).join('')).toBe(text);
    });

    it('splits on sentence boundaries when it can', () => {
        const text = `${'a'.repeat(300)}. ${'b'.repeat(300)}`;
        const [first] = chunkText(text, 450);
        expect(first.endsWith('.')).toBe(true);
    });

    it('hard-splits a single oversized token rather than looping forever', () => {
        const chunks = chunkText('x'.repeat(1000), 450);
        expect(chunks.join('')).toBe('x'.repeat(1000));
        expect(chunks.length).toBe(3);
    });
});

describe('splitHtmlSegments', () => {
    it('marks tags as non-translatable and text as translatable', () => {
        const segments = splitHtmlSegments('<p>Hello world</p>');
        expect(segments.map((s) => s.value)).toEqual(['<p>', 'Hello world', '</p>']);
        expect(segments.map((s) => s.translatable)).toEqual([false, true, false]);
    });

    it('preserves the original markup when reassembled untouched', () => {
        const html = '<div class="x"><p>One</p><img src="a.png"/><p>Two</p></div>';
        expect(splitHtmlSegments(html).map((s) => s.value).join('')).toBe(html);
    });

    it('does not try to translate punctuation-only or numeric segments', () => {
        const segments = splitHtmlSegments('<p>123</p><p> — </p>');
        expect(segments.filter((s) => s.translatable)).toHaveLength(0);
    });

    it('leaves attribute values inside tags alone', () => {
        const segments = splitHtmlSegments('<a href="/x" title="Click here">Go</a>');
        const translatable = segments.filter((s) => s.translatable).map((s) => s.value);
        expect(translatable).toEqual(['Go']);
    });
});

describe('looksLikeHtml', () => {
    it('detects markup', () => {
        expect(looksLikeHtml('<p>hi</p>')).toBe(true);
        expect(looksLikeHtml('a <br/> b')).toBe(true);
    });

    it('treats prose with comparisons as plain text', () => {
        expect(looksLikeHtml('5 < 10 and 20 > 3')).toBe(false);
        expect(looksLikeHtml('A regular synopsis.')).toBe(false);
    });
});

describe('decodeHtmlEntities', () => {
    it('decodes what MyMemory escapes', () => {
        expect(decodeHtmlEntities('It&#39;s here')).toBe("It's here");
        expect(decodeHtmlEntities('a &amp; b')).toBe('a & b');
        expect(decodeHtmlEntities('&quot;quoted&quot;')).toBe('"quoted"');
    });

    it('does not double-decode an escaped ampersand entity', () => {
        // &amp;#39; must become &#39; — not an apostrophe
        expect(decodeHtmlEntities('&amp;#39;')).toBe('&#39;');
    });
});

describe('stripControlChars', () => {
    it('keeps tabs, newlines and carriage returns', () => {
        const text = 'a\tb\nc\rd';
        expect(stripControlChars(text)).toBe(text);
    });

    it('removes NUL and other control characters', () => {
        expect(stripControlChars('a\u0000b\u0007c')).toBe('abc');
        expect(stripControlChars('x\u001Fy\u009Fz')).toBe('xyz');
    });
});

describe('preserveEdgeWhitespace', () => {
    it('restores a trailing space the provider trimmed', () => {
        // "The " -> provider returns "Le" -> must not weld onto the next <strong>
        expect(preserveEdgeWhitespace('The ', 'Le')).toBe('Le ');
    });

    it('restores a leading space', () => {
        expect(preserveEdgeWhitespace(' was confirmed.', 'a été confirmé.')).toBe(' a été confirmé.');
    });

    it('restores whitespace on both sides', () => {
        expect(preserveEdgeWhitespace('  hello  ', 'bonjour')).toBe('  bonjour  ');
    });

    it('leaves text without edge whitespace untouched', () => {
        expect(preserveEdgeWhitespace('hello', 'bonjour')).toBe('bonjour');
    });

    it('does not fabricate whitespace for a blank source', () => {
        expect(preserveEdgeWhitespace('   ', 'x')).toBe('x');
    });

    it('passes non-string translations straight through', () => {
        expect(preserveEdgeWhitespace('a ', null)).toBe(null);
    });
});

describe('missingLanguages (loop guard)', () => {
    const TARGETS = ['fr'];

    it('requests work for a fresh request document', () => {
        expect(missingLanguages({ input: 'Hello' }, TARGETS)).toEqual(['fr']);
    });

    it('reports nothing once the payload matches the input — this is what stops the trigger loop', () => {
        const done = { input: 'Hello', translated: { fr: 'Bonjour' }, translatedInput: 'Hello' };
        expect(missingLanguages(done, TARGETS)).toEqual([]);
    });

    it('re-requests when the source input changed', () => {
        const stale = { input: 'Goodbye', translated: { fr: 'Bonjour' }, translatedInput: 'Hello' };
        expect(missingLanguages(stale, TARGETS)).toEqual(['fr']);
    });

    it('ignores documents with no usable input', () => {
        expect(missingLanguages({ input: '   ' }, TARGETS)).toEqual([]);
        expect(missingLanguages({}, TARGETS)).toEqual([]);
        expect(missingLanguages(null, TARGETS)).toEqual([]);
    });

    it('re-requests when a stored translation is an empty string', () => {
        const empty = { input: 'Hello', translated: { fr: '' }, translatedInput: 'Hello' };
        expect(missingLanguages(empty, TARGETS)).toEqual(['fr']);
    });

    it('cannot be short-circuited by a client forging translatedInput', () => {
        // A client may write translatedInput (rules now block it, but defence in depth):
        // without an actual payload the server must still translate.
        const forged = { input: 'Hello', translatedInput: 'Hello' };
        expect(missingLanguages(forged, TARGETS)).toEqual(['fr']);
    });
});
