# Social Bot — Setup end-to-end

Étapes ordonnées pour démarrer le bot en production. Chaque commande
peut se copier-coller telle quelle.

## Pré-requis (une fois)

- [ ] Firebase CLI logged in : `firebase login` (déjà fait si tu as pu
      `firebase functions:secrets:set`)
- [ ] Un service account JSON pour lancer les scripts d'init :
  1. https://console.firebase.google.com/ → projet `bingeki` → ⚙️ **Paramètres** → **Comptes de service**
  2. **Générer une nouvelle clé privée** → télécharge le JSON
  3. Range-le hors du repo, ex. `~/.firebase/bingeki-service-account.json`
  4. **Ne le commit jamais** (ajouté au .gitignore parent, mais reste vigilant)

## 1. Secrets Firebase

```bash
# Clé Google AI Studio (https://aistudio.google.com/apikey)
firebase functions:secrets:set GEMINI_API_KEY

# Clé Buffer (déjà fait normalement)
firebase functions:secrets:set BUFFER_API_KEY
```

## 2. Doc Firestore `social_bot_config/singleton`

```bash
FIREBASE_APPLICATION_CREDENTIALS=~/.firebase/bingeki-service-account.json \
  npm run social:init
```

Le kill-switch global reste `enabled=false` par défaut — le bot est
configuré mais ne publiera rien tant que tu ne le passes pas à `true`
(dans la console Firestore, ou en relançant le script avec
`ENABLE_BOT=true`).

Pour ajouter TikTok plus tard :

```bash
FIREBASE_APPLICATION_CREDENTIALS=~/.firebase/bingeki-service-account.json \
  TIKTOK_BUFFER_CHANNEL_ID=<id-du-channel-tiktok> \
  npm run social:init
```

Le script est **idempotent** (merge), il ne casse rien si tu le rejoues.

## 3. Deploy des Cloud Functions

```bash
firebase deploy --only \
  functions:socialDailyReleases,\
functions:socialWeeklyRecap,\
functions:socialCommunityFavorite,\
functions:socialNewSeasonDetector,\
functions:socialPublishNow,\
functions:socialRejectPost,\
functions:socialRegeneratePost
```

## 4. Premier test end-to-end (sans attendre le cron)

```bash
FIREBASE_APPLICATION_CREDENTIALS=~/.firebase/bingeki-service-account.json \
  npm run social:seed-test-post
```

Ça insère un post "TEST · Sorties du jour" dans `social_pending_posts`.
Puis :

1. Ouvre https://bingeki.web.app/fr/admin/social (connecté en admin)
2. Le post devrait apparaître en tête de "En attente"
3. Clique **Publier maintenant**
4. Va vérifier dans Buffer (queue) puis sur ton Instagram @bingeki.fr

Si ça casse quelque part, les logs sont dans :

```bash
firebase functions:log --only socialPublishNow
```

## 5. Bascule prod

Quand le test manuel passe, active le bot pour laisser tourner les crons :

```bash
# via la console Firestore : social_bot_config/singleton.enabled = true
# OU
ENABLE_BOT=true FIREBASE_APPLICATION_CREDENTIALS=... npm run social:init
```

À partir de là :

- **Sorties du jour** tous les soirs à 19h (Europe/Paris)
- **Récap hebdo** tous les dimanches à 19h
- **Coup de cœur** tous les mercredis à 12h
- **Nouvelle saison** détecté automatiquement par le cron
  `socialNewSeasonDetector`

Chaque post créé par un cron atterrit en `pending` — il doit être validé
depuis `/admin/social` avant d'être poussé chez Buffer.
