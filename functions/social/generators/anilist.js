/**
 * generators/anilist.js — source complémentaire au bot social.
 *
 * AniList a des dates d'airing et des numéros d'épisode à venir bien
 * plus fiables que MAL/Jikan (notamment pour les sequels frais et les
 * long-runners que MAL ne track plus). API GraphQL publique, sans clé,
 * 90 req/min.
 *
 * Isolé au dossier social — le reste de l'app continue d'utiliser
 * Tenrai/Jikan comme source unique.
 */

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

async function anilistQuery(query, variables) {
    const res = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
        throw new Error(`AniList ${res.status}`);
    }
    const json = await res.json();
    if (json.errors) {
        throw new Error(`AniList: ${json.errors.map((e) => e.message).join(', ')}`);
    }
    return json.data;
}

const MEDIA_BY_MAL = `
query ($malId: Int) {
    Media(idMal: $malId, type: ANIME) {
        id
        format
        status
        episodes
        nextAiringEpisode { episode airingAt }
    }
}`;

/**
 * Retourne le numéro d'épisode "actuel" à afficher pour un anime en
 * cours. Basé sur AniList `nextAiringEpisode` :
 *   - si le prochain ép sort dans la fenêtre [now-6h, now+30h] → c'est
 *     lui (l'ép d'aujourd'hui, affiché même juste avant airing)
 *   - sinon on retourne le précédent (`episode - 1`) si dispo
 * Retourne null si AniList ne connaît pas l'anime ou n'a pas de
 * `nextAiringEpisode`.
 */
async function fetchAniListCurrentEpisode(malId) {
    try {
        const data = await anilistQuery(MEDIA_BY_MAL, { malId });
        const media = data?.Media;
        if (!media) return null;
        const next = media.nextAiringEpisode;
        if (!next?.episode || !next?.airingAt) return null;
        const airingMs = next.airingAt * 1000;
        const now = Date.now();
        const SIX_HOURS = 6 * 3600_000;
        const THIRTY_HOURS = 30 * 3600_000;
        if (airingMs >= now - SIX_HOURS && airingMs <= now + THIRTY_HOURS) {
            return next.episode;
        }
        if (airingMs > now + THIRTY_HOURS && next.episode > 1) {
            return next.episode - 1;
        }
        return null;
    } catch (_err) {
        return null;
    }
}

module.exports = {
    fetchAniListCurrentEpisode,
};
