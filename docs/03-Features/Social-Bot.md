# Social Bot — Plan technique

Bot de génération et publication automatique de posts sur les réseaux sociaux pour animer la présence de Bingeki (Instagram, TikTok, X manuel).

Ce document cadre l'implémentation. Les maquettes visuelles sont dans `src/components/mockups/SocialPostMockup.tsx` (les 4 types de posts en 2 formats) et `src/components/mockups/AdminSocialMockup.tsx` (l'interface de validation).

## Vue d'ensemble

Le bot vit dans les **Cloud Functions Firebase** existantes du projet — pas de serveur séparé à maintenir. Il s'appuie sur:

- Les **crons Firebase Scheduler** pour déclencher la génération à horaires fixes.
- **Firestore** pour stocker les posts en attente, publiés, la config.
- L'API **Jikan / Tenrai** (déjà utilisée par `/schedule`) pour récupérer les données anime.
- L'API **Gemini** (free tier) pour générer les captions et hashtags.
- **Puppeteer** dans une function callable pour rendre le HTML des slides en PNG.
- Les APIs **Meta Graph** (Instagram) et **TikTok Content Posting** pour publier après validation.

## 4 types de posts

| Type | Fréquence | Trigger | Slides | Source data |
|---|---|---|---|---|
| **Sorties du jour** | Quotidien 19h | Cron | 1 intro + N animes du jour + outro | `/schedules/{day}` Jikan |
| **Récap hebdo** | Dimanche 19h | Cron | 1 intro + 3 tops + outro | Stats users Bingeki (Firestore) |
| **Coup de cœur communauté** | Mercredi 12h | Cron | 1 intro + 1-N ex æquo + outro | Notes users Firestore |
| **Nouvelle saison** | Event-driven | Cron quotidien qui détecte + queue | 1 announcement + 1 fiche + outro | Jikan (nouvelles saisons de la semaine) |

## Flow complet

```
[Cron Firebase]
    ↓
[fetchData] Jikan / Firestore
    ↓
[generateCaption] Gemini → caption + hashtags
    ↓
[renderSlides] Puppeteer → N images PNG
    ↓
[upload] Firebase Storage → URLs
    ↓
[createPendingPost] Firestore doc `pending_posts/{id}`
    ↓
[notify] Discord webhook + notif admin
    ↓
       ┌── ADMIN valide via /admin/social ──┐
       ↓                                    ↓
[publishInsta]                        [rejectOrEdit]
[publishTikTok]                       (retour à pending / suppression)
       ↓
[moveToPublished] Firestore doc `published_posts/{id}`
       ↓
[trackReach] j+1, j+7 (poll insights API)
```

## Structure des Cloud Functions

Dans `functions/social/` (nouveau dossier):

```
functions/social/
├── crons/
│   ├── dailyReleases.ts       # scheduled 19h every day
│   ├── weeklyRecap.ts         # scheduled dimanche 19h
│   ├── communityFavorite.ts   # scheduled mercredi 12h
│   └── newSeasonDetector.ts   # scheduled 8h every day, queue si détection
├── generators/
│   ├── gemini.ts              # génération captions par type
│   ├── jikan.ts               # wrapper API (dedup avec le /schedule existant)
│   ├── stats.ts               # requêtes Firestore users
│   └── renderer.ts            # HTML → PNG via Puppeteer
├── publishers/
│   ├── instagram.ts           # Meta Graph API
│   └── tiktok.ts              # TikTok Content Posting API
├── admin/
│   ├── listPending.ts         # callable pour la sidebar
│   ├── publishNow.ts          # callable "Publier maintenant"
│   ├── reject.ts              # callable "Rejeter"
│   └── regenerate.ts          # callable "Régénérer"
└── shared/
    ├── types.ts
    └── config.ts
```

## Schéma Firestore

### `pending_posts/{postId}`

```typescript
{
  type: 'daily' | 'weekly' | 'favorite' | 'newseason',
  createdAt: Timestamp,
  scheduledAt: Timestamp,     // quand le bot veut publier
  status: 'pending' | 'processing' | 'ready',

  // Contenu généré
  title: string,              // ex: "Sorties du jour · 12 mars"
  caption: string,            // caption Insta/TikTok
  hashtags: string,           // "#anime #mha #bingeki"

  // Slides (URLs Firebase Storage)
  slides: Array<{
    format: 'feed' | 'story',
    url: string,              // PNG rendu
    index: number,
  }>,

  // Metadata source
  sourceData: {
    animeIds?: number[],      // MAL IDs pour dedup
    weekNumber?: number,
    stats?: object,
  },

  // Plateformes cibles (par défaut cochées selon type)
  platforms: {
    insta: boolean,
    tiktok: boolean,
    x: boolean,               // toujours false (manuel)
  },
}
```

### `published_posts/{postId}`

