/**
 * generators/gemini.js — caption + hashtags via Gemini REST API.
 *
 * Uses raw fetch to avoid pinning to a specific SDK version. The model
 * alias `gemini-flash-latest` follows the current stable flash release.
 *
 * Auth: reads `GEMINI_API_KEY` from process.env. In prod (Cloud
 * Functions v2) bind it via `defineSecret('GEMINI_API_KEY')` in the
 * cron declaration.
 */

const GEMINI_ENDPOINT = (model, key) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const BINGEKI_URL = 'https://bingeki.web.app';

const PROMPTS = {
    daily: `Tu écris pour la page Instagram de Bingeki (un tracker anime & manga gamifié, dispo sur ${BINGEKI_URL}). Ton: chaleureux, communautaire, un peu insolent quand ça sert, on parle en "on" pour l'équipe et en "vous" pour la commu. Interdit: "Chez Bingeki nous...", "En tant que...", émojis à outrance. Termine toujours par une invitation vers ${BINGEKI_URL}.

Voici les épisodes d'anime sortis aujourd'hui :
{{DATA}}

Rédige une caption Instagram (max 400 caractères) qui :
1. Accroche avec le nombre ou un titre marquant (pas "Aujourd'hui...").
2. Cite 2-3 des animes par leur nom.
3. Termine par une question qui pousse au commentaire.

Puis 5-7 hashtags pertinents (anime, titres, communauté).

Réponds STRICTEMENT en JSON, rien d'autre :
{"caption": "...", "hashtags": "#... #... #..."}`,

    weekly: `Tu écris pour la page Instagram de Bingeki (${BINGEKI_URL}). Contexte: post récap hebdo TOP 3, notes moyennes calculées à partir de VOS users Bingeki.

TOP 3 de la semaine :
{{DATA}}

Rédige une caption (max 400 caractères) qui :
1. Célèbre le classement.
2. Souligne que ce sont LES USERS qui ont fait le classement (fierté commu).
3. Termine par un appel à noter/commenter et inclus ${BINGEKI_URL} dans la caption (obligatoire).

Puis 5 hashtags.

JSON strict :
{"caption": "...", "hashtags": "..."}`,

    favorite: `Tu écris pour la page Instagram de Bingeki (${BINGEKI_URL}). Contexte: post "coup de cœur de la semaine" — TOP 3 des épisodes sortis cette semaine, notés par la communauté MyAnimeList (source : Jikan API, notes converties sur /10).

TOP 3 des épisodes :
{{DATA}}

Rédige une caption (max 400 caractères) qui :
1. Accroche façon "les 3 pépites de la semaine" (sans dire "coup de cœur", on veut du frais).
2. Cite les 3 anime par leur nom + numéro d'épisode.
3. Précise que les notes viennent de MAL (source communautaire de référence).
4. Invite à ajouter les animes à sa liste sur ${BINGEKI_URL} (l'URL doit apparaître dans la caption, obligatoire).

Puis 5 hashtags avec les noms d'anime.

JSON strict :
{"caption": "...", "hashtags": "..."}`,

    newseason: `Tu écris pour la page Instagram de Bingeki (${BINGEKI_URL}). Contexte: annonce du démarrage d'une nouvelle saison d'un anime attendu.

Anime :
{{DATA}}

Rédige une caption (max 400 caractères) qui :
1. Accroche façon "hype" (le retour tant attendu, etc.).
2. Mentionne le studio et la note de la précédente saison (si dispo).
3. Termine par une question aux fans et inclus ${BINGEKI_URL} dans la caption (obligatoire, pour tracker la saison).

Puis 5-6 hashtags avec le nom de l'anime.

JSON strict :
{"caption": "...", "hashtags": "..."}`,

    announcement: `Tu écris pour la page Instagram de Bingeki (${BINGEKI_URL}). Contexte: une nouvelle saison vient d'être ANNONCÉE (pas encore diffusée). Prochainement.

Anime :
{{DATA}}

Rédige une caption (max 400 caractères) qui :
1. Accroche façon "annonce officielle / prochainement".
2. Mentionne le studio, la date si dispo, et la note de la saison précédente si donnée (comme argument d'hype).
3. Reste HONNÊTE sur la date — si seulement l'année est connue, dis "prévu en 2027" jamais une date précise inventée.
4. Invite à ajouter à la watchlist sur ${BINGEKI_URL} (obligatoire dans la caption).

Puis 5-6 hashtags avec le nom de l'anime + #animeannouncement.

JSON strict :
{"caption": "...", "hashtags": "..."}`,
};

