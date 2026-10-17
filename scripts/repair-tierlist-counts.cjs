/**
 * Backfill legacy lists before enabling indexed popularity queries.
 * No network is used when this module is imported by tests.
 */
async function repairTierListCounts(db) {
    let cursor;
    let repaired = 0;
    while (true) {
        let query = db.collection('tierLists').limit(200);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        for (const document of page.docs) {
            const changed = await db.runTransaction(async tx => {
                const current = await tx.get(document.ref);
                if (!current.exists) return false;
                const data = current.data();
                const likes = data.likes ?? [];
                if (!Array.isArray(likes) || !likes.every(uid => typeof uid === 'string')) {
                    throw new Error(`Invalid likes in ${document.ref.path}`);
                }
                const uniqueLikes = [...new Set(likes)];
                if (data.likesCount === uniqueLikes.length && likes.length === uniqueLikes.length) return false;
                tx.update(document.ref, { likes: uniqueLikes, likesCount: uniqueLikes.length });
                return true;
            });
            if (changed) repaired++;
        }
        if (page.docs.length < 200) return repaired;
        cursor = page.docs.at(-1);
    }
}

if (require.main === module) {
    const projectId = process.env.GCLOUD_PROJECT;
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;
    if (!projectId || (emulator && !/^(localhost|127\.0\.0\.1):\d+$/.test(emulator))) {
        throw new Error('Set an explicit GCLOUD_PROJECT and a local emulator host.');
    }
    if (!emulator && !process.argv.includes(`--approve-production=${projectId}`)) {
        throw new Error('Production access refused: explicit --approve-production=<projectId> is required.');
    }
    const { Firestore } = require('@google-cloud/firestore');
    const db = new Firestore({ projectId });
    repairTierListCounts(db)
        .then(repaired => console.log(`Repaired ${repaired} tier list count(s) in ${projectId}.`))
        .catch(error => { console.error(error); process.exitCode = 1; })
        .finally(() => db.terminate());
}

module.exports = { repairTierListCounts };
