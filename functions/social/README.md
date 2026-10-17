# functions/social/ — Social Bot Cloud Functions

Implémentation du bot d'automatisation social media pour Bingeki. Voir
`docs/03-Features/Social-Bot.md` à la racine du repo pour le plan
technique complet.

## Statut

Le pipeline de publication utilise Buffer pour Instagram et TikTok.
Les tests de publication utilisent uniquement des transports simulés ;
ils ne déclenchent aucun cron ni publication réelle.

### Concurrence, reprise et résultats incertains

`publishers/publicationCore.js` est partagé par le bouton de publication,
le cron et la reprise des publications partielles. Une transaction réserve
le post pendant 15 minutes (plus que la durée maximale de la fonction).
Les mutations concurrentes refusent un bail actif.

Avant chaque envoi, un journal `publishAttempts[platform]` est persisté
avec un identifiant de tentative et l'état `started`. Le reçu est écrit
immédiatement après succès. Une reprise saute les plateformes ayant déjà
un reçu ; la transition pending → published est transactionnelle et une
nouvelle invocation sur le même ID renvoie le résultat existant.

Buffer ne fournit pas ici de clé d'idempotence contractuelle. Un timeout,
un crash après envoi ou une réponse ambiguë devient donc `unknown` :
**aucun renvoi automatique n'est autorisé**, même après expiration du bail.
Seul un rejet explicite du fournisseur (`definitive`) est relançable.
Vérifier le post dans Buffer puis confirmer la plateforme via
`socialMarkPublished({postId, platform})` : cette confirmation fonctionne
aussi pour une publication partielle déjà dans `published`, conserve les
autres reçus et enregistre l'administrateur ayant réconcilié le résultat.
Ne jamais confirmer sans cette vérification. Si aucun envoi ne peut être
confirmé, conserver l'erreur pour investigation plutôt que réinitialiser
le journal ou promettre une publication réussie.

Les anciens posts `processing` sans journal nécessitent aussi une
réconciliation manuelle : leur état ne prouve pas l'absence d'envoi.
Les tests `functions/__tests__/functionalFlows.test.mjs` couvrent concurrence,
rejeu, reçu partiel, interruption et erreur ambiguë sur émulateurs locaux.

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
