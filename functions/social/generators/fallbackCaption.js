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
        `Vous en suivez lesquels ? Dites-nous en commentaires.\n\n` +
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
        const num = ep.episodeNumber ? ` ép. ${ep.episodeNumber}` : '';
        return `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} ${ep.title}${num} — ${ep.avg}/10`;
    }).join('\n');
    const caption =
        `Les 3 pépites de la semaine selon MAL :\n\n${lines}\n\n` +
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

/**
 * Public: returns a deterministic caption + hashtags for the given
 * post type. Data shape mirrors what generateCaption(type, data, config)
 * receives from each cron:
 *   - daily:    Array<{ title, season? }>
 *   - weekly:   Array<{ title, avg, count }>
 *   - favorite: Array<{ title, avg, count }>
 *   - newseason: { title, studios?, episodes?, previousScore? }
 */
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
