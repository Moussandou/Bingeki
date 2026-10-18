/**
 * cron cronWatchdog — vérifie la santé des crons tout seul.
 *
 * Toutes les 30 min :
 *   - un cron bloqué en « running » depuis plus d'une heure est marqué
 *     en erreur (la fonction a planté sans passer par withCronHealth) ;
 *   - un cron en erreur est relancé une seule fois (`autoRetriedFor`
 *     garde le lastRunAt déjà relancé pour ne pas boucler) ;
 *   - `social_cron_health/_watchdog` garde l'heure de la dernière
 *     vérification, affichée dans l'admin.
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { COLLECTIONS } = require('../shared/firestore');
const { CRON_RUNNERS } = require('./runners');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const BUFFER_API_KEY = defineSecret('BUFFER_API_KEY');
const TIKTOK_CLIENT_KEY = defineSecret('TIKTOK_CLIENT_KEY');
const TIKTOK_CLIENT_SECRET = defineSecret('TIKTOK_CLIENT_SECRET');

const STUCK_AFTER_MS = 3600_000;
const WATCHDOG_DOC = '_watchdog';
// Les stats Buffer ne sont pas urgentes : pas de relance qui doublerait
// leur consommation de quota, le relevé du lendemain suffit.
const NO_AUTO_RETRY = new Set(['pollReach']);

async function runCronWatchdog() {
    const db = admin.firestore();
    const col = db.collection(COLLECTIONS.cronHealth);
    const snap = await col.get();
    const now = Date.now();
    const retried = [];
    const stuck = [];

    for (const doc of snap.docs) {
        if (doc.id === WATCHDOG_DOC) continue;
        const h = doc.data();

        if (h.lastStatus === 'running' && h.lastRunAt && now - h.lastRunAt > STUCK_AFTER_MS) {
            await doc.ref.update({
                lastStatus: 'error',
                lastError: 'Bloqué en cours depuis plus d\'une heure (timeout probable)',
                lastRunEndAt: now,
            });
            h.lastStatus = 'error';
            stuck.push(doc.id);
        }

        if (h.lastStatus !== 'error') continue;
        const runner = CRON_RUNNERS[doc.id];
        if (!runner || NO_AUTO_RETRY.has(doc.id) || h.autoRetriedFor === h.lastRunAt) continue;

        // Noté avant la relance : si elle échoue à son tour, lastRunAt
        // change et on ne relancera pas une deuxième fois.
        await doc.ref.update({ autoRetriedFor: h.lastRunAt || null, lastAutoRetryAt: now });
        try {
            await runner();
            await doc.ref.update({ autoRetriedFor: (await doc.ref.get()).data()?.lastRunAt || null });
            retried.push(`${doc.id}:ok`);
        } catch (err) {
            await doc.ref.update({ autoRetriedFor: (await doc.ref.get()).data()?.lastRunAt || null });
            console.error(`[social/cronWatchdog] retry ${doc.id} failed:`, err.message || err);
            retried.push(`${doc.id}:ko`);
        }
    }

    await col.doc(WATCHDOG_DOC).set({
        checkedAt: Date.now(),
        retried,
        stuck,
    });
    console.log(`[social/cronWatchdog] retried=[${retried.join(', ')}] stuck=[${stuck.join(', ')}]`);
    return { retried, stuck };
}

exports.runCronWatchdog = runCronWatchdog;
exports.cronWatchdog = onSchedule(
    {
        schedule: '*/30 * * * *',
        timeZone: 'Europe/Paris',
        retryCount: 0,
        secrets: [GEMINI_API_KEY, BUFFER_API_KEY, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET],
        memory: '2GiB',
        timeoutSeconds: 540,
    },
    runCronWatchdog,
);
