# functions/social/ — Social Bot Cloud Functions

Implémentation du bot d'automatisation social media pour Bingeki. Voir
`docs/03-Features/Social-Bot.md` à la racine du repo pour le plan
technique complet.

## Statut

**Phase 1 — Foundations** en cours. Cette structure est **stubbée** :
les fichiers existent avec leur signature attendue et un `TODO`. Les
crons ne tournent PAS encore et rien n'est déployé.

## Layout

```
functions/social/
├── crons/               # Scheduled Firebase functions (Cloud Scheduler)
│   ├── dailyReleases.js
│   ├── weeklyRecap.js
│   ├── communityFavorite.js
│   └── newSeasonDetector.js
├── generators/          # Fetch data + génère caption + rend slides
│   ├── gemini.js        # Prompt engineering par type de post
│   ├── jikan.js         # Wrapper API Jikan/Tenrai (dedup avec /schedule)
│   ├── stats.js         # Requêtes Firestore users pour top hebdo & favs
│   └── renderer.js      # HTML → PNG via Puppeteer
├── publishers/          # Publie sur les réseaux après validation admin
│   ├── instagram.js     # Meta Graph API (Content Publishing)
│   └── tiktok.js        # TikTok Content Posting API
├── admin/               # Callables déclenchées depuis /admin/social
│   ├── listPending.js
│   ├── publishNow.js
│   ├── reject.js
│   └── regenerate.js
└── shared/
    ├── config.js        # Chargement du BotConfig depuis Firestore
    └── firestore.js     # Helpers CRUD pending_posts / published_posts
```

## Prochaines phases

- **Phase 2** : implémenter `generators/*` — Jikan wrapper + Gemini
  prompts + Puppeteer renderer branché sur les composants React mockups
  convertis en templates HTML standalone.
- **Phase 3** : câbler les 4 crons sur Cloud Scheduler.
- **Phase 4** : OAuth Meta + TikTok (tokens en Secret Manager), publishers.
- **Phase 5** : callables admin + polling reach j+1/j+7.

## Sécurité

- Tokens jamais dans le code. Utiliser `defineSecret()` de Firebase
  Functions v2 pour les récupérer depuis Secret Manager.
- Les callables `admin/*` doivent vérifier `context.auth.token.admin`
  côté serveur (le check `RequireAdmin` du front ne suffit pas).
- Kill-switch : chaque cron lit `social_bot_config/singleton.enabled`
  et retourne immédiatement si `false`.
