# Bot social — guide technique

Le bot de `functions/social/` prépare des contenus anime/manga, les met en
file dans Firestore et les publie sur Instagram et TikTok via Buffer. Les
administrateurs pilotent les contenus, les modes de publication, les comptes
et l'état des tâches depuis `/admin/social`.

## Fonctionnalités actuelles

- Génération de légendes et de visuels à partir des données Jikan/Tenrai,
  AniList, RSS et Firestore, avec Gemini et un rendu Puppeteer.
- File d'attente Firestore avec prévisualisation, régénération de légende,
  rejet, validation manuelle et historique des publications.
- Publication Buffer en carrousel photo ou vidéo selon la configuration du
  compte. La voie de publication directe Meta/TikTok est conservée dans le
  dépôt, mais Buffer est le publisher utilisé.
- Modes par type de contenu : `manual` (validation et publication manuelles),
  `auto` (publication par Buffer après l'heure prévue) ou `off`.
- Relevé des statistiques de portée, synchronisation des statistiques TikTok,
  notification Discord optionnelle, nettoyage des posts expirés et watchdog
  des tâches planifiées.

Le mode par défaut est **Manuel** pour les publications planifiées, tandis que
`cultureNewsAuto` est désactivé par défaut. Le kill-switch global
`social_bot_config/singleton.enabled` doit aussi être activé avant qu'un cron
ou une publication Buffer puisse fonctionner.

## Flux et sûreté de publication

```text
Cron / action admin
    → collecte des données → génération Gemini → rendu des slides
    → social_pending_posts
    → validation admin (mode manual) ou heure prévue (mode auto)
    → Buffer → social_published_posts
```

Les callables vérifient le rôle et l'état courant du compte administrateur côté
serveur ; la garde de route de l'interface seule ne suffit pas. Les mutations
de publication utilisent un bail Firestore et un journal par plateforme.
Chaque tentative est persistée avant l'envoi et son reçu est sauvegardé dès le
succès.

Buffer ne garantit pas de clé d'idempotence pour ce flux. Un timeout, un crash
après envoi ou une réponse ambiguë est donc enregistré comme résultat
`unknown` : le bail expiré ne prouve pas que l'envoi a échoué et ne permet pas
de renvoyer automatiquement le post. Vérifier Buffer puis utiliser
`socialMarkPublished` pour réconcilier le réseau concerné. Seuls les échecs
explicitement définitifs sont relançables ; les reçus déjà obtenus sont
conservés lors d'une reprise partielle.

## Tâches planifiées

Toutes les heures ci-dessous sont en `Europe/Paris`.

| Fonction | Horaire | Contenu / rôle |
| --- | --- | --- |
| `socialDailyReleases` | Tous les jours à 10 h | Sorties du jour, jusqu'à 16 titres. |
| `socialWeeklyRecap` | Dimanche à 19 h | Top 3 de la communauté, avec classement saisonnier MAL en secours. |
| `socialCommunityFavorite` | Dimanche à 21 h | Épisodes les mieux notés sur MAL. |
| `socialNewSeasonDetector` | Tous les jours à 8 h | Détecte les saisons qui commencent. |
| `socialAnnouncement` | Lundi, mercredi et vendredi à 15 h | Digest d'annonces de suites à venir. |
| `socialCultureNewsAuto` | Toutes les 6 h, à :15 | Filtre des flux RSS et crée au plus une actualité pertinente par jour. |
| `socialSeasonPreviewAuto` | Le 21 mars, juin, septembre et décembre à 18 h | Prépare la preview de la saison suivante. |
| `socialAutoPublish` | Toutes les 15 min | Publie les posts échus dont le type est en mode `auto` (jusqu'à 3 par passage). |
| `socialPollReach` | Tous les jours à 5 h | Actualise les statistiques Buffer. |
| `socialTiktokStats` | Tous les jours à 6 h 30 et 18 h 30 | Actualise les statistiques du compte TikTok. |
| `socialCleanupPending` | Tous les jours à 4 h | Archive les posts restés en attente plus de 3 jours. |
| `socialCronWatchdog` | Toutes les 30 min | Détecte les tâches bloquées et relance une seule fois les échecs autorisés. |

La création manuelle d'une actualité culturelle est disponible depuis le
panneau admin ; elle n'est pas un cron séparé.

## Données Firestore principales

Les types partagés entre l'application et les Functions sont dans
`src/shared/socialBot.ts`.

- `social_pending_posts/{id}` : file de modération et journal de publication.
- `social_published_posts/{id}` : publications terminées ou partielles.
- `social_archived_posts/{id}` : posts expirés ou archivés.
- `social_bot_config/singleton` : kill-switch, modes, horaires, comptes Buffer
  et paramètres Gemini.
- `social_bot_config/tiktok` et `social_bot_config/buffer_usage` : état TikTok
  et quotas/usage Buffer.
- `social_cron_health/{cronId}` : état et dernière exécution des tâches.
- `social_culture_news_seen/{urlKey}` : liens RSS déjà évalués, avec leur
  verdict et l'identifiant AniList lorsqu'il existe.

Les collections de modération sont écrites par le serveur. Les règles
Firestore et les vérifications dans les callables définissent les accès admin.

## Configuration et déploiement

Pour les secrets, les comptes Buffer/TikTok, l'initialisation de
`social_bot_config/singleton` et les commandes de déploiement, suivre le
[guide de configuration du bot](../../functions/social/SETUP.md). Les secrets
API doivent rester dans Firebase Secret Manager, jamais dans le dépôt ou dans
la configuration Firestore. Le bot est initialisé kill-switch désactivé.

Pour publier en mode manuel, valider le post dans `/admin/social`, puis le
publier via Buffer ou manuellement sur le téléphone et confirmer la plateforme
dans l'interface. Pour activer le mode automatique, vérifier d'abord les
comptes, les canaux Buffer, les modes et les secrets ; tester la publication
dans un environnement isolé avant toute activation en production.

Le déploiement de production suit le guide général
[Deployment](../05-Management/Deployment.md), qui inclut les contrôles requis
et les ressources Firebase concernées.

## Tests

Les tests de publication et les scénarios d'interruption sont simulés ; ils ne
lancent aucun cron et ne publient pas réellement :

```bash
npx vitest run functions/__tests__/functionalFlows.test.mjs
npx vitest run functions/__tests__/publicDownload.test.js
```

Les flux end-to-end avec Firebase et le navigateur sont documentés dans
[Testing](../01-Getting-Started/Testing.md).
