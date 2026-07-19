const JIKAN_BASE = 'https://api.jikan.moe/v4';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch from Jikan API with retry and exponential backoff on 429.
 * Returns parsed response.data (or full response for paginated endpoints).
 */
async function jikanFetch(path, returnFull = false) {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let res;
    try {
      res = await fetch(`${JIKAN_BASE}${path}`, {
        signal: AbortSignal.timeout(12000),
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await sleep(1000 * (attempt + 1));
      continue;
    }

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
      await sleep((retryAfter + attempt) * 1000);
      continue;
    }

    if (res.status === 404) return null;
    if (res.status >= 500) {
      if (attempt === maxRetries - 1) throw new Error(`Jikan HTTP ${res.status} for ${path}`);
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`Jikan HTTP ${res.status} for ${path}`);

    const json = await res.json();
    return returnFull ? json : json.data;
  }
  throw new Error(`Jikan: max retries exceeded for ${path}`);
}

module.exports = { jikanFetch };