function serializeData(type, data) {
    switch (type) {
        case 'daily':
            return data.map((a) => `- ${a.title}${a.season ? ` ${a.season}` : ''}`).join('\n');
        case 'weekly':
            return data.map((a, i) => `${i + 1}. ${a.title} — ${a.avg}/10 (${a.count} notes)`).join('\n');
        case 'favorite':
            return data.map((a, i) => {
                const season = a.season ? ` S${a.season}` : '';
                const ep = a.episodeNumber ? ` — Épisode ${a.episodeNumber}` : '';
                const t = a.episodeTitle ? ` "${a.episodeTitle}"` : '';
                return `${i + 1}. ${a.title}${season}${ep}${t} — ${a.avg}/10 sur MAL`;
            }).join('\n');
        case 'newseason':
            return `${data.title} — Studio: ${(data.studios || []).join(', ') || 'inconnu'}, ${data.episodes ?? '?'} épisodes prévus${data.previousScore ? `, S1 notée ${data.previousScore}/10` : ''}`;
        case 'announcement': {
            const raw = data.aired_from ? String(data.aired_from).trim() : '';
            const airedString = (data.aired_string || '').trim();
            const airedStringYear = airedString.match(/^(\d{4})\s*(to|-)?/i)?.[1];
            const candidate = raw || airedStringYear || '';
            let release;
            if (!candidate) release = 'à venir (date pas encore annoncée)';
            else if (/^\d{4}$/.test(candidate)) release = `prévu en ${candidate} (année seulement)`;
            else {
                const parsed = new Date(candidate);
                release = isNaN(parsed.getTime())
                    ? 'à venir (date pas encore annoncée)'
                    : parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            }
            const prevScoreLine = typeof data.prequel_score === 'number' && data.prequel_score > 0
                ? `, ${data.prequel_title || 'saison précédente'} notée ${data.prequel_score}/10 sur MAL${data.prequel_scored_by ? ` (${data.prequel_scored_by.toLocaleString('fr-FR')} votes)` : ''}`
                : '';
            return `${data.title} — Studio: ${(data.studios || []).join(', ') || 'inconnu'}, ${data.episodes ?? '?'} épisodes prévus, sortie: ${release}${prevScoreLine}`;
        }
        default:
            return JSON.stringify(data);
    }
}

function parseGeminiResponse(text) {
    // Trim any surrounding markdown fences the model may add
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    let obj;
    try {
        obj = JSON.parse(cleaned);
    } catch {
        // Fallback: find the first {...} block
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) {
            console.error('[social/gemini] raw response was not JSON:', text.slice(0, 500));
            throw new Error('Gemini response is not JSON');
        }
        obj = JSON.parse(match[0]);
    }
    if (typeof obj.caption !== 'string' || typeof obj.hashtags !== 'string') {
        console.error('[social/gemini] parsed obj missing fields:', JSON.stringify(obj).slice(0, 300));
        throw new Error('Gemini response missing caption/hashtags');
    }
    return obj;
}

function ensureBingekiUrl(caption) {
    if (caption.includes('bingeki.web.app') || caption.includes(BINGEKI_URL)) return caption;
    const trimmed = caption.trimEnd();
    return `${trimmed}\n\n${BINGEKI_URL}`;
}

const { fallbackCaption } = require('./fallbackCaption');

/**
 * Public API. Tries Gemini first, falls back to a deterministic template
 * caption on any failure (Gemini 5xx, model deprecated, malformed JSON,
 * missing env var, timeout). This keeps the cron unblocked when Google
 * throttles or breaks its own model aliases.
 *
 * On failure the returned object has a `viaFallback: true` marker so
 * callers (or a Discord webhook) can flag it if desired.
 *
 * @param {'daily'|'weekly'|'favorite'|'newseason'} type
 * @param {object|Array} data
 * @param {{gemini:{model:string}}} config
 * @returns {Promise<{caption:string, hashtags:string, viaFallback?:boolean}>}
 */
async function generateCaption(type, data, config) {
    try {
        return await generateCaptionFromGemini(type, data, config);
    } catch (err) {
        console.warn(
            `[social/gemini] falling back to template caption (type=${type}): ${err.message || err}`,
        );
        return { ...fallbackCaption(type, data), viaFallback: true };
    }
}

/**
 * @param {'daily'|'weekly'|'favorite'|'newseason'} type
 * @param {object|Array} data
 * @param {{gemini:{model:string}}} config
 * @returns {Promise<{caption:string, hashtags:string}>}
 */
