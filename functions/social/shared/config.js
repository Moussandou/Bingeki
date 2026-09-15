/**
 * shared/config.js — load BotConfig singleton from Firestore
 *
 * Phase 1 stub. Real impl in Phase 2 will read
 * `social_bot_config/singleton` and cache in memory for the invocation.
 */

const DEFAULTS = {
    enabled: false,
    schedules: {
        daily: { hour: 19, enabled: true },
        weekly: { dayOfWeek: 0, hour: 19, enabled: true },
        favorite: { dayOfWeek: 3, hour: 12, enabled: true },
    },
    platforms: {
        insta: { accountId: '', tokenRef: '', enabled: false },
        tiktok: { accountId: '', tokenRef: '', enabled: false },
    },
    gemini: {
        model: 'gemini-flash-latest',
        maxPromptTokens: 8000,
    },
    discordWebhook: '',
};

async function loadBotConfig(_db) {
    // TODO: fetch `social_bot_config/singleton`, merge with DEFAULTS.
    return DEFAULTS;
}

function isKilled(config) {
    return !config?.enabled;
}

module.exports = { loadBotConfig, isKilled, DEFAULTS };
