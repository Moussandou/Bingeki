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
│   ├── buffer.js        # Buffer GraphQL API — publisher actif (IG + TikTok)
│   ├── instagram.js     # [deprecated] Meta Graph API direct (kept for reference)
│   └── tiktok.js        # [deprecated] TikTok Content Posting API direct (kept for reference)
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
- **Phase 4** : publishers via Buffer (`BUFFER_API_KEY` en Secret Manager,
  `bufferChannelId` par plateforme dans `social_bot_config/singleton`).
  Les publishers Meta/TikTok directs sont conservés en deprecated au cas où.
- **Phase 5** : callables admin + polling reach j+1/j+7.

## Sécurité

- Tokens jamais dans le code. Utiliser `defineSecret()` de Firebase
  Functions v2 pour les récupérer depuis Secret Manager.
- Les callables `admin/*` doivent vérifier `context.auth.token.admin`
  côté serveur (le check `RequireAdmin` du front ne suffit pas).
- Kill-switch : chaque cron lit `social_bot_config/singleton.enabled`
  et retourne immédiatement si `false`.

### Téléchargements Open Graph

`generators/publicDownload.js` est utilisé pour les pages, oEmbed et images.
Seules les URL HTTP(S) sans identifiants sur les ports standards sont
acceptées. Chaque destination, y compris après redirection, doit résoudre
exclusivement vers des adresses publiques. La connexion utilise cette
résolution vérifiée, sans seconde résolution DNS.

Les téléchargements sont limités à 5 redirections et à une durée totale
de 15 secondes pour le HTML, 10 secondes pour oEmbed et 20 secondes pour
les images. Les limites sont respectivement de 2 Mio, 256 Kio et 10 Mio,
y compris sans `Content-Length`. Les images doivent annoncer un type
JPEG, PNG, WebP, GIF ou AVIF ; les SVG ne sont pas réhébergés. Une réponse
compressée inattendue est refusée. Les erreurs de page/image remontent
à l'appelant ; un échec oEmbed optionnel est journalisé.

Les régressions réseau sont simulées, sans contacter de service externe :
`npx vitest run functions/__tests__/publicDownload.test.js` depuis la racine.
