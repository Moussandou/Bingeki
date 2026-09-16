# Social Bot — Feature technique

Bot d'automatisation social media pour Bingeki. Génère 4 types de posts anime/manga, les fait valider par l'équipe dans `/admin/social`, puis les publie automatiquement sur Instagram et TikTok.

## État d'avancement

| Phase | Statut | PR |
|---|---|---|
| Design & maquettes | Livré | #86 |
| **Phase 1** — Foundations (types, page admin, routes, Firestore rules, functions skeleton) | Livré | #87 |
| **Phase 2** — Live Firestore + generators (Jikan, stats, Gemini) | Livré | #87 |
| **Phase 3** — Crons scheduled + admin callables (reject, regenerate) | Livré | #87 |
| **Phase 4** — Publishers (Meta Graph, TikTok) + renderer Puppeteer | Livré | #87 |
| Templates HTML riches (port des mockups React) | Simplifié, à améliorer | — |
| OAuth flows configuration (tokens Secret Manager) | À faire à main | — |
| Analytics reach j+1 / j+7 | Non commencé | — |

## Architecture

Le bot vit intégralement dans les **Cloud Functions Firebase** existantes du projet. Aucun serveur séparé.

- **Front** — `/admin/social` (React + Firestore `onSnapshot` sur les collections).
- **Backend** — `functions/social/` avec:
  - `crons/` : 4 scheduled functions (Firebase Scheduler).
  - `generators/` : Jikan, stats, Gemini, renderer Puppeteer, templates HTML.
  - `publishers/` : Meta Graph API (Instagram) + TikTok Content Posting.
  - `admin/` : callables `socialPublishNow`, `socialRejectPost`, `socialRegeneratePost`.
  - `shared/` : `loadBotConfig` (cache 1 min) + CRUD Firestore.

## Flow complet

```
[Cron] → [fetchData] → [generateCaption Gemini] → [renderSlides Puppeteer]
       → [uploadPng Storage] → [createPendingPost Firestore]
              ↓
        Admin /admin/social (live via onSnapshot)
              ↓
       ┌─── ADMIN valide ───┐
       ↓                    ↓
[socialPublishNow]     [reject/regenerate]
[publishToInstagram]
[publishToTikTok]
[movePendingToPublished]
```

## 4 types de posts

| Type | Fréquence | Cron | Slides | Data |
|---|---|---|---|---|
| **Sorties du jour** | Quotidien 19h | `socialDailyReleases` | 1 intro + top 5 animes | Jikan `/schedules/{day}` |
| **Récap hebdo** | Dimanche 19h | `socialWeeklyRecap` | 1 intro + top 3 | `aggregateWeeklyRatings` (users libraries) |
| **Coup de cœur** | Mercredi 12h | `socialCommunityFavorite` | 1 intro + 1-3 (ex æquo) | `computeCommunityFavorites` |
| **Nouvelle saison** | Event-driven, poll 8h | `socialNewSeasonDetector` | 1 announcement | Jikan `/seasons/now` + regex sequels |

## Schéma Firestore

Collections définies dans `src/shared/socialBot.ts` (FIRESTORE_COLLECTIONS):

- **`social_pending_posts/{id}`** — server create only, admin read/update/delete
- **`social_published_posts/{id}`** — server write only, admin read
- **`social_bot_config/singleton`** — superAdmin write, admin read
  - `enabled` : kill-switch global
  - `schedules.{daily,weekly,favorite}` : hour + dayOfWeek + enabled
  - `platforms.{insta,tiktok}` : accountId + tokenRef
  - `gemini.model` : `gemini-flash-latest`
  - `discordWebhook` : optionnel, notif équipe

Types partagés front + functions : voir `src/shared/socialBot.ts`.

## Déploiement — checklist

Une seule fois pour tout activer :

