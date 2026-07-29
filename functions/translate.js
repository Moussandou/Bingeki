/**
 * Automated translation of user-facing dynamic content (work synopses, character
 * bios, news titles/bodies).
 *
 * The client writes a REQUEST document to /translations/{docId} containing the
 * source `input`; security rules forbid it from writing the rendered `translated`
 * payload. This trigger is the server side of that contract.
 *
 * Providers are free and key-less (no billing, no signup):
 *   1. Google `gtx` — the endpoint the web widget uses. No key, no hard length cap
 *      beyond the URL, best quality. Unofficial, so it is paired with a fallback.
 *   2. MyMemory — documented free tier, no key, but 500 chars/request and
 *      5 000 chars/day per IP anonymously (50 000 with a free email in MYMEMORY_EMAIL).
 *
 * Set TRANSLATE_PROVIDER_ORDER="mymemory,google" to prefer the documented API.
 *
 * If every provider fails we leave `translated` untouched; the client falls back
 * to the source text after a short delay instead of spinning forever.
 */
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions/v2");
const { FieldValue } = require("firebase-admin/firestore");

const {
    chunkText,
    splitHtmlSegments,
    looksLikeHtml,
    decodeHtmlEntities,
    stripControlChars,
    preserveEdgeWhitespace,
    missingLanguages,
} = require("./translateCore");

// Content sourced from Jikan / news feeds is English; the app ships fr + en.
const SOURCE_LANG = "en";
const TARGET_LANGS = ["fr"];

// Guard rails: a runaway synopsis must not burn the whole free quota.
const MAX_INPUT_CHARS = 12000;
const REQUEST_TIMEOUT_MS = 8000;
const DELAY_BETWEEN_CALLS_MS = 350;

// Optional and free: registering an email with MyMemory lifts the anonymous
// 5k chars/day cap to 50k. Nothing to pay, nothing breaks if unset.
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Bingeki/1.0; +https://bingeki.com)" },
        });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Google's public translate endpoint. Returns segmented output:
 * [[["Bonjour","Hello",...],["Salut","Hi",...]], ...] — segments must be joined.
 */
async function translateViaGoogle(text, targetLang) {
    try {
        const url =
            "https://translate.googleapis.com/translate_a/single?client=gtx" +
            `&sl=${SOURCE_LANG}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) return null;

        const body = await res.json();
        if (!Array.isArray(body) || !Array.isArray(body[0])) return null;

        const out = body[0]
            .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
            .join("");
        return out.trim().length > 0 ? out : null;
    } catch (err) {
        logger.debug(`[Translate] google provider failed: ${err.message}`);
        return null;
    }
}

/**
 * MyMemory free tier. Signals quota/length problems with HTTP 200 plus a
 * non-200 `responseStatus`, so the body must be inspected rather than the status.
 */
async function translateViaMyMemory(text, targetLang) {
    try {
        const params = new URLSearchParams({
            q: text,
            langpair: `${SOURCE_LANG}|${targetLang}`,
        });
        if (MYMEMORY_EMAIL) params.set("de", MYMEMORY_EMAIL);

        const res = await fetchWithTimeout(`https://api.mymemory.translated.net/get?${params}`);
        if (!res.ok) return null;

        const body = await res.json();
        if (body && body.responseStatus && Number(body.responseStatus) !== 200) {
            logger.warn(`[Translate] MyMemory ${body.responseStatus}: ${body.responseDetails}`);
            return null;
        }

        const out = body && body.responseData && body.responseData.translatedText;
        if (typeof out !== "string" || out.trim().length === 0) return null;
        return decodeHtmlEntities(out);
    } catch (err) {
        logger.debug(`[Translate] mymemory provider failed: ${err.message}`);
        return null;
    }
}

// `maxChars` is the per-request ceiling each provider tolerates.
const PROVIDERS = {
    google: { name: "google", maxChars: 1800, translate: translateViaGoogle },
    mymemory: { name: "mymemory", maxChars: 450, translate: translateViaMyMemory },
};

