# ⚡ Guide Essentiel (Cheat Sheet)

Ce guide résume les commandes fréquentes pour développer et maintenir Bingeki.

---

## 🛠️ Commandes de Développement

| Commande | Action |
| :--- | :--- |
| `npm run dev` | Lance le serveur de dev local avec HMR. |
| `npm run build` | Génère le bundle de production + prerendering + PWA code. |
| `npm run lint` | Vérifie la qualité du code et du style. |
| `npm run test:run` | Lance les tests unitaires (Vitest) une fois. |
| `npm run test:e2e` | Lance les tests de bout en bout (Playwright). |
| `npm run build:isolated` | Valide un build hors ligne avec la configuration de démonstration. |

---

## 🚀 Déploiement

### Déploiement Automatique (Recommandé)
Les pushes sur **`main`** déclenchent le pipeline de déploiement GitHub Actions.
Le déploiement de production attend les vérifications CI et sécurité. Il met à
jour plusieurs ressources Firebase ; consulter le guide
[Deployment](./05-Management/Deployment.md) avant toute opération manuelle.

### Déploiement Manuel
Le déploiement de Hosting seul ne met pas à jour les Functions, règles ou
indexes. Suivre le guide [Deployment](./05-Management/Deployment.md) pour les
pré-requis, tests et le périmètre correct.

---

## 📝 Traduction (i18n)

Pour ajouter une traduction :
1.  Modifie les fichiers JSON correspondants dans `public/locales/fr/` et
    `public/locales/en/`.
2.  Lance `npm run validate:i18n` pour vérifier s'il manque des clés entre FR et EN.
3.  Consulte le guide [Internationalization](./01-Getting-Started/Internationalization.md)
    pour les namespaces et les validations prises en charge.

---

## 🔒 Sécurité (Firestore)

Si tu modifies les règles de sécurité dans `firestore.rules` :
```bash
# Tester et déployer uniquement les règles
firebase deploy --only firestore:rules
```

> [!IMPORTANT]
> Ne modifie jamais les documents de gamification directement dans la console Firebase sans respecter les limites de sécurité (max +10 niveaux par sync), sinon les règles bloqueront l'écriture.

---

## 📂 Documentation

Pour maintenir cette doc :
- Ajoute tes nouveaux fichiers dans le dossier correspondant (`01-05`).
- Garde les liens **relatifs** (ex: `./Dossier/Fichier.md`).
- Mets à jour le [README.md](./README.md) central après chaque ajout majeur.
