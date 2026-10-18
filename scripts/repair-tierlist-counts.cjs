const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { isDeepStrictEqual: equal } = require('node:util');

const MAX_DOCUMENTS = 100000;
const MAX_BYTES = 16 * 1024 * 1024;
const fields = ['likes', 'likesCount'];

class MigrationError extends Error {}

function fail(message) {
    throw new MigrationError(message);
}

function targetOf(db) {
    return { projectId: db.projectId, emulator: process.env.FIRESTORE_EMULATOR_HOST || null };
}

function version(snapshot) {
    return snapshot.updateTime ? [snapshot.updateTime.seconds, snapshot.updateTime.nanoseconds] : null;
}

function capture(data, key) {
    if (!Object.hasOwn(data, key)) return { present: false };
    const value = data[key];
    if (typeof value === 'number' && !Number.isFinite(value)) {
        return { present: true, number: String(value) };
    }
    if (key === 'likesCount' && value !== null && !['number', 'string', 'boolean'].includes(typeof value)) {
        fail('Unsupported counter type; manual review required before any writes.');
    }
    return { present: true, value };
}

function beforeOf(data) {
    return Object.fromEntries(fields.map(key => [key, capture(data, key)]));
}

function afterOf(data) {
    const likes = data.likes ?? [];
    if (!Array.isArray(likes) || !likes.every(uid => typeof uid === 'string' && uid.length > 0)) {
        fail('Invalid likes array; manual review required before any writes.');
    }
    const unique = [...new Set(likes)];
    return { likes: unique, likesCount: unique.length };
}

function digest(plan) {
    return createHash('sha256').update(JSON.stringify(plan)).digest('hex');
}

async function activeOwner(reader, db, data) {
    if (typeof data.userId !== 'string' || !data.userId || data.userId.includes('/')) return false;
    const [profile, tombstone] = await reader.getAll(
        db.collection('users').doc(data.userId), db.collection('accountDeletions').doc(data.userId),
        { fieldMask: ['isBanned', 'deleting', 'deletedAt'] },
    );
    return profile.exists && !profile.data().isBanned && !profile.data().deleting
        && !profile.data().deletedAt && !tombstone.exists;
}

/** Read-only, bounded scan. The plan contains only changed fields, never full profiles/lists. */
async function planTierListCounts(db, { maxDocuments = 10000 } = {}) {
    if (!Number.isSafeInteger(maxDocuments) || maxDocuments < 1 || maxDocuments > MAX_DOCUMENTS) {
        fail('maxDocuments must be an integer between 1 and 100000.');
    }
    const plan = {
        schema: 1, runId: randomUUID(), target: targetOf(db), maxDocuments,
        scanned: 0, skippedOwners: 0, entries: [],
    };
    let cursor;
    while (true) {
        let query = db.collection('tierLists').select('likes', 'likesCount', 'userId')
            .orderBy('__name__').limit(Math.min(200, maxDocuments - plan.scanned + 1));
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        for (const document of page.docs) {
            if (++plan.scanned > maxDocuments) fail('Scan limit exceeded; no writes performed. Increase maxDocuments explicitly.');
            const data = document.data();
            const after = afterOf(data);
            const before = beforeOf(data);
            if (equal(data.likes, after.likes) && data.likesCount === after.likesCount) continue;
            if (!await activeOwner(db, db, data)) {
                plan.skippedOwners++;
                continue;
            }
            plan.entries.push({ id: document.id, version: version(document), before, after });
            if (Buffer.byteLength(JSON.stringify(plan)) > MAX_BYTES) fail('Plan size limit exceeded; no writes performed.');
        }
        if (page.size < Math.min(200, maxDocuments - (plan.scanned - page.size) + 1)) break;
        cursor = page.docs.at(-1);
    }
    return validatePlan(plan, db);
}

