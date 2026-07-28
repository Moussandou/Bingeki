/**
 * Sources de données MyAnimeList, essayées dans l'ordre.
 *
 * Tenrai implémente le schéma Jikan v4 avec des chemins identiques : un même `path`
 * fonctionne sur les deux, d'où le simple tableau de bases.
 *
 * Jikan est passé en mode maintenance le 2026-06-14 et ferme le 2026-10-01 ; son
 * scraper ne répond déjà plus que sur les URL présentes dans son cache (504 sinon).
 * Il ne reste donc en second que comme filet, et pourra être retiré après cette date.
 */
const API_BASES = [
  'https://api.tenrai.org/v1',
  'https://api.jikan.moe/v4',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Un seul essai sur une base donnée. Renvoie {ok:true,json} ou lève. */
async function fetchOnce(base, path) {
  const res = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'Accept': 'application/json' },
  });
  if (res.status === 404) return { notFound: true };
  if (res.status === 429) {
    const retryAfter = Math.min(parseInt(res.headers.get('Retry-After') || '1', 10) || 1, 3);
    const err = new Error(`HTTP 429 for ${path}`);
    err.retryAfter = retryAfter;
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return { json: await res.json() };
}

/**
 * Récupère `path` depuis la première source disponible.
 * Returns parsed response.data (or full response for paginated endpoints).
 * Échec rapide voulu : les retries longs bloquaient le callable 9-60s,
 * cachedFetch sert le cache expiré en cas d'échec.
 */
async function jikanFetch(path, returnFull = false) {
  let lastError;

  for (const base of API_BASES) {
    // Un seul retry par base, uniquement sur 429 (le rate limit se libère vite)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { notFound, json } = await fetchOnce(base, path);
        if (notFound) return null;
        return returnFull ? json : json.data;
      } catch (err) {
        lastError = err;
        if (err.retryAfter && attempt === 0) {
          await sleep(err.retryAfter * 1000);
          continue;
        }
        break;
      }
    }
    console.warn(`[api] ${base} indisponible pour ${path}: ${lastError.message}`);
  }

  throw new Error(`Toutes les sources ont échoué pour ${path}: ${lastError.message}`);
}

module.exports = { jikanFetch, API_BASES };