async function generateCaptionFromGemini(type, data, config) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const template = PROMPTS[type];
    if (!template) throw new Error(`Unknown post type: ${type}`);

    const prompt = template.replace('{{DATA}}', serializeData(type, data));
    const model = config?.gemini?.model || 'gemini-flash-latest';

    // Gemini flash frequently returns 503 UNAVAILABLE or 429 during
    // regional traffic spikes. Retry with exponential backoff on those
    // transient statuses; other errors bubble up immediately.
    const RETRYABLE = new Set([429, 500, 502, 503, 504]);
    const MAX_ATTEMPTS = 4;
    let res;
    let lastErrBody = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        res = await fetch(GEMINI_ENDPOINT(model, apiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30_000),
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.85,
                    maxOutputTokens: 800,
                    responseMimeType: 'application/json',
                },
            }),
        });
        if (res.ok) break;
        lastErrBody = await res.text().catch(() => '');
        if (!RETRYABLE.has(res.status) || attempt === MAX_ATTEMPTS) break;
        const delayMs = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
        console.warn(
            `[social/gemini] ${res.status} on attempt ${attempt}/${MAX_ATTEMPTS}, retrying in ${delayMs}ms`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
    }

    if (!res.ok) {
        throw new Error(`Gemini API ${res.status}: ${lastErrBody.slice(0, 300)}`);
    }

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini response empty');

    const parsed = parseGeminiResponse(text);
    return { ...parsed, caption: ensureBingekiUrl(parsed.caption) };
}

/**
 * Batch-translate one or two anime synopses to French via Gemini.
 * MAL/Tenrai only ship English, so the announcement cron routes both
 * the sequel's own synopsis and the prequel fallback through here in
 * one call — halves the Gemini quota vs two separate translations,
 * which matters at the free-tier 15 RPM ceiling.
 *
 * Returns `{ sequel, prequel }`, each either a French translation or
 * null when Gemini fails / the source was too short to bother.
 * Callers are expected to fall back to the raw English string on null
 * (better than nothing on the slide).
 */
async function translateSynopsisPair(sequelSynopsis, prequelSynopsis, config = {}) {
    const seq = (sequelSynopsis || '').trim();
    const prev = (prequelSynopsis || '').trim();
    const wantSeq = seq.length >= 10;
    const wantPrev = prev.length >= 10;
    if (!wantSeq && !wantPrev) return { sequel: null, prequel: null };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { sequel: null, prequel: null };

    const model = config?.gemini?.model || 'gemini-flash-latest';
    const inputs = {};
    if (wantSeq) inputs.sequel = seq;
    if (wantPrev) inputs.prequel = prev;

    const prompt = `Traduis en français chaque synopsis d'anime ci-dessous, style naturel et fluide pour un post Instagram. Garde tels quels les noms propres (personnages, lieux, techniques, groupes). Ne raccourcis pas, ne rajoute rien.

Réponds STRICTEMENT en JSON avec exactement les mêmes clés que l'entrée, chaque valeur étant la traduction française. Pas d'intro, pas de commentaire.

Entrée (JSON) :
${JSON.stringify(inputs)}`;

    const RETRYABLE = new Set([429, 500, 502, 503, 504]);
    const MAX_ATTEMPTS = 3;
    let res;
    let lastErrBody = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        res = await fetch(GEMINI_ENDPOINT(model, apiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(45_000),
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1400,
                    responseMimeType: 'application/json',
                },
            }),
        });
        if (res.ok) break;
        lastErrBody = await res.text().catch(() => '');
        if (!RETRYABLE.has(res.status) || attempt === MAX_ATTEMPTS) break;
        const delayMs = 1500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
        await new Promise((r) => setTimeout(r, delayMs));
    }
    if (!res.ok) {
        console.warn(`[social/gemini] translate pair failed ${res.status}: ${lastErrBody.slice(0, 200)}`);
        return { sequel: null, prequel: null };
    }
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    let obj;
    try {
        obj = JSON.parse(text);
    } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) {
            console.warn('[social/gemini] translate pair non-JSON response:', text.slice(0, 200));
            return { sequel: null, prequel: null };
        }
        try { obj = JSON.parse(m[0]); } catch { return { sequel: null, prequel: null }; }
    }
    return {
        sequel: typeof obj?.sequel === 'string' && obj.sequel.trim() ? obj.sequel.trim() : null,
        prequel: typeof obj?.prequel === 'string' && obj.prequel.trim() ? obj.prequel.trim() : null,
    };
}

module.exports = {
    generateCaption,
    generateCaptionFromGemini,
    translateSynopsisPair,
    PROMPTS,
    parseGeminiResponse,
    serializeData,
    ensureBingekiUrl,
};