function validatePlan(plan, db) {
    if (!plan || plan.schema !== 1 || !/^[a-f0-9-]{36}$/.test(plan.runId)
        || !equal(plan.target, targetOf(db))
        || !Number.isSafeInteger(plan.maxDocuments) || plan.maxDocuments < 1 || plan.maxDocuments > MAX_DOCUMENTS
        || !Number.isSafeInteger(plan.scanned) || plan.scanned < 0 || plan.scanned > plan.maxDocuments
        || !Number.isSafeInteger(plan.skippedOwners) || plan.skippedOwners < 0 || plan.skippedOwners > plan.scanned
        || !Array.isArray(plan.entries) || plan.entries.length > plan.scanned
        || Buffer.byteLength(JSON.stringify(plan)) > MAX_BYTES) fail('Invalid plan or target mismatch.');
    const ids = new Set();
    for (const entry of plan.entries) {
        if (!entry || typeof entry.id !== 'string' || !entry.id || entry.id.includes('/') || ids.has(entry.id)
            || !Array.isArray(entry.version) || entry.version.length !== 2
            || !entry.version.every(Number.isSafeInteger) || entry.version[1] < 0 || entry.version[1] >= 1e9
            || !entry.before || !entry.after || !equal(Object.keys(entry.before).sort(), [...fields].sort())
            || !equal(Object.keys(entry.after).sort(), [...fields].sort())) fail('Invalid plan entry.');
        ids.add(entry.id);
        const restored = {};
        for (const key of fields) {
            const saved = entry.before[key];
            if (!saved || typeof saved.present !== 'boolean') fail('Invalid saved field.');
            if (!saved.present) {
                if (!equal(saved, { present: false })) fail('Invalid absent field.');
            } else if (Object.hasOwn(saved, 'number')) {
                if (key !== 'likesCount' || !['NaN', 'Infinity', '-Infinity'].includes(saved.number)
                    || !equal(Object.keys(saved).sort(), ['number', 'present'])) fail('Invalid saved number.');
                restored[key] = Number(saved.number);
            } else {
                if (!equal(Object.keys(saved).sort(), ['present', 'value'])) fail('Invalid saved value.');
                restored[key] = saved.value;
            }
        }
        if (!equal(beforeOf(restored), entry.before) || !equal(afterOf(restored), entry.after)
            || (equal(restored.likes, entry.after.likes) && restored.likesCount === entry.after.likesCount)) {
            fail('Plan does not describe the canonical repair.');
        }
    }
    return plan;
}

function privatePath(filename) {
    if (typeof filename !== 'string' || !filename) fail('A private planFile outside the repository is required.');
    const resolved = path.join(fs.realpathSync(path.dirname(path.resolve(filename))), path.basename(filename));
    const root = fs.realpathSync(path.join(__dirname, '..'));
    const relative = path.relative(root, resolved);
    if (!relative.startsWith(`..${path.sep}`) && relative !== '..') fail('Backup must be outside the repository.');
    return resolved;
}

