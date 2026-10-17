/**
 * cron autoPublish — publie via Buffer les posts des types en mode Auto
 * dont l'heure prévue est passée.
 *
 * Les posts des types en Manuel ne sont jamais touchés ici : ils
 * attendent la validation puis la publication à la main.
 *
 * Si Buffer échoue sur toutes les plateformes et que
 * `config.fallbackToManual` n'est pas désactivé, le post bascule en
 * Manuel (`manualFallback`) au lieu d'être perdu : il réapparaît dans la
 * file de l'admin.
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { COLLECTIONS, markPendingFailed, updatePendingCaption } = require('../shared/firestore');
const { getModeForType } = require('../shared/modes');
const { withCronHealth } = require('../shared/cronHealth');
const { publishPendingPost } = require('../publishers/publishPending');

const BUFFER_API_KEY = defineSecret('BUFFER_API_KEY');
const MAX_PER_RUN = 3;

async function runAutoPublish() {
    return withCronHealth('autoPublish', async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) return { note: 'skipped: kill-switch' };

        const db = admin.firestore();
        const snap = await db.collection(COLLECTIONS.pending)
            .where('scheduledAt', '<=', Date.now())
            .get();

        const due = snap.docs.filter((doc) => {
            const post = doc.data();
            return (post.status === 'ready' || (post.status === 'processing' && post.publishLease?.expiresAt <= Date.now()))
                && !post.manualFallback
                && getModeForType(config, post.type) === 'auto';
        }).slice(0, MAX_PER_RUN);

        if (due.length === 0) return { note: 'nothing due' };

        const apiKey = process.env.BUFFER_API_KEY;
        let published = 0;
        let fellBack = 0;
        for (const doc of due) {
            const { ok, errors } = await publishPendingPost(doc.id, {
                config, apiKey, publishedBy: 'auto',
            });
            if (ok) {
                published += 1;
                continue;
            }
            const summary = Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(' · ');
            if (config.fallbackToManual === false) {
                await markPendingFailed(doc.id, summary);
            } else {
                await updatePendingCaption(doc.id, {
                    status: 'ready',
                    manualFallback: true,
                    error: `Buffer a échoué, passé en Manuel — ${summary}`,
                });
                fellBack += 1;
            }
        }
        return { note: `${published} publié(s) · ${fellBack} passé(s) en Manuel` };
    });
}

exports.runAutoPublish = runAutoPublish;
exports.autoPublish = onSchedule(
    {
        schedule: '*/15 * * * *',
        timeZone: 'Europe/Paris',
        retryCount: 0,
        secrets: [BUFFER_API_KEY],
        memory: '2GiB',
        timeoutSeconds: 540,
    },
    runAutoPublish,
);
