/**
 * shared/modes.js — mode de publication par type de post.
 *
 * Chaque type a un mode stocké dans `config.schedules.<clé>.mode` :
 *   - 'auto'   : publié via Buffer à l'heure prévue, sans validation
 *   - 'manual' : attend la validation admin, publié à la main depuis le tel
 *   - 'off'    : le cron ne génère plus rien
 *
 * `schedules.<clé>.enabled === false` reste lu comme 'off' pour garder la
 * compatibilité avec les anciens interrupteurs de crons.
 */

const TYPE_TO_KEY = {
    daily: 'daily',
    weekly: 'weekly',
    favorite: 'favorite',
    newseason: 'newseason',
    announcement: 'announcement',
    announcement_digest: 'announcement',
    season_preview: 'seasonPreview',
    culture_news: 'cultureNewsAuto',
};

const DEFAULT_MODES = {
    daily: 'manual',
    weekly: 'manual',
    favorite: 'manual',
    newseason: 'manual',
    announcement: 'manual',
    seasonPreview: 'manual',
    cultureNewsAuto: 'off',
};

const VALID_MODES = new Set(['auto', 'manual', 'off']);

function getModeForKey(config, key) {
    const sched = config?.schedules?.[key];
    if (sched?.enabled === false) return 'off';
    if (VALID_MODES.has(sched?.mode)) return sched.mode;
    return DEFAULT_MODES[key] || 'manual';
}

function getModeForType(config, type) {
    const key = TYPE_TO_KEY[type];
    return key ? getModeForKey(config, key) : 'manual';
}

module.exports = { TYPE_TO_KEY, DEFAULT_MODES, getModeForKey, getModeForType };