function savePlan(filename, plan) {
    const data = JSON.stringify(plan);
    if (Buffer.byteLength(data) > MAX_BYTES) fail('Plan size limit exceeded.');
    const fd = fs.openSync(privatePath(filename), fs.constants.O_WRONLY | fs.constants.O_CREAT
        | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    try {
        fs.fchmodSync(fd, 0o600);
        fs.writeFileSync(fd, data);
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
    const directory = fs.openSync(path.dirname(privatePath(filename)), fs.constants.O_RDONLY);
    try {
        fs.fsyncSync(directory);
    } finally {
        fs.closeSync(directory);
    }
}

function loadPlan(filename, db) {
    const fd = fs.openSync(privatePath(filename), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.size > MAX_BYTES) {
            fail('Backup must be a private regular file (0600), at most 16 MiB.');
        }
        return validatePlan(JSON.parse(fs.readFileSync(fd, 'utf8')), db);
    } finally {
        fs.closeSync(fd);
    }
}

function receiptRef(db, plan, index) {
    return db.collection('migrationReceipts').doc(digest(plan)).collection('entries').doc(String(index));
}

function matches(snapshot, values) {
    if (!snapshot.exists) return false;
    const data = snapshot.data();
    return fields.every(key => equal(data[key], values[key]));
}

function checkCurrent(snapshot, receipt, entry, rollback) {
    if (!snapshot.exists) fail('Conflict: planned document no longer exists.');
    if (receipt.exists) {
        const state = receipt.data().state;
        if (!['applied', 'restored'].includes(state)) fail('Invalid migration receipt.');
        if (state === 'restored') {
            if (!rollback) fail('Plan already rolled back; generate a fresh plan.');
            if (!equal(beforeOf(snapshot.data()), entry.before)) fail('Conflict after rollback.');
            return 'done';
        }
        if (!equal(version(snapshot), version(receipt)) || !matches(snapshot, entry.after)) {
            fail('Conflict: document changed after migration; refusing to overwrite.');
        }
        return rollback ? 'write' : 'done';
    }
    if (!equal(version(snapshot), entry.version) || !equal(beforeOf(snapshot.data()), entry.before)) {
        fail('Conflict: document changed since planning; generate a fresh plan.');
    }
    return rollback ? 'done' : 'write';
}

/** Validate every entry before the first write; each transaction rechecks all guards. */
async function preflight(db, plan, rollback) {
    for (const [index, entry] of plan.entries.entries()) {
        const [snapshot, receipt] = await db.getAll(db.collection('tierLists').doc(entry.id), receiptRef(db, plan, index));
        const action = checkCurrent(snapshot, receipt, entry, rollback);
        if (action === 'write' && !await activeOwner(db, db, snapshot.data())) {
            fail('Conflict: owner missing, banned, deleting or tombstoned.');
        }
    }
}

/** The existing immutable plan is the mandatory, fsynced pre-write backup. */
async function applyTierListCounts(db, { planFile, rollback = false } = {}) {
    const plan = loadPlan(planFile, db);
    await preflight(db, plan, rollback);
    // Use the injected client's SDK, including when Admin SDK resolves a second installation.
    const { FieldValue } = db.constructor;
    let changed = 0;
    for (const [index, entry] of plan.entries.entries()) {
        const ref = db.collection('tierLists').doc(entry.id);
        const receipt = receiptRef(db, plan, index);
        const wrote = await db.runTransaction(async tx => {
            const [snapshot, recorded] = await tx.getAll(ref, receipt);
            if (checkCurrent(snapshot, recorded, entry, rollback) === 'done') return false;
            if (!await activeOwner(tx, db, snapshot.data())) fail('Conflict: owner is no longer active.');
            const update = rollback ? Object.fromEntries(fields.map(key => {
                const saved = entry.before[key];
                return [key, !saved.present ? FieldValue.delete()
                    : Object.hasOwn(saved, 'number') ? Number(saved.number) : saved.value];
            })) : entry.after;
            tx.update(ref, update);
            // Both timestamps are identical in this atomic commit, including after a lost response.
            tx.set(receipt, { state: rollback ? 'restored' : 'applied' });
            return true;
        });
        if (wrote) changed++;
    }
    const verification = await verifyTierListCounts(db, { planFile, rollback });
    return { changed, ...verification };
}

async function verifyTierListCounts(db, { planFile, rollback = false } = {}) {
    const plan = loadPlan(planFile, db);
    for (const [index, entry] of plan.entries.entries()) {
        const [snapshot, receipt] = await db.getAll(db.collection('tierLists').doc(entry.id), receiptRef(db, plan, index));
        if (rollback) {
            if (!snapshot.exists || !equal(beforeOf(snapshot.data()), entry.before)) fail('Rollback verification failed.');
            if (receipt.exists && receipt.data().state !== 'restored') fail('Rollback receipt verification failed.');
        } else if (!receipt.exists || receipt.data().state !== 'applied'
            || !equal(version(snapshot), version(receipt)) || !matches(snapshot, entry.after)) {
            fail('Apply verification failed; concurrent change or incomplete migration.');
        }
    }
    return { verified: plan.entries.length, skippedOwners: plan.skippedOwners };
}

/** Importing this module never opens a connection; the default operation is read-only. */
async function repairTierListCounts(db, options = {}) {
    if (options.apply) return applyTierListCounts(db, options);
    const plan = await planTierListCounts(db, options);
    if (options.planFile) savePlan(options.planFile, plan);
    return plan;
}

async function main() {
    const args = process.argv.slice(2);
    const allowed = /^(--dry-run|--apply|--rollback|--verify|--plan=.+|--max-documents=\d+|--approve-production=[a-z0-9-]+)$/;
    if (args.some(arg => !allowed.test(arg)) || new Set(args.map(arg => arg.split('=')[0])).size !== args.length) {
        fail('Invalid or duplicate arguments.');
    }
    const modes = args.filter(arg => ['--dry-run', '--apply', '--rollback', '--verify'].includes(arg));
    if (modes.length > 1) fail('Choose one operation only.');
    const mode = modes[0] || '--dry-run';
    const projectId = process.env.GCLOUD_PROJECT;
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;
    if (!projectId || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId)
        || (emulator && !/^(localhost|127\.0\.0\.1):\d+$/.test(emulator))) fail('Explicit project and local emulator host required.');
    if (!emulator && !args.includes(`--approve-production=${projectId}`)) {
        fail('Production access refused: --approve-production=<projectId> is required even for reads.');
    }
    const planFile = args.find(arg => arg.startsWith('--plan='))?.slice(7);
    if (!planFile) fail('--plan=<private-file-outside-repository> is required.');
    if (mode !== '--dry-run' && args.some(arg => arg.startsWith('--max-documents='))) fail('Scan limit applies only to dry-run.');
    const { Firestore } = require('@google-cloud/firestore');
    const db = new Firestore({ projectId });
    try {
        let result;
        if (mode === '--dry-run') {
            const max = args.find(arg => arg.startsWith('--max-documents='));
            const plan = await repairTierListCounts(db, { planFile, ...(max ? { maxDocuments: Number(max.slice(16)) } : {}) });
            result = { scanned: plan.scanned, planned: plan.entries.length, skippedOwners: plan.skippedOwners, writes: 0, sha256: digest(plan) };
        } else if (mode === '--verify') {
            result = await verifyTierListCounts(db, { planFile });
        } else {
            result = await applyTierListCounts(db, { planFile, rollback: mode === '--rollback' });
        }
        console.log(JSON.stringify(result));
    } finally {
        await db.terminate();
    }
}

if (require.main === module) {
    main().catch(error => {
        // SDK errors may contain paths, query data or credentials; never print them from the CLI.
        console.error(error instanceof MigrationError ? error.message : 'Migration failed (SDK or local file error). Inspect privately with the exported API.');
        console.error('No further writes attempted. Keep the plan for recovery; earlier entries may have committed.');
        process.exitCode = 1;
    });
}

module.exports = { repairTierListCounts, planTierListCounts, savePlan, loadPlan, applyTierListCounts, verifyTierListCounts };
