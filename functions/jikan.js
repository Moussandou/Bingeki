const JIKAN_BASE = 'https://api.jikan.moe/v4';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch from Jikan API with a single capped retry.
 * Returns parsed response.data (or full response for paginated endpoints).
 * Échec rapide voulu : les retries longs bloquaient le callable 9-60s,
 * cachedFetch sert le cache expiré en cas d'échec.
 */
async function jikanFetch(path, returnFull = false) {
  const maxRetries = 2;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let res;
    try {
      res = await fetch(`${JIKAN_BASE}${path}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await sleep(1000);
      continue;
    }

    if (res.status === 429) {
      if (attempt === maxRetries - 1) throw new Error(`Jikan HTTP 429 for ${path}`);
      // Retry-After plafonné : Jikan peut annoncer des valeurs très longues
      const retryAfter = Math.min(parseInt(res.headers.get('Retry-After') || '1', 10) || 1, 3);
      await sleep(retryAfter * 1000);
      continue;
    }

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Jikan HTTP ${res.status} for ${path}`);

    const json = await res.json();
    return returnFull ? json : json.data;
  }
  throw new Error(`Jikan: max retries exceeded for ${path}`);
}

module.exports = { jikanFetch };
