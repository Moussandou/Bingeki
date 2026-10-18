# Configuration du bot social

Ce guide couvre l'initialisation et les tests du bot. Pour ses tâches, ses
modes et son comportement de publication, voir
[la documentation fonctionnelle](../../docs/03-Features/Social-Bot.md).
Pour les contrôles et étapes du déploiement de production, voir
[Deployment](../../docs/05-Management/Deployment.md).

## Prérequis et secrets

- Accès autorisé au projet Firebase et à Firebase CLI (`firebase login`).
- Un compte/canal Buffer pour chaque réseau à publier.
- Des credentials Firebase Admin pour les scripts de configuration ; conservez
  le fichier de compte de service hors du dépôt.
- Les clés API nécessaires stockées dans Firebase Secret Manager :

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set BUFFER_API_KEY
```

Pour connecter le compte TikTok et relever ses statistiques, configurez aussi
`TIKTOK_CLIENT_KEY` et `TIKTOK_CLIENT_SECRET` dans Secret Manager. Ne placez
aucun secret dans Firestore, un fichier commité ou une variable `VITE_*`.

## Initialiser la configuration

Installez les dépendances de Functions si elles ne sont pas déjà installées,
puis initialisez le document de configuration :

```bash
npm ci --prefix functions
FIREBASE_APPLICATION_CREDENTIALS="$HOME/.firebase/bingeki-service-account.json" \
  npm run social:init
```

`social:init` fusionne les valeurs par défaut dans
`social_bot_config/singleton`, préserve les champs personnalisés et laisse le
kill-switch désactivé. Configurez les canaux Buffer avec
`INSTA_BUFFER_CHANNEL_ID` et, si nécessaire, `TIKTOK_BUFFER_CHANNEL_ID`.
N'activez pas `ENABLE_BOT=true` avant d'avoir vérifié les paramètres et les
comptes dans l'environnement cible.

Les modes de contenu et l'état des comptes sont visibles dans
`/admin/social`. Vérifiez que chaque canal est correct, que le mode est celui
souhaité (`manual`, `auto` ou `off`) et que le kill-switch est désactivé tant
que la configuration n'est pas validée.

## Déployer

Ne déployez pas depuis un environnement de test et ne contournez pas les
contrôles du pipeline. Suivez le guide [Deployment](../../docs/05-Management/Deployment.md)
pour le déploiement autorisé. Le workflow de production déploie également les
règles, indexes, Storage et Hosting requis ; un simple déploiement de Hosting
ne met pas à jour les Functions.

## Vérifier une publication

Le script `npm run social:seed-test-post` insère un post dans Firestore. Si
vous le publiez, il peut réellement être envoyé au canal Buffer configuré :
utilisez uniquement un projet de test avec un compte/canal de test et vérifiez
les cibles avant d'appeler `socialPublishNow`.

Les tests automatisés utilisent des publishers simulés et n'envoient aucun
contenu aux réseaux sociaux :

```bash
npx vitest run functions/__tests__/functionalFlows.test.mjs
```

En cas d'envoi incertain, vérifiez d'abord l'état du post dans Buffer. Ne
relancez pas une tentative `unknown` ; réconciliez-la depuis l'interface admin
avec `socialMarkPublished` uniquement après confirmation sur la plateforme.
