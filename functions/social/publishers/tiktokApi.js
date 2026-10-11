/**
 * publishers/tiktokApi.js — lecture du compte TikTok Bingeki (Login Kit +
 * scopes user.info.stats et video.list).
 *
 * Pas de publication ici : on lit seulement les vidéos et leurs chiffres
 * pour les posts publiés à la main depuis le téléphone (Buffer ne les
 * voit pas).
 *
 * Stockage :
 *   - social_secrets/tiktok        tokens (aucune règle Firestore → lisible
 *                                   seulement par les Cloud Functions)
 *   - social_bot_config/tiktok     infos publiques du compte pour l'admin
 *                                   (nom, abonnés, dernière synchro, erreur)
 */

const admin = require('firebase-admin');

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_URL = 'https://open.tiktokapis.com/v2/user/info/';
const VIDEO_LIST_URL = 'https://open.tiktokapis.com/v2/video/list/';

// Doit correspondre lettre pour lettre à la Redirect URI déclarée dans
// le portail TikTok for Developers (Login Kit → Web).
const REDIRECT_URI = 'https://bingeki.web.app/fr/admin/social';
const SCOPES = 'user.info.basic,user.info.stats,video.list';

const SECRET_DOC = ['social_secrets', 'tiktok'];
const STATUS_DOC = ['social_bot_config', 'tiktok'];

const secretRef = () => admin.firestore().collection(SECRET_DOC[0]).doc(SECRET_DOC[1]);
const statusRef = () => admin.firestore().collection(STATUS_DOC[0]).doc(STATUS_DOC[1]);

function credentials() {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) throw new Error('TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET manquants');
    return { clientKey, clientSecret };
}

function buildAuthUrl(state) {
    // Seule la Client key est nécessaire ici (la fonction n'a pas accès au secret).
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) throw new Error('TIKTOK_CLIENT_KEY manquant');
    const params = new URLSearchParams({
        client_key: clientKey,
        scope: SCOPES,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state,
    });
    return `${AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(body) {
    const { clientKey, clientSecret } = credentials();
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
        body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, ...body }).toString(),
        signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error || !data.access_token) {
        throw new Error(`TikTok token: ${data.error_description || data.error || `HTTP ${res.status}`}`);
    }
    return data;
}

async function saveTokens(data) {
    const now = Date.now();
    await secretRef().set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        openId: data.open_id,
        scope: data.scope || SCOPES,
        accessExpiresAt: now + (Number(data.expires_in) || 86_400) * 1000,
        refreshExpiresAt: now + (Number(data.refresh_expires_in) || 31_536_000) * 1000,
        updatedAt: now,
    });
}

/** Échange le code reçu sur la Redirect URI contre des tokens. */
async function exchangeCode(code) {
    const data = await tokenRequest({
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
    });
    await saveTokens(data);
    return data;
}

/** Token d'accès valide, renouvelé avec le refresh token s'il expire bientôt. */
async function getAccessToken() {
    const snap = await secretRef().get();
    if (!snap.exists) throw new Error('Compte TikTok non connecté');
    const tokens = snap.data();
    if (tokens.accessExpiresAt - Date.now() > 10 * 60_000) return tokens.accessToken;
    if (tokens.refreshExpiresAt < Date.now()) throw new Error('Connexion TikTok expirée, reconnecte le compte');
    const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken });
    await saveTokens(data);
    return data.access_token;
}

async function apiCall(url, { method = 'GET', body } = {}) {
    const token = await getAccessToken();
    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data.error && data.error.code && data.error.code !== 'ok')) {
        throw new Error(`TikTok API: ${data.error?.message || data.error?.code || `HTTP ${res.status}`}`);
    }
    return data.data || {};
}

async function fetchUserInfo() {
    const fields = 'open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count';
    const data = await apiCall(`${USER_URL}?fields=${fields}`);
    return data.user || {};
}

/** Vidéos les plus récentes du compte (jusqu'à `max`, par pages de 20). */
async function fetchRecentVideos(max = 40) {
    const fields = 'id,title,create_time,share_url,view_count,like_count,comment_count,share_count';
    const out = [];
    let cursor;
    while (out.length < max) {
        const data = await apiCall(`${VIDEO_LIST_URL}?fields=${fields}`, {
            method: 'POST',
            body: { max_count: 20, ...(cursor ? { cursor } : {}) },
        });
        out.push(...(data.videos || []));
        if (!data.has_more || !data.cursor) break;
        cursor = data.cursor;
    }
    return out.slice(0, max);
}

module.exports = {
    REDIRECT_URI,
    buildAuthUrl,
    exchangeCode,
    fetchUserInfo,
    fetchRecentVideos,
    secretRef,
    statusRef,
};
