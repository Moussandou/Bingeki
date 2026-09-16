/**
 * shared/config.js — load BotConfig singleton from Firestore.
 *
 * Caches the config for the lifetime of the Cloud Function instance to
 * avoid a Firestore read on every invocation.
 */

const admin = require('firebase-admin');

const COLLECTION = 'social_bot_config';
const DOC_ID = 'singleton';

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

let cached = null;
let cachedAt = 0;
const TTL_MS = 60_000; // 1 min cache

async function loadBotConfig() {
    const now = Date.now();
    if (cached && now - cachedAt < TTL_MS) return cached;

    const db = admin.firestore();
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) {
        cached = DEFAULTS;
    } else {
        cached = { ...DEFAULTS, ...snap.data() };
    }
    cachedAt = now;
    return cached;
}

function invalidateCache() {
    cached = null;
    cachedAt = 0;
}

function isKilled(config) {
    return !config?.enabled;
}

module.exports = { loadBotConfig, invalidateCache, isKilled, DEFAULTS };
