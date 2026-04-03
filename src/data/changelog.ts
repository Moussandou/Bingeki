export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    description: string;
    changes: string[];
}

export const changelogData: ChangelogEntry[] = [
    {
        version: "v3.9",
        date: "03 Avril 2026",
        title: "Health Dashboard & System Hardening",
        description: "A major step forward for admin monitoring and infrastructure robustness.",
        changes: [
            "Admin: New Health Dashboard with real-time monitoring of infrastructure and data integrity.",
            "Admin: Added visual metrics, latency charts, and Data Shield logs.",
            "Security: Hardened rules and restricted access to system history.",
            "UI: Simplified Settings page and refined Login/Auth layouts.",
            "Navigation: Standardized routes and improved internal linking.",
            "Performance: Cleaned up legacy dependencies to optimize bundle size.",
            "I18n: Global synchronization of translation keys."
        ]
    },
    {
        version: 'v3.8',
        date: '02 Avril 2026',
        title: 'Image & SEO Optimization',
        description: 'Migration massive vers OptimizedImage, refonte du handler SEO et amélioration du flux social.',
        changes: [
            'Tech : Migration complète de toutes les balises <img> vers le composant custom OptimizedImage.',
            'Tech : Intégration de wsrv.nl comme proxy d\'image par défaut pour une meilleure fiabilité.',
            'OptimizedImage : Support des props priority (chargement impatient) et fill (gestion du ratio).',
            'SEO : Sécurisation du handler Cloud Function pour bloquer l\'accès aux fichiers statiques.',
            'SEO : Mise à jour de la Permissions-Policy pour inclure browsing-topics.',
            'Social : Nouveau design "Manga Grid" pour le flux d\'activité des amis.',
            'Social : Intégration d\'icônes personnalisées pour Discord et TikTok dans toute l\'app.',
            'Gamification : Refonte de la synchronisation de l\'XP pour garantir l\'intégrité des données au chargement.',
            'UI : Suppression définitive des skeletons de chargement d\'images au profit d\'un fade-in natif.'
        ]
    },
    {
        version: 'v3.7',
        date: '17 Mars 2026',
        title: 'Survey & Dashboard Revolution',
        description: 'Refonte complète du questionnaire, tableau de bord admin et intégration sociale.',
        changes: [
            'Survey : UX repensée avec affichage séquentiel et auto-scroll fluide.',
            'Admin : Nouveau Dashboard avec cards de statistiques (Total, Waitlist, Intérêt).',
            'Admin : Visualisation enrichie via graphiques Donuts et meilleure lisibilité des données brutes.',
            'Social : Intégration complète d\'Instagram et TikTok (Footer + Survey).',
            'I18n : Ajout d\'un sélecteur de langue dynamique sur le formulaire.',
            'Security : Mise à jour des règles Firestore pour sécuriser les réponses.',
            'Fix : Correction du lien Discord officiel sur toute la plateforme.',
            'Fix : Résolution de la boucle de redirection infinie sur les URLs localisées.',
            'I18n : Correction des clés de traduction pour le Dashboard Admin et le Questionnaire.'
        ]
    },
    {
        version: 'v3.6',
        date: '07 Mars 2026',
        title: 'Anime News & Security Update',
        description: 'Flux d\'actus complet, optimisations scraper et corrections de sécurité majeures.',
        changes: [
            'News : Nouvelle section dédiée avec SEO optimisé et sommaire auto.',
            'Scraper : Parallélisation du fetch et formatage intelligent pour Crunchyroll/ANN.',
            'Security : Résolution de 100% des vulnérabilités critiques via overrides.',
            'UI : Amélioration de la visibilité du bouton retour en haut.',
            'Automation : Passage à un cycle de mise à jour toutes les 4 heures.'
        ]
    },
    {
        version: 'v3.5',
        date: '13 Février 2026',
        title: 'Visual Assets & Core Sync',
        description: 'Introduction des mockups haute fidélité et synchronisation administrative.',
        changes: [
            'Assets : Bibliothèque complète de mockups CSS (Discover, Library, Social, Auth).',
            'Admin : Synchronisation en temps réel des profils pour accès immédiat.',
            'Auth : Accès sécurisé à la page de connexion pendant la maintenance.',
            'Core : Nettoyage des scripts de déploiement et optimisation de la logique de maintenance.'
        ]
    },
    {
        version: 'v3.3',
        date: '24 Janvier 2026',
        title: 'Library & NSFW Update',
        description: 'Import MAL, Gestion des dossiers, Mode NSFW et corrections de gamification.',
        changes: [
            'Library : Import MyAnimeList et gestion avancée des dossiers.',
            'Settings : Nouveau mode NSFW et bascule API.',
            'Profile : Suppression des favoris et recalcul d\'XP.',
            'UI : Amélioration du tutoriel avec visuels réels.',
            'WorkDetails : Pagination avancée et retour en haut de page.',
            'Fix : Recalcul d\'XP, redirections de notifications et règles de sécurité.'
        ]
    },
    {
        version: 'v3.2',
        date: '17 Janvier 2026',
        title: 'Dark Mode Complet',
        description: 'Refonte massive du thème sombre pour une expérience visuelle optimale.',
        changes: [
            'Theme : Refactorisation de 100+ couleurs hardcodées vers des variables CSS.',
            'WorkDetails : Corrections complètes (Comments, Reviews, Gallery, Themes, Casting).',
            'Header : Menu mobile hamburger entièrement compatible Dark Mode.',
            'Pages : Dashboard, Library, Discover, Schedule, Feedback, Profile, Settings.',
            'Tokens : Nouvelles variables --color-text-inverse, --color-border-heavy, --color-shadow-solid.',
            'UI : Contrastes améliorés sur tous les composants et sections.'
        ]
    },
    {
        version: 'v3.1',
        date: '16 Janvier 2026',
        title: 'SEO & Global I18n Fix',
        description: 'Amélioration massive du SEO et correction globale du système de traduction.',
        changes: [
            'SEO : Intégration du composant SEO sur les pages Détails (Animes, Persos, Staff).',
            'I18n : Restructuration complète des namespaces pour une meilleure résolution des clés.',
            'I18n : Traduction intégrale de la fiche Personne (PersonDetails).',
            'Fix : Correction des clés de thèmes (Openings/Endings) et des titres de chargement.',
            'Git : Migration vers origin/main avec déploiement automatique.'
        ]
    },
    {
        version: 'v3.0',
        date: '14 Janvier 2026',
        title: 'Data Shield & Support',
        description: 'Une mise à jour critique pour la protection de vos données et le support du projet.',
        changes: [
            'Fix Critique : Système de protection des données (Anti-reset pour niveau/XP).',
            'Nouveau : Section "Tips for Devs" avec intégration Ko-fi.',
            'Tech : Backups automatiques et fusion intelligente des données cloud/local.',
            'UI : Amélioration visuelle des boutons de support sur l\'accueil et le footer.'
        ]
    },
    {
        version: 'v2.9',
        date: '03 Janvier 2026',
        title: 'Trailer & UI Polish',
        description: 'Correction critique du lecteur de bande-annonce et optimisation de l\'interface.',
        changes: [
            'Fix : Le bouton "Fermer" du trailer est maintenant toujours visible (Z-Index fix).',
            'Tech : Utilisation de React Portals pour les modales plein écran.',
            'UI : Amélioration du contraste des boutons d\'interaction.'
        ]
    },
    {
        version: 'v2.8',
        date: '03 Janvier 2026',
        title: 'Showcase & Accessibilité',
        description: 'Mise en avant des détails d\'œuvres et ouverture au public.',
        changes: [
            'Nouveau : Section "Tout Savoir" sur la Landing Page (Showcase Brutalist)',
            'Accessibilité : Agenda et Changelog désormais accessibles aux invités',
            'Nouveau : Page Crédits et mentions légales',
            'UI : Harmonisation des visuels Jujutsu Kaisen sur le showcase'
        ]
    },
    {
        version: 'v2.7',
        date: '03 Janvier 2026',
        title: 'Personnages et Seiyuu',
        description: 'Explorez les fiches détaillées des personnages et doubleurs avec un style wiki.',
        changes: [
            'Nouveau : Pages dédiées Personnages avec fiche wiki (Age, Clan, Kekkei Genkai, etc.)',
            'Nouveau : Pages dédiées Seiyuu avec infos structurées (Twitter, Birthplace, etc.)',
            'Navigation : Cliquez sur les personnages/seiyuu depuis le casting',
            'UI : Logos des services de streaming (Crunchyroll, Netflix, ADN, etc.)',
            'UI : Univers Étendu collapsible avec cartes adaptatives',
            'Responsive : Amélioration mobile des pages Feedback et WorkDetails',
        ]
    },
    {
        version: 'v2.6',
        date: '03 Janvier 2026',
        title: 'Community Voices & Discovery',
        description: 'Intégration des avis communautaires et amélioration de la recherche.',
        changes: [
            'Nouveau : Onglet "Avis" sur les fiches (Intégration MyAnimeList)',
            'Nouveau : Filtre par Studio dans la recherche avancée',
            'UI : Refonte brutalist de l\'écran de chargement',
            'UI : Amélioration de la grille des avis et des filtres de recherche',
        ]
    },
    {
        version: "v2.5",
        date: "03 Janvier 2026",
        title: "Suivi Hebdomadaire",
        description: "Ne ratez plus jamais un épisode grâce au nouveau Calendrier de Sorties.",
        changes: [
            "Nouvel Agenda : Visualisez les sorties d'animes jour par jour.",
            "Accès rapide via le Header (Icône Calendrier).",
            "Mise à jour des boutons de streaming pour plus de clarté.",
            "Indication des heures de diffusion sur les cartes d'agenda."
        ]
    },
    {
        version: "v2.4",
        date: "03 Janvier 2026",
        title: "Profondeur de Données",
        description: "Une immersion totale avec les détails du casting et les statistiques de la communauté.",
        changes: [
            "Casting Enrichi : Découvrez les Seiyuu (doubleurs) originaux sous chaque personnage.",
            "Statistiques : Visualisez la popularité et la répartition des notes de l'œuvre.",
            "Visualisation Brutaliste : Nouveaux graphiques pour les scores et le statut de visionnage.",
            "Optimisation de la structure de la page Détails."
        ]
    },
    {
        version: "v2.3",
        date: "03 Janvier 2026",
        title: "Discovery & Immersion",
        description: "Enrichissement visuel et découverte de nouvelles pépites.",
        changes: [
            "Nouvel onglet 'Galerie' : Explorez les artworks officiels en haute qualité.",
            "Section 'Vous Aimerez Aussi' : Recommandations basées sur les votes de la communauté.",
            "Intégration d'une modale 'Click-to-Zoom' pour les images.",
            "Amélioration UX : Stop de l'autoplay vidéo et optimisation des grilles.",
            "Nouvel onglet 'MUSIQUES' : Écoutez tous les openings et endings avec recherche YouTube intégrée."
        ]
    },
    {
        version: "v2.2",
        date: "03 Janvier 2026",
        title: "Deep Dive Update",
        description: "Plongez au cœur de vos œuvres préférées avec le Casting et l'Univers Étendu.",
        changes: [
            "Ajout de la section 'Casting' : Les 10 personnages principaux en un coup d'œil.",
            "Ajout de la section 'Univers Étendu' : Navigation facile entre préquels, suites et side-stories.",
            "Nouveau style de scroll horizontal 'Invisible' pour une esthétique ultra-clean.",
            "Optimisation des performances API (Chargement parallèle des détails)."
        ]
    },
    {
        version: "v2.1",
        date: "03 Janvier 2026",
        title: "L'Ère des Détails",
        description: "Une mise à jour majeure pour enrichir les fiches d'anime et de manga avec des informations détaillées et interactives.",
        changes: [
            "Ajout des bandes-annonces (trailers) directement sur la page de détails.",
            "Nouvelles informations : Studios, Rang, Popularité, Saison et Année.",
            "Nouvelle page Changelog pour suivre l'historique des mises à jour.",
            "Amélioration de la synchronisation des données API vs Bibliothèque."
        ]
    },
    {
        version: "v1.5",
        date: "19 Décembre 2025",
        title: "Optimisation Mobile & Social",
        description: "Focus sur l'expérience mobile et la stabilité des fonctionnalités sociales.",
        changes: [
            "Refonte complète de l'affichage Social sur mobile (CSS Grid & Layout compact).",
            "Correction des problèmes d'affichage des graphiques et classements.",
            "Optimisation des permissions Firestore pour les fonctionnalités communautaires.",
            "Résolution des doublons dans la page Découvrir."
        ]
    },
    {
        version: "v1.4",
        date: "18 Décembre 2025",
        title: "Mobile First & Stabilité",
        description: "Améliorations cruciales pour la navigation sur petits écrans.",
        changes: [
            "Amélioration globale de la responsivité 'Bingeki Style' sur mobile.",
            "Correction des problèmes de redimensionnement des graphiques.",
            "Injecton correcte des IDs utilisateurs dans les profils."
        ]
    },
    {
        version: "v1.3",
        date: "17 Décembre 2025",
        title: "Community & Feedback",
        description: "Introduction des fonctionnalités communautaires avancées et gestion des retours.",
        changes: [
            "Système de commentaires avancé avec réponses imbriquées et mentions.",
            "Nouvelle page Feedback et interface d'administration.",
            "Ajout du Rang spécial 'Niveau 100'.",
            "Sécurisation renforcée des données utilisateurs (Règles Firestore).",
            "Style Brutalist appliqué aux zones de texte et interactions."
        ]
    },
    {
        version: "v1.2",
        date: "17 Décembre 2025",
        title: "Profile 2.0 & Gamification",
        description: "Une refonte majeure de l'identité utilisateur et du système de progression.",
        changes: [
            "Nouveau Profil : Graphique de Nen, Top 3 Favoris et Badges Holographiques.",
            "Système d'invitation aux Défis et contrôles de Watch Party.",
            "Amélioration de la gestion des bannières de profil (Support URL).",
            "Mise à jour de la logique d'XP et de progression.",
            "Filtre de contenu 'SFW' activé par défaut sur l'API."
        ]
    },
    {
        version: "v1.1",
        date: "17 Décembre 2025",
        title: "Discover & UI Polish",
        description: "Amélioration de la découverte de contenu et harmonisation visuelle.",
        changes: [
            "Nouvelle interface 'Discover' avec section Hero immersive.",
            "Filtres par genre fonctionnels via l'API.",
            "Harmonisation des boutons et cartes avec le thème Manga/Brutalist.",
            "Correction des styles de la bibliothèque (boutons, icônes stats)."
        ]
    }
];
