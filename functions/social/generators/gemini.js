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

    favorite: `Tu écris pour la page Instagram de Bingeki (${BINGEKI_URL}). Contexte: post "coup de cœur de la semaine" — TOP 3 des épisodes sortis cette semaine, notés par la communauté d'anime fans.

TOP 3 des épisodes :
{{DATA}}

Rédige une caption (max 400 caractères) qui :
1. Accroche façon "les 3 pépites de la semaine" (sans dire "coup de cœur", on veut du frais).
2. Cite les 3 anime par leur nom + numéro d'épisode.
3. Ne cite JAMAIS la source des notes (pas de "MAL", "MyAnimeList", "Jikan"). Reste focalisé sur les animes eux-mêmes.
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
2. Mentionne le studio, la date si dispo, et 1 raison d'être hype (studio culte, source manga populaire, sequel très attendu, univers marquant, etc.).
3. Ne cite AUCUNE note chiffrée (pas de "8.72/10", pas de "noté X/10"). Ne cite JAMAIS la source des notes non plus (pas de "MAL", "MyAnimeList", "Jikan").
4. Reste HONNÊTE sur la date — si seulement l'année est connue, dis "prévu en 2027" jamais une date précise inventée.
5. Invite à ajouter à la watchlist sur ${BINGEKI_URL} (obligatoire dans la caption).

Puis 5-6 hashtags avec le nom de l'anime + #animeannouncement.

JSON strict :
{"caption": "...", "hashtags": "..."}`,

    announcement_digest: `Tu écris pour la page Instagram de Bingeki (${BINGEKI_URL}). Contexte: DIGEST des annonces d'animes de la semaine — plusieurs sequels annoncés qu'on regroupe en 1 seul post.

Annonces (${BINGEKI_URL}) :
{{DATA}}

Rédige une caption (max 500 caractères) qui :
1. Accroche façon "les X annonces de la semaine à noter".
2. Cite chaque anime par son nom une fois (bref, pas de descriptif).
3. Ne cite AUCUNE note chiffrée (pas de "8.5/10", pas de "noté X"). Ne cite JAMAIS la source des notes non plus (pas de "MAL", "MyAnimeList", "Jikan").
4. Reste HONNÊTE sur les dates — si seule l'année est connue, dis "prévu en 2027".
5. Termine par une invite à ajouter à la watchlist sur ${BINGEKI_URL} (obligatoire dans la caption).

Puis 5-7 hashtags : #animeannouncement + noms des animes.

JSON strict :
{"caption": "...", "hashtags": "..."}`,

    culture_news_infer: `Tu es l'éditeur du bot social Bingeki (tracker anime & manga francophone, public jeune Instagram/TikTok). À partir d'un titre de news, tu dois répondre :

- relevant : booléen. TRUE si l'info intéresse un fan d'anime/manga et vaut la peine d'être postée sur Bingeki. FALSE pour les sujets NON pertinents :
  * Reviews de volumes de manga individuels ("Volumes 4, 5 and 6 Review")
  * Récaps épisodes / previews guides / this-week-in-anime
  * Sujets touristiques japonais génériques (céramique, cuisine, voyage)
  * Articles d'opinion/philo/analyse sociétale sans info actu ("À qui appartient la voix…")
  * Interviews de fond (mangaka/seiyu peu connus)
  * Culture japonaise générale sans lien direct anime/manga

- hype : entier de 1 à 10 mesurant l'intérêt du sujet pour un fan francophone jeune. Barème :
  * 10 : scoop majeur (Chainsaw Man S2 date, One Piece film, Netflix rachète Studio Ghibli)
  * 8-9 : annonce d'adaptation d'un manga populaire, trailer d'un anime hype, film majeur qui sort
  * 6-7 : nouvelle saison confirmée pour un anime moyen, collab intéressante, jeu vidéo mainstream (Naruto/DBZ/One Piece)
  * 4-5 : sortie goodies importants, event notable, actu industrie modérée
  * 1-3 : news mineure, sujet niche, analyse de fond, récap, article touristique
  Sois exigeant — un fan qui scrolle Insta doit s'arrêter sur le post.

- category : une des valeurs strictement parmi ["game", "movie", "goodies", "industry", "event", "other"]
  · game     = jeu vidéo (mobile, console, gacha, MMO)
  · movie    = film cinéma, film d'animation, live-action
  · goodies  = figurine, merch, art book, blu-ray, collector
  · industry = box-office, deal, licence, streaming, chiffres, controverse
  · event    = convention, concert, sortie premium, premiere
  · other    = actu générique qui ne rentre pas ailleurs (utilise avec parcimonie)

- source : le nom de la VRAIE source officielle de l'info (ex: "Bandai Namco" pour un jeu Bandai, "Toei Animation", "Kadokawa", "Aniplex", "Netflix", "Crunchyroll", "Manga+", "Shueisha"). PAS un influenceur ou compte réseau social. Si tu ne peux pas identifier de source officielle avec certitude, retourne "" (chaîne vide).

- description : 1 à 2 phrases courtes (100-200 caractères) qui donnent le contexte et l'intérêt de l'info. **OBLIGATOIRE si relevant=true, jamais vide** — extrapole raisonnablement si peu d'infos :
  * Jeu : "Adaptation vidéoludique de X, développée par Y."
  * Film : "Suite / film-résumé de X, sortie prévue Z."
  * Industrie : "X annonce/lance/rachète Y."
  * Reste factuel — n'invente pas dates ou chiffres précis. Ne commence pas par "Cette news…" ou "L'article…".

Infos disponibles :
{{DATA}}

Réponds STRICTEMENT en JSON, rien d'autre :
{"relevant": true, "hype": 8, "category": "game", "source": "Bandai Namco", "description": "Le RPG mobile revient avec de nouveaux personnages et un mode multi coopératif."}`,

    culture_news: `Tu écris pour la page Instagram de Bingeki (${BINGEKI_URL}). Contexte: post "actu culture anime" — une news qui touche à l'univers anime/manga mais qui n'est PAS une sortie d'épisode (ex: jeu vidéo, film live-action, goodies, actu industrie, événement, box-office…).

Actu :
{{DATA}}

Rédige une caption Instagram (max 450 caractères) qui :
1. Accroche direct avec l'info principale (pas "aujourd'hui...", pas "on vous parle de...").
2. Développe brièvement le contexte : pourquoi c'est intéressant, ce qui est nouveau/marquant.
3. Ne cite AUCUNE source spécifique (pas de "selon @xxx", pas de crédit d'influenceur). Reste factuel.
4. Termine par une question ouverte à la commu OU un teaser (hype/scepticisme).
5. Inclus ${BINGEKI_URL} dans la caption (obligatoire).

Puis 4-6 hashtags courts et pertinents (nom de l'œuvre, catégorie, univers, #anime).

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
                return `${i + 1}. ${a.title}${season}${ep}${t} — noté ${a.avg}/10`;
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
            // On ne passe plus la note à Gemini : le modèle a tendance à
            // la caser dans la caption même quand on lui interdit.
            return `${data.title} — Studio: ${(data.studios || []).join(', ') || 'inconnu'}, ${data.episodes ?? '?'} épisodes prévus, sortie: ${release}`;
        }
        case 'culture_news': {
            const catLabels = {
                game: 'jeu vidéo', movie: 'film', goodies: 'goodies/figurine',
                industry: 'actu industrie', event: 'événement', other: 'actu univers anime',
            };
            const cat = catLabels[data.category] || 'actu';
            const desc = data.description ? `\nContexte : ${data.description}` : '';
            return `Catégorie : ${cat}\nTitre : ${data.title || ''}${desc}`;
        }
        case 'announcement_digest': {
            const items = Array.isArray(data?.animes) ? data.animes : [];
            return items.map((a, i) => {
                const raw = a.aired_from ? String(a.aired_from).trim() : '';
                const airedString = (a.aired_string || '').trim();
                const airedStringYear = airedString.match(/^(\d{4})\s*(to|-)?/i)?.[1];
                const candidate = raw || airedStringYear || '';
                let release;
                if (!candidate) release = 'date à venir';
                else if (/^\d{4}$/.test(candidate)) release = `prévu en ${candidate}`;
                else {
                    const parsed = new Date(candidate);
                    release = isNaN(parsed.getTime())
                        ? 'date à venir'
                        : parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                }
                // Pas de note transmise à Gemini pour le digest non plus.
                return `${i + 1}. ${a.title} — Studio: ${(a.studios || []).join(', ') || 'inconnu'}, sortie: ${release}`;
            }).join('\n');
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

/**
 * Devine la catégorie, la source officielle et une courte description à
 * partir d'un titre de news (généralement extrait d'un TikTok, tweet ou
 * article). Utilisé par le workflow "actu culture anime" pour permettre
 * un post en 1 clic (colle URL → tout est auto).
 *
 * Retourne { category, source, description } ou lance une erreur si
 * Gemini échoue. Le caller peut fallback sur { category: 'other',
 * source: '', description: '' }.
 */
async function inferCultureNewsFields({ title, description, host, siteName }, config = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const payload = [
        `Titre extrait : ${title || '(vide)'}`,
        description ? `Description extraite : ${description}` : null,
        `Provenance : ${siteName || host || '?'}`,
    ].filter(Boolean).join('\n');

    const prompt = PROMPTS.culture_news_infer.replace('{{DATA}}', payload);
    const model = config?.gemini?.model || 'gemini-flash-latest';
    const RETRYABLE = new Set([429, 500, 502, 503, 504]);
    const MAX_ATTEMPTS = 3;
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
                    temperature: 0.3,
                    maxOutputTokens: 400,
                    responseMimeType: 'application/json',
                },
            }),
        });
        if (res.ok) break;
        lastErrBody = await res.text().catch(() => '');
        if (!RETRYABLE.has(res.status) || attempt === MAX_ATTEMPTS) break;
        const delayMs = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 400);
        console.warn(`[social/gemini] infer ${res.status} attempt ${attempt}/${MAX_ATTEMPTS}, retry in ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
    }
    if (!res.ok) {
        throw new Error(`Gemini infer ${res.status}: ${lastErrBody.slice(0, 200)}`);
    }
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    let obj;
    try { obj = JSON.parse(text); }
    catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('Gemini infer non-JSON response');
        obj = JSON.parse(m[0]);
    }
    const VALID_CATS = new Set(['game', 'movie', 'goodies', 'industry', 'event', 'other']);
    return {
        // relevant: null (Gemini a échoué / champ absent), true (pertinent),
        // false (à skipper). Le cron interprète null comme "on tente quand
        // même", false comme "skip".
        relevant: typeof obj.relevant === 'boolean' ? obj.relevant : null,
        // hype 1-10 : intérêt pour un fan jeune anime FR. null si absent.
        hype: typeof obj.hype === 'number' ? Math.max(1, Math.min(10, Math.round(obj.hype))) : null,
        category: VALID_CATS.has(obj.category) ? obj.category : 'other',
        source: typeof obj.source === 'string' ? obj.source.trim().slice(0, 60) : '',
        description: typeof obj.description === 'string' ? obj.description.trim().slice(0, 260) : '',
    };
}

module.exports = {
    generateCaption,
    generateCaptionFromGemini,
    translateSynopsisPair,
    inferCultureNewsFields,
    PROMPTS,
    parseGeminiResponse,
    serializeData,
    ensureBingekiUrl,
};
