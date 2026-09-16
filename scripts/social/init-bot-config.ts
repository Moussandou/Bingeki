/**
 * scripts/social/init-bot-config.ts
 *
 * One-shot: write `social_bot_config/singleton` with the default schema
 * expected by functions/social/*.
 *
 * Uses `{ merge: true }` so re-running the script preserves any field
 * you already customised in the console and just fills the blanks.
 *
 * Usage:
 *   FIREBASE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx tsx scripts/social/init-bot-config.ts
 *
 * Overrides via env (optional):
 *   INSTA_BUFFER_CHANNEL_ID   default: '6aaad254ea19ca0bde5b9a1d'
 *   TIKTOK_BUFFER_CHANNEL_ID  default: '' (TikTok stays disabled)
 *   ENABLE_BOT                default: 'false' (kill-switch OFF until
 *                             we verify a first end-to-end publish)
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

if (!process.env.FIREBASE_APPLICATION_CREDENTIALS) {
    console.warn(
        "⚠️  FIREBASE_APPLICATION_CREDENTIALS non défini — tentative avec les credentials par défaut.",
    );
}

initializeApp({
    credential: process.env.FIREBASE_APPLICATION_CREDENTIALS
        ? cert(resolve(process.env.FIREBASE_APPLICATION_CREDENTIALS))
        : applicationDefault(),
});

const db = getFirestore();

const INSTA_CHANNEL = process.env.INSTA_BUFFER_CHANNEL_ID || '6aaad254ea19ca0bde5b9a1d';
const TIKTOK_CHANNEL = process.env.TIKTOK_BUFFER_CHANNEL_ID || '';
const ENABLED = process.env.ENABLE_BOT === 'true';

const config = {
    enabled: ENABLED,
    schedules: {
        daily: { hour: 19, enabled: true },
        weekly: { dayOfWeek: 0, hour: 19, enabled: true },
        favorite: { dayOfWeek: 3, hour: 12, enabled: true },
    },
    platforms: {
        insta: {
            accountId: 'bingeki.fr',
            tokenRef: 'BUFFER_API_KEY',
            enabled: Boolean(INSTA_CHANNEL),
            mode: 'photo',
            bufferChannelId: INSTA_CHANNEL,
        },
        tiktok: {
            accountId: '',
            tokenRef: 'BUFFER_API_KEY',
            enabled: Boolean(TIKTOK_CHANNEL),
            mode: 'photo',
            bufferChannelId: TIKTOK_CHANNEL,
        },
    },
    gemini: {
        model: 'gemini-flash-latest',
        maxPromptTokens: 8000,
    },
    discordWebhook: '',
};

async function main() {
    const ref = db.doc('social_bot_config/singleton');
    const before = await ref.get();

    if (before.exists) {
        console.log('→ Doc existant, merge des nouveaux champs uniquement.');
    } else {
        console.log('→ Création du doc social_bot_config/singleton.');
    }

    await ref.set(config, { merge: true });
    const after = await ref.get();

    console.log('\n✅ social_bot_config/singleton écrit.');
    console.log(JSON.stringify(after.data(), null, 2));
    console.log(
        `\n⚠️  Kill-switch enabled=${ENABLED}. ` +
            (ENABLED
                ? 'Le bot publiera aux prochaines exécutions cron.'
                : 'Repasse à ENABLE_BOT=true quand tu es prêt pour la prod.'),
    );

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ init-bot-config a échoué:', err);
    process.exit(1);
});
