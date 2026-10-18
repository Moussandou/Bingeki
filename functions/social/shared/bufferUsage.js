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

const WINDOWS = { 900: 'w15m', 86400: 'w24h', 2592000: 'w30d' };

/** Découpe une liste de champs structurés : `"a";q=1;w=2, "b";r=3` → [{name, q, w, r…}]. */
function parseStructured(value) {
    if (!value) return [];
    return String(value).split(/,(?=\s*"?[\w-]+"?\s*;)/).map((item) => {
        const [rawName, ...params] = item.trim().split(';');
        const entry = { name: rawName.replace(/"/g, '').trim() };
        for (const param of params) {
            const [k, v] = param.split('=');
            if (k && v !== undefined) entry[k.trim()] = v.trim();
        }
        return entry;
    });
}

/**
 * Lit les vraies limites renvoyées par Buffer (en-têtes RateLimit-Policy /
 * RateLimit, une entrée par fenêtre de 15 min, 24 h et 30 jours ; ou
 * l'ancien format RateLimit-Limit / -Remaining / -Reset).
 * → { w15m: { limit, remaining, resetIn }, w24h: …, w30d: … }
 */
function parseRateLimitHeaders(headers) {
    const h = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const out = {};
    const policies = parseStructured(h['ratelimit-policy']);
    const states = parseStructured(h.ratelimit);
    for (const policy of policies) {
        const key = WINDOWS[Number(policy.w)];
        if (!key) continue;
        const state = states.find((s) => s.name === policy.name) || {};
        out[key] = {
            limit: Number(policy.q) || null,
            remaining: state.r !== undefined ? Number(state.r) : null,
            resetIn: state.t !== undefined ? Number(state.t) : null,
        };
    }
    if (Object.keys(out).length === 0 && h['ratelimit-limit']) {
        out.w30d = {
            limit: Number(h['ratelimit-limit']) || null,
            remaining: h['ratelimit-remaining'] !== undefined ? Number(h['ratelimit-remaining']) : null,
            resetIn: h['ratelimit-reset'] !== undefined ? Number(h['ratelimit-reset']) : null,
        };
    }
    return out;
}

async function recordBufferCall({ rateLimited = false, headers = null } = {}) {
    try {
        const now = Date.now();
        const update = {
            // Map imbriquée : avec set({ merge }), une clé « days.x » serait
            // un champ littéral et non un chemin.
            days: { [dayKey(now)]: FieldValue.increment(1) },
            lastCallAt: now,
        };
        if (rateLimited) update.lastRateLimitAt = now;
        if (headers && Object.keys(headers).length) {
            update.lastHeaders = headers;
            const real = parseRateLimitHeaders(headers);
            if (Object.keys(real).length) {
                update.real = real;
                update.realAt = now;
            }
        }
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
    // Les chiffres de Buffer (en-têtes) priment sur notre compteur s'ils sont récents.
    const fresh = data.realAt && Date.now() - data.realAt < 86_400_000;
    const used = (w) => (w && w.limit != null && w.remaining != null ? w.limit - w.remaining : null);
    const real30 = fresh ? used(data.real?.w30d) : null;
    const real24 = fresh ? used(data.real?.w24h) : null;
    return {
        last30: real30 ?? last30,
        today: real24 ?? today,
        lastRateLimitAt: data.lastRateLimitAt || null,
        days,
    };
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
    parseRateLimitHeaders,
    LIMIT_30D, LIMIT_24H, recordBufferCall, readBufferUsage, shouldPauseStats, pruneBufferUsage,
};
