/**
 * shared/bufferUsage.js — compte les appels à l'API Buffer.
 *
 * Buffer limite la clé API (3000 requêtes / 30 jours, 250 / 24 h) sans
 * exposer de compteur : on note nous-mêmes chaque appel par jour dans
 * `social_bot_config/buffer_usage`, plus la dernière erreur de quota et
 * les en-têtes de limite si Buffer en renvoie. L'admin affiche la jauge,
 * et pollReach se met en pause avant d'épuiser le quota de publication.
 */

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const LIMIT_30D = 3000;
const LIMIT_24H = 250;
const PAUSE_RATIO = 0.8;
const KEEP_DAYS = 35;

const usageRef = () => admin.firestore().collection('social_bot_config').doc('buffer_usage');

const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

async function recordBufferCall({ rateLimited = false, headers = null } = {}) {
    try {
        const now = Date.now();
        const update = {
            [`days.${dayKey(now)}`]: FieldValue.increment(1),
            lastCallAt: now,
        };
        if (rateLimited) update.lastRateLimitAt = now;
        if (headers && Object.keys(headers).length) update.lastHeaders = headers;
        await usageRef().set(update, { merge: true });
    } catch (err) {
        console.warn('[social/bufferUsage] record failed:', err.message || err);
    }
}

/** Appels des 30 derniers jours et du jour, d'après le compteur. */
async function readBufferUsage() {
    const snap = await usageRef().get();
    const data = snap.exists ? snap.data() : {};
    const days = data.days || {};
    const cutoff = dayKey(Date.now() - 29 * 86_400_000);
    let last30 = 0;
    for (const [day, n] of Object.entries(days)) if (day >= cutoff) last30 += Number(n) || 0;
    const today = Number(days[dayKey()]) || 0;
    return { last30, today, lastRateLimitAt: data.lastRateLimitAt || null, days };
}

/** Vrai si les stats doivent se mettre en pause pour garder la publication. */
async function shouldPauseStats() {
    const { last30, today, lastRateLimitAt } = await readBufferUsage();
    if (lastRateLimitAt && Date.now() - lastRateLimitAt < 86_400_000) return 'quota Buffer atteint il y a moins de 24 h';
    if (last30 >= LIMIT_30D * PAUSE_RATIO) return `${last30}/${LIMIT_30D} requêtes sur 30 jours`;
    if (today >= LIMIT_24H * PAUSE_RATIO) return `${today}/${LIMIT_24H} requêtes aujourd'hui`;
    return null;
}

/** Retire les jours trop anciens du compteur. */
async function pruneBufferUsage() {
    const { days } = await readBufferUsage();
    const cutoff = dayKey(Date.now() - KEEP_DAYS * 86_400_000);
    const stale = Object.keys(days).filter((d) => d < cutoff);
    if (stale.length === 0) return;
    await usageRef().update(Object.fromEntries(stale.map((d) => [`days.${d}`, FieldValue.delete()])));
}

module.exports = {
    LIMIT_30D, LIMIT_24H, recordBufferCall, readBufferUsage, shouldPauseStats, pruneBufferUsage,
};
