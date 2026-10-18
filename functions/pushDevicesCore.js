const { createHash, randomUUID } = require('node:crypto');
const { FieldValue } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');

const COOLDOWN_MS = 10_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PERMISSIONS = ['notDetermined', 'denied', 'authorized', 'provisional', 'ephemeral'];
const hashToken = token => createHash('sha256').update(token).digest('hex');
const deviceRef = (db, uid, id) => db.collection('users').doc(uid).collection('pushDevices').doc(id);
const bindingRef = (db, hash) => db.collection('pushTokenBindings').doc(hash);

function validateInput(data, operation) {
    const keys = ['installationId', 'expectedGeneration'];
    if (operation === 'register') keys.push('tokenFCM', 'platform', 'bundleId', 'permission', 'enabled');
    if (!data || typeof data !== 'object' || Array.isArray(data)
        || Object.keys(data).length !== keys.length
        || !keys.every(key => Object.hasOwn(data, key))
        || typeof data.installationId !== 'string' || !UUID.test(data.installationId)
        || (data.expectedGeneration !== null
            && (typeof data.expectedGeneration !== 'string' || !UUID.test(data.expectedGeneration)))) {
        throw new HttpsError('invalid-argument', 'Invalid push device schema.');
    }
    if (operation === 'register'
        && (data.platform !== 'ios' || data.bundleId !== 'com.bingeki.ios'
            || !PERMISSIONS.includes(data.permission) || typeof data.enabled !== 'boolean'
            || (data.enabled && !['authorized', 'provisional', 'ephemeral'].includes(data.permission))
            || typeof data.tokenFCM !== 'string' || !/^[A-Za-z0-9_:-]{20,4096}$/.test(data.tokenFCM)
            || /^[0-9a-f]{64}$/i.test(data.tokenFCM))) {
        throw new HttpsError('invalid-argument', 'Invalid iOS push registration.');
    }
    if (operation === 'revoke' && data.expectedGeneration === null) {
        throw new HttpsError('invalid-argument', 'A generation is required to revoke a device.');
    }
    return data;
}

function owns(binding, uid, installationId, generation) {
    return binding?.uid === uid && binding.installationId === installationId && binding.generation === generation;
}

function revokedDevice(current, generation, timestamp) {
    return {
        platform: 'ios', bundleId: 'com.bingeki.ios', permission: current.permission,
        enabled: false, generation, createdAt: current.createdAt, updatedAt: timestamp, revokedAt: timestamp,
    };
}

async function mutateDevice(db, uid, input, operation, now = Date.now()) {
    const data = validateInput(input, operation);
    const ref = deviceRef(db, uid, data.installationId);
    const stateRef = db.collection('pushDeviceState').doc(uid);
    return db.runTransaction(async tx => {
        const [profile, deletion, snapshot, stateSnap] = await Promise.all([
            tx.get(db.collection('users').doc(uid)),
            tx.get(db.collection('accountDeletions').doc(uid)),
            tx.get(ref), tx.get(stateRef),
        ]);
        if (!profile.exists || deletion.exists || profile.data().isBanned || profile.data().deleting) {
            throw new HttpsError('failed-precondition', 'Account is unavailable for push registration.');
        }
        const current = snapshot.data();
        const oldRef = current?.tokenHash ? bindingRef(db, current.tokenHash) : null;
        const oldBinding = oldRef ? (await tx.get(oldRef)).data() : undefined;
        if (operation === 'revoke' && (!current?.tokenHash || current.generation !== data.expectedGeneration)) {
            return { ok: true, revoked: false };
        }
        const tokenHash = operation === 'register' ? hashToken(data.tokenFCM) : null;
        const nextRef = tokenHash ? bindingRef(db, tokenHash) : null;
        const nextBinding = nextRef ? (await tx.get(nextRef)).data() : undefined;
        if (operation === 'register') {
            const identical = current && ['tokenFCM', 'platform', 'bundleId', 'permission', 'enabled']
                .every(key => current[key] === data[key]);
            if (identical && owns(nextBinding, uid, data.installationId, current.generation)) {
                return { ok: true, generation: current.generation, enabled: current.enabled };
            }
            if ((current?.generation ?? null) !== data.expectedGeneration) {
                throw new HttpsError('aborted', 'Push device generation changed. Read the device and retry.');
            }
        }
        let previousRef;
        let previous;
        if (nextBinding && (nextBinding.uid !== uid || nextBinding.installationId !== data.installationId)) {
            previousRef = deviceRef(db, nextBinding.uid, nextBinding.installationId);
            previous = (await tx.get(previousRef)).data();
        }
        const state = stateSnap.data() || {};
        const rateField = operation === 'register' ? 'lastRegisteredAt' : 'lastRevokedAt';
        if (typeof state[rateField] === 'number' && now - state[rateField] < COOLDOWN_MS) {
            throw new HttpsError('resource-exhausted', 'Wait before changing push devices again.', {
                retryAfterMs: COOLDOWN_MS - (now - state[rateField]),
            });
        }
        const timestamp = FieldValue.serverTimestamp();
        const generation = randomUUID();
        if (oldRef && owns(oldBinding, uid, data.installationId, current.generation)) tx.delete(oldRef);
        if (operation === 'revoke') {
            tx.set(ref, revokedDevice(current, generation, timestamp));
        } else {
            // Only invalidate the exact lease being transferred, never a newer rotation.
            if (previous && previous.generation === nextBinding.generation && previous.tokenHash === tokenHash) {
                tx.set(previousRef, revokedDevice(previous, randomUUID(), timestamp));
            }
            const device = {
                tokenFCM: data.tokenFCM, tokenHash, platform: data.platform, bundleId: data.bundleId,
                permission: data.permission, enabled: data.enabled, generation,
                createdAt: current?.createdAt ?? timestamp, updatedAt: timestamp,
            };
            if (snapshot.exists) tx.set(ref, device);
            else tx.create(ref, device);
            const binding = { uid, installationId: data.installationId, generation, updatedAt: timestamp };
            // Missing-document reads must not permit two first-time claims to overwrite.
            if (nextBinding) tx.set(nextRef, binding);
            else tx.create(nextRef, binding);
        }
        if (stateSnap.exists) tx.set(stateRef, { [rateField]: now }, { merge: true });
        else tx.create(stateRef, { [rateField]: now });
        return operation === 'revoke' ? { ok: true, revoked: true }
            : { ok: true, generation, enabled: data.enabled };
    }).catch(error => {
        if (error.code === 6) {
            throw new HttpsError('aborted', 'Push device state changed. Read the device and retry.');
        }
        throw error;
    });
}

module.exports = { mutateDevice, validateInput, hashToken, COOLDOWN_MS };