function providerChain() {
    const configured = (process.env.TRANSLATE_PROVIDER_ORDER || "google,mymemory")
        .split(",")
        .map((n) => n.trim().toLowerCase())
        .filter((n) => PROVIDERS[n]);
    return configured.length > 0 ? configured.map((n) => PROVIDERS[n]) : [PROVIDERS.google];
}

/**
 * Translates one piece of prose, trying each provider in turn.
 * A provider is only accepted if it translates EVERY chunk — a partial result is
 * discarded so we never store half-English copy.
 */
async function translateProse(text, targetLang) {
    if (text.trim().length === 0) return text;

    for (const provider of providerChain()) {
        const chunks = chunkText(text, provider.maxChars);
        const out = [];
        let complete = true;

        for (const chunk of chunks) {
            if (chunk.trim().length === 0) {
                out.push(chunk); // whitespace: keep as-is, don't waste a call
                continue;
            }
            const translated = await provider.translate(chunk, targetLang);
            if (translated === null) {
                complete = false;
                break;
            }
            out.push(translated);
            if (chunks.length > 1) await sleep(DELAY_BETWEEN_CALLS_MS);
        }

        if (complete) return out.join("");
        logger.warn(`[Translate] provider "${provider.name}" failed, falling through`);
    }

    return null;
}

/**
 * Translates HTML by only sending text nodes to the providers, so tags and
 * attributes survive byte-for-byte.
 */
async function translateHtml(html, targetLang) {
    const segments = splitHtmlSegments(html);
    const out = [];

    for (const segment of segments) {
        if (!segment.translatable) {
            out.push(segment.value);
            continue;
        }
        const translated = await translateProse(segment.value, targetLang);
        if (translated === null) return null;
        // Providers trim; without this, text welds onto the neighbouring tag.
        out.push(preserveEdgeWhitespace(segment.value, translated));
        await sleep(DELAY_BETWEEN_CALLS_MS);
    }

    return out.join("");
}

async function translateInput(input, targetLang) {
    const result = looksLikeHtml(input)
        ? await translateHtml(input, targetLang)
        : await translateProse(input, targetLang);

    return result === null ? null : stripControlChars(result);
}

/**
 * Fills in `translated` whenever a request document appears or its `input` changes.
 *
 * Loop safety: this trigger writes to the very document it watches. It only writes
 * when `missingLanguages()` is non-empty and always stamps `translatedInput = input`,
 * so the resulting re-trigger finds nothing to do and stops.
 */
exports.onTranslationRequest = onDocumentWritten(
    {
        document: "translations/{docId}",
        // Free providers are IP-rate-limited; keep the fan-out deliberately small.
        concurrency: 1,
        maxInstances: 2,
        timeoutSeconds: 300,
        retry: false,
    },
    async (event) => {
        const after = event.data && event.data.after;
        if (!after || !after.exists) return; // document deleted

        const data = after.data();
        const docId = event.params.docId;

        const pending = missingLanguages(data, TARGET_LANGS);
        if (pending.length === 0) return; // nothing to do — this breaks the write loop

        const input = data.input;
        if (input.length > MAX_INPUT_CHARS) {
            logger.warn(`[Translate] ${docId} skipped: input is ${input.length} chars`);
            return;
        }

        logger.info(`[Translate] ${docId}: translating into ${pending.join(", ")}`);

        const translated = {};
        for (const lang of pending) {
            const out = await translateInput(input, lang);
            if (out) {
                translated[lang] = out;
            } else {
                logger.warn(`[Translate] ${docId}: every provider failed for "${lang}"`);
            }
        }

        if (Object.keys(translated).length === 0) return;

        await after.ref.set(
            {
                translated,
                translatedInput: input,
                translatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        logger.info(`[Translate] ${docId}: stored ${Object.keys(translated).join(", ")}`);
    }
);

// Exported for tests / manual backfill scripts.
exports._internal = { translateInput, translateProse, translateHtml, providerChain };
