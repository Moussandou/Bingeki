/**
 * generators/fallbackCaption.js — deterministic caption + hashtags per
 * post type, used when Gemini is unavailable (503 during traffic spikes,
 * quota exhausted, network hiccup, etc.).
 *
 * Design goals:
 * - Never throw. Always return a caption + hashtags shaped like Gemini's.
 * - Always include https://bingeki.web.app so the URL rule from
 *   ensureBingekiUrl() holds even without post-processing.
 * - Feel natural (not "sorry, our AI is down") — the reader shouldn't
 *   know which path was taken.
 * - Under 400 characters where the prompts constrained Gemini too.
 */

const URL = 'https://bingeki.web.app';

function slug(title) {
    return String(title || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
}

function dailyCaption(animes) {
    const n = animes.length;
    const titles = animes.slice(0, 3).map((a) => a.title).join(', ');
    const rest = n > 3 ? ` et ${n - 3} autre${n - 3 > 1 ? 's' : ''}` : '';
    const caption =
        `${n} épisode${n > 1 ? 's' : ''} sorti${n > 1 ? 's' : ''} aujourd'hui — ${titles}${rest}.\n\n` +
        `Vous suivez lesquels ? Dites-nous en commentaires.\n\n` +
        `Toutes les sorties et progressions sur ${URL}`;
    const tags = ['#anime', '#bingeki', '#animefr', '#sortiesdujour']
        .concat(animes.slice(0, 2).map((a) => `#${slug(a.title)}`).filter((t) => t !== '#'))
        .join(' ');
    return { caption, hashtags: tags };
}

function weeklyCaption(animes) {
    const medals = ['🥇', '🥈', '🥉'];
    const top = animes.slice(0, 3)
        .map((a, i) => `${medals[i]} ${a.title} — ${a.avg}/10`)
        .join('\n');
    const caption =
        `Le TOP 3 de la semaine selon VOUS :\n\n${top}\n\n` +
        `Merci aux watchers Bingeki qui font le classement. Notez vos épisodes sur ${URL}`;
    const tags = ['#animeweeklyrecap', '#bingeki', '#anime']
        .concat(animes.slice(0, 3).map((a) => `#${slug(a.title)}`).filter((t) => t !== '#'))
        .join(' ');
    return { caption, hashtags: tags };
}

function favoriteCaption(episodes) {
    if (!episodes.length) {
        return {
            caption: `Aucune pépite cette semaine — le retour de vos anime prend forme sur ${URL}`,
            hashtags: '#anime #bingeki #animefr',
        };
    }
    const lines = episodes.slice(0, 3).map((ep, i) => {
        const s = ep.season ? ` S${ep.season}` : '';
        const num = ep.episodeNumber ? ` ép. ${ep.episodeNumber}` : '';
        return `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} ${ep.title}${s}${num} — ${ep.avg}/10`;
    }).join('\n');
    const caption =
        `Les 3 pépites de la semaine selon la commu :\n\n${lines}\n\n` +
        `Ajoute-les à ta liste sur ${URL}`;
    const tags = ['#anime', '#bingeki', '#animefr', '#coupdecoeur']
        .concat(
            episodes.slice(0, 3).map((a) => `#${slug(a.title)}`).filter((t) => t !== '#'),
        )
        .join(' ');
    return { caption, hashtags: tags };
}

function newseasonCaption(data) {
    const studios = (data.studios || []).slice(0, 2).join(' & ');
    const eps = data.episodes ? `${data.episodes} épisodes prévus` : '';
    const prev = data.previousScore ? `S1 notée ${data.previousScore}/10` : '';
    const context = [studios, eps, prev].filter(Boolean).join(' · ');
    const caption =
        `${data.title} — nouvelle saison. Le retour tant attendu.\n\n` +
        (context ? `${context}.\n\n` : '') +
        `Track la saison en direct sur ${URL}. Vous êtes hype ?`;
    const tags = [`#${slug(data.title)}`, '#anime', '#newseason', '#bingeki', '#animefr']
        .filter((t) => t !== '#')
        .join(' ');
    return { caption, hashtags: tags };
}

function formatReleaseLabel(data) {
    const raw = data.aired_from ? String(data.aired_from).trim() : '';
    const airedString = (data.aired_string || '').trim();
    const airedStringYear = airedString.match(/^(\d{4})\s*(to|-)?/i)?.[1];
    const candidate = raw || airedStringYear || '';
    if (!candidate) return null;
    // Tenrai returns just the year "2027" for anime with no confirmed
    // schedule yet. Say "prévu en 2027" so the caption doesn't imply a
    // specific day, matching the slide wording.
    if (/^\d{4}$/.test(candidate)) return `prévu en ${candidate}`;
    const d = new Date(candidate);
    if (isNaN(d.getTime())) return null;
    return `sortie le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function announcementCaption(data) {
    const studios = (data.studios || []).slice(0, 2).join(' & ');
    const eps = data.episodes ? `${data.episodes} épisodes prévus` : '';
    const releaseLabel = formatReleaseLabel(data);
    // Pas de note affichée dans la caption — le score MAL était trop
    // "raw" et exposait la source. On mise sur le studio et la date
    // pour créer de l'attente.
    const context = [
        studios ? `Studio ${studios}` : '',
        eps,
        releaseLabel ? releaseLabel.replace(/^prévu en/, 'Prévu en').replace(/^sortie le/, 'Sortie le') : '',
    ].filter(Boolean).join(' · ');
    const caption =
        `${data.title} — c'est officiel, la suite arrive.\n\n` +
        (context ? `${context}.\n\n` : '') +
        `Ajoute-le à ta watchlist sur ${URL}. Hyped ?`;
    const tags = [`#${slug(data.title)}`, '#anime', '#animeannouncement', '#bingeki', '#animefr']
        .filter((t) => t !== '#')
        .join(' ');
    return { caption, hashtags: tags };
}

function announcementDigestCaption(data) {
    const items = Array.isArray(data?.animes) ? data.animes : [];
    const N = items.length;
    const titles = items.map(a => a.title).join(', ');
    const shorts = items.map(a => {
        const rel = formatReleaseLabel(a);
        return `• ${a.title}${rel ? ` — ${rel}` : ''}`;
    }).join('\n');
    const caption =
        `${N} annonces à noter cette semaine :\n\n` +
        `${shorts}\n\n` +
        `Ajoute-les à ta watchlist sur ${URL}. Sur laquelle vous êtes le plus hype ?`;
    const tagBase = ['#animeannouncement', '#anime', '#bingeki', '#animefr'];
    const nameTags = items.slice(0, 3).map(a => `#${slug(a.title)}`).filter(t => t !== '#');
    const tags = [...tagBase, ...nameTags].join(' ');
    return { caption, hashtags: tags };
}

/**
 * Public: returns a deterministic caption + hashtags for the given
 * post type. Data shape mirrors what generateCaption(type, data, config)
 * receives from each cron:
 *   - daily:    Array<{ title, season? }>
 *   - weekly:   Array<{ title, avg, count }>
 *   - favorite: Array<{ title, avg, count }>
 *   - newseason: { title, studios?, episodes?, previousScore? }
 */
function cultureNewsCaption(data) {
    const title = (data.title || '').trim();
    const desc = (data.description || '').trim();
    const cats = {
        game: 'jeu', movie: 'film', goodies: 'goodies',
        industry: 'industrie', event: 'événement', other: 'actu',
    };
    const catTag = `#${(cats[data.category] || 'anime').replace(/\s+/g, '')}`;
    const line1 = title || 'Une actu à ne pas rater côté culture anime.';
    const line2 = desc ? `\n\n${desc}` : '';
    const caption = `${line1}${line2}\n\nToute l'actu anime, jour après jour, sur ${URL}`;
    return {
        caption,
        hashtags: `#anime #cultureanime ${catTag} #bingeki`,
    };
}

function fallbackCaption(type, data) {
    try {
        switch (type) {
            case 'daily':
                return dailyCaption(Array.isArray(data) ? data : []);
            case 'weekly':
                return weeklyCaption(Array.isArray(data) ? data : []);
            case 'favorite':
                return favoriteCaption(Array.isArray(data) ? data : []);
            case 'newseason':
                return newseasonCaption(data || {});
            case 'announcement':
                return announcementCaption(data || {});
            case 'announcement_digest':
                return announcementDigestCaption(data || {});
            case 'culture_news':
                return cultureNewsCaption(data || {});
            default:
                return {
                    caption: `Nouveauté sur Bingeki. Découvrez-la sur ${URL}`,
                    hashtags: '#anime #bingeki',
                };
        }
    } catch (err) {
        // Absolute safety net: even a bad data shape must not break the
        // cron. Return something publishable.
        console.warn('[social/fallback] handler crashed, returning generic:', err.message || err);
        return {
            caption: `Nouveauté sur Bingeki. Découvrez-la sur ${URL}`,
            hashtags: '#anime #bingeki',
        };
    }
}

module.exports = { fallbackCaption };