```typescript
{
  // Tous les champs de pending_posts +
  publishedAt: Timestamp,
  publishedBy: string,        // uid admin qui a validé
  results: {
    insta: { id: string, permalink: string, publishedAt: Timestamp } | null,
    tiktok: { id: string, publishedAt: Timestamp } | null,
  },
  reach: {                    // rempli j+1 puis j+7
    insta?: { impressions: number, likes: number, comments: number },
    tiktok?: { views: number, likes: number },
  },
}
```

### `bot_config/{singleton}`

```typescript
{
  enabled: boolean,           // kill-switch global
  schedules: {
    daily: { hour: number, enabled: boolean },
    weekly: { dayOfWeek: number, hour: number, enabled: boolean },
    favorite: { dayOfWeek: number, hour: number, enabled: boolean },
  },
  platforms: {
    insta: { accountId: string, tokenRef: string, enabled: boolean },
    tiktok: { accountId: string, tokenRef: string, enabled: boolean },
  },
  gemini: {
    model: 'gemini-flash-latest',
    maxPromptTokens: number,
  },
  discordWebhook: string,     // notif équipe
}
```

## APIs externes — récap coûts

| Service | Coût | Free tier suffit ? |
|---|---|---|
| Meta Graph API (Instagram) | Gratuit | Oui (compte Business/Creator requis) |
| TikTok Content Posting API | Gratuit | Oui (validation d'audit à demander) |
| X API v2 | $100/mois | **Skip** — publication X reste manuelle |
| Gemini API | Free tier: 15 rpm, 1500 rpd | Oui (5-10 posts/jour max chez nous) |
| Firebase Functions | Free tier: 2M invocations/mois | Oui (~500 invocations/mois estimées) |
| Firestore | Free tier | Oui |
| Firebase Storage | Free tier: 5 GB | Oui (~2 MB/post × 300 posts/an) |

**Coût total mensuel: 0€** à notre échelle.

## Sécurité

- Tokens Meta / TikTok stockés dans **Secret Manager** Firebase (jamais dans le code, jamais dans Firestore en clair).
- Les endpoints callables `publishNow`, `reject`, `regenerate` vérifient `RequireAdmin` côté serveur (pas juste côté client).
- Firestore rules: `pending_posts` et `published_posts` en read/write **admin uniquement**.
- Kill-switch global `bot_config.enabled` pour couper tout le pipeline en cas de bug.

## Interface admin

Route: `/admin/social` (gated par `RequireAdmin`, ajoutée dans `AdminSidebar`).

Composant: à extraire de `AdminSocialMockup.tsx` (déjà maquetté) en composant fonctionnel branché sur Firestore avec `onSnapshot`.

Fonctionnalités:
- Liste temps réel des posts en attente (sidebar).
- Preview visuel avec navigation entre slides.
- Édition inline de la caption / hashtags.
- Toggle par plateforme.
- Actions: Régénérer (rejoue Gemini), Éditer, Rejeter, Publier maintenant.
- Historique des publiés + stats de reach.

## Roadmap d'implémentation

### Phase 1 — Foundations (1-2 jours)
- Créer la structure `functions/social/`
- Setup Firestore rules pour `pending_posts` et `published_posts`
- Créer la route `/admin/social` avec le composant fonctionnel (extrait du mockup)
- Kill-switch dans `bot_config`

### Phase 2 — Génération (2-3 jours)
- Wrapper Jikan + wrapper stats users
- Prompt Gemini par type de post (avec les 5 angles LinkedIn du bot Yanis en inspiration)
- Renderer Puppeteer (adapter les composants React mockups en HTML standalone)
- Upload Firebase Storage

### Phase 3 — Crons (1 jour)
- Les 4 crons (daily / weekly / favorite / newseason detector)
- Notif Discord webhook

### Phase 4 — Publication (2-3 jours)
- Auth OAuth Meta + storage Secret Manager
- Publisher Instagram (Content Publishing API)
- Auth TikTok + storage Secret Manager
- Publisher TikTok (Content Posting API)
- Callables `publishNow`, `reject`, `regenerate`

### Phase 5 — Analytics (1 jour, plus tard)
- Cron j+1 et j+7 pour poll reach/likes/comments
- Widget stats dans l'admin

**Total estimé: 7-10 jours de dev.**

## Choix vs le bot Python de Yanis

Le bot Yanis (`bingeki_news_bot`) fait un job similaire mais orienté news LinkedIn. On **ne le remplace pas** — c'est un projet parallèle qui reste utile pour la comm B2B / LinkedIn.

Différences de notre bot:
- **Data:** on branche sur la donnée interne Bingeki (users, stats, planning) que le bot Yanis n'a pas.
- **UI:** validation via `/admin/social` avec preview, pas juste Discord.
- **Auto-publish:** on ferme la boucle jusqu'à la publication (Yanis reste à la validation manuelle).
- **Multi-formats:** Feed + Story/TikTok, pas juste un format LinkedIn.
- **Infra:** Cloud Functions (pas de serveur Docker à maintenir).

Les 2 systèmes peuvent coexister sans collision.
