/**
 * One-shot migration: move `email` off the world-readable users/{uid} profile
 * document into the private subcollection users/{uid}/private/contact.
 *
 * WHY: the profile document is publicly readable (public profiles / SEO /
 * leaderboards). Storing email there leaks PII to anyone, including anonymous
 * sessions. Firestore rules cannot strip a single field on read, so the field
 * must physically live in a protected location.
 *
 * SAFETY:
 *   - Idempotent: re-running it is harmless (already-migrated users are skipped).
 *   - Copies first, deletes the public field only after the private write succeeds.
 *   - Use --dry-run to preview without writing.
 *
 * USAGE:
 *   FIREBASE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx tsx scripts/migrate-email-to-private.ts [--dry-run]
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

if (!process.env.FIREBASE_APPLICATION_CREDENTIALS) {
    console.warn("⚠️  FIREBASE_APPLICATION_CREDENTIALS is not set — falling back to application default credentials.");
}

initializeApp({
    credential: process.env.FIREBASE_APPLICATION_CREDENTIALS
        ? cert(resolve(process.env.FIREBASE_APPLICATION_CREDENTIALS))
        : applicationDefault(),
});

const db = getFirestore();

async function migrate() {
    console.log(`--- Email → private/contact migration ${DRY_RUN ? '(DRY RUN)' : ''} ---`);

    const snapshot = await db.collection('users').get();
    console.log(`Scanning ${snapshot.size} user document(s)…`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        const email = data.email;

        // Nothing to migrate if the public doc has no email field.
        if (!email || typeof email !== 'string') {
            skipped++;
            continue;
        }

        try {
            if (DRY_RUN) {
                console.log(`  would migrate ${userDoc.id} (${email})`);
                migrated++;
                continue;
            }

            // 1. Write into the private subcollection (source of truth going forward).
            await db
                .collection('users').doc(userDoc.id)
                .collection('private').doc('contact')
                .set({ email, updatedAt: Date.now() }, { merge: true });

            // 2. Only after the private write succeeds, strip the public field.
            await userDoc.ref.update({ email: FieldValue.delete() });

            migrated++;
            if (migrated % 50 === 0) console.log(`  …${migrated} migrated`);
        } catch (err) {
            failed++;
            console.error(`  ❌ Failed for ${userDoc.id}:`, err);
        }
    }

    console.log('--- Done ---');
    console.log(`Migrated: ${migrated} | Skipped (no email): ${skipped} | Failed: ${failed}`);
    if (DRY_RUN) console.log('No writes were performed (dry run).');
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration crashed:', err);
        process.exit(1);
    });
