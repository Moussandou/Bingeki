# Skeleton Loading — Design Spec
**Date:** 2026-04-07  
**Approche:** boneyard-js full auto (scan headless)

---

## Objectif

Remplacer les spinners / écrans vides actuels par des skeletons pixel-perfect sur toutes les pages de l'application. Les skeletons doivent respecter le thème CSS du projet (variables `--color-*`) et s'adapter automatiquement au dark mode.

---

## Architecture

### Dépendance

```bash
npm install boneyard-js
```

### Fichiers générés (commités)

```
src/bones/
├── registry.js                  ← auto-généré par le CLI boneyard
├── dashboard.bones.json
├── library.bones.json
├── work-details.bones.json
├── profile.bones.json
├── discover.bones.json
├── schedule.bones.json
├── opening.bones.json
├── lens.bones.json
├── social.bones.json
├── character-details.bones.json
├── person-details.bones.json
├── tier-list-feed.bones.json
├── create-tier-list.bones.json
├── view-tier-list.bones.json
├── news-index.bones.json
├── news-article.bones.json
├── changelog.bones.json
├── challenges.bones.json
├── auth.bones.json
├── settings.bones.json
├── notifications.bones.json
├── feedback.bones.json
├── form-survey.bones.json
├── contact.bones.json
├── about.bones.json
├── privacy.bones.json
├── terms.bones.json
├── legal.bones.json
├── credits.bones.json
├── donors.bones.json
├── admin-dashboard.bones.json
├── admin-users.bones.json
├── admin-health.bones.json
└── admin-feedback.bones.json
```

### Point d'entrée unique

Dans `src/main.tsx`, ajouter une seule ligne :

```tsx
import './bones/registry'
```

---

## Intégration par page

Chaque page wrappe son contenu principal (à l'intérieur du `<Layout>`) avec le composant `<Skeleton>` de boneyard-js :

```tsx
import { Skeleton } from 'boneyard-js/react'

// Avant :
{isLoading ? <LoadingScreen /> : <MonContenu />}

// Après :
<Skeleton
  name="dashboard"
  loading={isLoading}
  color="var(--color-border)"
  darkColor="var(--color-border)"
>
  <MonContenu />
</Skeleton>
```

### Règle de nommage

Le `name` passé au composant `<Skeleton>` correspond exactement au nom du fichier `.bones.json` (sans l'extension).

### Pages sans état `isLoading` existant

Certaines pages chargent leurs données de façon synchrone (store Zustand déjà hydraté) ou n'ont pas encore de flag de chargement. Pour ces pages, ajouter un `useState<boolean>(true)` local qui passe à `false` dans le premier `useEffect` après récupération des données.

---

## Thème

Les couleurs des skeletons utilisent les variables CSS du projet pour rester cohérentes avec le thème light/dark :

```tsx
color="var(--color-border)"      // light: #e5e5e5
darkColor="var(--color-border)"  // dark: #333333
```

Le dark mode est détecté automatiquement par boneyard via `prefers-color-scheme`. Pas de prop `dark` à passer manuellement — le thème de l'app est déjà géré globalement via les variables CSS.

---

## Authentification pour le scan

### Configuration

`boneyard.config.json` à la racine du projet (ajouté à `.gitignore`) :

```json
{
  "auth": {
    "cookies": [
      { "name": "firebaseToken", "value": "<TOKEN_COMPTE_TEST>" }
    ]
  }
}
```

### Compte test Firebase

- Créer un compte dédié dans Firebase Auth (ex: `skeleton-scanner@bingeki.app`)
- Remplir la bibliothèque avec quelques œuvres pour que les pages comme Library et Dashboard aient du contenu à scanner
- Le token est récupéré via Firebase Console ou `firebase auth:export`

### `.gitignore`

```
boneyard.config.json
```

---

## Workflow de scan

### Setup initial (une seule fois)

```bash
# 1. Démarrer le dev server
npm run dev

# 2. Scanner toutes les pages en une passe
npx boneyard-js build http://localhost:5173 --out src/bones
```

Le CLI crawle automatiquement toutes les routes définies. Les `.bones.json` générés sont commités.

### Maintenance (après changement de layout)

```bash
# Rescan d'une seule page
npx boneyard-js build http://localhost:5173/dashboard --out src/bones
```

Seul le fichier `.bones.json` de la page modifiée est regénéré.

---

## Pages couvertes

| Catégorie | Pages | Auth requise |
|---|---|---|
| Principales | Dashboard, Library, WorkDetails, Profile | Oui |
| Découverte | Discover, Schedule, Opening, Lens | Non |
| Social | Social, CharacterDetails, PersonDetails | Mixte |
| Tier Lists | TierListFeed, CreateTierList, ViewTierList | Mixte |
| Contenu | NewsIndex, NewsArticle, Changelog, Challenges | Non |
| Auth/Settings | Auth, Settings, Notifications | Mixte |
| Formulaires | Feedback, FormSurvey, Contact | Non |
| Statique | About, Privacy, Terms, Legal, Credits, Donors | Non |
| Admin | Dashboard, Users, Health, FeedbackAdmin, + analytics | Oui (compte test avec rôle admin) |

---

## Ce qui n'est pas dans le scope

- Skeletons dans les **modales** (AddWorkModal, EditWorkModal, etc.) — le chargement y est trop court pour justifier un skeleton
- Skeletons pour les **toasts** et **notifications inline**
- `FormSurveyThankYou` — page statique sans données asynchrones

---

## Résumé des changements par fichier

| Fichier | Changement |
|---|---|
| `package.json` | Ajouter `boneyard-js` |
| `src/main.tsx` | `import './bones/registry'` |
| `.gitignore` | Ajouter `boneyard.config.json` |
| `boneyard.config.json` | Créer (non commité) |
| `src/bones/` | Répertoire généré + commité |
| Toutes les pages | Wrapper `<Skeleton>` autour du contenu principal |
