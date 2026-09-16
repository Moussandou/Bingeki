/**
 * scripts/social/seed-test-post.ts
 *
 * One-shot: insert a single ready-to-publish "Sorties du jour" post
 * into social_pending_posts. Useful for the first end-to-end test
 * without waiting for the daily cron.
 *
 * After running this, open /admin/social, you should see the post in
 * "En attente" — click "Publier maintenant" to route it through the
 * Buffer publisher.
 *
 * Usage:
 *   FIREBASE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npm run social:seed-test-post
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

admin.initializeApp({
    credential: process.env.FIREBASE_APPLICATION_CREDENTIALS
        ? admin.credential.cert(resolve(process.env.FIREBASE_APPLICATION_CREDENTIALS))
        : admin.credential.applicationDefault(),
});

const db = admin.firestore();

const now = Date.now();

const testPost = {
    type: 'daily',
    createdAt: now,
    scheduledAt: now + 60_000,
    status: 'ready',
    title: `TEST · Sorties du jour · ${new Date().toLocaleDateString('fr-FR')}`,
    caption:
        "Test de publication end-to-end depuis le bot Bingeki via Buffer.\n\n" +
        "Si tu vois ce post sur Instagram, ça veut dire que la pipeline complète tourne. " +
        "Toutes les progressions et sorties du jour sur https://bingeki.web.app",
    hashtags: '#anime #bingeki #test #ignore',
    slides: [
        {
            format: 'feed',
            url: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
            index: 0,
        },
        {
            format: 'feed',
            url: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
            index: 1,
        },
    ],
    sourceData: {
        animeIds: [31964, 52991],
        animes: [
            {
                mal_id: 31964,
                title: 'My Hero Academia (test)',
                cover: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
                currentEpisode: 1,
            },
            {
                mal_id: 52991,
                title: 'Frieren (test)',
                cover: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
                currentEpisode: 1,
            },
        ],
    },
    platforms: { insta: true, tiktok: false, x: false },
};

async function main() {
    const ref = await db.collection('social_pending_posts').add(testPost);
    console.log(`✅ Test post créé: social_pending_posts/${ref.id}`);
    console.log('→ Ouvre /admin/social, tu devrais le voir en tête de liste.');
    console.log('→ Clique "Publier maintenant" pour tester le publisher Buffer.');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ seed-test-post a échoué:', err);
    process.exit(1);
});
