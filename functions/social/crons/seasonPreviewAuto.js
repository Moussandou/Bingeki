/**
 * cron seasonPreviewAuto — génère la preview de la saison suivante
 * une dizaine de jours avant son début (21 mars, 21 juin, 21 sept.,
 * 21 déc. à 18h). Le post suit ensuite le mode du type « Preview de
 * saison » : en Manuel il attend la validation, en Auto il part seul.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { getModeForKey } = require('../shared/modes');
const { withCronHealth } = require('../shared/cronHealth');
const { runSeasonPreview } = require('./seasonPreview');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

/** Saison qui démarre au trimestre suivant la date donnée. */
function upcomingSeason(date = new Date()) {
    const month = date.getMonth();
    const year = date.getFullYear();
    if (month <= 2) return { season: 'SPRING', year };
    if (month <= 5) return { season: 'SUMMER', year };
    if (month <= 8) return { season: 'FALL', year };
    return { season: 'WINTER', year: year + 1 };
}

async function runSeasonPreviewAuto() {
    return withCronHealth('seasonPreviewAuto', async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) return { note: 'skipped: kill-switch' };
        if (getModeForKey(config, 'seasonPreview') === 'off') return { note: 'skipped: mode off' };

        const { season, year } = upcomingSeason();
        const result = await runSeasonPreview({ season, year, limit: 20 });
        return { postId: result?.postId || null, note: `${season} ${year} · ${result?.note || 'ok'}` };
    });
}

exports.upcomingSeason = upcomingSeason;
exports.runSeasonPreviewAuto = runSeasonPreviewAuto;
exports.seasonPreviewAuto = onSchedule(
    {
        schedule: '0 18 21 3,6,9,12 *',
        timeZone: 'Europe/Paris',
        retryCount: 0,
        secrets: [GEMINI_API_KEY],
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    runSeasonPreviewAuto,
);
