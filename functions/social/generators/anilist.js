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

const SEASON_PREVIEW = `
query ($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
        media(
            type: ANIME
            season: $season
            seasonYear: $seasonYear
            sort: [POPULARITY_DESC]
            isAdult: false
        ) {
            idMal
            title { english romaji native }
            format
            status
            episodes
            startDate { year month day }
            popularity
            favourites
            averageScore
            coverImage { extraLarge large }
            studios(isMain: true) { nodes { name } }
            nextAiringEpisode { episode airingAt }
            relations {
                edges {
                    relationType(version: 2)
                    node {
                        type
                        format
                        seasonYear
                        averageScore
                        title { english romaji }
                    }
                }
            }
        }
    }
}`;

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function formatStartDate(startDate, nextAiringEpisode) {
    // Priorité : nextAiringEpisode.airingAt (précis, jour/heure) si dispo
    // dans les 6 prochains mois. Sinon startDate.
    const now = Date.now();
    if (nextAiringEpisode?.airingAt) {
        const ms = nextAiringEpisode.airingAt * 1000;
        const d = new Date(ms);
        return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
    }
    if (startDate?.year && startDate.month) {
        return { day: startDate.day || 1, month: startDate.month, year: startDate.year };
    }
    return null;
}

function shortDate(d) {
    if (!d) return '';
    return `${d.day} ${MONTHS_FR[d.month - 1]}`;
}

function seasonLabel(node, hasPrequel, prequelSeasonYear) {
    // Détermine le label de chip : S2/S3/MOVIE/OVA/AIRS ON
    if (node.format === 'MOVIE') return 'FILM · SORTIE';
    if (node.format === 'OVA') return 'OVA · SORTIE';
    if (node.format === 'ONA') return 'ONA · SORTIE';
    if (hasPrequel) {
        // Compte grossier des seasons : on affiche "SUITE" plutôt que
        // de risquer un mauvais numéro. Le vrai numéro nécessiterait
        // de walker toute la chaîne.
        return 'SUITE · SORTIE';
    }
    return 'SORTIE';
}

/**
 * Récupère les animes d'une saison AniList (fall/winter/spring/summer).
 * Triés par popularité descendante. Format normalisé pour les slides.
 *
 * @param {Object} opts
 * @param {'WINTER'|'SPRING'|'SUMMER'|'FALL'} opts.season
 * @param {number} opts.year
 * @param {number} [opts.limit=24] - max animes retournés
 */
async function fetchAniListSeasonPreview({ season, year, limit = 24 }) {
    const data = await anilistQuery(SEASON_PREVIEW, {
        season,
        seasonYear: year,
        perPage: Math.min(limit * 2, 50), // over-fetch pour filtrer ensuite
    });
    const raw = data?.Page?.media || [];
    return raw
        .filter((m) => m.idMal && m.title)
        .map((m) => {
            const prequelEdge = (m.relations?.edges || []).find(
                (e) => e.relationType === 'PREQUEL' && e.node?.type === 'ANIME',
            );
            const startDateObj = formatStartDate(m.startDate, m.nextAiringEpisode);
            const currentEp = m.nextAiringEpisode?.episode || null;
            return {
                mal_id: m.idMal,
                anilist_id: m.id,
                title: m.title.english || m.title.romaji || m.title.native,
                cover: m.coverImage?.extraLarge || m.coverImage?.large || '',
                format: m.format, // TV/MOVIE/OVA/ONA/SPECIAL
                studios: (m.studios?.nodes || []).map((s) => s.name),
                popularity: m.popularity || 0,
                favourites: m.favourites || 0,
                averageScore: m.averageScore || null,
                startDate: startDateObj,
                startDateShort: shortDate(startDateObj),
                currentEpisode: currentEp,
                statusLabel: seasonLabel(m, !!prequelEdge, prequelEdge?.node?.seasonYear),
                prequelScore: prequelEdge?.node?.averageScore
                    ? Math.round(prequelEdge.node.averageScore / 10 * 10) / 10
                    : null,
            };
        })
        .slice(0, limit);
}

module.exports = {
    fetchAniListCurrentEpisode,
    fetchAniListSeasonPreview,
};
