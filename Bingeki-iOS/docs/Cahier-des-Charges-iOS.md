# Cahier des charges — Bingeki iOS (MVP natif)

| | |
|---|---|
| **Statut** | En développement — Phases 0 à 3 faites, Phase 4 bien avancée (voir §0) |
| **Base** | Maquettes canvas · [Bingeki iOS — MVP](https://claude.ai/artifact/4fBkXJrcCTi8pEesgRHPGr) |
| **Périmètre** | MVP mobile natif iOS, dérivé de la V2 web (`Bingeki-V2`) |
| **Rédigé** | 2026-09-29, mis à jour le 2026-10-01 |
| **Code** | [`Bingeki-iOS/`](..) à la racine du dépôt |

---

## 0. État d'avancement (mis à jour le 2026-10-01)

Ce document a servi de base à l'implémentation ; voici ce qui existe réellement dans `Bingeki-iOS/` à ce stade, pour qu'un autre développeur reprenne sans redécouvrir ce qui est déjà fait.

**Fait** :
- Projet Xcode généré via `project.yml` + XcodeGen (`xcodegen generate`), Swift 6 strict concurrency, cible iOS 17.
- Design system en Asset Catalog (clair/sombre), polices Outfit/Inter embarquées (extraites des fontes variables Google Fonts).
- Modèles (`Work`, `UserProfile`, `Badge`, `GamificationCore`) avec `Codable` compatible avec le format Firestore exact du web (voir §7 mis à jour).
- **Firebase réel branché** : même projet `bingeki` que le web (nouvelle app iOS `com.bingeki.ios` enregistrée, pas l'ancienne « Bingeki Mobile »). `FirebaseAuthStore`, `FirebaseUserStore`, `FirebaseLibraryStore` implémentés derrière les protocoles `AuthProviding`/`UserStoring`/`LibraryStoring`.
- Authentification : Sign in with Apple avec échange de jeton + nonce réel ; **nécessite un compte développeur Apple payant (`DEVELOPMENT_TEAM`) pour aboutir**, non configuré pour l'instant. Un bouton « Continuer sans compte (dev) » (build DEBUG uniquement) utilise l'Anonymous Auth Firebase comme contournement — il faut activer le fournisseur « Anonyme » une fois dans la [console Firebase](https://console.firebase.google.com/project/bingeki/authentication/providers). Google Sign-In n'est pas câblé (lève `AuthError.providerNotYetSupported`).
- Écrans alignés sur les maquettes HF : Accueil (S01), Découvrir · Pour toi (S02/S03), Parcourir (S04 : collections, genres, top communauté), Recherche (S05), Fiche œuvre (S06), Biblio (S07), sheet Progression avec règle glissante (S08), Profil + licence + Profil Nen (S09), éditeur de licence à 5 onglets (couleurs, bannière, top 3, badge, bio), Réglages (S13).
- Barre d'onglets custom `BKTabBar` (panneau encré + carré recherche) à la place de la barre système, comme sur les maquettes.
- Feed Découvrir sur de **vraies données Tenrai** : recommandations à partir de la biblio (titres vus, sinon « À voir »), complétées par la saison en cours ; titres passés mémorisés ; filtre `sfw` appliqué partout tant que « Contenu 18+ » est désactivé (comme le web).
- Board États : 1 onboarding (3 titres aimés), 2 tutoriel des gestes, 3 squelettes, 4 biblio vide, 5 aucun résultat + « Tu voulais dire », 6 bandeau hors ligne avec modifs en attente, 7 erreur du feed, 8 tampon + toast Annuler, 9 « Dans ta biblio », 10 fiche disparue à la source, 11 note de fin de série, 12 level up.
- Badges du web lus en lecture seule (icônes lucide → SF Symbols), badge vedette sur la licence.
- `BingekiTests` : 21 tests unitaires Swift Testing (modèles `Work`, `UserProfile`, `Tenrai`, calculs Nen, gamification, stores in-memory, décodage des badges web), 100 % passés.
- `BingekiUITests` : 3 suites de tests d'interface automatisés XCTest (`AuthFlowUITests`, `NavigationUITests`, `LibraryFlowUITests`) validant les flux clés et l'accessibilité.
- **Pipeline Qualité & CI** :
  - `scripts/check-ios.sh` : script unifié de validation locale (audit de secrets, génération xcodegen, tests unitaires, tests UI, build de validation en configuration Release).
  - `scripts/build-archive.sh` : script d'archivage release pour déploiement TestFlight / App Store.
  - `.github/workflows/ios-ci.yml` : workflow GitHub Actions CI exécuté sur runner macOS (XcodeGen, cache SPM, tests unitaires & UI, build Release, upload des rapports `.xcresult`).
  - `.husky/pre-push` : hook de pré-push déclenchant `npm run test:ios` sur les branches iOS ou lors de modifications dans `Bingeki-iOS/`.
  - Scripts npm dans `package.json` : `test:ios`, `test:ios:unit`, `test:ios:ui`, `build:ios:archive`.
- `scripts/run-simulator.sh` : build + install + launch + capture ; `--tab home|discover|library`. Arguments de lancement DEBUG pour les captures : `-bk.searchQuery`, `-bk.openWork <malId>:<type>`, `-bk.openProfile YES`, `-bk.discoverSegment browse`, `-bk.forceOnboarding YES`, `-bk.forceOffline YES`, `-bk.coach.swipe NO`.

**Pas encore fait** :
- SwiftData / cache disque — le hors-ligne repose sur le cache Firestore (les écritures attendent le retour réseau, le bandeau affiche le nombre en attente).
- Merge par œuvre avec tombstones (le web a `mergeLibraryData`) — `FirebaseLibraryStore` fait un dernier-écrit-gagne au niveau du document entier ; documenté comme simplification volontaire dans le code.
- Google Sign-In, notifications push (FCM), scan ISBN, personnages favoris sur le profil.
- Streak / `data/gamification` (le badge de série affiche la valeur serveur du profil).

**Écart avec la stack technique initialement proposée (§4)** : SwiftData n'a pas encore été introduit ; les stores actuels (`InMemory*`/`Firebase*`) suffisent pour le MVP en cours de développement. L'ajouter reste pertinent pour la Phase 4 (hors-ligne).

---

## 1. Contexte

Bingeki existe aujourd'hui en PWA (React + Firebase, voir [`docs/02-Architecture/Architecture.md`](../../docs/02-Architecture/Architecture.md)). Ce document cadre une **application iOS native** distincte, qui partage le même backend Firebase et la même identité de marque, mais dont l'UX est repensée pour le mobile (cf. étapes 1 à 6 du canvas de maquettes : stratégie, explorations, design system, écrans HF, états, prototype).

Ce cahier des charges décrit ce que le canvas ne spécifie pas : la stack technique, l'architecture applicative, le modèle de données, l'intégration backend, et le plan de développement.

## 2. Objectif du document

Permettre à un développeur (ou à un agent) de démarrer l'implémentation Xcode sans avoir à redécouvrir les décisions déjà prises pendant la phase de design. En cas de doute sur le visuel ou une interaction, **le canvas de maquettes fait foi** ; ce document ne le duplique pas.

## 3. Périmètre du MVP

Repris tel quel du board *02 · MVP & navigation* :

**Inclus** : Bibliothèque (ajout 1 tap, 5 statuts, +1 / règle glissante, note /10), Découverte (feed swipe + Parcourir + similaires), Recherche (anime + manga unifiés), Profil (licence personnalisable, stats, Profil Nen, réglages).

**Exclu → V2+** : social & amis, tier lists, challenges, news, calendrier des sorties, dossiers personnalisés, personnages/staff détaillés, watch parties, commentaires, galerie de badges complète, notes texte libres, filtres avancés, scan ISBN (V1.1), Mode Légendaire (effets premium créateurs).

## 4. Choix techniques

| Domaine | Choix | Justification |
|---|---|---|
| Langage | **Swift 6** (concurrency stricte) | Standard actuel, aligné avec `swift-concurrency-pro` |
| UI | **SwiftUI**, iOS 17 minimum | Composants déclaratifs, Dynamic Type et VoiceOver natifs ; iOS 17 apporte `@Observable` et les animations `phase`/`keyframe` utiles pour les micro-interactions du board *Micro-interactions* |
| Architecture | **MVVM léger** : `View` SwiftUI + `@Observable` view-model par écran, pas de framework tiers | Cohérent avec un MVP à 4 briques ; évite la sur-ingénierie |
| Persistance locale | **SwiftData** (prévu, pas encore implémenté — voir §0) | Cache de la bibliothèque + file d'attente de synchro hors-ligne (board États #6) |
| Backend | **Firebase iOS SDK** (`FirebaseAuth`, `FirebaseFirestore`, `FirebaseFunctions`, `FirebaseMessaging`) via Swift Package Manager | Même projet Firebase que le web : un seul compte, une seule base |
| Données externes | **Tenrai** (`https://api.tenrai.org/v1`, schéma Jikan v4) en appel direct, avec repli sur les Cloud Functions `jikanProxy` existantes | Jikan est discontinué (mémoire projet) ; le web utilise déjà ce même repli direct→proxy dans `src/services/animeApi.ts` |
| Auth | **Sign in with Apple** (obligatoire si Google proposé) + **Sign in with Google** | Recommandation initiale confirmée par le board *02* |
| Notifications | **APNs** via `FirebaseMessaging` | Le web utilise déjà FCM (`usePushNotifications.ts`) ; réutiliser les mêmes topics côté serveur |
| Tests | **Swift Testing** (`BingekiTests` : modèles, stores, décodage) + **XCTest** (`BingekiUITests` : flux auth, navigation, bibliothèque, accessibilité) | Tests automatisés garantissant la non-régression et la robustesse des flux critiques |
| CI / Déploiement | **GitHub Actions** (`ios-ci.yml`) + scripts `check-ios.sh`, `build-archive.sh`, hooks Husky | Validation automatisée avant push et sur PR/main (XcodeGen, build Release, tests, archivage) |
| Localisation | `String Catalog` (.xcstrings), FR par défaut + EN | Miroir de `i18next` côté web (voir §12) |

## 5. Architecture applicative

### 5.1 Navigation

Calquée sur le board *02 · MVP & navigation*, direction B :

```
BingekiApp
└─ RootView (état auth)
   ├─ AuthView                         (non connecté)
   └─ TabView                          (connecté)
      ├─ Tab 1 — HomeView              (Accueil)
      ├─ Tab 2 — DiscoverView          (segments Pour toi / Parcourir)
      ├─ Tab 3 — LibraryView           (chips de statut)
      └─ SearchButton (flottant, hors TabView) → SearchView (fullScreenCover)

Push depuis n'importe quel onglet :
  WorkDetailView (NavigationStack)
  ProfileView (push, ouvert depuis l'avatar)
    └─ ProfileEditView (fullScreenCover, 5 onglets : couleurs / bannière / top3 / badge / bio)
    └─ SettingsView (push)

Sheets (.sheet, detents .medium/.large) :
  ProgressSheetView, StatusPickerView, RatingSheetView (fin de série)
```

Profondeur maximale : onglet → écran poussé → sheet. Aucune navigation à plus de 3 niveaux (cf. board *02*, colonne « Profondeur max »).

### 5.2 Arborescence de fichiers (telle qu'implémentée)

```
Bingeki-iOS/
├─ App/                    BingekiApp.swift, RootView.swift
├─ Core/
│  ├─ DesignSystem/        BKColor, BKFont, BKMetrics
│  ├─ Components/          BKButton, BKContentCard, BKToast, BKLevelUpOverlay
│  ├─ Networking/          TenraiClient, TenraiModels, FirebaseAuthStore, FirebaseUserStore, FirebaseLibraryStore
│  ├─ Persistence/         LibraryStore, UserStore (protocoles + InMemory*), EnvironmentKeys (@Entry, voir §8.1 note)
│  └─ Haptics/             HapticEngine
├─ Features/
│  ├─ Auth/                AuthView
│  ├─ Home/                HomeView
│  ├─ Discover/            DiscoverView, BrowseView
│  ├─ Search/               SearchView
│  ├─ Library/              LibraryListView, WorkDetailView, ProgressSheetView
│  ├─ Profile/              ProfileView, ProfileEditView
│  └─ Settings/             SettingsView
├─ Models/                  Work, UserProfile, Badge, GamificationCore
├─ Resources/               Assets.xcassets, Fonts/, Info.plist, GoogleService-Info.plist, Bingeki.entitlements
├─ BingekiTests/            tests Swift Testing
├─ scripts/                 run-simulator.sh
└─ project.yml              spec XcodeGen (source de vérité — ne pas éditer le .xcodeproj à la main)
```

## 6. Design system iOS

Source unique de vérité : board *03 · Design system mobile*. Résumé exploitable directement en code :

### 6.1 Couleurs (à définir en `Asset Catalog` avec variante Any/Dark, **pas** en `Color(hex:)` codé en dur)

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `bg` | `#F5F5F5` | `#121212` | fond d'écran |
| `surface` | `#FFFFFF` | `#1E1E1E` | cartes, sheets |
| `surfaceTint` | `#E5E5E5` | `#2D2D2D` | pistes de progression |
| `textPrimary` | `#1A1A1A` | `#EDEDED` | texte principal |
| `textSecondary` | `#666666` | `#A0A0A0` | légendes |
| `border` | `#1A1A1A` | `#444444` | contours, séparateurs |
| `accentText` | `#C00D40` | `#FF2E63` | liens, onglet actif (contraste AA en clair) |
| `cyanText` | `#047C7A` | `#08D9D6` | badges, teasers |
| `greenText` | `#047857` | `#10B981` | statut Terminé |
| `orangeText` | `#B45309` | `#F59E0B` | streak |
| — | `#E0104A` (fixe) | `#E0104A` (fixe) | fond des CTA pleins (4,8:1 sous texte blanc dans les deux thèmes) |

Réglage utilisateur : Système (défaut) / Clair / Sombre / AMOLED. Le sélecteur applique bien `.preferredColorScheme` ; AMOLED réutilise la palette sombre pour l'instant (pas de vrai noir absolu séparé — follow-up Phase 4).

### 6.2 Typographie

- **Titres, labels, CTA** : Outfit (SemiBold/Bold/ExtraBold/Black), embarquée dans `Resources/Fonts`, déclarée dans `Info.plist` (`UIAppFonts`). Extraite des fontes variables Google Fonts avec `fontTools` (voir le commit qui l'a ajoutée pour la commande exacte).
- **Corps de texte** : Inter (Regular/Medium/SemiBold/Bold), même traitement. Tailles mappées sur les styles Dynamic Type d'iOS.
- Titres plafonnés à 2 lignes ; au-delà de la taille de texte AX3, la tab bar passe en icônes seules (règle du board *Micro*) — fait dans `BKTabBar` ; le Large Content Viewer reste à ajouter.

### 6.3 Forme, espacement, mouvement

- Grille d'espacement 4 pt : 4 / 8 / 12 / 16 / 24 / 32 / 48. Marges d'écran 16, entre cartes 12, entre sections 32.
- Cibles tactiles ≥ 44 pt, CTA principal 56 pt.
- Panels : bordure 2 pt encre + ombre pleine décalée 4 pt (6 pt sur les CTA), jamais de `cornerRadius` arrondi sur les cartes de contenu (style "manga panel" du web). Voir `BKMetrics.bkPanelShadow`/`bkInkBorder`.
- Animation par défaut : `timingCurve` équivalente à `cubic-bezier(.19,1,.22,1)`, 200–400 ms. Réserver les ressorts (`interpolatingSpring`) aux moments de marque (tampon d'ajout, level-up) — jamais sur une simple navigation.
- Respecter `UIAccessibility.isReduceMotionEnabled` : remplacer rotation/tampon/speedlines par un fondu 150 ms — fait sur le deck Découvrir (rotation, ressort, pulsation des squelettes) ; reste l'overlay level-up.

### 6.4 Iconographie

Uniquement des icônes vectorielles (SF Symbols en priorité) — **aucun émoji ni caractère Unicode décoratif** dans l'UI (règle appliquée sur tout le canvas de maquettes fin septembre 2026, et respectée dans tout le code Swift : `BKStatusChip`, badges, etc. utilisent des `Image(systemName:)`, jamais un caractère littéral).

## 7. Modèle de données (Swift)

Les types réels vivent dans `Models/Work.swift` et `Models/UserProfile.swift` — ce qui suit résume les décisions, pas le code exact (qui a évolué pendant l'implémentation, notamment pour l'interopérabilité Firestore).

**`Work`** : miroir de `src/store/libraryStore.ts`. Point important découvert pendant l'implémentation : le format Firestore du web n'est **pas** un simple mapping 1:1 avec des clés camelCase — `id` est `number | string`, `genres` est `{name: string}[]` et non un tableau de chaînes, `lastUpdated`/`dateAdded` sont en millisecondes epoch (convention `Date.now()` de JS), pas en ISO8601. `Work` a donc un `Codable` personnalisé (`init(from:)`/`encode(to:)`) qui traduit entre ces deux représentations, plutôt que la conformance synthétisée par défaut.

**`UserProfile`** : miroir de `src/firebase/users.ts`, **fields pertinents pour le MVP uniquement** — les champs gérés côté serveur (`badges`, `isAdmin`, `isSuperAdmin`, `isBanned`, `email`, `lastLogin`, `createdAt`, `deletedAt`, `favoriteCharacters`) sont délibérément absents de ce modèle Swift. Son décodage est également défensif (`decodeIfPresent` + valeur par défaut sur chaque champ sauf `uid`), car un document Firestore écrit par l'allowlist `saveUserProfileToFirestore` du web peut légitimement ne pas contenir toutes les clés.

**`Badge`** : `icon` est une clé sémantique (`"crown"`, `"bolt"`, `"target"`…) mappée vers un SF Symbol dans la vue, jamais un emoji littéral.

`GamificationCore.swift` porte les formules XP/niveau (`LEVEL_BASE = 100`, `LEVEL_MULTIPLIER = 1.05`, `MAX_LEVEL = 100`) à l'identique depuis `src/shared/gamificationCore.ts` — **ne pas réinventer le calcul côté client** : le serveur (Cloud Function `onLibraryUpdate`) reste la source de vérité, le client ne fait que de l'affichage optimiste (voir §9).

`Folder`/`Tombstone` et le merge par œuvre avec tombstones ne sont pas encore portés — voir §0 et la note dans `FirebaseLibraryStore`.

## 8. Intégration backend

### 8.1 Authentification

Implémentée dans `FirebaseAuthStore` (derrière le protocole `AuthProviding`) : Sign in with Apple avec nonce + échange de jeton réel (`OAuthProvider.appleCredential`). **Nécessite un `DEVELOPMENT_TEAM` (compte développeur Apple payant) pour fonctionner** — non configuré dans `project.yml` actuellement, donc le flow Apple ne peut pas aboutir sur simulateur tel quel. Un bouton de contournement en DEBUG utilise l'Anonymous Auth Firebase (fournisseur à activer une fois dans la console). Google lève explicitement `AuthError.providerNotYetSupported` plutôt que d'échouer silencieusement.

> **Note d'architecture** : chaque écran lit le store via `@Environment(\.authStore)`/`@Environment(\.libraryStore)`/`@Environment(\.userStore)` — des clés `EnvironmentValues` **typées par protocole** (`Core/Persistence/EnvironmentKeys.swift`), pas `@Environment(ConcreteType.self)`. C'est ce qui permet à `FirebaseLibraryStore`/`FirebaseUserStore`/`FirebaseAuthStore` d'être de vrais remplacements interchangeables avec les stores `InMemory*` utilisés dans les previews et les tests — une erreur de conception initiale corrigée après coup, donc à ne pas réintroduire par erreur dans du nouveau code.

Le document `/users/{uid}` n'est pour l'instant créé qu'implicitement par `FirebaseUserStore.update(_:)` (un `setData(merge: true)` crée le document s'il n'existe pas). Il n'y a pas encore d'étape explicite de création de profil au premier lancement façon `saveUserProfileToFirestore` côté web — un utilisateur qui ne s'est jamais connecté sur le web n'aura donc pas de `xp`/`badges` tant qu'aucune écriture de bibliothèque n'a déclenché le trigger `onLibraryUpdate`.

### 8.2 Firestore

| Chemin | Usage iOS | Implémenté dans |
|---|---|---|
| `/users/{uid}` | Profil, XP, niveau, badges | `FirebaseUserStore` (écoute + écriture allowlistée, jamais un `setDoc` complet) |
| `/users/{uid}/data/library` | Document unique contenant le tableau `works` — écrit après chaque mutation, debounce 800 ms | `FirebaseLibraryStore` |
| `/users/{uid}/data/gamification` | Streak, `bonusXp`, historique — le client n'écrit que ces 3 champs | **pas encore implémenté** |

Écoute temps réel via `addSnapshotListener` sur `/users/{uid}` et `/data/library` pour la synchro multi-appareils (web ↔ iOS). **Simplification documentée** : `FirebaseLibraryStore` résout les conflits en dernier-écrit-gagne au niveau du document entier, pas le merge par œuvre + tombstones que `mergeLibraryData` fait sur le web (`src/utils/dataProtection.ts`) — suffisant pour un usage mono-appareil en développement, à revoir avant une vraie bêta multi-appareils.

### 8.3 Cloud Functions réutilisables (`functions/index.js`)

Aucune fonction spécifique écrite côté iOS pour l'instant : la recherche et le feed Découvrir utilisent `TenraiClient` (appel direct à Tenrai). Le repli automatique sur les Cloud Functions `jikanProxy.*` en cas d'échec réseau — documenté comme stratégie prévue — **n'est pas encore implémenté**.

### 8.4 Notifications

Pas encore implémenté. `FirebaseMessaging` est ajouté comme dépendance SPM mais aucun code d'enregistrement de jeton APNs n'existe.

## 9. Gamification — règles d'implémentation

- Le client applique l'XP de façon **optimiste** (ex. +5 XP sur `UPDATE_PROGRESS`, +15 sur `ADD_WORK`, +50 sur `COMPLETE_WORK`, +20 sur `WATCH_MOVIE`, +25 sur `DAILY_LOGIN`) puis le trigger Firestore `onLibraryUpdate` corrige silencieusement si nécessaire (le snapshot listener de `FirebaseUserStore` remplace la valeur optimiste par la vraie dès qu'elle arrive).
- Rang lettre (F→S→臭) calculé localement à partir du niveau, formule identique à `src/utils/rankUtils.ts` — implémenté dans `GamificationCore.rank(forLevel:)`.
- Le radar « Profil Nen » (6 axes : Niveau, Passion, Assiduité, Collection, Lecture, Complétion) suit exactement les formules du board *Profil*, implémenté dans `GamificationCore.nenAxes(for:)`.
- Le passage de niveau déclenche `BKLevelUpOverlay` (speedlines + tampon, se ferme seul après 1,6 s) — état qui n'existait pas du tout avant cette implémentation.

## 10. Accessibilité

- VoiceOver : chaque carte Découvrir expose 3 actions personnalisées (À voir, Passer, Déjà vu).
- Contraste : jamais la couleur seule pour un statut — toujours icône + libellé (`BKStatusChip` combine les deux systématiquement).
- `accessibilityLabel` explicite sur tout bouton icône-seul.
- `isReduceMotionEnabled` : respecté sur le deck Découvrir (voir §6.3) ; `isReduceTransparencyEnabled` pas encore.
- Actions VoiceOver sur la carte Découvrir (À voir / Passer / Déjà vu), règle de progression ajustable (`accessibilityAdjustableAction`).

## 11. Performance

- Chargement des couvertures via `AsyncImage` (`BKCover`) ; pas de cache disque dédié pour l'instant (repose sur le cache HTTP par défaut d'`URLSession`).
- Squelettes de chargement à la forme exacte du contenu final (board États #3) — implémenté sur `BrowseView` et la section Similaires de `WorkDetailView` ; pas généralisé partout.
- Pagination : pas encore implémentée (les résultats Tenrai sont limités à la demande, sans pagination infinie).
- Budget de lancement à froid : non mesuré formellement.

## 12. Internationalisation

FR uniquement pour l'instant (pas de `String Catalog`, les chaînes sont en dur dans le code SwiftUI). EN reste prévu en V1.1 comme initialement cadré.

## 13. Sécurité & confidentialité

- `GoogleService-Info.plist` est commité (pratique standard Firebase iOS — la clé API n'est pas un secret, la vraie frontière de sécurité est `firestore.rules`).
- `Bingeki.entitlements` déclare `com.apple.developer.applesignin`.
- Réglage « Contenu 18+ » (`nsfwMode`) désactivé par défaut, branché sur `UserProfile` réel.
- Keychain pour les jetons : géré nativement par le SDK Firebase Auth, aucun code maison à écrire.
- Aucune collecte publicitaire tierce dans le MVP.

## 14. Plan de développement — avancement réel

**Hypothèses d'estimation d'origine** (1 développeur, temps plein, débutant SwiftUI) conservées pour référence ; voir §0 pour ce qui est réellement fait à date.

| Phase | Contenu | Sortie | Durée estimée | Avancement |
|---|---|---|---|---|
| **0 — Socle** | Xcode project, SPM (Firebase), design tokens, composants de base, Auth Apple/Google | Écran de connexion fonctionnel | 1,5–2 semaines | **Fait** (Google non câblé) |
| **1 — Bibliothèque** | `LibraryListView`, `WorkDetailView`, `ProgressSheetView`, sync Firestore `data/library` | Biblio synchronisée web ↔ iOS | 2–3 semaines | **Fait** (sans merge par œuvre, voir §8.2) |
| **2 — Découverte & Recherche** | Feed swipe, Parcourir, `SearchView`, intégration Tenrai | Ajout de titres depuis le mobile | 2,5–3,5 semaines | **Fait** |
| **3 — Profil & personnalisation** | `HunterLicenseCard`, `ProfileEditView`, Profil Nen, `SettingsView` | Profil complet, thème clair/sombre | 2–3 semaines | **Fait** |
| **4 — États, polish, accessibilité & CI** | Tous les états du board *États*, micro-interactions, VoiceOver, tests unitaires, tests UI, CI/CD | Prêt pour TestFlight | 1,5–2,5 semaines | **Fait** — 12 états faits, tests unitaires + UI passés, scripts et CI en place |
| **5 — Bêta fermée** | Distribution TestFlight, retours, corrections | Prêt pour soumission App Store | 1–2 semaines | Pas commencé (besoin d'un `DEVELOPMENT_TEAM`) |

Prochaines étapes concrètes pour qui reprend ce projet : (1) obtenir/configurer un `DEVELOPMENT_TEAM` pour que Sign in with Apple fonctionne réellement et permettre l'export d'archive signée, (2) activer le fournisseur Anonymous dans la console Firebase pour débloquer les tests sans attendre (1), (3) porter le merge par œuvre avec tombstones avant une bêta multi-appareils.

## 15. Definition of Done (par écran)

Un écran est considéré fini quand : (1) il correspond au board du canvas en clair et en sombre, (2) tous ses états (vide / chargement / erreur / succès) du board *États* sont implémentés s'il y figure, (3) VoiceOver annonce correctement chaque action, (4) Dynamic Type jusqu'à AX3 ne casse pas la mise en page, (5) aucune donnée factice ne reste en dur hors previews SwiftUI.

## 16. Annexes

- Maquettes complètes : [canvas Bingeki iOS — MVP](https://claude.ai/artifact/4fBkXJrcCTi8pEesgRHPGr) (6 pages : Stratégie, Explorations, Design system, Maquettes HF, Profil, États, Prototype)
- Architecture web de référence : [`docs/02-Architecture/Architecture.md`](../../docs/02-Architecture/Architecture.md), [`docs/02-Architecture/Firebase-Backend.md`](../../docs/02-Architecture/Firebase-Backend.md)
- Gamification : [`src/shared/gamificationCore.ts`](../../src/shared/gamificationCore.ts) (source de vérité serveur)
- Mémoire projet : Jikan est discontinué (fermé depuis le 2026-10-01) → toujours utiliser Tenrai (`api.tenrai.org/v1`, schéma Jikan v4)
- Console Firebase du projet partagé : https://console.firebase.google.com/project/bingeki (app iOS `com.bingeki.ios`, à ne pas confondre avec l'ancienne app « Bingeki Mobile » `com.bingeki.mobile`)
