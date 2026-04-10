# ⚡ Guide Essentiel (Cheat Sheet)

Ce guide résume les commandes et procédures les plus fréquentes pour développer et maintenir Bingeki-V2.

---

## 🛠️ Commandes de Développement

| Commande | Action |
| :--- | :--- |
| `npm run dev` | Lance le serveur de dev local avec HMR. |
| `npm run build` | Génère le bundle de production + prerendering + PWA code. |
| `npm run lint` | Vérifie la qualité du code et du style. |
| `npm test` | Lance les tests unitaires (Vitest). |
| `npm run test:e2e` | Lance les tests de bout en bout (Playwright). |

---

## 🚀 Déploiement

### Déploiement Automatique (Recommandé)
Toute fusion (merge) sur la branche **`main`** déclenche automatiquement le pipeline GitHub Actions :
1.  Vérification du code (Lint/Tests).
2.  Build de production.
3.  Déploiement sur Firebase Hosting.

### Déploiement Manuel
Si besoin de déployer manuellement depuis ta machine :
```bash
# 1. Préparer le build
npm run build

# 2. Envoyer sur Firebase (nécessite d'être loggé)
firebase deploy --only hosting
```

---

## 📝 Traduction (i18n)

Pour ajouter une traduction :
1.  Modifie `src/i18n.ts`.
2.  Lance `npm run validate:i18n` pour vérifier s'il manque des clés entre FR et EN.
3.  Utilise `scripts/auto-translate.ts` (si configuré) pour générer les traductions manquantes via IA.

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
