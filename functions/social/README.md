# `functions/social/`

Cloud Functions pour le bot social. Le fonctionnement, les horaires, les modes
`manual`/`auto`/`off`, la configuration et les garanties de publication sont
documentés dans [Social-Bot](../../docs/03-Features/Social-Bot.md).

## Structure

- `crons/` : génération de contenu, publication automatique, statistiques,
  nettoyage et surveillance des tâches planifiées.
- `generators/` : collecte de données, prompts Gemini, templates et rendu des
  slides.
- `publishers/` : publication via Buffer et helpers de publication ; certains
  publishers directs historiques sont conservés.
- `admin/` : callables d'administration et de publication, avec vérification
  serveur du rôle admin.
- `shared/` : configuration, accès Firestore, santé des crons et notifications.

`publicationCore.js` journalise les tentatives avant l'envoi. Un résultat
ambigu est réconcilié manuellement plutôt que renvoyé automatiquement : le
fournisseur ne garantit pas l'idempotence de la publication.

Les tests de publication sont simulés et n'appellent pas les réseaux sociaux :

```bash
npx vitest run functions/__tests__/functionalFlows.test.mjs
npx vitest run functions/__tests__/publicDownload.test.js
```
