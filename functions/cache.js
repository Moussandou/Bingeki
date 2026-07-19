const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const TTL_MS = {
  SEARCH: 60 * 60 * 1000,                    // 1h
  RECOMMENDATIONS: 6 * 60 * 60 * 1000,       // 6h
  EPISODES: 6 * 60 * 60 * 1000,              // 6h
  STREAMING: 24 * 60 * 60 * 1000,            // 24h
  DETAILS: 24 * 60 * 60 * 1000,              // 24h
  SECONDARY: 48 * 60 * 60 * 1000,            // 48h (characters, relations, pics, stats, staff, themes)
  TRANSLATION: 30 * 24 * 60 * 60 * 1000,    // 30 days
  NOT_FOUND: 7 * 24 * 60 * 60 * 1000,       // 7 days (negative cache)
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

/**
 * Read a FR translation entry.
 * Returns { hit, synopsis, notFound } or { hit: false }.
 */
async function readTranslation(key) {
  const doc = await admin.firestore().collection('translations').doc(key).get();
  if (!doc.exists) return { hit: false };

  const entry = doc.data();
  const age = Date.now() - entry.fetchedAt.toMillis();

  if (entry.notFound) {
    return age < TTL_MS.NOT_FOUND ? { hit: true, notFound: true } : { hit: false };
  }
  return age < TTL_MS.TRANSLATION ? { hit: true, synopsis: entry.synopsis } : { hit: false };
}

/**
 * Write a FR translation entry (or a negative cache entry if notFound).
 */
async function writeTranslation(key, synopsis) {
  const entry = synopsis
    ? { synopsis, notFound: false, fetchedAt: Timestamp.now() }
    : { notFound: true, fetchedAt: Timestamp.now() };
  await admin.firestore().collection('translations').doc(key).set(entry);
}

module.exports = { TTL_MS, readCache, writeCache, readTranslation, writeTranslation };
