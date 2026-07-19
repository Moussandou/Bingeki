const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const TTL_MS = {
  SEARCH: 60 * 60 * 1000,                    // 1h
  RECOMMENDATIONS: 6 * 60 * 60 * 1000,       // 6h
  EPISODES: 6 * 60 * 60 * 1000,              // 6h
  STREAMING: 24 * 60 * 60 * 1000,            // 24h
  DETAILS: 24 * 60 * 60 * 1000,              // 24h
  SECONDARY: 48 * 60 * 60 * 1000,            // 48h (characters, relations, pics, stats, staff, themes)
};

/**
 * Read a cache entry. Returns { hit, data, stale }.
 * stale = true if data is fresh but past 80% of TTL (caller should refresh in background).
 */
async function readCache(key, ttl) {
  const doc = await admin.firestore().collection('apiCache').doc(key).get();
  if (!doc.exists) {
    console.log(`[Cache] MISS — ${key}`);
    return { hit: false };
  }

  const { data, fetchedAt } = doc.data();
  const age = Date.now() - fetchedAt.toMillis();

  if (age < ttl) {
    const stale = age > ttl * 0.8;
    console.log(`[Cache] ${stale ? 'STALE HIT' : 'HIT'} — ${key} (age: ${Math.round(age / 1000 / 60)}min)`);
    return { hit: true, data, stale };
  }
  console.log(`[Cache] EXPIRED — ${key} (age: ${Math.round(age / 1000 / 60)}min)`);
  return { hit: false, expiredData: data };
}

/**
 * Write a cache entry.
 */
async function writeCache(key, data) {
  console.log(`[Cache] WRITE — ${key}`);
  await admin.firestore().collection('apiCache').doc(key).set({
    data,
    fetchedAt: Timestamp.now(),
  });
}

module.exports = { TTL_MS, readCache, writeCache };