### 1. Créer les secrets

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set INSTA_PAGE_TOKEN
firebase functions:secrets:set TIKTOK_ACCESS_TOKEN
```

- **`GEMINI_API_KEY`** : générer sur https://aistudio.google.com/apikey (gratuit)
- **`INSTA_PAGE_TOKEN`** : long-lived Page Access Token depuis Meta Graph API Explorer, scopes `instagram_content_publish`, `pages_read_engagement`, `instagram_basic`
- **`TIKTOK_ACCESS_TOKEN`** : OAuth 2.0 sur developers.tiktok.com avec scope `content.posting.write`

### 2. Initialiser `social_bot_config/singleton`

Dans la console Firestore, créer le doc `singleton` dans `social_bot_config` avec:

```json
{
  "enabled": false,
  "platforms": {
    "insta": { "accountId": "<ig_user_id>", "tokenRef": "INSTA_PAGE_TOKEN", "enabled": true },
    "tiktok": { "accountId": "<tiktok_user_id>", "tokenRef": "TIKTOK_ACCESS_TOKEN", "enabled": true }
  }
}
```

Le `enabled: false` empêche toute publication tant qu'on n'a pas vérifié end-to-end. Un superAdmin l'active via le bouton dans `/admin/social`.

### 3. Déployer

```bash
npm run deploy:functions
```

Les crons Firebase Scheduler seront créés automatiquement.

### 4. Vérifier

- Ouvrir `/admin/social` — la page charge sans erreur, "Aucun post en attente".
- Attendre le prochain cron OU déclencher manuellement via l'onglet Functions du console Firebase.
- Un post apparaît dans la sidebar.
- Cliquer sur le post → preview + caption + hashtags visibles.
- Cliquer **Régénérer** → nouvelle caption après quelques secondes.
- Activer le bot (bouton en haut à droite) puis **Publier maintenant** → check le compte Insta/TikTok.

## Coûts

- **Gemini API** : Free tier (15 rpm, 1500 rpd) — largement suffisant à ~10 posts/jour.
- **Meta Graph API** : Gratuit (compte Business/Creator requis).
- **TikTok Content Posting** : Gratuit (validation audit à demander pour prod).
- **X / Twitter API** : Payant $100/mois → **skip**, publication X manuelle.
- **Firebase Functions v2** : Free tier 2M invocations/mois — on est loin.
- **Firestore** : Free tier — on est loin.
- **Firebase Storage** : Free tier 5 GB — ~2 MB/post × 400 posts/an = 800 MB.
- **@sparticuz/chromium** : ~50 MB par cold start, compute lourd. Free tier ok.

**Coût total mensuel : 0€** à l'échelle actuelle.

## Sécurité

- Tokens jamais dans le code ni dans Firestore en clair — `defineSecret()` de Firebase Functions v2 (Secret Manager).
- Callables `admin/*` vérifient `assertAdminOrThrow` (custom claim OU Firestore fallback) — le `RequireAdmin` du front n'est pas suffisant.
- Firestore rules interdisent la création directe de `pending_posts` (server-only).
- Kill-switch global : chaque cron lit `bot_config.enabled` en tête et return immédiatement si `false`. Le callable `socialPublishNow` re-check aussi.

## Limitations connues

- **Templates HTML** actuels sont simplifiés (`functions/social/generators/templates.js`). Le look final devra reprendre plus fidèlement les composants React de `src/components/mockups/SocialPostMockup.tsx`.
- **`aggregateWeeklyRatings`** scanne les libraries user (limit 500). Au-delà de ~2000 users actifs, migrer vers une collection d'agrégation maintenue par un trigger `onWrite`.
- **TikTok pull-from-URL** requiert un domaine vérifié dans le portail Developer TikTok, ou l'app en mode dev où le créateur confirme manuellement.
- **Rate limits Instagram** : max 25 API-published media par 24h par compte IG (limite plateforme). On est très en dessous.
- **Analytics reach (j+1, j+7)** pas encore implémentées — nécessitent un cron supplémentaire qui poll `/{media-id}/insights`.

## Roadmap post-Phase 4

1. Port fidèle des templates React `SocialPostMockup` en HTML standalone pour le renderer.
2. Analytics reach (impressions, likes, commentaires) via crons j+1 et j+7.
3. Panel de config du kill-switch et des schedules dans `/admin/social` (aujourd'hui l'admin doit éditer Firestore à la main pour les schedules).
4. Preview live du HTML dans `/admin/social` (aujourd'hui juste la première slide via `<img>`).
5. Notification Discord webhook au moment où un post entre en pending.
