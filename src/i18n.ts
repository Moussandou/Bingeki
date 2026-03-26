import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    fr: {
        translation: {
            seo: {
                default_description: "Transformez votre passion manga en quête RPG ! Suivez vos lectures, gagnez de l'XP, débloquez des badges et affrontez vos amis.",
            },
            header: {

                dashboard: "Q.G.",
                library: "BIBLIOTHÈQUE",
                agenda: "AGENDA",
                community: "COMMUNAUTÉ",
                news: "NOUVEAUTÉS",
                tierlist: "TIER LISTS",
                login: "CONNEXION",
                search_placeholder: "Rechercher...",
                discover: "DÉCOUVRIR",
                changelog: "CHANGELOG",
                profile: "Mon Profil",
                settings: "Paramètres",
                logout: "Déconnexion",
                feedback: "Donner un avis",
                more: "PLUS",
                title: "AIDE & CHANGELOG",
                version: "Version {{version}}",
                see_changelog: "Voir le changelog",
                report_bug: "Signaler un bug",
                notifications: "Notifications",
                lens: "ANIME LENS"
            },
            lens: {
                title: "ANIME LENS",
                subtitle: "Retrouvez n'importe quel anime à partir d'une capture d'écran d'épisode",
                drop_zone: "Glissez une capture d'écran d'anime ici ou cliquez pour uploader",
                camera: "Prendre une photo",
                or: "ou",
                search: "Identifier",
                searching: "Recherche en cours...",
                no_results: "Aucun résultat trouvé. Essayez avec une capture d'écran directe d'un épisode d'anime.",
                similarity: "{{score}}%",
                episode: "Épisode {{ep}}",
                timestamp: "à {{time}}",
                add_to_library: "Ajouter",
                view_details: "Voir les détails",
                search_discover: "Chercher dans Découvrir",
                error: "Une erreur est survenue. Veuillez réessayer.",
                file_too_large: "L'image doit faire moins de 10 Mo",
                result_count: "{{count}} résultat(s) trouvé(s)",
                match: "correspondance"
            },
            pwa: {
                install_app: "Installer l'App",
                install_app_promo: "TÉLÉCHARGER L'APP",
                install_modal: {
                    title: "INSTALLER L'APP",
                    description: "Installez l'application pour un accès rapide et hors ligne.",
                    ios_step1: "Appuyez sur le bouton Partager",
                    ios_step2: "Sélectionnez 'Sur l'écran d'accueil'",
                    android_step1: "Ouvrez le menu du navigateur",
                    android_step2: "Appuyez sur 'Installer l'application'"
                }
            },
            roles: {
                admin: "ADMIN",
                creator: "CRÉATEUR"
            },
            landing: {
                hero: {
                    title: "VOTRE HISTOIRE<br />COMMENCE",
                    subtitle: "Ne soyez plus un simple spectateur. Devenez le protagoniste.",
                    cta: "COMMENCER L'AVENTURE",
                    cta_logged_in: "ACCÉDER AU Q.G."

                },
                features: {
                    qg: {
                        title: "LE Q.G.",
                        description_1: "Organisez votre vidéothèque comme un stratège.",
                        description_2: "Séparez vos lectures en cours, vos pauses, et vos archives. Ne perdez plus jamais le fil de vos intrigues favorites.",
                        check_chapters: "CHAPITRES",
                        check_episodes: "ÉPISODES",
                        check_volumes: "TOMES"
                    },
                    progression: {
                        title: "PROGRESSION",
                        description_1: "Chaque chapitre lu vous rend plus fort.",
                        description_2: "Gagnez de l'XP en mettant à jour votre liste. Débloquez des <strong>Badges Holographiques</strong> et grimpez les rangs de la Hunter Society.",
                        stats_title: "STATISTIQUES DÉTAILLÉES"
                    },
                    exploration: {
                        title: "EXPLORATION",
                        description_1: "Une base de données infinie à portée de main.",
                        description_2: "Recherchez parmis des milliers d'Anime et Manga. Filtrez par genre, score, ou popularité. Trouvez votre prochaine addiction en quelques secondes.",
                        search_placeholder: "Rechercher un anime, un manga...",
                        genres: {
                            seinen: "Seinen",
                            shonen: "Shonen",
                            romance: "Romance",
                            horror: "Horreur",
                            isekai: "Isekai"
                        }
                    },
                    community: {
                        title: "COMMUNAUTÉ",
                        description_1: "Vous n'êtes pas seul dans ce monde.",
                        description_2: "Suivez l'activité de vos amis. Partagez vos avis sans spoil. Comparez vos collections et vos badges.",
                        friends: "AMIS",
                        debates: "DÉBATS",
                        share: "PARTAGE",
                        see_discussion: "VOIR LA DISCUSSION",
                        comments: {
                            levi: "Ce chapitre était incroyable !! 🔥",
                            armin: "Je ne m'attendais pas à ça...",
                            mikasa: "Eren..."
                        }
                    },
                    details: {
                        title: "TOUT SAVOIR",
                        description_1: "Plongez au cœur de vos œuvres.",
                        description_2: "Synopsis, staff, statistiques détaillées, personnages... Accédez à une fiche d'identité complète pour chaque Anime et Manga. Ne ratez aucun détail.",
                        mock_card: {
                            general: "GÉNÉRAL",
                            chapters: "CHAPITRES",
                            stats: "STATS",
                            reviews: "AVIS",
                            manga: "MANGA",
                            ongoing: "EN COURS",
                            view_full: "VOIR LA FICHE COMPLÈTE",
                            synopsis: "Pour sauver ses amis, Yuji Itadori avale un doigt maudit et partage désormais son corps avec Ryomen Sukuna, le plus puissant des fléaux."
                        }
                    },
                    wip: {
                        title: "WORK IN PROGRESS",
                        description_1: "Bingeki est vivant. Il évolue.",
                        description_2: "Je construis cette plateforme avec vous. Suivez chaque mise à jour, suggérez des fonctionnalités, et voyez vos idées prendre vie.",
                        roadmap_btn: "VOIR LA ROADMAP",
                        timeline: {
                            feedback_title: "Feedback & Changelog 2.0",
                            feedback_desc: "Refonte complète du système de feedback et de l'affichage des mises à jour.",
                            guilds_title: "Système de \"Guildes\"",
                            guilds_desc: "Créez votre propre clan, participez à des guerres de guildes et dominez le classement.",
                            soon: "SOON"
                        }
                    },
                    support: {
                        sfx: "MECÈNE",
                        tag: "TIPS FOR DEVS",
                        title: "SOUTENEZ LE PROJET",
                        description_1: "Bingeki est développé avec ❤️ en open-source",
                        description_2: "Si Bingeki enrichit votre expérience manga/anime, aidez à financer le développement de nouvelles fonctionnalités. Chaque café compte ! ☕",
                        features: "Nouvelles features",
                        servers: "Serveurs performants",
                        premium: "Support premium",
                        kofi_alt: "Support me on Ko-fi"
                    },
                    mobile: {
                        title: "BINGEKI DANS VOTRE POCHE",
                        description_1: "Emportez votre collection partout. Une expérience fluide, rapide et conçue pour le mobile.",
                        feature_1: "Installable (PWA)",
                        feature_2: "Mode Hors-ligne",
                        feature_3: "Notifications Push (Bientôt)",
                        scan_qr: "Scannez pour installer"
                    },
                    final_cta: {
                        title: "REJOIGNEZ L'ÉLITE",
                        title_logged_in: "PRÊT À REPRENDRE ?",
                        button: "CRÉER MON COMPTE",
                        button_logged_in: "ACCÉDER AU Q.G."
                    }
                }
            },
            content_list: {
                no_content: "Aucun contenu disponible.",
                unknown_date: "Date inconnue",
                watch_on_crunchyroll: "Regarder sur Crunchyroll",
                watch_on_adn: "Regarder sur ADN",
                search_streaming: "Rechercher Streaming VOSTFR",
                search_scan: "Rechercher Scan FR",
                seen: "VU",
                see: "VOIR",
                loading_summary: "Chargement du résumé...",
                no_summary: "Aucun résumé disponible.",
                show_more: "AFFICHER PLUS",
                previous: "Précédent",
                next: "Suivant",
                page: "PAGE"
            },
            hunter_license: {
                title: "HUNTER LICENSE",
                top_3: "Top 3 Favoris",
                favorite: "FAVORI",
                id_prefix: "ID",
                logout: "DECONNEXION"
            },
            watch_parties: {
                title: "WATCH PARTIES",
                new_party: "NOUVELLE PARTY",
                login_required: "Connectez-vous pour créer des Watch Parties",
                loading: "Chargement...",
                no_parties: "Aucune party en cours",
                no_parties_desc: "Crée une party et regarde/lis avec tes amis !",
                episode: "Épisode",
                chapter: "Chapitre",
                participant: "participant",
                participants: "participants",
                end_party: "Terminer",
                leave_party: "Quitter",
                host: "Hôte",
                choose_work: "Choisir une œuvre",
                add_work_first: "Ajoutez d'abord une œuvre à votre bibliothèque",
                party_name: "Nom de la party (optionnel)",
                party_name_placeholder: "Ex: Marathon One Piece",
                invite_friends: "Inviter des amis",
                no_friends: "Vous n'avez pas encore d'amis",
                cancel: "Annuler",
                create_party: "Créer la party",
                party_created: "Party créée !",
                party_ended: "Party terminée",
                left_party: "Vous avez quitté la party",
                episode_advanced: "Épisode avancé !",
                select_work: "Sélectionnez une œuvre"
            },
            common: {
                loading: "Chargement...",
                error: "Erreur",
                success: "Succès",
                cancel: "Annuler",
                confirm: "Confirmer",
                save: "Enregistrer",
                delete: "Supprimer",
                edit: "Modifier",
                add: "Ajouter",
                remove: "Retirer",
                back: "Retour",
                next: "Suivant",
                previous: "Précédent",
                first_page: "Première page",
                last_page: "Dernière page",
                go_to_page: "Aller à la page",
                back_to_top: "Remonter en haut",
                search: "Rechercher",
                no_results: "Aucun résultat",
                see_more: "Voir plus",
                show_more: "Afficher plus",
                close: "Fermer",
                yes: "Oui",
                no: "Non",
                access_denied: "Accès refusé",
                no_notifications: "Aucune notification",
                view_all: "Tout voir",
                finish: "Terminer",
                skip: "Passer",
                prev: "Précédent",
                mark_all_read: "Tout marquer comme lu",
                view_details: "Voir détails",
                unknown: "Inconnu",
                continue: "Continuer"
            },
            tierlist: {
                characters: "PERSONNAGES",
                by_name: "Par Nom",
                by_anime: "Par Anime",
                search_name: "Rechercher un nom...",
                search_anime: "Rechercher un anime...",
                no_characters: "Aucun personnage trouvé.",
                no_anime: "Aucun anime trouvé.",
                load_error: "Échec du chargement de la tier list",
                export_success: "Image téléchargée !",
                export_error: "Échec de la génération de l'image",
                duplicate_character: "Ce personnage est déjà dans la tier list !",
                save_success: "Tier list sauvegardée !",
                save_error: "Erreur lors de la sauvegarde"
            },
            stats: {
                level: "Niveau",
                xp: "EXPÉRIENCE",
                passion: "Passion",
                diligence: "Assiduité",
                collection: "Collection",
                reading: "Lecture",
                completion: "Complétion",
                streak: "Jours Streak",
                badges: "Badges",
                chart_title: "GRAPH DU CHASSEUR",
                legend: {
                    title: "CALCUL DES STATS",
                    level: "Level × 2 (max 100)",
                    passion: "XP ÷ 100 (max 100)",
                    diligence: "Jours de streak (max 100)",
                    collection: "Œuvres ÷ 2 (max 100)",
                    reading: "Chapitres ÷ 10 (max 100)",
                    completion: "Complétés × 5 (max 100)"
                }
            },
            footer: {
                tbc: "TO BE CONTINUED",
                feedback: "DONNER MON AVIS",
                copyright: "Bingeki Experience.",
                changelog: "CHANGELOG",
                legal: "MENTIONS LÉGALES & RGPD",
                privacy: "CONFIDENTIALITÉ",
                terms: "CGU",
                contact: "CONTACT",
                about: "À PROPOS",
                credits: "CRÉDITS",
                wiki: "WIKI",
                contribution_msg: "Chaque contribution aide à ajouter de nouvelles fonctionnalités !",
                donors: "DONATEURS"
            },
            donors: {
                title: "NOS HÉROS",
                subtitle: "Un immense merci à ceux qui soutiennent le projet financièrement.",
                top_donor: "TOP DONATEUR",
                rank_1: "LE ROI DU SUPPORT",
                creator_desc: "Créateur de Inazuma DB",
                amount: "Don total",
                thank_you_title: "MERCI !",
                thank_you_desc: "Grâce à vous, Bingeki continue de grandir. Serveurs, domaine, nouvelles features... tout ça, c'est grâce à votre générosité.",
                become_donor: "DEVENIR DONATEUR"
            },
            tutorial: {
                welcome_title: "Bienvenue dans la Hunter Society",
                welcome_desc: "Bingeki est votre tracker de manga ultime. Faisons un tour rapide.",
                profile_title: "Votre Profil & Nen",
                profile_desc: "Ici vous pouvez voir votre XP, Niveau, et votre carte de Nen unique basée sur vos lectures.",
                discover_title: "Découvrir & Rechercher",
                discover_desc: "Trouvez facilement de nouveaux mangas et animes à ajouter à votre collection.",
                library_title: "Votre Bibliothèque",
                library_desc: "Toutes vos œuvres suivies sont ici. Mettez-les à jour au fur et à mesure.",
                import_title: "Importation facile",
                import_desc: "Déjà une liste sur MyAnimeList ? Importez-la en un clic et récupérez tout votre historique."
            },
            dashboard: {
                title: "TABLEAU DE BORD",
                rank: "RANK",
                hero_default: "Héros",
                discover_btn: "Découvrir",
                profile_btn: "PROFIL",
                goal: "Objectif",
                weekly: "Hebdo",
                chapters_read: "chapitres lus",
                streak: "Série",
                days: "jours",
                chapter: "Chapitre",
                continue_reading: "Continuer la lecture",
                in_progress: "En cours",
                see_all: "TOUT VOIR",
                no_reading: "Aucune lecture en cours",
                discover: "DÉCOUVRIR",
                friends_activity: "Activité amis",
                loading: "Chargement...",
                no_activity: "Pas encore d'activité",
                add_friends: "Ajouter des amis",
                see_all_activity: "VOIR TOUTE L'ACTIVITÉ",
                to_discover: "À DÉCOUVRIR",
                see_more_suggestions: "VOIR PLUS DE SUGGESTIONS",
                just_now: "À l'instant",
                hours_ago: "Il y a {{hours}}h",
                days_ago: "Il y a {{days}}j",
                community_title: "REJOIGNEZ LA COMMUNAUTÉ",
                community_subtitle: "Suivez nos aventures et partagez votre passion sur nos réseaux officiels.",
                community_discord: "REJOINDRE LE DISCORD",
                community_instagram: "NOUS SUIVRE SUR INSTA",
                community_tiktok: "VOIR NOS TIKTOKS",
                community_discord_desc: "Echange avec d'autres fans et l'équipe",
                community_instagram_desc: "News, concours et coulisses",
                community_tiktok_desc: "Edits, news et fun"
            },
            activity_labels: {
                watch: "a regardé",
                read: "a lu",
                complete: "a terminé",
                add_work: "a ajouté",
                level_up: "est passé au niveau",
                badge: "a débloqué le badge"
            },
            library: {
                title: "Ma Bibliothèque",
                friend_title: "Bibliothèque de {{name}}",
                read_only: "Affichage en lecture seule (pas de modification)",
                load_error: "Impossible de charger la bibliothèque",

                total: "Total",
                completed: "Terminées",
                progression: "Progression",
                add_work: "AJOUTER UNE ŒUVRE",
                search: "Rechercher...",
                filters: "FILTRES",
                type: "TYPE",
                all: "TOUS",
                status: "STATUT",
                sort: {
                    recent: "Récents",
                    added: "Ajoutés",
                    alphabetical: "A-Z",
                    progress: "Progression"
                },
                view_grid: "Vue Grille",
                view_list: "Vue Liste",
                export: "Exporter",
                import: "Importer",
                select: "SÉLECTIONNER",
                cancel: "ANNULER",
                delete_selected: "SUPPRIMER",
                delete_confirm: "Supprimer {{count}} œuvres ?",
                deleted_success: "{{count}} œuvres supprimées",
                deleted_single: "\"{{title}}\" a été supprimé",
                data_imported: "Données importées !",
                error: "Erreur",
                no_works: "Aucune œuvre trouvée",
                delete_title: "SUPPRESSION",
                delete_question: "Supprimer \"{{title}}\" ?",
                delete_warning: "Cette action est irréversible. Votre progression et vos notes seront perdues.",
                delete_btn: "SUPPRIMER",
                delete_work: "Supprimer l'oeuvre",
                episode: "Ep.",
                chapter: "Ch."
            },
            auth: {
                back: "RETOUR",
                hero_title: "VOTRE<br />AVENTURE<br />COMMENCE",
                hero_subtitle: "Rejoignez Bingeki pour transformer votre passion manga en une véritable quête RPG.",
                feature_rpg: "Suivi RPG",
                feature_progression: "Progression",
                welcome_back: "BON RETOUR !",
                create_account: "CRÉER UN COMPTE",
                resume_progress: "Reprenez votre progression",
                start_legend: "Commencez votre légende",
                placeholder_pseudo: "Pseudo",
                placeholder_email: "Email",
                placeholder_password: "Mot de passe",
                login_title: "CONNEXION",
                register_title: "INSCRIPTION",
                login_required: "Connexion requise",
                login_btn: "SE CONNECTER",
                register_btn: "S'INSCRIRE",
                or: "OU",
                google_login: "CONTINUER AVEC GOOGLE",
                discord_login: "CONTINUER AVEC DISCORD",
                no_account: "Pas encore de compte ? S'inscrire",
                has_account: "Déjà un compte ? Se connecter",
                error_pseudo: "Veuillez entrer un pseudo",
                error_generic: "Une erreur est survenue",
                mobile_title: "VOTRE AVENTURE",
                mobile_subtitle: "Suivez vos mangas, gagnez de l'XP et défiez vos amis.",
                choose_pseudo_title: "CHOISISSEZ VOTRE PSEUDO",
                choose_pseudo_desc: "Pour une meilleure expérience, choisissez un pseudo unique qui vous représentera dans la communauté.",
                save_pseudo: "CONFIRMER MON PSEUDO",
                error_pseudo_short: "Le pseudo doit faire au moins 3 caractères",
                error_pseudo_taken: "Ce pseudo est déjà utilisé",
            },
            feedback: {
                success_icon: "💌",
                success_title: "MERCI !",
                success_message: "Votre avis a bien été reçu. C'est grâce à vous que Bingeki s'améliore !",
                back_home: "Retour à l'accueil",
                title: "AIDEZ-NOUS À PROGRESSER",
                subtitle_1: "Bug trouvé ? Idée de génie ? Ou juste envie de dire bonjour ?",
                subtitle_2: "Votre avis compte énormément pour l'évolution de la plateforme.",
                rating_label: "Votre Note Globale",
                category_label: "C'est à propos de quoi ?",
                category_bug: "UN BUG",
                category_feature: "UNE IDÉE",
                category_general: "GÉNÉRAL",
                message_label: "Votre Message",
                message_placeholder: "Dites-nous tout...",
                email_label: "Email (Optionnel)",
                email_placeholder: "Pour vous recontacter si besoin...",
                submit_sending: "ENVOI...",
                submit_btn: "ENVOYER MON AVIS",
                toast_select_rating: "Veuillez sélectionner une note",
                toast_write_message: "Veuillez écrire un message",
                toast_success: "Merci pour votre retour !",
                toast_error: "Erreur lors de l'envoi. Réessayez.",
                toast_unexpected: "Erreur inattendue.",
                error_permission: "Permission refusée.",
                error_loading_detail: "Impossible de charger les détails.",
                // Enhanced fields
                priority_label: "Priorité",
                priority_low: "FAIBLE",
                priority_medium: "MOYENNE",
                priority_high: "HAUTE",
                priority_critical: "CRITIQUE",
                status_open: "Ouvert",
                status_in_progress: "En cours",
                status_resolved: "Résolu",
                status_closed: "Fermé",
                attachments_label: "Captures d'écran (max 3)",
                attachments_hint: "Glissez-déposez ou cliquez pour ajouter",
                my_tickets: "Mes Tickets",
                no_tickets: "Vous n'avez pas encore envoyé de feedback.",
                ticket_id: "Ticket #",
                last_updated: "Mis à jour",
                admin_reply: "Réponse Admin",
                your_message: "Votre Message",
                view_details: "Voir Détails",
                submit_another: "Envoyer un autre avis"
            },
            components: {
                add_work_modal: {
                    title: "RECRUTER UNE ŒUVRE",
                    tab_search: "Recherche",
                    tab_manual: "Manuel",
                    search_placeholder: "Rechercher (ex: Naruto, Berserk...)",
                    no_results: "Aucune trace détectée...",
                    search_hint: "TAPEZ UN NOM POUR LANCER LA TRAQUE",
                    label_title: "TITRE",
                    title_placeholder: "Titre de l'œuvre...",
                    label_type: "TYPE",
                    label_chapters: "CHAPITRES",
                    label_episodes: "ÉPISODES",
                    total_placeholder: "Total...",
                    label_image: "IMAGE (OPTIONNEL)",
                    drag_and_drop: "Glissez une image ou cliquez pour upload",
                    or_paste_url: "Ou collez une URL ci-dessous",
                    url_placeholder: "Ou URL de l'image...",
                    add_work: "AJOUTER L'ŒUVRE",
                    chapters_abbr: "Chaps",
                    episodes_abbr: "Éps"
                },
                challenges_section: {
                    title: "MES DÉFIS",
                    types: {
                        race_to_finish: "Course à la fin",
                        most_chapters: "Plus de chapitres",
                        streak_battle: "Battle de Streak"
                    },
                    new_challenge: "NOUVEAU DÉFI",
                    loading: "Chargement...",
                    no_challenges: "Aucun défi en cours",
                    no_challenges_hint: "Créez un défi et affrontez vos amis !",
                    login_required: "Connectez-vous pour voir vos défis",
                    status_active: "En cours",
                    status_pending: "En attente",
                    status_completed: "Terminé",
                    you: "(Vous)",
                    days: "jours",
                    chapters_abbr: "ch.",
                    accept: "Accepter",
                    decline: "Refuser",
                    cancel: "Annuler",
                    modal_title: "NOUVEAU DÉFI",
                    challenge_name: "Nom du défi",
                    challenge_name_placeholder: "Ex: Qui finira One Piece en premier ?",
                    challenge_type: "Type de défi",
                    challenge_work: "Œuvre du défi",
                    add_works_hint: "Ajoutez des œuvres à votre bibliothèque",
                    invite_friends: "Inviter des amis",
                    selected: "sélectionnés",
                    no_friends: "Vous n'avez pas encore d'amis",
                    cancel_btn: "Annuler",
                    create_btn: "Créer le défi",
                    toast_fill_fields: "Remplissez tous les champs et sélectionnez des amis",
                    toast_created: "Défi créé !",
                    toast_accepted: "Défi accepté !",
                    toast_declined: "Défi refusé",
                    toast_cancelled: "Défi annulé"
                },
                progress_button: {
                    completed: "Terminé"
                },
                xp_bar: {
                    level: "NIV"
                }
            },
            challenges: {
                title: "DÉFIS (En construction)",
                description: "Cette page est en cours de développement."
            },
            schedule: {
                title: "CALENDRIER DES SORTIES",
                subtitle: "Ne ratez jamais un épisode ! Les horaires sont basés sur la diffusion japonaise.",
                days: {
                    monday: "Lundi",
                    tuesday: "Mardi",
                    wednesday: "Mercredi",
                    thursday: "Jeudi",
                    friday: "Vendredi",
                    saturday: "Samedi",
                    sunday: "Dimanche"
                },
                unknown_time: "Heure inconnue",
                no_anime: "Aucun anime trouvé pour ce jour... C'est calme ! 🍃"
            },
            discover: {
                title: "DÉCOUVRIR",
                guest_banner: {
                    title: "Créez un compte pour débloquer toutes les fonctionnalités !",
                    subtitle: "Bibliothèque personnelle, suivi de progression, badges, classements et plus encore...",
                    cta: "S'inscrire gratuitement"
                },
                hero: {
                    featured: "A LA UNE",
                    add_to_list: "AJOUTER À MA LISTE",
                    more_details: "PLUS DE DÉTAILS"
                },
                search: {
                    placeholder: "Rechercher un anime, un manga...",
                    results_title: "Résultats de la recherche",
                    no_results: "Aucun résultat trouvé. Essayez de relâcher les filtres !"
                },
                filters: {
                    status: "Statut",
                    all: "TOUS",
                    airing: "EN COURS",
                    complete: "TERMINÉ",
                    upcoming: "À VENIR",
                    rating: "Public",
                    all_ages: "TOUT PUBLIC",
                    teen: "ADO (PG-13)",
                    adult: "ADULTE (R-17)",
                    min_score: "Score Min",
                    year: "Année",
                    year_placeholder: "ex: 2024",
                    studio: "Studio",
                    all_studios: "TOUS LES STUDIOS",
                    reset: "Réinitialiser",
                    genre: "Genre",
                    score: "Score"
                },
                surprise: {
                    title: "En panne d'inspiration ?",
                    subtitle: "Laisse le destin choisir ta prochaine aventure.",
                    button: "SURPRENDS-MOI"
                },
                carousels: {
                    seasonal: "Anime de la Saison",
                    top_anime: "Top 10 Animes",
                    popular_manga: "Mangas Populaires",
                    top_manga: "Top 10 Mangas"
                }
            },
            social: {
                title: "SOCIAL",
                tabs: {
                    ranking: "CLASSEMENT",
                    activity: "ACTIVITÉ",
                    challenges: "DÉFIS",
                    parties: "PARTIES",
                    friends: "AMIS"
                },
                activity: {
                    title: "Activité de tes amis",
                    loading: "Chargement...",
                    no_activity: "Aucune activité récente de tes amis.",
                    add_friends_hint: "Ajoute des amis pour voir leur activité !",
                    time: {
                        less_than_hour: "Il y a moins d'une heure",
                        hours_ago: "Il y a {{hours}}h",
                        days_ago: "Il y a {{days}}j"
                    }
                },
                ranking: {
                    filter_by: "Par :",
                    xp: "XP",
                    chapters: "Chapitres",
                    streak: "Streak",
                    anonymous: "Anonyme",
                    pending: "En attente",
                    show_less: "Voir moins",
                    show_more: "Voir plus",
                    your_ranking: "Votre classement"
                },
                friends: {
                    add_title: "AJOUTER UN AMI",
                    search_placeholder: "Pseudo ou Email exact...",
                    search_btn: "CHERCHER",
                    request_sent: "DEMANDE ENVOYÉE",
                    add_btn: "AJOUTER",
                    not_found: "Aucun utilisateur trouvé avec cet email.",
                    requests_title: "DEMANDES REÇUES",
                    accept: "ACCEPTER",
                    no_friends: "Vous n'avez pas encore d'amis. Lancez une recherche !",
                    request_sent_toast: "Demande envoyée à {{name}} !",
                    request_error: "Erreur lors de l'envoi de la demande.",
                    reject_success: "Demande refusée et supprimée.",
                    reject_error: "Erreur lors du refus de la demande. Veuillez réessayer."
                }
            },
            profile: {
                seo_title: "Profil Chasseur",
                seo_description: "Consultez le profil et la progression.",
                title: "Fiche de Chasseur",
                view_library: "VOIR LA BIBLIOTHÈQUE",
                edit: "EDITER",
                guide: "GUIDE",
                back: "RETOUR",
                loading: "Chargement du profil...",
                chapters_read: "Chapitres lus",
                episodes_watched: "Épisodes vus",
                movies_watched: "Films vus",
                in_progress: "En cours",
                completed: "Terminées",
                collection: "Collection",
                badges: "Badges",
                xp_total: "XP Total",
                common_works: "{{count}} œuvre en commun",
                common_works_plural: "{{count}} œuvres en commun",
                recent_badges: "Badges Récents",
                favorite_characters: "Personnages Favoris",
                edit_modal: {
                    title: "EDITER LA LICENSE",
                    pseudo: "PSEUDO",
                    banner_label: "BANNIÈRE / GIF (Lien URL)",
                    banner_help: "Copiez l'adresse d'une image (clic droit > Copier l'adresse de l'image) et collez-la ici.",
                    banner_placeholder: "https://exemple.com/image.jpg",
                    colors: "COULEURS",
                    accent: "ACCENT",
                    background: "FOND",
                    border: "BORDURE",
                    top3: "TOP 3 FAVORIS",
                    select_favorite: "Sélectionner un favori #{{index}}",
                    featured_badge: "BADGE EN VEDETTE",
                    none: "Aucun",
                    bio: "BIO / CITATION",
                    bio_placeholder: "Une phrase qui vous définit...",
                    save: "ENREGISTRER"
                },
                guide_modal: {
                    title: "Guide du Chasseur",
                    xp_title: "EXPERIENCE (XP)",
                    xp_desc: "Gagnez de l'XP à chaque action sur Bingeki :",
                    xp_read: "Lire un chapitre :",
                    xp_add: "Ajouter une œuvre :",
                    xp_complete: "Terminer une œuvre :",
                    xp_daily: "Connexion quotidienne :",
                    streak_title: "STREAK",
                    streak_desc: "La flamme de votre passion ! 🔥 Connectez-vous chaque jour pour augmenter votre Streak.",
                    streak_warning: "Attention : si vous ratez un jour, la flamme s'éteint et retombe à 0.",
                    ranks_title: "Gagner des Rangs",
                    ranks_desc: "En accumulant de l'XP, vous montez de niveau et de rang (F -> S). Débloquez des badges uniques pour montrer vos exploits sur votre profil !"
                },
                toast: {
                    profile_updated: "Profil mis à jour avec succès !",
                    save_error: "Erreur lors de la sauvegarde : ",
                    friend_request_sent: "Demande d'ami envoyée !",
                    friend_request_error: "Erreur lors de l'envoi de la demande",
                    already_friends: "Vous êtes déjà amis"
                },
                add_favorite_character: "Ajouter un personnage favori",
                character_removed: "Personnage retiré des favoris",
                add_friend: "AJOUTER EN AMI",
                request_pending: "DEMANDE EN ATTENTE",
                friends: "AMIS",
                remove_friend: "RETIRER DES AMIS",
                share: "Partager",
                share_text: "Découvre mon profil sur Bingeki !",
                link_copied: "Lien du profil copié !",
                share_failed: "Échec du partage"
            },
            gamification: {
                level_up: "MONTÉE DE NIVEAU !",
                reached_level: "Tu as atteint le niveau {{level}}",
            },
            share: {
                share: "Partager",
                link_copied: "Lien copié !",
                enable_sharing: "Activer le partage",
                access_public: "Public (tout le monde)",
                access_friends: "Amis uniquement",
                copy_link: "Copier le lien",
                share_folder: "Partager le dossier",
                share_library: "Partager la bibliothèque",
                access_denied: "Accès refusé",
                access_denied_msg: "Ce contenu est réservé aux amis de l'utilisateur.",
                login_required: "Connexion requise pour voir ce contenu.",
                sharing_updated: "Paramètres de partage mis à jour !",
                not_shared: "Ce contenu n'est pas partagé."
            },
            maintenance: {
                title: "Maintenance en cours",
                description: "Nous améliorons Bingeki pour vous offrir une meilleure expérience. Le service sera de retour très bientôt."
            },
            settings: {
                title: "Paramètres",
                appearance: {
                    title: "APPARENCE",
                    accent_color: "Couleur d'accentuation",
                    spoiler_mode: "Mode Spoiler",
                    spoiler_enabled: "Mode Spoiler activé",
                    spoiler_disabled: "Mode Spoiler désactivé",
                    spoiler_help: "Floute les synopsis pour éviter les révélations.",
                    nsfw_mode: "Contenu sensible (NSFW)",
                    nsfw_enabled: "Contenu sensible activé",
                    nsfw_disabled: "Contenu sensible masqué",
                    nsfw_help: "Autorise l'affichage de contenu potentiellement inapproprié pour un jeune public.",
                    restart_tutorial: "Relancer le tutoriel"
                },
                colors: {
                    red: "Rouge Bingeki",
                    cyan: "Cyan Futur",
                    green: "Vert Toxique",
                    yellow: "Jaune Solaire",
                    purple: "Violet Royal"
                },
                preferences: {
                    title: "PRÉFÉRENCES",
                    reduce_motion: "Réduire les animations",
                    sound_effects: "Effets sonores (UI)",
                    notifications: "Notifications"
                },
                data: {
                    title: "GESTION DES DONNÉES",
                    storage_used: "Espace utilisé",
                    storage_local: "{{size}} MB stockés localement",
                    clear_cache: "Nettoyer Cache",
                    export_backup: "Exporter Backup",
                    import_backup: "Importer Backup",
                    recalculate_button: "Réparer les stats",
                    recalculate_success: "Statistiques recalculées avec succès !",
                    recalculate_error: "Erreur lors du recalcul des statistiques.",
                    sync_library: "Synchroniser la bibliothèque",
                    danger_zone: "Zone de danger",
                    danger_desc: "Actions irréversibles",
                    reset_all: "Reset All",
                    delete_account: "Supprimer Compte",
                    confirm_sure: "Sûr ?",
                    no: "Non",
                    yes_reset: "Oui, Reset",
                    cancel: "Annuler",
                    delete_confirm_title: "SUPPRIMER DÉFINITIVEMENT ?",
                    delete_confirm_desc: "Cette action supprimera votre compte, votre bibliothèque et toute votre progression. Impossible d'annuler.",
                    goodbye: "ADIEU"
                },
                about: {
                    title: "À PROPOS",
                    version: "Version 3.6.1",
                    made_with: "Développé avec ❤️ pour les fans d'anime et de manga.",
                    credits: "Données fournies par l'API Jikan (MyAnimeList). Les images et titres appartiennent à leurs créateurs respectifs."
                },
                sync: {
                    no_works: "Aucune œuvre à synchroniser",
                    complete: "Synchronisation terminée : {{count}} mis à jour",
                    error: "Erreur lors de la synchronisation",
                    button: "Synchroniser"
                },
                toast: {
                    reset_success: "Toutes les données ont été réinitialisées !",
                    reset_error: "Erreur lors de la réinitialisation",
                    import_success: "Données importées avec succès !",
                    import_error: "Échec de l'importation",
                    account_deleted: "Compte supprimé. Sayonara.",
                    relogin_required: "Veuillez vous reconnecter pour supprimer votre compte",
                    delete_error: "Erreur lors de la suppression",
                    cache_cleared: "Cache nettoyé (simulation)"
                }
            },
            mal_import: {
                title: "IMPORTER DEPUIS MAL",
                drop_file: "Déposez votre fichier ici",
                file_types: "Fichiers .xml ou .xml.gz de MyAnimeList",
                parsing: "Analyse du fichier...",
                no_entries: "Aucune entrée trouvée dans le fichier",
                parse_error: "Erreur lors de l'analyse du fichier",
                invalid_file: "Format de fichier invalide",
                entries_found: "entrées trouvées",
                duplicates: "doublons détectés",
                resolve_duplicates: "Résoudre les doublons",
                start_import: "Lancer l'import",
                keep_bingeki: "Garder Bingeki",
                use_mal: "Utiliser MAL",
                complete_title: "Import terminé !",
                imported: "importées",
                skipped: "ignorées",
                errors: "erreurs",
                import_mal: "Importer depuis MAL"
            },
            folders: {
                title: "DOSSIERS",
                create: "CRÉER UN DOSSIER",
                edit: "MODIFIER LE DOSSIER",
                name: "Nom",
                name_placeholder: "Mon dossier",
                emoji: "Icône",
                color: "Couleur",
                create_btn: "Créer",
                delete_confirm: "Supprimer le dossier \"{{name}}\" ? Les œuvres ne seront pas supprimées.",
                deleted: "Dossier supprimé",
                delete: "Supprimer le dossier",
                empty: "Aucune œuvre dans ce dossier",
                add_to: "Ajouter à un dossier",
                remove_from: "Retirer du dossier",
                all_works: "Toutes les œuvres",
                no_folders: "Aucun dossier créé"
            },
            changelog: {
                title: "JOURNAL DE BORD",
                subtitle: "L'historique des évolutions de la plateforme Bingeki.",
                updates: "Mises à jour",
                current_version: "Version Actuelle",
                new: "NEW",
                to_be_continued: "À SUIVRE...",
                entries: {
                    v3_7: {
                        date: "17 Mars 2026",
                        title: "Survey & Admin Revolution",
                        description: "Refonte complète du questionnaire, tableau de bord admin et intégration sociale.",
                        changes: [
                            "Survey : UX repensée avec affichage séquentiel et auto-scroll fluide.",
                            "Admin : Nouveau Dashboard pour visualiser les résultats du questionnaire en temps réel.",
                            "Social : Intégration complète d'Instagram et TikTok (Footer + Survey).",
                            "I18n : Ajout d'un sélecteur de langue dynamique sur le formulaire.",
                            "Security : Mise à jour des règles Firestore pour sécuriser les réponses.",
                            "Fix : Correction du lien Discord officiel sur toute la plateforme."
                        ]
                    },
                    v3_6: {
                        date: "07 Mars 2026",
                        title: "Anime News & Security Update",
                        description: "Flux d'actus complet, optimisations scraper et corrections de sécurité majeures.",
                        changes: [
                            "News : Nouvelle section dédiée avec SEO optimisé et sommaire auto.",
                            "Scraper : Parallélisation du fetch et formatage intelligent pour Crunchyroll/ANN.",
                            "Security : Résolution de 100% des vulnérabilités critiques via overrides.",
                            "UI : Amélioration de la visibilité du bouton retour en haut.",
                            "Automation : Passage à un cycle de mise à jour toutes les 4 heures."
                        ]
                    },
                    v3_5: {
                        date: "13 Février 2026",
                        title: "Visual Assets & Core Sync",
                        description: "Introduction des mockups haute fidélité et synchronisation administrative.",
                        changes: [
                            "Assets : Bibliothèque complète de mockups CSS (Discover, Library, Social, Auth).",
                            "Admin : Synchronisation en temps réel des profils pour accès immédiat.",
                            "Auth : Accès sécurisé à la page de connexion pendant la maintenance.",
                            "Core : Nettoyage des scripts de déploiement et optimisation de la logique de maintenance."
                        ]
                    },
                    v3_4: {
                        date: "01 Février 2026",
                        title: "Retour Haptique",
                        description: "Une expérience tactile améliorée pour plus d'immersion.",
                        changes: [
                            "Haptique : Retour haptique sur tous les boutons pour une sensation physique.",
                            "UI : Meilleure réactivité via vibrations légères.",
                            "Tech : Nouveau hook useHaptics pour gérer les vibrations."
                        ]
                    },
                    v3_3: {
                        date: "22 Janvier 2026",
                        title: "Expérience Mobile & PWA",
                        description: "Optimisation majeure pour les appareils mobiles et installation de l'application.",
                        changes: [
                            "Nouveau : Application Installable (PWA) avec support hors-ligne.",
                            "UI : Nouvelle section de promotion mobile sur la Landing Page.",
                            "UI : Bouton d'installation déplacé dans le footer pour plus de clarté.",
                            "Ergonomie : Retour en haut de page automatique lors de la navigation.",
                            "Fix : Résolution des problèmes d'affichage sur mobile (Header, Recherche, Bibliothèque)."
                        ]
                    },
                    v3_2: {
                        date: "16 Janvier 2026",
                        title: "Social & Sécurité",
                        description: "Accès aux bibliothèques d'amis, Discord Login, et renforcement de la sécurité.",
                        changes: [
                            "Nouveau : Voir la bibliothèque de vos amis en lecture seule.",
                            "Nouveau : Connexion via Discord (OAuth).",
                            "Sécurité : Protection XSS renforcée sur les URLs d'images.",
                            "Sécurité : Validation stricte des niveaux utilisateurs (max 100).",
                            "Fix : Confirmation avant de marquer une œuvre comme terminée.",
                            "Tech : Audit ESLint et correction des erreurs de code."
                        ]
                    },
                    v3_1: {
                        date: "16 Janvier 2026",
                        title: "SEO & Global I18n Fix",
                        description: "Amélioration massive du SEO et correction globale du système de traduction.",
                        changes: [
                            "SEO : Intégration du composant SEO sur les pages Détails (Animes, Persos, Staff).",
                            "I18n : Restructuration complète des namespaces pour une meilleure résolution des clés.",
                            "I18n : Traduction intégrale de la fiche Personne (PersonDetails).",
                            "Fix : Correction des clés de thèmes (Openings/Endings) et des titres de chargement.",
                            "Git : Migration vers origin/main avec déploiement automatique."
                        ]
                    },
                    v3_0: {
                        date: "14 Janvier 2026",
                        title: "Data Shield & Support",
                        description: "Une mise à jour critique pour la protection de vos données et le support du projet.",
                        changes: [
                            "Fix Critique : Système de protection des données (Anti-reset pour niveau/XP).",
                            "Nouveau : Section \"Tips for Devs\" avec intégration Ko-fi.",
                            "Tech : Backups automatiques et fusion intelligente des données cloud/local.",
                            "UI : Amélioration visuelle des boutons de support sur l'accueil et le footer."
                        ]
                    },
                    v2_9: {
                        date: "03 Janvier 2026",
                        title: "Trailer & UI Polish",
                        description: "Correction critique du lecteur de bande-annonce et optimisation de l'interface.",
                        changes: [
                            "Fix : Le bouton \"Fermer\" du trailer est maintenant toujours visible (Z-Index fix).",
                            "Tech : Utilisation de React Portals pour les modales plein écran.",
                            "UI : Amélioration du contraste des boutons d'interaction."
                        ]
                    },
                    v2_8: {
                        date: "03 Janvier 2026",
                        title: "Showcase & Accessibilité",
                        description: "Mise en avant des détails d'œuvres et ouverture au public.",
                        changes: [
                            "Nouveau : Section \"Tout Savoir\" sur la Landing Page (Showcase Brutalist)",
                            "Accessibilité : Agenda et Changelog désormais accessibles aux invités",
                            "Nouveau : Page Crédits et mentions légales",
                            "UI : Harmonisation des visuels Jujutsu Kaisen sur le showcase"
                        ]
                    },
                    v2_7: {
                        date: "03 Janvier 2026",
                        title: "Personnages et Seiyuu",
                        description: "Explorez les fiches détaillées des personnages et doubleurs avec un style wiki.",
                        changes: [
                            "Nouveau : Pages dédiées Personnages avec fiche wiki (Age, Clan, Kekkei Genkai, etc.)",
                            "Nouveau : Pages dédiées Seiyuu avec infos structurées (Twitter, Birthplace, etc.)",
                            "Navigation : Cliquez sur les personnages/seiyuu depuis le casting",
                            "UI : Logos des services de streaming (Crunchyroll, Netflix, ADN, etc.)",
                            "UI : Univers Étendu collapsible avec cartes adaptatives",
                            "Responsive : Amélioration mobile des pages Feedback et WorkDetails"
                        ]
                    },
                    v2_6: {
                        date: "03 Janvier 2026",
                        title: "Community Voices & Discovery",
                        description: "Intégration des avis communautaires et amélioration de la recherche.",
                        changes: [
                            "Nouveau : Onglet \"Avis\" sur les fiches (Intégration MyAnimeList)",
                            "Nouveau : Filtre par Studio dans la recherche avancée",
                            "UI : Refonte brutalist de l'écran de chargement",
                            "UI : Amélioration de la grille des avis et des filtres de recherche"
                        ]
                    },
                    v2_5: {
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
                    v2_4: {
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
                    v2_3: {
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
                    v2_2: {
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
                    v2_1: {
                        date: "03 Janvier 2026",
                        title: "L'Ère des Détails",
                        description: "Une mise à jour majeure pour fiches d'anime et de manga.",
                        changes: [
                            "Ajout des bandes-annonces (trailers) directement sur la page de détails.",
                            "Nouvelles informations : Studios, Rang, Popularité, Saison et Année.",
                            "Nouvelle page Changelog pour suivre l'historique des mises à jour.",
                            "Amélioration de la synchronisation des données API vs Bibliothèque."
                        ]
                    },
                    v1_5: {
                        date: "19 Décembre 2025",
                        title: "Optimisation Mobile & Social",
                        description: "Focus sur l'expérience mobile et la stabilité.",
                        changes: [
                            "Refonte complète de l'affichage Social sur mobile.",
                            "Correction des problèmes d'affichage des graphiques.",
                            "Optimisation des permissions Firestore.",
                            "Résolution des doublons dans la page Découvrir."
                        ]
                    },
                    v1_4: {
                        date: "18 Décembre 2025",
                        title: "Mobile First & Stabilité",
                        description: "Améliorations cruciales pour la navigation sur petits écrans.",
                        changes: [
                            "Amélioration globale de la responsivité 'Bingeki Style' sur mobile.",
                            "Correction des problèmes de redimensionnement des graphiques.",
                            "Injection correcte des IDs utilisateurs dans les profils."
                        ]
                    },
                    v1_3: {
                        date: "17 Décembre 2025",
                        title: "Community & Feedback",
                        description: "Introduction des fonctionnalités communautaires.",
                        changes: [
                            "Système de commentaires avancé avec mentions.",
                            "Nouvelle page Feedback et interface d'administration.",
                            "Ajout du Rang spécial 'Niveau 100'.",
                            "Sécurisation renforcée des données utilisateurs.",
                            "Style Brutalist appliqué aux zones de texte."
                        ]
                    },
                    v1_2: {
                        date: "17 Décembre 2025",
                        title: "Profile 2.0 & Gamification",
                        description: "Refonte de l'identité utilisateur et du système de progression.",
                        changes: [
                            "Nouveau Profil : Graphique de Nen, Top 3 Favoris et Badges.",
                            "Système d'invitation aux Défis et contrôles de Watch Party.",
                            "Amélioration de la gestion des bannières de profil.",
                            "Mise à jour de la logique d'XP et de progression.",
                            "Filtre de contenu 'SFW' activé par défaut."
                        ]
                    },
                    v1_1: {
                        date: "17 Décembre 2025",
                        title: "Discover & UI Polish",
                        description: "Amélioration de la découverte et harmonisation visuelle.",
                        changes: [
                            "Nouvelle interface 'Discover' immersive.",
                            "Filtres par genre fonctionnels via l'API.",
                            "Harmonisation des boutons et cartes brutalist.",
                            "Correction des styles de la bibliothèque."
                        ]
                    }
                }
            },
            legal: {
                back: "RETOUR",
                title: "MENTIONS LÉGALES & RGPD",
                section1_title: "1. ÉDITEUR DU SITE",
                name: "Nom :",
                address: "Adresse :",
                contact: "Contact :",
                status: "Statut :",
                status_value: "Développeur Freelance / Projet Personnel",
                section2_title: "2. HÉBERGEMENT",
                hosting_text: "Ce site est hébergé par Firebase (Google LLC).",
                hosting_data: "Certaines données (images) peuvent être stockées via d'autres services tiers.",
                section3_title: "3. PROPRIÉTÉ INTELLECTUELLE",
                ip_design: "Le design, la structure et le code de \"Bingeki Experience\" sont la propriété exclusive de l'éditeur.",
                ip_images: "Les images d'œuvres (mangas/animes) sont utilisées à titre d'illustration et restent la propriété de leurs ayants droit respectifs.",
                section4_title: "4. DONNÉES PERSONNELLES (RGPD)",
                gdpr_intro: "Conformément au Règlement Général sur la Protection des Données (RGPD), nous vous informons que :",
                gdpr_collect_title: "Collecte :",
                gdpr_collect: "Les données collectées (email, image de profil, progression) sont uniquement utilisées pour le fonctionnement de l'application (sauvegarde de la bibliothèque, gamification).",
                gdpr_responsible_title: "Responsable :",
                gdpr_responsible: "Moussandou Mroivili est le responsable du traitement des données.",
                gdpr_access_title: "Droit d'accès :",
                gdpr_access: "Vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Vous pouvez supprimer votre compte et toutes les données associées directement depuis les paramètres de l'application ou en nous contactant.",
                gdpr_share_title: "Partage :",
                gdpr_share: "Vos données ne sont ni vendues, ni louées, ni cédées à des tiers.",
                gdpr_cookies_title: "Cookies :",
                gdpr_cookies: "Nous utilisons des cookies techniques essentiels pour maintenir votre session. Pour en savoir plus, consultez notre Politique de Confidentialité.",
                ai_title: "Transparence Intelligence Artificielle (AI Act)",
                ai_text: "Conformément aux principes de transparence, nous informons nos utilisateurs que des outils basés sur l'intelligence artificielle ont été utilisés pour assister la création d'éléments graphiques (comme des logos) ainsi qu'une partie du code source de ce site web. Tous les contenus générés ont fait l'objet d'une révision et d'une validation humaine.",
                section5_title: "5. CONTACT",
                contact_text: "Pour toute question, demande d'information ou réclamation, vous pouvez nous contacter à l'adresse suivante :"
            },
            privacy: {
                title: "POLITIQUE DE CONFIDENTIALITÉ",
                intro: "La protection de votre vie privée est importante pour nous.",
                cookies_title: "Cookies",
                cookies_desc: "Ce site utilise des cookies (y compris des cookies tiers) pour personnaliser le contenu et analyser notre trafic.",
                ads_title: "Publicités Google (AdSense)",
                ads_desc: "Des fournisseurs tiers, y compris Google, utilisent des cookies pour diffuser des annonces en fonction des visites antérieures des utilisateurs sur votre site web ou sur d'autres sites web. L'utilisation de cookies publicitaires par Google permet à Google et à ses partenaires de diffuser des annonces auprès de vos utilisateurs en fonction de leur visite sur vos sites et/ou d'autres sites sur Internet.",
                data_title: "Collecte de données",
                data_desc: "Nous recueillons certaines données (comme votre progression de lecture) uniquement pour vous fournir nos services. Nous ne vendons en aucun cas vos données personnelles à des tiers."
            },
            terms: {
                title: "CONDITIONS GÉNÉRALES D'UTILISATION",
                intro: "En utilisant Bingeki, vous acceptez de respecter ces conditions d'utilisation.",
                rules_title: "Règles de bonne conduite",
                rules_desc: "Soyez respectueux envers les autres membres de la communauté. Aucun contenu abusif ou illégal ne sera toléré."
            },
            contact: {
                title: "CONTACTER L'ÉQUIPE",
                intro: "Une question, une suggestion ou un problème technique ? N'hésitez pas à nous contacter.",
                email_label: "Email direct :"
            },
            about: {
                title: "À PROPOS DE BINGEKI",
                vision_title: "Une plateforme pour les passionnés",
                vision_p1: "Bingeki est une plateforme pensée pour les passionnés d’animé et de manga qui souhaitent vivre leur passion de manière plus immersive, organisée et interactive. À l’ère du streaming et de la consommation massive de contenus culturels, l’accès aux animés et aux mangas n’a jamais été aussi simple. Pourtant, malgré cette abondance de contenus, l’expérience utilisateur reste souvent fragmentée et limitée. Les fans utilisent différents sites pour suivre leurs séries, découvrir de nouvelles œuvres ou échanger avec d’autres passionnés, sans qu’il existe réellement d’espace centralisé capable de rassembler toutes ces dimensions.",
                vision_p2: "C’est précisément ce constat qui a donné naissance à Bingeki.",
                problem_p1: "Aujourd’hui, la plupart des outils disponibles permettent surtout de consulter des bases de données ou de gérer des listes de visionnage. Ils remplissent une fonction utile, mais restent majoritairement statiques. L’utilisateur peut noter un animé, indiquer qu’il l’a terminé ou l’ajouter à une liste, mais l’expérience s’arrête souvent là. Or, la manière dont les fans consomment la culture anime et manga a évolué : ils veulent suivre leur progression, partager leurs découvertes, comparer leurs expériences et s’inscrire dans une communauté qui valorise leur engagement.",
                problem_p2: "Bingeki a été conçu pour répondre à cette évolution.",
                evolution_p1: "La plateforme transforme le simple suivi d’animé et de manga en une véritable expérience personnelle et sociale. Elle permet aux utilisateurs de centraliser leur consommation de contenus, de suivre facilement leur progression dans les séries et les mangas qu’ils regardent ou lisent, et de découvrir de nouvelles œuvres adaptées à leurs goûts. L’objectif n’est pas seulement d’organiser l’information, mais de créer un environnement dynamique dans lequel chaque interaction contribue à enrichir l’expérience utilisateur.",
                core_p1: "Au cœur de Bingeki se trouve une idée simple : la passion pour les animés et les mangas mérite une plateforme à la hauteur de l’engagement de ses fans.",
                features_p1: "La plateforme propose ainsi un ensemble de fonctionnalités pensées pour accompagner les utilisateurs dans leur quotidien de fans. Les utilisateurs peuvent créer et gérer leurs listes de visionnage, suivre leur progression dans les épisodes ou les chapitres, accéder à des fiches détaillées sur les œuvres et explorer de nouveaux contenus. Bingeki facilite également la découverte en mettant en avant des recommandations et des informations sur les saisons d’animé en cours.",
                features_p2: "Mais l’expérience ne s’arrête pas au suivi personnel.",
                social_p1: "Bingeki intègre également une dimension sociale qui permet aux fans d’interagir, de partager leur activité et de découvrir ce que regarde ou lit la communauté. Les profils utilisateurs deviennent ainsi une vitrine de la passion de chacun, où l’on peut retrouver ses statistiques, ses œuvres favorites et sa progression globale. Cette approche transforme l’expérience individuelle en une expérience collective, où les utilisateurs peuvent échanger, comparer leurs goûts et découvrir de nouvelles recommandations à travers l’activité des autres membres.",
                gamification_p1: "Un autre aspect important de Bingeki est la notion de progression. La plateforme valorise l’engagement des utilisateurs en intégrant des mécanismes inspirés des systèmes de progression présents dans les jeux vidéo. En suivant des animés, en découvrant de nouvelles œuvres ou en interagissant avec la plateforme, les utilisateurs peuvent voir évoluer leur profil et leur activité. Cette approche gamifiée permet de rendre l’expérience plus motivante et plus immersive, tout en renforçant le sentiment d’appartenance à la communauté.",
                design_p1: "L’ergonomie et l’accessibilité ont également été des priorités dans la conception de Bingeki. La plateforme est développée comme une application web moderne, optimisée pour une utilisation fluide sur ordinateur, tablette et smartphone. L’interface a été pensée pour être claire, rapide et agréable à utiliser au quotidien, afin que les utilisateurs puissent accéder facilement à leurs contenus et à leur progression, où qu’ils soient.",
                audience_p1: "Bingeki s’adresse principalement à une nouvelle génération de fans : des utilisateurs connectés, habitués aux applications modernes et à la personnalisation de leur expérience numérique. Étudiants, jeunes adultes ou passionnés de longue date, tous partagent le même besoin : disposer d’un espace simple, moderne et engageant pour suivre leur passion pour les animés et les mangas.",
                future_p1: "Le projet est encore en évolution et continue de s’améliorer au fil du temps. De nouvelles fonctionnalités sont régulièrement développées afin d’enrichir l’expérience utilisateur et de renforcer l’aspect communautaire de la plateforme. Cette démarche progressive permet de construire Bingeki avec une vision claire : créer un espace durable, capable d’accompagner les fans dans leur passion sur le long terme.",
                ecosystem_p1: "Au-delà d’une simple application, Bingeki ambitionne de devenir un véritable écosystème pour les fans d’animé et de manga. Un lieu où l’on peut organiser sa consommation de contenus, découvrir de nouvelles œuvres, partager son expérience et se connecter à une communauté qui partage la même passion.",
                closing_p1: "Parce que suivre des animés et des mangas ne devrait pas être seulement une liste à remplir, mais une expérience à vivre et à partager."
            },
            credits: {
                title: "CRÉDITS",
                role: "DEVELOPER & CREATOR",
                description_1: "<strong>Bingeki</strong> est né d'une passion pour le manga et l'envie de créer une expérience utilisateur unique.",
                description_2: "Développé avec amour, café et beaucoup de CSS. Ce projet est une démonstration de ce qui est possible quand on mélange design brutaliste et technologies modernes.",
                made_with: "Fait avec",
                in_marseille: "à Marseille"
            },
            admin: {
                sidebar: {
                    admin_panel: "ADMIN PANEL",
                    dashboard: "Dashboard",
                    users: "Utilisateurs",
                    feedback: "Feedback",
                    system: "Système",
                    survey: "Questionnaire",
                    back_to_site: "Retour au site",
                    exit: "Exit"
                },
                dashboard: {
                    loading: "Chargement du dashboard...",
                    title: "Centre de Contrôle",
                    subtitle: "Vue d'overview de l'activité sur Bingeki",
                    users_label: "Utilisateurs",
                    today: "aujourd'hui",
                    feedback_label: "Feedback",
                    tickets_pending: "tickets en attente",
                    system_label: "Système",
                    activity_volume: "Volume d'Activité",
                    last_7_days: "DERNIERS 7 JOURS",
                    recent_members: "Derniers Membres",
                    anonymous: "Anonyme",
                    quick_actions: "Actions Rapides",
                    manage_users: "Gérer Utilisateurs",
                    view_feedback: "Voir Feedback",
                    live_console: "Live Console",
                    survey_label: "Questionnaires",
                    view_survey_details: "Voir les détails",
                    just_now: "A l'instant",
                    minutes_ago: "Il y a {{count}} min",
                    hours_ago: "Il y a {{count}}h",
                    days_ago: "Il y a {{count}}j",
                    last_seen: "Connecté",
                    online: "En ligne",
                    dau: "Actifs (24h)",
                    wau: "Actifs (7j)",
                    mau: "Actifs (30j)",
                    engagement_rate: "Engagement",
                    engagement: "Engagement",
                    growth: "Croissance",
                    funnel: "Tunnel",
                    retention: "Rétention",
                    engagement_breakdown: "Répartition",
                    top_content: "Top Contenu",
                    active_users: "Utilisateurs Actifs"
                },
                users: {
                    title: "Gestion Utilisateurs",
                    members_count: "{{count}} membres enregistrés",
                    search_placeholder: "Rechercher (Email, Pseudo...)",
                    loading: "Chargement...",
                    no_name: "Sans nom",
                    ban: "Bannir",
                    admin: "Admin",
                    view_profile: "Voir Profil",
                    ban_yes: "OUI",
                    ban_no: "NON",
                    confirm_ban: "Voulez-vous vraiment {{action}} cet utilisateur ?",
                    confirm_admin: "ATTENTION: {{action}} les droits administrateur ?",
                    update_error: "Erreur lors de la mise à jour",
                    action_ban: "bannir",
                    action_unban: "débannir",
                    action_give: "Donner",
                    action_remove: "Retirer",
                    delete_account: "Supprimer Compte",
                    confirm_delete: "Es-tu SÛR de vouloir supprimer définitivement ce compte ? Toutes les données (bibliothèque, niveau, activités) seront PERDUES à jamais.",
                    delete_success: "Compte supprimé avec succès.",
                    delete_error: "Erreur lors de la suppression."
                },
                feedback: {
                    title: "Feedback Center",
                    tickets_pending: "{{count}} tickets en attente",
                    refresh: "Rafraîchir",
                    loading: "Chargement des messages...",
                    load_error: "Erreur lors du chargement des avis",
                    no_messages: "Aucun message pour le moment.",
                    anonymous: "Anonyme",
                    resolved: "Résolu",
                    reply: "Répondre",
                    no_email: "Pas d'email",
                    reopen: "Rouvrir",
                    mark_resolved: "Marquer comme résolu",
                    delete: "Supprimer",
                    confirm_delete: "Supprimer ce feedback définitivement ?",
                    delete_error: "Erreur lors de la suppression",
                    status_error: "Erreur lors de la mise à jour du statut",
                    priority_error: "Erreur lors de la mise à jour de la priorité"
                },
                system: {
                    title: "Système & Logs",
                    subtitle: "Monitoring temps réel et configuration globale",
                    global_announcement: "Annonce Globale",
                    message_placeholder: "Message pour tous les utilisateurs...",
                    info: "INFO",
                    alert: "ALERT",
                    enable_announcement: "Activer l'annonce",
                    update_live: "Mettre à jour (LIVE)",
                    save_offline: "Sauvegarder (Hors-ligne)",
                    server_config: "Configuration Serveur",
                    maintenance_mode: "Mode Maintenance",
                    maintenance_desc: "Bloque l'accès sauf aux admins",
                    registrations: "Inscriptions",
                    registrations_desc: "Autoriser les nouveaux membres",
                    database: "Base de Données",
                    data_shield: "Data Shield Protocol v3.0 Active",
                    manual_backup: "Lancer Backup Manuel",
                    live: "LIVE"
                },
                survey: {
                    title: "Analyses du Questionnaire",
                    loading: "Chargement des réponses...",
                    total_responses: "réponses",
                    raw_data: "Données brutes",
                    date: "Date",
                    email: "Email",
                    profile: "Profil",
                    interest: "Intérêt",
                    no_responses: "Aucune réponse trouvée",
                    labels: {
                        total: "Total Réponses",
                        waitlist: "Liste d'attente",
                        hyped: "Impatients",
                        premium: "Premium"
                    }
                }
            },
            work_details: {
                back: "RETOUR",
                loading: "CHARGEMENT...",
                not_found: "ŒUVRE INTROUVABLE",
                not_found_desc: "Impossible de récupérer les détails. Vérifiez votre connexion ou l'ID.",
                tabs: {
                    general: "GÉNÉRAL",
                    chapters_list: "LISTE DES CHAPITRES",
                    episodes_list: "LISTE DES ÉPISODES",
                    music: "MUSIQUES",
                    reviews: "AVIS",
                    gallery: "GALERIE",
                    stats: "STATISTIQUES"
                },
                meta: {
                    score: "Score",
                    chaps: "Chaps",
                    eps: "Eps"
                },
                streaming: {
                    watch_on: "Regarder sur",
                    watch: "REGARDER",
                    read: "LIRE",
                    search_episode: "Recherche Google - Épisode",
                    search_chapter: "Lire - Chapitre"
                },
                synopsis: {
                    title: "SYNOPSIS",
                    show_less: "Moins",
                    show_more: "Lire la suite"
                },
                info: {
                    season: "SAISON",
                    studio: "STUDIO",
                    rank: "RANG",
                    popularity: "POPULARITÉ"
                },
                trailer: {
                    title: "BANDE-ANNONCE",
                    watch: "REGARDER LA BANDE-ANNONCE",
                    close: "FERMER"
                },
                casting: {
                    title: "CASTING",
                    show_more: "VOIR PLUS",
                    show_less: "VOIR MOINS"
                },
                universe: {
                    title: "UNIVERS ÉTENDU",
                    collapse: "Réduire",
                    expand: "Voir {{count}} de plus"
                },
                library: {
                    interested: "INTÉRESSÉ ?",
                    interested_title: "AJOUTER À MA LISTE",
                    interested_desc: "Suivez votre progression et recevez des notifications !",
                    add_desc: "Ajoutez cette œuvre à votre bibliothèque pour suivre votre progression !",
                    add_to_collection: "AJOUTER À MA COLLECTION",
                    login_to_add: "SE CONNECTER POUR AJOUTER",
                    added_toast: "Ajouté à votre bibliothèque !"
                },
                progress: {
                    title: "PROGRESSION",
                    edit: "Éditer",
                    saved_toast: "Progression sauvegardée !",
                    mark_complete_confirm: "Avez-vous terminé cette œuvre ? Votre progression sera mise au maximum.",
                    ok: "OK"
                },
                status: {
                    title: "STATUT",
                    watching: "En cours",
                    reading: "Lecture en cours",
                    completed: "Terminé",
                    on_hold: "En pause",
                    dropped: "Abandonné",
                    plan_to_watch: "À voir",
                    plan_to_read: "À lire",
                    finished_airing: "Terminé",
                    currently_airing: "En cours"
                },
                rating: {
                    title: "MA NOTE"
                },
                notes: {
                    title: "MES NOTES",
                    placeholder: "Écrivez vos pensées ici..."
                },
                comments: {
                    title: "COMMENTAIRES",
                    time_now: "À l'instant",
                    time_hours: "Il y a {{hours}}h",
                    time_days: "Il y a {{days}}j",
                    reply: "RÉPONDRE",
                    reply_to: "Répondre à {{name}}...",
                    spoiler: "SPOILER",
                    friends_reading: "{{count}} ami(s) {{action}} aussi cette œuvre",

                    friends_count: "Vous et {{count}} ami(s) lisent aussi cette œuvre",
                    friends_watching: "regarde",
                    friends_reading_action: "lit",
                    share_opinion: "Partagez votre avis...",
                    contains_spoilers: "Contient des spoilers",
                    publish: "PUBLIER",
                    login_to_comment: "Connectez-vous pour commenter",
                    loading: "Chargement des commentaires...",
                    no_comments: "Aucun commentaire. Soyez le premier !",
                    error_loading: "Erreur de chargement :",
                    permission_error: "Vous n'avez pas la permission de voir les commentaires (Règles Firestore).",
                    generic_error: "Impossible de charger les commentaires.",
                    added_toast: "Commentaire ajouté !",
                    error_toast: "Erreur lors de l'ajout du commentaire",
                    reply_added_toast: "Réponse ajoutée !",
                    reply_error_toast: "Erreur lors de la réponse",
                    show_less: "▲ Réduire",
                    show_more: "▼ Voir {{count}} de plus",
                    reading: "Vous et {{count}} ami(s) lisent aussi cette œuvre",
                    watching: "Vous et {{count}} ami(s) regardez aussi cette œuvre",
                    placeholder: "Partagez votre avis (sans spoil de préférence)...",
                    submit: "PUBLIER"
                },
                danger: {
                    delete_button: "SUPPRIMER DE MA BIBLIOTHÈQUE",
                    delete: "Supprimer de la bibliothèque",
                    deleted_toast: "\"{{title}}\" a été supprimé",
                    modal_title: "SUPPRESSION",
                    confirm_title: "Supprimer \"{{title}}\" ?",
                    confirm_desc: "Cette action est irréversible. Votre progression et vos notes seront perdues.",
                    cancel: "ANNULER",
                    confirm_delete: "SUPPRIMER"
                },
                stats: {
                    no_data: "Aucune statistique ou information de staff disponible pour cette œuvre.",
                    staff_title: "STAFF (PRINCIPAL)",
                    title: "STATISTIQUES",
                    library_distribution: "RÉPARTITION DANS LES BIBLIOTHÈQUES",
                    score_distribution: "RÉPARTITION DES NOTES",
                    show_more: "VOIR PLUS",
                    show_less: "VOIR MOINS"
                },
                reviews: {
                    title: "AVIS DE LA COMMUNAUTÉ",
                    read_full: "LIRE L'AVIS COMPLET",
                    none_found: "AUCUN AVIS TROUVÉ",
                    be_first: "Soyez le premier à donner votre avis dans la section commentaires ci-dessous !"
                },
                gallery: {
                    title: "GALERIE OFFICIELLE",
                    no_images: "Aucune image disponible."
                },
                themes: {
                    title: "BANDES ORIGINALES",
                    openings: "OPENINGS",
                    endings: "ENDINGS",
                    no_openings: "Aucun opening trouvé.",
                    no_endings: "Aucun ending trouvé.",
                    no_music: "Aucune musique (opening/ending) disponible."
                },
                recommendations: {
                    title: "VOUS AIMEREZ AUSSI",
                    votes: "VOTES"
                },
                chapters: {
                    unknown_count: "NOMBRE DE CHAPITRES INCONNU",
                    unknown_desc: "Veuillez définir le nombre total de chapitres dans l'onglet \"Général\" pour générer la liste.",
                    set_count: "Définir le nombre de chapitres",
                    prompt: "Entrez le nombre total de chapitres :",
                    prompt_total: "Entrez le nombre total:",
                    click_to_edit: "Cliquez pour modifier le total"
                }
            },
            character_details: {
                loading_title: "Chargement...",
                loading_description: "Récupération des informations du personnage.",
                back: "RETOUR",
                not_found: "Personnage introuvable.",
                removed_from_favorites: "Retiré des favoris",
                added_to_favorites: "Ajouté aux favoris",
                favorites: "favoris",
                identity: "IDENTITÉ",
                biography: "BIOGRAPHIE",
                source: "Source",
                seiyuu: "SEIYUU (DOUBLAGE JP)",
                anime_appearances: "APPARITIONS ANIME",
                manga_appearances: "APPARITIONS MANGA"
            },
            person_details: {
                loading_title: "Chargement...",
                loading_description: "Récupération des informations de la personne.",
                back: "RETOUR",
                not_found_title: "Personne Introuvable",
                not_found_description: "Impossible de trouver cette personne.",
                not_found: "Personne introuvable.",
                favorites: "favoris",
                sheet: "FICHE",
                biography: "BIOGRAPHIE",
                roles: "RÔLES"
            },
            news: {
                not_found: "Article introuvable",
                back: "RETOUR",
                source_badge: "SOURCE",
                read_full: "LIRE L'INFORMATION COMPLÈTE ORIGINELLE",
                disclaimer: "Cet article est un résumé automatisé. Pour lire l'intégralité du contenu et soutenir les créateurs originaux, veuillez consulter l'article complet sur le site source.",
                go_to_source: "ALLER VERS LA SOURCE",
                title: "ACTUALITÉS ANIMÉS & MANGAS",
                description: "Les dernières news Anime et Manga en temps réel.",
                heading: "ACTUALITÉS RÉCENTES",
                featured: "À LA UNE",
                empty: "Aucune actualité trouvée.",
                summary_box_title: "EN UN CLIN D'ŒIL",
                toc: "Sommaire",
                search_placeholder: "Rechercher par titre ou tag...",
                filter_all_sources: "Toutes les sources",
                results_found: "{{count}} actualité trouvée",
                results_found_plural: "{{count}} actualités trouvées"
            },
            survey: {
                title: "Questionnaire Bingeki",
                brand: "Bingeki",
                step_indicator: "Étape {{current}} sur {{total}}",
                landing: {
                    title: "Construisons le suivi parfait des <span>Animés</span>",
                    desc: "Bingeki est une future plateforme sociale et gamifiée pour ta consommation d'animés et de mangas. Donne-nous ton avis pour créer la plateforme dont tu rêves."
                },
                steps: {
                    profil: { title: "Profil", desc: "Mieux te connaître" },
                    habitudes: { title: "Habitudes", desc: "Ta consommation" },
                    problemes: { title: "Frustrations", desc: "Les problèmes actuels" },
                    interet: { title: "Bingeki", desc: "Ton intérêt pour le projet" },
                    gamification: { title: "Gamification", desc: "Ta motivation" },
                    monetisation: { title: "Premium", desc: "Et si on allait plus loin ?" },
                    communaute: { title: "Social", desc: "Toi et tes amis" },
                    libre: { title: "Avis libre", desc: "Ton mot de la fin" },
                    lead: { title: "Rester en contact", desc: "Pour ne rien rater" }
                },
                questions: {
                    age: "Quel âge as-tu ?",
                    status: "Quel est ton statut ?",
                    consumption_frequency: "À quelle fréquence consommes-tu des animés ou mangas ?",
                    anime_count: "Combien d’animés suis-tu en parallèle ?",
                    reads_manga: "Lis-tu aussi des mangas ?",
                    devices: "Quels appareils utilises-tu principalement ? (Plusieurs choix possibles)",
                    forgets_progress: "Oublies-tu parfois où tu en es dans une série ?",
                    current_tracking: "Comment suis-tu ta progression aujourd’hui ?",
                    frustrations: "Qu’est-ce qui te frustre dans les solutions actuelles ?",
                    interest_level: "Une plateforme de suivi plus sociale et gamifiée t’intéresserait-elle ?",
                    attractive_features: "Qu’est-ce qui t’attire le plus ? (Plusieurs choix)",
                    likes_gamification: "Aimes-tu les systèmes de progression (niveaux, XP) ?",
                    motivation_drivers: "Qu’est-ce qui te motiverait le plus ? (Plusieurs choix)",
                    premium_interest: "Serais-tu prêt à payer pour des fonctionnalités premium (sur une alternative gratuite sans pub) ?",
                    premium_features: "Que voudrais-tu en premium ? (Plusieurs choix)",
                    acceptable_price: "Quel prix mensuel te semblerait acceptable ?",
                    shares_friends: "Partages-tu souvent tes découvertes avec tes amis ?",
                    social_platforms: "Sur quels réseaux interagis-tu le plus autour des animés/mangas ?",
                    social_interest: "Serais-tu intéressé par des fonctions sociales (Feed amis, réactions, commentaires) ?",
                    must_have: "Quelle fonctionnalité aimerais-tu ABSOLUMENT voir dans Bingeki ?",
                    daily_return: "Qu’est-ce qui te ferait utiliser l'application tous les jours ?",
                    stay_in_touch: "Ne manque pas le lancement 🎉",
                    stay_in_touch_desc: "Laisse ton e-mail pour être prévenu de la sortie officielle de l'application (pas de spam, promis).",
                    wants_news: "Oui, je veux être recontacté !",
                    no_news: "Non merci.",
                    referral_source: "Comment nous as-tu connu ?",
                    ageRange: "Tranches d'âge",
                    interestLevel: "Niveau d'intérêt",
                    mostAttractiveFeatures: "Fonctionnalités"
                },
                options: {
                    status: {
                        etudiant: "Étudiant / Lycéen",
                        salarie: "Salarié / Actif",
                        autre: "Autre"
                    },
                    frequency: {
                        quotidien: "Tous les jours",
                        hebdomadaire: "Plusieurs fois par semaine",
                        mensuel: "Quelques fois par mois"
                    },
                    manga: {
                        oui_beaucoup: "Oui, beaucoup",
                        oui_un_peu: "Oui, de temps en temps",
                        non: "Non, pas du tout"
                    },
                    devices: {
                        smartphone: "📱 Smartphone",
                        pc: "💻 PC / Mac",
                        tv: "📺 TV / Console",
                        tablette: "📱 Tablette"
                    },
                    forget: {
                        souvent: "Oui, très souvent",
                        parfois: "De temps en temps",
                        jamais: "Non, je gère parfaitement"
                    },
                    tracking: {
                        myanimelist: "MyAnimeList / Anilist",
                        notes: "Bloc note / Notion / Excel",
                        memoire: "De tête (ma mémoire me suffit)",
                        autre: "Autre"
                    },
                    interest: {
                        beaucoup: "Oui, carrément !",
                        un_peu: "Pourquoi pas, à tester.",
                        pas_du_tout: "Non, aucun intérêt pour moi."
                    },
                    features: {
                        design: "🎨 Une interface moderne et mobile-first",
                        gamification: "🎮 Gagner de l'XP et monter de niveau",
                        social: "👥 Voir l'activité et le profil des amis",
                        statistiques: "📊 Des statistiques poussées sur mon visionnage"
                    },
                    gamification: {
                        like_much: "J'adore ça !",
                        like_some: "C'est sympa mais secondaire",
                        no_interest: "Je n'y prête pas attention"
                    },
                    motivation: {
                        badges: "🏆 Collectionner des badges (ex: Regardé 50 Isekai)",
                        niveau: "⭐ Monter de niveau avec mon compte",
                        classement: "📈 Un classement (Leaderboard) avec mes amis",
                        defis: "🎯 Des défis (Objectifs hebdo pour bonus)"
                    },
                    premium: {
                        oui: "Oui, si la valeur ajoutée est là",
                        peut_etre: "Peut-être, tout dépend du prix",
                        non: "Non, jamais"
                    },
                    premium_features: {
                        personnalisation: "🎨 Personnalisation max de mon profil de ouf",
                        badges_exclusifs: "💎 Des badges/titres exclusifs",
                        stats_avancees: "📊 Statistiques de visionnage super avancées",
                        soutien: "❤️ Juste soutenir le projet Bingeki"
                    },
                    social: {
                        often: "Oui, tout le temps !",
                        sometimes: "De temps en temps",
                        solo: "Je vis ma passion en solo"
                    },
                    referral: {
                        tiktok: "📱 TikTok",
                        instagram: "📸 Instagram",
                        discord: "👾 Discord",
                        word_of_mouth: "🗣️ Bouche à oreille",
                        search: "🔍 Recherche (Google...)",
                        other: "✨ Autre"
                    },
                    social_interest: {
                        feed: "Oui, un vrai fil d'actu de mes potes !",
                        maybe: "Un peu, à voir.",
                        no: "Pas spécialement."
                    }
                },
                placeholders: {
                    frustrations: "Interfaces vieillissantes, trop compliqué, manque de fonctionnalités...",
                    must_have: "La fonctionnalité de rêve que tu n'as vue nulle part ailleurs...",
                    daily_return: "Des notifs de sortie ? Le fil d'actu de mes amis ? Les défis ?",
                    email: "ton@email.com"
                },
                footer: {
                    start: "Commencer",
                    next: "Suivant",
                    back: "Retour",
                    finish: "Terminer",
                    submitting: "Envoi...",
                    join_title: "PRÊT À REJOINDRE L'AVENTURE ?",
                    join_button: "REJOINDRE BINGEKI",
                    follow_insta: "Retrouvez-nous sur Instagram"
                },
                errors: {
                    submit: "Une erreur est survenue. Veuillez réessayer."
                },
                thank_you: {
                    title: "Merci beaucoup !",
                    message: "Tes réponses ont bien été enregistrées. Grâce à toi, nous allons pouvoir construire la plateforme dont nous rêvons tous pour suivre nos animés et mangas préférés.",
                    next_steps: "Tu veux aller plus loin ?",
                    join_site: "Rejoindre Bingeki",
                    discord: "Rejoindre le Discord",
                    instagram: "Nous suivre sur Instagram",
                    tiktok: "Nous suivre sur TikTok",
                    home: "Retour à l'accueil"
                }
            }
        },
    },
    en: {
        translation: {
            seo: {
                default_description: "Transform your manga passion into an RPG quest! Track your reads, earn XP, unlock badges and compete with friends.",
            },
            header: {

                dashboard: "H.Q.",
                library: "LIBRARY",
                agenda: "SCHEDULE",
                community: "COMMUNITY",
                news: "WHATS NEW",
                feedback: "Give Feedback",
                login: "LOGIN",
                search_placeholder: "Search...",
                discover: "DISCOVER",
                changelog: "CHANGELOG",
                profile: "My Profile",
                settings: "Settings",
                logout: "Logout",
                more: "MORE",
                tierlist: "Tier List",
                title: "HELP & CHANGELOG",
                version: "Version {{version}}",
                see_changelog: "View Changelog",
                report_bug: "Report Bug",
                notifications: "Notifications",
                lens: "ANIME LENS"
            },
            lens: {
                title: "ANIME LENS",
                subtitle: "Find any anime from an episode screenshot",
                drop_zone: "Drop an anime screenshot here or click to upload",
                camera: "Take a photo",
                or: "or",
                search: "Identify",
                searching: "Searching...",
                no_results: "No matches found. Try with a direct screenshot from an anime episode.",
                similarity: "{{score}}%",
                episode: "Episode {{ep}}",
                timestamp: "at {{time}}",
                add_to_library: "Add",
                view_details: "View Details",
                search_discover: "Search in Discover",
                error: "An error occurred. Please try again.",
                file_too_large: "Image must be under 10MB",
                result_count: "{{count}} result(s) found",
                match: "match"
            },
            pwa: {
                install_app: "Install App",
                install_app_promo: "DOWNLOAD APP",
                install_modal: {
                    title: "INSTALL APP",
                    description: "Install the app for quick and offline access.",
                    ios_step1: "Tap the Share button",
                    ios_step2: "Select 'Add to Home Screen'",
                    android_step1: "Open the browser menu",
                    android_step2: "Tap 'Install App'"
                }
            },
            roles: {
                admin: "ADMIN",
                creator: "CREATOR"
            },

            profile: {
                seo_title: "Hunter Profile",
                seo_description: "Check out the profile and progress.",
                title: "Hunter License",
                view_library: "VIEW LIBRARY",
                edit: "EDIT",
                guide: "GUIDE",
                back: "BACK",
                loading: "Loading profile...",
                chapters_read: "Chapters read",
                episodes_watched: "Episodes Watched",
                movies_watched: "Movies Watched",
                in_progress: "In progress",
                completed: "Completed",
                collection: "Collection",
                badges: "Badges",
                xp_total: "Total XP",
                common_works: "{{count}} work in common",
                common_works_plural: "{{count}} works in common",
                recent_badges: "Recent Badges",
                favorite_characters: "Favorite Characters",
                edit_modal: {
                    title: "EDIT LICENSE",
                    pseudo: "PSEUDO",
                    banner_label: "BANNER / GIF (URL Link)",
                    banner_help: "Copy image address (right click > Copy image address) and paste it here.",
                    banner_placeholder: "https://example.com/image.jpg",
                    colors: "COLORS",
                    accent: "ACCENT",
                    background: "BACKGROUND",
                    border: "BORDER",
                    top3: "TOP 3 FAVORITES",
                    select_favorite: "Select a favorite #{{index}}",
                    featured_badge: "FEATURED BADGE",
                    none: "None",
                    bio: "BIO / QUOTE",
                    bio_placeholder: "A phrase that defines you...",
                    save: "SAVE"
                },
                guide_modal: {
                    title: "Hunter Guide",
                    xp_title: "EXPERIENCE (XP)",
                    xp_desc: "Earn XP with every action on Bingeki:",
                    xp_read: "Read a chapter:",
                    xp_add: "Add a work:",
                    xp_complete: "Complete a work:",
                    xp_daily: "Daily login:",
                    streak_title: "STREAK",
                    streak_desc: "The flame of your passion! 🔥 Log in every day to increase your Streak.",
                    streak_warning: "Warning: if you miss a day, the flame goes out and returns to 0.",
                    ranks_title: "Earning Ranks",
                    ranks_desc: "By accumulating XP, you level up and rank up (F -> S). Unlock unique badges to show off your achievements on your profile!"
                },
                toast: {
                    profile_updated: "Profile updated successfully!",
                    save_error: "Error saving: ",
                    friend_request_sent: "Friend request sent!",
                    friend_request_error: "Error sending friend request",
                    already_friends: "You are already friends"
                },
                add_favorite_character: "Add favorite character",
                character_removed: "Character removed from favorites",
                add_friend: "ADD FRIEND",
                request_pending: "REQUEST PENDING",
                friends: "FRIENDS",
                remove_friend: "REMOVE FRIEND",
                share: "Share",
                share_text: "Check out my profile on Bingeki!",
                link_copied: "Profile link copied!",
                share_failed: "Share failed"
            },
            gamification: {
                level_up: "LEVEL UP!",
                reached_level: "You reached level {{level}}",
            },
            share: {
                share: "Share",
                link_copied: "Link copied!",
                enable_sharing: "Enable sharing",
                access_public: "Public (everyone)",
                access_friends: "Friends only",
                copy_link: "Copy link",
                share_folder: "Share folder",
                share_library: "Share library",
                access_denied: "Access denied",
                access_denied_msg: "This content is reserved for the user's friends.",
                login_required: "Login required to view this content.",
                sharing_updated: "Sharing settings updated!",
                not_shared: "This content is not shared."
            },
            content_list: {
                no_content: "No content available.",
                unknown_date: "Unknown date",
                watch_on_crunchyroll: "Watch on Crunchyroll",
                watch_on_adn: "Watch on ADN",
                search_streaming: "Search Streaming",
                search_scan: "Search Scan",
                seen: "SEEN",
                see: "SEE",
                loading_summary: "Loading summary...",
                no_summary: "No summary available.",
                show_more: "SHOW MORE",
                previous: "Previous",
                next: "Next",
                page: "PAGE"
            },
            watch_parties: {
                title: "WATCH PARTIES",
                new_party: "NEW PARTY",
                login_required: "Log in to create Watch Parties",
                loading: "Loading...",
                no_parties: "No parties in progress",
                no_parties_desc: "Create a party and watch/read with your friends!",
                episode: "Episode",
                chapter: "Chapter",
                participant: "participant",
                participants: "participants",
                end_party: "End",
                leave_party: "Leave",
                host: "Host",
                choose_work: "Choose a work",
                add_work_first: "Add a work to your library first",
                party_name: "Party name (optional)",
                party_name_placeholder: "Ex: One Piece Marathon",
                invite_friends: "Invite friends",
                no_friends: "You don't have any friends yet",
                cancel: "Cancel",
                create_party: "Create party",
                party_created: "Party created!",
                party_ended: "Party ended",
                left_party: "You left the party",
                episode_advanced: "Episode advanced!",
                select_work: "Select a work"
            },
            common: {
                loading: "Loading...",
                error: "Error",
                success: "Success",
                cancel: "Cancel",
                confirm: "Confirm",
                save: "Save",
                delete: "Delete",
                edit: "Edit",
                add: "Add",
                remove: "Remove",
                back: "Back",
                next: "Next",
                previous: "Previous",
                first_page: "First page",
                last_page: "Last page",
                go_to_page: "Go to page",
                back_to_top: "Back to top",
                search: "Search",
                no_results: "No results",
                see_more: "See more",
                show_more: "Show more",
                close: "Close",
                yes: "Yes",
                no: "No",
                access_denied: "Access denied",
                no_notifications: "No notifications",
                view_all: "View all",
                finish: "Finish",
                skip: "Skip",
                prev: "Previous",
                mark_all_read: "Mark all as read",
                view_details: "View Details",
                unknown: "Unknown",
                continue: "Continue"
            },
            tierlist: {
                characters: "CHARACTERS",
                by_name: "By Name",
                by_anime: "By Anime",
                search_name: "Search Name...",
                search_anime: "Search Anime...",
                no_characters: "No characters found.",
                no_anime: "No anime found.",
                load_error: "Failed to load tier list",
                export_success: "Image downloaded!",
                export_error: "Failed to generate image",
                duplicate_character: "Character already in tier list!",
                save_success: "Tier list saved successfully!",
                save_error: "Error saving tier list"
            },
            maintenance: {
                title: "Maintenance in Progress",
                description: "We are improving Bingeki to provide you with a better experience. Service will be back very soon."
            },
            settings: {
                title: "Settings",
                appearance: {
                    title: "APPEARANCE",
                    accent_color: "Accent Color",
                    spoiler_mode: "Spoiler Mode",
                    spoiler_enabled: "Spoiler Mode enabled",
                    spoiler_disabled: "Spoiler Mode disabled",
                    spoiler_help: "Blurs synopsis to avoid spoilers.",
                    nsfw_mode: "Sensitive Content (NSFW)",
                    nsfw_enabled: "Sensitive content enabled",
                    nsfw_disabled: "Sensitive content disabled",
                    nsfw_help: "Allows displaying content potentially inappropriate for younger audiences.",
                    restart_tutorial: "Restart Tutorial"
                },
                colors: {
                    red: "Bingeki Red",
                    cyan: "Cyan Future",
                    green: "Toxic Green",
                    yellow: "Sunny Yellow",
                    purple: "Royal Purple"
                },
                preferences: {
                    title: "PREFERENCES",
                    reduce_motion: "Reduce Motion",
                    sound_effects: "Sound Effects (UI)",
                    notifications: "Notifications"
                },
                data: {
                    title: "DATA MANAGEMENT",
                    storage_used: "Storage Used",
                    storage_local: "{{size}} MB stored locally",
                    clear_cache: "Clear Cache",
                    export_backup: "Export Backup",
                    import_backup: "Import Backup",
                    recalculate_button: "Recalculate Stats",
                    recalculate_success: "Stats recalculated successfully!",
                    recalculate_error: "Error recalculating stats.",
                    sync_library: "Sync Library",
                    danger_zone: "Danger Zone",
                    danger_desc: "Irreversible actions",
                    reset_all: "Reset All",
                    delete_account: "Delete Account",
                    confirm_sure: "Sure?",
                    no: "No",
                    yes_reset: "Yes, Reset",
                    cancel: "Cancel",
                    delete_confirm_title: "PERMANENTLY DELETE?",
                    delete_confirm_desc: "This action will delete your account, your library, and all your progress. Cannot be undone.",
                    goodbye: "GOODBYE"
                },
                about: {
                    title: "ABOUT",
                    version: "Version 3.6.1",
                    made_with: "Developed with ❤️ for anime and manga fans.",
                    credits: "Data provided by Jikan API (MyAnimeList). Images and titles belong to their respective creators."
                },
                sync: {
                    no_works: "No works to sync",
                    complete: "Sync complete: {{count}} updated",
                    error: "Sync error",
                    button: "Sync"
                },
                toast: {
                    reset_success: "All data has been reset!",
                    reset_error: "Reset error",
                    import_success: "Data imported successfully!",
                    import_error: "Import failed",
                    account_deleted: "Account deleted. Sayonara.",
                    relogin_required: "Please log in again to delete your account",
                    delete_error: "Deletion error",
                    cache_cleared: "Cache cleared (simulated)"
                }
            },
            mal_import: {
                title: "IMPORT FROM MAL",
                drop_file: "Drop your file here",
                file_types: ".xml or .xml.gz files from MyAnimeList",
                parsing: "Parsing file...",
                no_entries: "No entries found in file",
                parse_error: "Error parsing file",
                invalid_file: "Invalid file format",
                entries_found: "entries found",
                duplicates: "duplicates detected",
                resolve_duplicates: "Resolve duplicates",
                start_import: "Start import",
                keep_bingeki: "Keep Bingeki",
                use_mal: "Use MAL",
                complete_title: "Import complete!",
                imported: "imported",
                skipped: "skipped",
                errors: "errors",
                import_mal: "Import from MAL"
            },
            folders: {
                title: "FOLDERS",
                create: "CREATE A FOLDER",
                edit: "EDIT FOLDER",
                name: "Name",
                name_placeholder: "My folder",
                emoji: "Icon",
                color: "Color",
                create_btn: "Create",
                delete_confirm: "Delete folder \"{{name}}\"? Works will not be deleted.",
                deleted: "Folder deleted",
                delete: "Delete folder",
                empty: "No works in this folder",
                add_to: "Add to folder",
                remove_from: "Remove from folder",
                all_works: "All works",
                no_folders: "No folders created"
            },
            discover: {
                title: "DISCOVER",
                guest_banner: {
                    title: "✨ Create an account to unlock all features!",
                    subtitle: "Personal library, progress tracking, badges, rankings and more...",
                    cta: "Sign up for free"
                },
                hero: {
                    featured: "FEATURED",
                    add_to_list: "ADD TO MY LIST",
                    more_details: "MORE DETAILS"
                },
                search: {
                    placeholder: "Search for an anime, a manga...",
                    results_title: "Search Results",
                    no_results: "No results found. Try loosening the filters!"
                },
                filters: {
                    status: "Status",
                    all: "ALL",
                    airing: "AIRING",
                    complete: "COMPLETED",
                    upcoming: "UPCOMING",
                    rating: "Rating",
                    all_ages: "ALL AGES",
                    teen: "TEEN (PG-13)",
                    adult: "ADULT (R-17)",
                    min_score: "Min Score",
                    year: "Year",
                    year_placeholder: "e.g: 2024",
                    studio: "Studio",
                    all_studios: "ALL STUDIOS",
                    reset: "Reset",
                    genre: "Genre",
                    score: "Score"
                },
                surprise: {
                    title: "Need inspiration?",
                    subtitle: "Let fate choose your next adventure.",
                    button: "SURPRISE ME"
                },
                carousels: {
                    seasonal: "Seasonal Anime",
                    top_anime: "Top 10 Anime",
                    popular_manga: "Popular Manga",
                    top_manga: "Top 10 Manga"
                }
            },
            social: {
                title: "SOCIAL",
                tabs: {
                    ranking: "RANKING",
                    activity: "ACTIVITY",
                    challenges: "CHALLENGES",
                    parties: "PARTIES",
                    friends: "FRIENDS"
                },
                activity: {
                    title: "Your Friends' Activity",
                    loading: "Loading...",
                    no_activity: "No recent activity from your friends.",
                    add_friends_hint: "Add friends to see their activity!",
                    time: {
                        less_than_hour: "Less than an hour ago",
                        hours_ago: "{{hours}}h ago",
                        days_ago: "{{days}}d ago"
                    }
                },
                ranking: {
                    filter_by: "By:",
                    xp: "XP",
                    chapters: "Chapters",
                    streak: "Streak",
                    anonymous: "Anonymous",
                    pending: "Pending",
                    show_less: "Show less",
                    show_more: "Show more",
                    your_ranking: "Your ranking"
                },
                friends: {
                    add_title: "ADD A FRIEND",
                    search_placeholder: "Username or exact Email...",
                    search_btn: "SEARCH",
                    request_sent: "REQUEST SENT",
                    add_btn: "ADD",
                    not_found: "No user found with this email.",
                    requests_title: "RECEIVED REQUESTS",
                    accept: "ACCEPT",
                    no_friends: "You don't have any friends yet. Start a search!",
                    request_sent_toast: "Request sent to {{name}}!",
                    request_error: "Error sending the request.",
                    reject_success: "Request rejected and removed.",
                    reject_error: "Error rejecting the request. Please try again."
                }
            },
            landing: {
                hero: {
                    title: "YOUR STORY<br />BEGINS",
                    subtitle: "Don't just be a spectator. Become the protagonist.",
                    cta: "START THE ADVENTURE",
                    cta_logged_in: "ACCESS H.Q."

                },
                features: {
                    qg: {
                        title: "THE H.Q.",
                        description_1: "Organize your library like a strategist.",
                        description_2: "Separate your current reads, pauses, and archives. Never lose track of your favorite plots again.",
                        check_chapters: "CHAPTERS",
                        check_episodes: "EPISODES",
                        check_volumes: "VOLUMES"
                    },
                    mobile: {
                        title: "BINGEKI IN YOUR POCKET",
                        description_1: "Take your collection everywhere. A smooth, fast experience designed for mobile.",
                        feature_1: "Installable (PWA)",
                        feature_2: "Offline Mode",
                        feature_3: "Push Notifications (Soon)",
                        scan_qr: "Scan to install"
                    },
                    progression: {
                        title: "PROGRESSION",
                        description_1: "Every chapter read makes you stronger.",
                        description_2: "Gain XP by updating your list. Unlock <strong>Holographic Badges</strong> and climb the ranks of the Hunter Society.",
                        stats_title: "DETAILED STATS"
                    },
                    exploration: {
                        title: "EXPLORATION",
                        description_1: "An infinite database at your fingertips.",
                        description_2: "Search among thousands of Anime and Manga. Filter by genre, score, or popularity. Find your next addiction in seconds.",
                        search_placeholder: "Search for an anime, a manga...",
                        genres: {
                            seinen: "Seinen",
                            shonen: "Shonen",
                            romance: "Romance",
                            horror: "Horror",
                            isekai: "Isekai"
                        }
                    },
                    community: {
                        title: "COMMUNITY",
                        description_1: "You are not alone in this world.",
                        description_2: "Follow your friend's activities. Share your reviews without spoilers. Compare your collections and badges.",
                        friends: "FRIENDS",
                        debates: "DEBATES",
                        share: "SHARE",
                        see_discussion: "SEE DISCUSSION",
                        comments: {
                            levi: "This chapter was incredible !! 🔥",
                            armin: "I didn't expect that...",
                            mikasa: "Eren..."
                        }
                    },
                    details: {
                        title: "KNOW EVERYTHING",
                        description_1: "Dive into the heart of your works.",
                        description_2: "Synopsis, staff, detailed stats, characters... Access a complete identity card for each Anime and Manga. Don't miss any detail.",
                        mock_card: {
                            general: "GENERAL",
                            chapters: "CHAPTERS",
                            stats: "STATS",
                            reviews: "REVIEWS",
                            manga: "MANGA",
                            ongoing: "ONGOING",
                            view_full: "VIEW FULL DETAILS",
                            synopsis: "To save his friends, Yuji Itadori swallows a cursed finger and now shares his body with Ryomen Sukuna, the most powerful of curses."
                        }
                    },
                    wip: {
                        title: "WORK IN PROGRESS",
                        description_1: "Bingeki is alive. It evolves.",
                        description_2: "I am building this platform with you. Follow every update, suggest features, and see your ideas come to life.",
                        roadmap_btn: "VIEW ROADMAP",
                        timeline: {
                            feedback_title: "Feedback & Changelog 2.0",
                            feedback_desc: "Complete overhaul of the feedback system and update display.",
                            guilds_title: "\"Guild\" System",
                            guilds_desc: "Create your own clan, participate in guild wars, and dominate the ranking.",
                            soon: "SOON"
                        }
                    },
                    support: {
                        sfx: "PATRON",
                        tag: "TIPS FOR DEVS",
                        title: "SUPPORT THE PROJECT",
                        description_1: "Bingeki is developed with ❤️ as open-source",
                        description_2: "If Bingeki enriches your manga/anime experience, help finance the development of new features. Every coffee counts! ☕",
                        features: "New features",
                        servers: "High-performance servers",
                        premium: "Premium support",
                        kofi_alt: "Support me on Ko-fi"
                    },
                    final_cta: {
                        title: "JOIN THE ELITE",
                        title_logged_in: "READY TO CONTINUE?",
                        button: "CREATE MY ACCOUNT",
                        button_logged_in: "GO TO HQ"
                    }
                }
            },
            hunter_license: {
                title: "HUNTER LICENSE",
                top_3: "Top 3 Favorites",
                favorite: "FAVORITE",
                id_prefix: "ID",
                logout: "LOGOUT"
            },
            stats: {
                level: "Level",
                xp: "EXPERIENCE",
                passion: "Passion",
                diligence: "Diligence",
                collection: "Collection",
                reading: "Reading",
                completion: "Completion",
                streak: "Day Streak",
                badges: "Badges",
                chart_title: "HUNTER'S GRAPH",
                legend: {
                    title: "STATS CALCULATION",
                    level: "Level × 2 (max 100)",
                    passion: "XP ÷ 100 (max 100)",
                    diligence: "Day Streak (max 100)",
                    collection: "Works ÷ 2 (max 100)",
                    reading: "Chapters ÷ 10 (max 100)",
                    completion: "Completed × 5 (max 100)"
                }
            },
            footer: {
                tbc: "TO BE CONTINUED",
                feedback: "GIVE FEEDBACK",
                copyright: "Bingeki Experience.",
                changelog: "CHANGELOG",
                legal: "LEGAL & GDPR",
                privacy: "PRIVACY",
                terms: "TERMS",
                contact: "CONTACT",
                about: "ABOUT",
                credits: "CREDITS",
                wiki: "WIKI",
                contribution_msg: "Every contribution helps add new features!",
                donors: "DONORS"
            },
            donors: {
                title: "OUR HEROES",
                subtitle: "A huge thank you to those who support the project financially.",
                top_donor: "TOP DONOR",
                rank_1: "THE KING OF SUPPORT",
                creator_desc: "Creator of Inazuma DB",
                amount: "Total donation",
                thank_you_title: "THANK YOU!",
                thank_you_desc: "Thanks to you, Bingeki keeps growing. Servers, domain, new features... all this is thanks to your generosity.",
                become_donor: "BECOME A DONOR"
            },
            tutorial: {
                welcome_title: "Welcome to Hunter Society",
                welcome_desc: "Bingeki is your ultimate manga tracker. Let's take a quick tour.",
                profile_title: "Your Profile & Nen",
                profile_desc: "Here you can see your XP, Level, and your unique Nen chart based on your reading habits.",
                discover_title: "Discover & Search",
                discover_desc: "Find new manga and anime to add to your collection easily.",
                library_title: "Your Library",
                library_desc: "All your tracked works are here. Update them as you read.",
                import_title: "Easy Import",
                import_desc: "Already have a list on MyAnimeList? Import it in one click and recover your history."
            },
            dashboard: {
                title: "DASHBOARD",
                rank: "RANK",
                hero_default: "Hero",
                discover_btn: "Discover",
                profile_btn: "PROFILE",
                goal: "Goal",
                weekly: "Weekly",
                chapters_read: "chapters read",
                streak: "Streak",
                days: "days",
                chapter: "Chapter",
                continue_reading: "Continue reading",
                in_progress: "In progress",
                see_all: "SEE ALL",
                no_reading: "No reading in progress",
                discover: "DISCOVER",
                friends_activity: "Friends activity",
                loading: "Loading...",
                no_activity: "No activity yet",
                add_friends: "Add friends",
                see_all_activity: "SEE ALL ACTIVITY",
                to_discover: "TO DISCOVER",
                see_more_suggestions: "SEE MORE SUGGESTIONS",
                just_now: "Just now",
                hours_ago: "{{hours}}h ago",
                days_ago: "{{days}}d ago",
                community_title: "JOIN THE COMMUNITY",
                community_subtitle: "Follow our adventures and share your passion on our official social networks.",
                community_discord: "JOIN DISCORD",
                community_instagram: "FOLLOW US ON INSTA",
                community_tiktok: "WATCH OUR TIKTOKS",
                community_discord_desc: "Chat with other fans and the team",
                community_instagram_desc: "News, giveaways and behind the scenes",
                community_tiktok_desc: "Edits, news and fun"
            },
            activity_labels: {
                watch: "watched",
                read: "read",
                complete: "completed",
                add_work: "added",
                level_up: "leveled up to",
                badge: "unlocked the badge"
            },
            library: {
                title: "My Library",
                friend_title: "{{name}}'s Library",
                read_only: "Read-only view (no modification)",
                load_error: "Failed to load library",

                total: "Total",
                completed: "Completed",
                progression: "Progress",
                add_work: "ADD A WORK",
                search: "Search...",
                filters: "FILTERS",
                type: "TYPE",
                all: "ALL",
                status: "STATUS",
                sort: {
                    recent: "Recent",
                    added: "Added",
                    alphabetical: "A-Z",
                    progress: "Progress"
                },
                view_grid: "Grid View",
                view_list: "List View",
                export: "Export",
                import: "Import",
                select: "SELECT",
                cancel: "CANCEL",
                delete_selected: "DELETE",
                delete_confirm: "Delete {{count}} works?",
                deleted_success: "{{count}} works deleted",
                deleted_single: "\"{{title}}\" has been deleted",
                data_imported: "Data imported!",
                error: "Error",
                no_works: "No works found",
                delete_title: "DELETE",
                delete_question: "Delete \"{{title}}\"?",
                delete_warning: "This action is irreversible. Your progress and notes will be lost.",
                delete_btn: "DELETE",
                delete_work: "Delete work",
                episode: "Ep.",
                chapter: "Ch."
            },
            changelog: {
                title: "LOGBOOK",
                subtitle: "The history of Bingeki platform updates.",
                updates: "Updates",
                current_version: "Current Version",
                new: "NEW",
                to_be_continued: "TO BE CONTINUED...",
                entries: {
                    v3_7: {
                        date: "March 17, 2026",
                        title: "Survey & Admin Revolution",
                        description: "Complete survey redesign, admin dashboard, and social integration.",
                        changes: [
                            "Survey: Redesigned UX with sequential display and smooth auto-scroll.",
                            "Admin: New Dashboard for real-time visualization of survey results.",
                            "Social: Full Instagram and TikTok integration (Footer + Survey).",
                            "I18n: Added a dynamic language switcher to the form.",
                            "Security: Updated Firestore rules to secure responses.",
                            "Fix: Correction of the official Discord link across the platform."
                        ]
                    },
                    v3_6: {
                        date: "March 07, 2026",
                        title: "Anime News & Security Update",
                        description: "Full news feed, scraper optimizations, and major security fixes.",
                        changes: [
                            "News: New dedicated section with optimized SEO and auto summary.",
                            "Scraper: Fetch parallelization and intelligent formatting for Crunchyroll/ANN.",
                            "Security: 100% resolution of critical vulnerabilities via overrides.",
                            "UI: Improved visibility for the back-to-top button.",
                            "Automation: Switched to a 4-hour update cycle."
                        ]
                    },
                    v3_5: {
                        date: "February 13, 2026",
                        title: "Visual Assets & Core Sync",
                        description: "Introduction of high-fidelity mockups and admin synchronization.",
                        changes: [
                            "Assets: Complete library of CSS mockups (Discover, Library, Social, Auth).",
                            "Admin: Real-time profile synchronization for immediate access.",
                            "Auth: Secure access to the login page during maintenance.",
                            "Core: Deployment scripts cleanup and maintenance logic optimization."
                        ]
                    },
                    v3_4: {
                        date: "February 01, 2026",
                        title: "Haptic Feedback",
                        description: "Enhanced tactile experience for better immersion.",
                        changes: [
                            "Haptic: Tactile feedback on all buttons for a physical feel.",
                            "UI: Better responsiveness via light vibrations.",
                            "Tech: New useHaptics hook to manage vibrations."
                        ]
                    },
                    v3_3: {
                        date: "January 22, 2026",
                        title: "Mobile Experience & PWA",
                        description: "Major optimization for mobile devices and application installation.",
                        changes: [
                            "New: Installable App (PWA) with offline support.",
                            "UI: New mobile promotion section on Landing Page.",
                            "UI: Install button moved to footer for clarity.",
                            "UX: Automatic scroll-to-top on navigation.",
                            "Fix: Resolved mobile display issues (Header, Search, Library)."
                        ]
                    },
                    v3_2: {
                        date: "January 16, 2026",
                        title: "Social & Security",
                        description: "Friend library access, Discord Login, and security hardening.",
                        changes: [
                            "New: View your friends' library in read-only mode.",
                            "New: Discord OAuth login.",
                            "Security: Enhanced XSS protection on image URLs.",
                            "Security: Strict user level validation (max 100).",
                            "Fix: Confirmation before marking a work as completed.",
                            "Tech: ESLint audit and code error fixes."
                        ]
                    },
                    v3_1: {
                        date: "January 16, 2026",
                        title: "SEO & Global I18n Fix",
                        description: "Massive SEO improvement and global translation system correction.",
                        changes: [
                            "SEO: SEO component integration on Details pages (Animes, Characters, Staff).",
                            "I18n: Complete restructuring of namespaces for better key resolution.",
                            "I18n: Full translation of PersonDetails sheet.",
                            "Fix: Correction of theme keys (Openings/Endings) and loading titles.",
                            "Git: Migration to origin/main with automatic deployment."
                        ]
                    },
                    v3_0: {
                        date: "January 14, 2026",
                        title: "Data Shield & Support",
                        description: "A critical update for your data protection and project support.",
                        changes: [
                            "Critical Fix: Data protection system (Anti-reset for level/XP).",
                            "New: \"Tips for Devs\" section with Ko-fi integration.",
                            "Tech: Automatic backups and intelligent cloud/local data merging.",
                            "UI: Visual improvement of support buttons on home and footer."
                        ]
                    },
                    v2_9: {
                        date: "January 03, 2026",
                        title: "Trailer & UI Polish",
                        description: "Critical fix for the trailer player and interface optimization.",
                        changes: [
                            "Fix: The trailer's \"Close\" button is now always visible (Z-Index fix).",
                            "Tech: Use of React Portals for full-screen modals.",
                            "UI: Improved contrast for interaction buttons."
                        ]
                    },
                    v2_8: {
                        date: "January 03, 2026",
                        title: "Showcase & Accessibility",
                        description: "Highlighting work details and opening to the public.",
                        changes: [
                            "New: \"Learn Everything\" section on the Landing Page (Brutalist Showcase)",
                            "Accessibility: Schedule and Changelog now accessible to guests",
                            "New: Credits and legal mentions page",
                            "UI: Harmonization of Jujutsu Kaisen visuals on the showcase"
                        ]
                    },
                    v2_7: {
                        date: "January 03, 2026",
                        title: "Characters and Seiyuu",
                        description: "Explore detailed character and voice actor profiles with a wiki style.",
                        changes: [
                            "New: Dedicated Character pages with wiki sheet (Age, Clan, Kekkei Genkai, etc.)",
                            "New: Dedicated Seiyuu pages with structured info (Twitter, Birthplace, etc.)",
                            "Navigation: Click on characters/seiyuu from the casting section",
                            "UI: Streaming service logos (Crunchyroll, Netflix, ADN, etc.)",
                            "UI: Collapsible Extended Universe with adaptive cards",
                            "Responsive: Mobile improvement for Feedback and WorkDetails pages"
                        ]
                    },
                    v2_6: {
                        date: "January 03, 2026",
                        title: "Community Voices & Discovery",
                        description: "Integration of community reviews and search improvements.",
                        changes: [
                            "New: \"Reviews\" tab on sheets (MyAnimeList integration)",
                            "New: Studio filter in advanced search",
                            "UI: Brutalist redesign of the loading screen",
                            "UI: Improvement of the reviews grid and search filters"
                        ]
                    },
                    v2_5: {
                        date: "January 03, 2026",
                        title: "Weekly Follow-up",
                        description: "Never miss an episode again with the new Release Schedule.",
                        changes: [
                            "New Schedule: View anime releases day by day.",
                            "Quick access via Header (Calendar icon).",
                            "Updated streaming buttons for more clarity.",
                            "Broadcasting times indicated on schedule cards."
                        ]
                    },
                    v2_4: {
                        date: "January 03, 2026",
                        title: "Data Depth",
                        description: "Full immersion with casting details and community statistics.",
                        changes: [
                            "Enriched Casting: Discover original Seiyuu (voice actors) under each character.",
                            "Statistics: Visualize popularity and score distribution of the work.",
                            "Brutalist Visualization: New charts for scores and watching status.",
                            "Optimization of the Details page structure."
                        ]
                    },
                    v2_3: {
                        date: "January 03, 2026",
                        title: "Discovery & Immersion",
                        description: "Visual enrichment and discovery of new gems.",
                        changes: [
                            "New 'Gallery' tab: Explore official artworks in high quality.",
                            " 'You Might Also Like' section: Recommendations based on community votes.",
                            "Integration of a 'Click-to-Zoom' modal for images.",
                            "UX Improvement: Video autoplay stop and grid optimization.",
                            "New 'MUSIC' tab: Listen to all openings and endings with integrated YouTube search."
                        ]
                    },
                    v2_2: {
                        date: "January 03, 2026",
                        title: "Deep Dive Update",
                        description: "Dive into your favorite works with Casting and Extended Universe.",
                        changes: [
                            "Added 'Casting' section: Top 10 main characters at a glance.",
                            "Added 'Extended Universe' section: Easy navigation between prequels, sequels, and side-stories.",
                            "New 'Invisible' horizontal scroll style for an ultra-clean aesthetic.",
                            "API performance optimization (Parallel details loading)."
                        ]
                    },
                    v2_1: {
                        date: "January 03, 2026",
                        title: "The Details Era",
                        description: "A major update to enrich anime and manga sheets.",
                        changes: [
                            "Added trailers directly on the details page.",
                            "New info: Studios, Rank, Popularity, Season, and Year.",
                            "New Changelog page to track update history.",
                            "Improved API vs Library data synchronization."
                        ]
                    },
                    v1_5: {
                        date: "December 19, 2025",
                        title: "Mobile & Social Optimization",
                        description: "Focus on mobile experience and stability.",
                        changes: [
                            "Complete redesign of Social display on mobile.",
                            "Fixed chart display issues.",
                            "Firestore permissions optimization.",
                            "Resolved duplicates in Discovery page."
                        ]
                    },
                    v1_4: {
                        date: "December 18, 2025",
                        title: "Mobile First & Stability",
                        description: "Crucial improvements for small screen navigation.",
                        changes: [
                            "Global improvement of 'Bingeki Style' responsivity on mobile.",
                            "Fixed chart resizing issues.",
                            "Correct injection of user IDs in profiles."
                        ]
                    },
                    v1_3: {
                        date: "December 17, 2025",
                        title: "Community & Feedback",
                        description: "Introduction of community features.",
                        changes: [
                            "Advanced commenting system with mentions.",
                            "New Feedback page and admin interface.",
                            "Added 'Level 100' special rank.",
                            "Enhanced user data security.",
                            "Brutalist style applied to text areas."
                        ]
                    },
                    v1_2: {
                        date: "December 17, 2025",
                        title: "Profile 2.0 & Gamification",
                        description: "Major overhaul of user identity and progression system.",
                        changes: [
                            "New Profile: Nen Chart, Top 3 Favorites, and Badges.",
                            "Challenge invitation system and Watch Party controls.",
                            "Improved profile banner management.",
                            "XP and progression logic update.",
                            "'SFW' content filter enabled by default."
                        ]
                    },
                    v1_1: {
                        date: "December 17, 2025",
                        title: "Discover & UI Polish",
                        description: "Discovery improvement and visual harmonization.",
                        changes: [
                            "New immersive 'Discover' interface.",
                            "Functional genre filters via API.",
                            "Harmonization of buttons and brutalist cards.",
                            "Fixed library styles."
                        ]
                    }
                }
            },
            legal: {
                back: "BACK",
                title: "LEGAL & GDPR",
                section1_title: "1. SITE PUBLISHER",
                name: "Name:",
                address: "Address:",
                contact: "Contact:",
                status: "Status:",
                status_value: "Freelance Developer / Personal Project",
                section2_title: "2. HOSTING",
                hosting_text: "This site is hosted by Firebase (Google LLC).",
                hosting_data: "Some data (images) may be stored via other third-party services.",
                section3_title: "3. INTELLECTUAL PROPERTY",
                ip_design: "The design, structure, and code of \"Bingeki Experience\" are the exclusive property of the publisher.",
                ip_images: "Images of works (manga/anime) are used for illustration purposes and remain the property of their respective rights holders.",
                section4_title: "4. PERSONAL DATA (GDPR)",
                gdpr_intro: "In accordance with the General Data Protection Regulation (GDPR), we inform you that:",
                gdpr_collect_title: "Collection:",
                gdpr_collect: "The data collected (email, profile picture, progress) is only used for the application's operation (library backup, gamification).",
                gdpr_responsible_title: "Responsible:",
                gdpr_responsible: "Moussandou Mroivili is the data controller.",
                gdpr_access_title: "Right of access:",
                gdpr_access: "You have the right to access, rectify, and delete your data. You can delete your account and all associated data directly from the application settings or by contacting us.",
                gdpr_share_title: "Sharing:",
                gdpr_share: "Your data is neither sold, rented, nor transferred to third parties.",
                gdpr_cookies_title: "Cookies:",
                gdpr_cookies: "We use essential technical cookies to maintain your session. To learn more, see our Privacy Policy.",
                ai_title: "Artificial Intelligence Transparency (AI Act)",
                ai_text: "In accordance with transparency principles, we inform our users that artificial intelligence-based tools were used to assist in the creation of graphic elements (such as logos) as well as part of the source code for this website. All generated content has undergone human review and validation.",
                section5_title: "5. CONTACT",
                contact_text: "For any questions, information requests or complaints, you can contact us at the following address:"
            },
            credits: {
                title: "CREDITS",
                role: "DEVELOPER & CREATOR",
                description_1: "<strong>Bingeki</strong> was born from a passion for manga and the desire to create a unique user experience.",
                description_2: "Developed with love, coffee, and a lot of CSS. This project is a demonstration of what's possible when you mix brutalist design with modern technologies.",
                made_with: "Made with",
                in_marseille: "in Marseille"
            },
            auth: {
                back: "BACK",
                hero_title: "YOUR<br />ADVENTURE<br />BEGINS",
                hero_subtitle: "Join Bingeki to transform your manga passion into a true RPG quest.",
                feature_rpg: "RPG Tracking",
                feature_progression: "Progression",
                welcome_back: "WELCOME BACK!",
                create_account: "CREATE ACCOUNT",
                resume_progress: "Resume your progress",
                start_legend: "Start your legend",
                placeholder_pseudo: "Username",
                placeholder_email: "Email",
                placeholder_password: "Password",
                login_title: "LOGIN",
                register_title: "REGISTER",
                login_required: "Login required",
                login_btn: "LOG IN",
                register_btn: "SIGN UP",
                or: "OR",
                google_login: "CONTINUE WITH GOOGLE",
                discord_login: "CONTINUE WITH DISCORD",
                no_account: "No account yet? Sign up",
                has_account: "Already have an account? Log in",
                error_pseudo: "Please enter a username",
                error_generic: "An error occurred",
                mobile_title: "YOUR ADVENTURE",
                mobile_subtitle: "Track your manga, earn XP and challenge your friends.",
                choose_pseudo_title: "CHOOSE YOUR USERNAME",
                choose_pseudo_desc: "For a better experience, please choose a unique username that will represent you in the community.",
                save_pseudo: "CONFIRM MY USERNAME",
                error_pseudo_short: "Username must be at least 3 characters",
                error_pseudo_taken: "This username is already taken",
            },
            feedback: {
                success_icon: "💌",
                success_title: "THANK YOU!",
                success_message: "Your feedback has been received. Bingeki improves thanks to you!",
                back_home: "Back to home",
                title: "HELP US IMPROVE",
                subtitle_1: "Found a bug? Got a great idea? Or just want to say hello?",
                subtitle_2: "Your feedback matters a lot for the platform's evolution.",
                rating_label: "Your Overall Rating",
                category_label: "What is this about?",
                category_bug: "A BUG",
                category_feature: "AN IDEA",
                category_general: "GENERAL",
                message_label: "Your Message",
                message_placeholder: "Tell us everything...",
                email_label: "Email (Optional)",
                email_placeholder: "In case we need to contact you...",
                submit_sending: "SENDING...",
                submit_btn: "SEND MY FEEDBACK",
                toast_select_rating: "Please select a rating",
                toast_write_message: "Please write a message",
                toast_success: "Thank you for your feedback!",
                toast_error: "Error while sending. Please try again.",
                toast_unexpected: "Unexpected error.",
                error_permission: "Permission denied.",
                error_loading_detail: "Unable to load details.",
                // Enhanced fields
                priority_label: "Priority",
                priority_low: "LOW",
                priority_medium: "MEDIUM",
                priority_high: "HIGH",
                priority_critical: "CRITICAL",
                status_open: "Open",
                status_in_progress: "In Progress",
                status_resolved: "Resolved",
                status_closed: "Closed",
                attachments_label: "Screenshots (max 3)",
                attachments_hint: "Drag & drop or click to add",
                my_tickets: "My Tickets",
                no_tickets: "You haven't sent any feedback yet.",
                ticket_id: "Ticket #",
                last_updated: "Last updated",
                admin_reply: "Admin Response",
                your_message: "Your Message",
                view_details: "View Details",
                submit_another: "Submit another feedback"
            },
            components: {
                add_work_modal: {
                    title: "RECRUIT A WORK",
                    tab_search: "Search",
                    tab_manual: "Manual",
                    search_placeholder: "Search (e.g. Naruto, Berserk...)",
                    no_results: "No trace detected...",
                    search_hint: "TYPE A NAME TO START THE HUNT",
                    label_title: "TITLE",
                    title_placeholder: "Work title...",
                    label_type: "TYPE",
                    label_chapters: "CHAPTERS",
                    label_episodes: "EPISODES",
                    total_placeholder: "Total...",
                    label_image: "IMAGE (OPTIONAL)",
                    drag_and_drop: "Drag an image or click to upload",
                    or_paste_url: "Or paste a URL below",
                    url_placeholder: "Or image URL...",
                    add_work: "ADD WORK",
                    chapters_abbr: "Chaps",
                    episodes_abbr: "Eps"
                },
                challenges_section: {
                    title: "MY CHALLENGES",
                    types: {
                        race_to_finish: "Race to finish",
                        most_chapters: "Most chapters",
                        streak_battle: "Streak battle"
                    },
                    new_challenge: "NEW CHALLENGE",
                    loading: "Loading...",
                    no_challenges: "No challenges in progress",
                    no_challenges_hint: "Create a challenge and face your friends!",
                    login_required: "Log in to see your challenges",
                    status_active: "Active",
                    status_pending: "Pending",
                    status_completed: "Completed",
                    you: "(You)",
                    days: "days",
                    chapters_abbr: "ch.",
                    accept: "Accept",
                    decline: "Decline",
                    cancel: "Cancel",
                    modal_title: "NEW CHALLENGE",
                    challenge_name: "Challenge name",
                    challenge_name_placeholder: "E.g. Who will finish One Piece first?",
                    challenge_type: "Challenge type",
                    challenge_work: "Challenge work",
                    add_works_hint: "Add works to your library",
                    invite_friends: "Invite friends",
                    selected: "selected",
                    no_friends: "You don't have any friends yet",
                    cancel_btn: "Cancel",
                    create_btn: "Create challenge",
                    toast_fill_fields: "Fill all fields and select friends",
                    toast_created: "Challenge created!",
                    toast_accepted: "Challenge accepted!",
                    toast_declined: "Challenge declined",
                    toast_cancelled: "Challenge cancelled"
                },
                progress_button: {
                    completed: "Completed"
                },
                xp_bar: {
                    level: "LVL"
                }
            },
            challenges: {
                title: "CHALLENGES (Under construction)",
                description: "This page is under development."
            },
            schedule: {
                title: "RELEASE CALENDAR",
                subtitle: "Never miss an episode! Times are based on Japanese broadcast.",
                days: {
                    monday: "Monday",
                    tuesday: "Tuesday",
                    wednesday: "Wednesday",
                    thursday: "Thursday",
                    friday: "Friday",
                    saturday: "Saturday",
                    sunday: "Sunday"
                },
                unknown_time: "Unknown time",
                no_anime: "No anime found for this day... It's quiet! 🍃"
            },
            admin: {
                sidebar: {
                    admin_panel: "ADMIN PANEL",
                    dashboard: "Dashboard",
                    users: "Users",
                    feedback: "Feedback",
                    system: "System",
                    survey: "Survey",
                    back_to_site: "Back to site",
                    exit: "Exit"
                },
                dashboard: {
                    loading: "Loading dashboard...",
                    title: "Control Center",
                    subtitle: "Overview of activity on Bingeki",
                    users_label: "Users",
                    today: "today",
                    feedback_label: "Feedback",
                    tickets_pending: "tickets pending",
                    system_label: "System",
                    activity_volume: "Activity Volume",
                    last_7_days: "LAST 7 DAYS",
                    recent_members: "Recent Members",
                    anonymous: "Anonymous",
                    quick_actions: "Quick Actions",
                    manage_users: "Manage Users",
                    view_feedback: "View Feedback",
                    live_console: "Live Console",
                    survey_label: "Surveys",
                    view_survey_details: "View details",
                    just_now: "Just now",
                    minutes_ago: "{{count}} min ago",
                    hours_ago: "{{count}}h ago",
                    days_ago: "{{count}}d ago",
                    last_seen: "Last Seen",
                    online: "Online",
                    dau: "Active (24h)",
                    wau: "Active (7d)",
                    mau: "Active (30d)",
                    engagement_rate: "Engagement",
                    engagement: "Engagement",
                    growth: "Growth",
                    funnel: "Funnel",
                    retention: "Retention",
                    engagement_breakdown: "Breakdown",
                    top_content: "Top Content",
                    active_users: "Active Users"
                },
                users: {
                    title: "User Management",
                    members_count: "{{count}} registered members",
                    search_placeholder: "Search (Email, Username...)",
                    loading: "Loading...",
                    no_name: "No name",
                    ban: "Ban",
                    admin: "Admin",
                    view_profile: "View Profile",
                    ban_yes: "YES",
                    ban_no: "NO",
                    confirm_ban: "Do you really want to {{action}} this user?",
                    confirm_admin: "WARNING: {{action}} administrator rights?",
                    update_error: "Error during update",
                    action_ban: "ban",
                    action_unban: "unban",
                    action_give: "Give",
                    action_remove: "Remove",
                    delete_account: "Delete Account",
                    confirm_delete: "Are you SURE you want to permanently delete this account? All data (library, level, activities) will be LOST forever.",
                    delete_success: "Account deleted successfully.",
                    delete_error: "Error deleting account."
                },
                feedback: {
                    title: "Feedback Center",
                    tickets_pending: "{{count}} tickets pending",
                    refresh: "Refresh",
                    loading: "Loading messages...",
                    load_error: "Failed to load feedback",
                    no_messages: "No messages at the moment.",
                    anonymous: "Anonymous",
                    resolved: "Resolved",
                    reply: "Reply",
                    no_email: "No email",
                    reopen: "Reopen",
                    mark_resolved: "Mark as resolved",
                    delete: "Delete",
                    confirm_delete: "Delete this feedback permanently?",
                    delete_error: "Error during deletion",
                    status_error: "Error updating status",
                    priority_error: "Error updating priority"
                },
                system: {
                    title: "System & Logs",
                    subtitle: "Real-time monitoring and global configuration",
                    global_announcement: "Global Announcement",
                    message_placeholder: "Message for all users...",
                    info: "INFO",
                    alert: "ALERT",
                    enable_announcement: "Enable announcement",
                    update_live: "Update (LIVE)",
                    save_offline: "Save (Offline)",
                    server_config: "Server Configuration",
                    maintenance_mode: "Maintenance Mode",
                    maintenance_desc: "Blocks access except for admins",
                    registrations: "Registrations",
                    registrations_desc: "Allow new members",
                    database: "Database",
                    data_shield: "Data Shield Protocol v3.0 Active",
                    manual_backup: "Start Manual Backup",
                    live: "LIVE"
                },
                survey: {
                    title: "Survey Analytics",
                    loading: "Loading responses...",
                    total_responses: "responses",
                    raw_data: "Raw Data",
                    date: "Date",
                    email: "Email",
                    profile: "Profile",
                    interest: "Interest",
                    no_responses: "No responses found",
                    labels: {
                        total: "Total Responses",
                        waitlist: "Waitlist",
                        hyped: "Hyped",
                        premium: "Premium"
                    }
                }
            },
            work_details: {
                back: "BACK",
                loading: "LOADING...",
                not_found: "WORK NOT FOUND",
                not_found_desc: "Unable to retrieve details. Check your connection or the ID.",
                tabs: {
                    general: "GENERAL",
                    chapters_list: "CHAPTERS LIST",
                    episodes_list: "EPISODES LIST",
                    music: "MUSIC",
                    reviews: "REVIEWS",
                    gallery: "GALLERY",
                    stats: "STATISTICS"
                },
                meta: {
                    score: "Score",
                    chaps: "Chaps",
                    eps: "Eps"
                },
                streaming: {
                    watch_on: "Watch on",
                    watch: "WATCH",
                    read: "READ",
                    search_episode: "Google Search - Episode",
                    search_chapter: "Read - Chapter"
                },
                synopsis: {
                    title: "SYNOPSIS",
                    show_less: "Less",
                    show_more: "Read more"
                },
                info: {
                    season: "SEASON",
                    studio: "STUDIO",
                    rank: "RANK",
                    popularity: "POPULARITY"
                },
                trailer: {
                    title: "TRAILER",
                    watch: "WATCH TRAILER",
                    close: "CLOSE"
                },
                casting: {
                    title: "CASTING",
                    show_more: "SEE MORE",
                    show_less: "SEE LESS"
                },
                universe: {
                    title: "EXTENDED UNIVERSE",
                    collapse: "Collapse",
                    expand: "See {{count}} more"
                },
                library: {
                    interested: "INTERESTED?",
                    interested_title: "ADD TO MY LIST",
                    interested_desc: "Track your progress and get notifications!",
                    add_desc: "Add this work to your library to track your progress!",
                    add_to_collection: "ADD TO MY COLLECTION",
                    login_to_add: "LOG IN TO ADD",
                    added_toast: "Added to your library!"
                },
                progress: {
                    title: "PROGRESS",
                    edit: "Edit",
                    saved_toast: "Progress saved!",
                    mark_complete_confirm: "Have you finished this work? Your progress will be set to maximum.",
                    ok: "OK"
                },
                status: {
                    title: "STATUS",
                    watching: "Watching",
                    reading: "Reading",
                    completed: "Completed",
                    on_hold: "On Hold",
                    dropped: "Dropped",
                    plan_to_watch: "Plan to Watch",
                    plan_to_read: "Plan to Read",
                    finished_airing: "Finished Airing",
                    currently_airing: "Currently Airing"
                },
                rating: {
                    title: "MY RATING"
                },
                notes: {
                    title: "MY NOTES",
                    placeholder: "Write your thoughts here..."
                },
                comments: {
                    title: "COMMENTS",
                    time_now: "Just now",
                    time_hours: "{{hours}}h ago",
                    time_days: "{{days}}d ago",
                    reply: "REPLY",
                    reply_to: "Reply to {{name}}...",
                    spoiler: "SPOILER",
                    friends_reading: "{{count}} friend(s) {{action}} this work too",

                    friends_count: "You and {{count}} friend(s) are also reading this work",
                    friends_watching: "is watching",
                    friends_reading_action: "is reading",
                    share_opinion: "Share your opinion...",
                    contains_spoilers: "Contains spoilers",
                    publish: "PUBLISH",
                    login_to_comment: "Log in to comment",
                    loading: "Loading comments...",
                    no_comments: "No comments. Be the first!",
                    error_loading: "Loading error:",
                    permission_error: "You do not have permission to view comments (Firestore Rules).",
                    generic_error: "Unable to load comments.",
                    added_toast: "Comment added!",
                    error_toast: "Error adding comment",
                    reply_added_toast: "Reply added!",
                    reply_error_toast: "Error adding reply",
                    show_less: "▲ Collapse",
                    show_more: "▼ See {{count}} more",
                    reading: "You and {{count}} friend(s) are also reading this work",
                    watching: "You and {{count}} friend(s) are also watching this work",
                    placeholder: "Share your opinion (no spoilers please)...",
                    submit: "SUBMIT"
                },
                danger: {
                    delete_button: "REMOVE FROM MY LIBRARY",
                    delete: "Remove from library",
                    deleted_toast: "\"{{title}}\" has been removed",
                    modal_title: "DELETION",
                    confirm_title: "Delete \"{{title}}\"?",
                    confirm_desc: "This action is irreversible. Your progress and notes will be lost.",
                    cancel: "CANCEL",
                    confirm_delete: "DELETE"
                },
                stats: {
                    no_data: "No statistics or staff information available for this work.",
                    staff_title: "STAFF (MAIN)",
                    title: "STATISTICS",
                    library_distribution: "LIBRARY DISTRIBUTION",
                    score_distribution: "SCORE DISTRIBUTION",
                    show_more: "SHOW MORE",
                    show_less: "SHOW LESS"
                },
                reviews: {
                    title: "COMMUNITY REVIEWS",
                    read_full: "READ FULL REVIEW",
                    none_found: "NO REVIEWS FOUND",
                    be_first: "Be the first to give your opinion in the comments section below!"
                },
                gallery: {
                    title: "OFFICIAL GALLERY",
                    no_images: "No images available."
                },
                themes: {
                    title: "SOUNDTRACKS",
                    openings: "OPENINGS",
                    endings: "ENDINGS",
                    no_openings: "No opening found.",
                    no_endings: "No ending found.",
                    no_music: "No music (opening/ending) available."
                },
                recommendations: {
                    title: "YOU MIGHT ALSO LIKE",
                    votes: "VOTES"
                },
                chapters: {
                    unknown_count: "UNKNOWN CHAPTER COUNT",
                    unknown_desc: "Please set the total number of chapters in the \"General\" tab to generate the list.",
                    set_count: "Set chapter count",
                    prompt: "Enter total number of chapters:",
                    prompt_total: "Enter total number:",
                    click_to_edit: "Click to edit total"
                }
            },
            character_details: {
                loading_title: "Loading...",
                loading_description: "Retrieving character information.",
                back: "BACK",
                not_found: "Character not found.",
                removed_from_favorites: "Removed from favorites",
                added_to_favorites: "Added to favorites",
                favorites: "favorites",
                identity: "IDENTITY",
                biography: "BIOGRAPHY",
                source: "Source",
                seiyuu: "SEIYUU (JP VOICE ACTORS)",
                anime_appearances: "ANIME APPEARANCES",
                manga_appearances: "MANGA APPEARANCES"
            },
            privacy: {
                title: "PRIVACY POLICY",
                intro: "Protecting your privacy is important to us.",
                cookies_title: "Cookies",
                cookies_desc: "This site uses cookies (including third-party cookies) to personalize content and analyze our traffic.",
                ads_title: "Google Ads (AdSense)",
                ads_desc: "Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.",
                data_title: "Data Collection",
                data_desc: "We collect certain data (such as your reading progress) solely to provide you with our services. We never sell your personal data to third parties."
            },
            terms: {
                title: "TERMS OF SERVICE",
                intro: "By using Bingeki, you agree to comply with these terms of use.",
                rules_title: "Rules of Conduct",
                rules_desc: "Be respectful to other members of the community. No abusive or illegal content will be tolerated."
            },
            contact: {
                title: "CONTACT US",
                intro: "A question, a suggestion or a technical issue? Feel free to contact us.",
                email_label: "Direct email:"
            },
            about: {
                title: "ABOUT BINGEKI",
                vision_title: "A platform for enthusiasts",
                vision_p1: "Bingeki is a platform designed for anime and manga enthusiasts who want to experience their passion in a more immersive, organized, and interactive way. In the age of streaming and mass consumption of cultural content, access to anime and manga has never been easier. Yet, despite this abundance of content, the user experience often remains fragmented and limited. Fans use different sites to track their series, discover new works or exchange with other enthusiasts, without there really being a centralized space capable of bringing all these dimensions together.",
                vision_p2: "It is precisely this realization that gave birth to Bingeki.",
                problem_p1: "Today, most available tools primarily allow for consulting databases or managing watchlists. They serve a useful function but remain mostly static. Users can rate an anime, indicate they've finished it, or add it to a list, but the experience often ends there. However, the way fans consume anime and manga culture has evolved: they want to track their progress, share their discoveries, compare their experiences, and be part of a community that values their engagement.",
                problem_p2: "Bingeki was designed to respond to this evolution.",
                evolution_p1: "The platform transforms simple anime and manga tracking into a truly personal and social experience. It allows users to centralize their content consumption, easily track their progress in the series and manga they watch or read, and discover new works tailored to their tastes. The goal is not just to organize information, but to create a dynamic environment in which every interaction contributes to enriching the user experience.",
                core_p1: "At the heart of Bingeki lies a simple idea: passion for anime and manga deserves a platform that matches the level of commitment of its fans.",
                features_p1: "The platform thus offers a set of features designed to accompany users in their daily life as fans. Users can create and manage their watchlists, track their progress in episodes or chapters, access detailed info sheets on works, and explore new content. Bingeki also facilitates discovery by highlighting recommendations and information on currently airing anime seasons.",
                features_p2: "But the experience doesn't stop at personal tracking.",
                social_p1: "Bingeki also integrates a social dimension that allows fans to interact, share their activity, and discover what the community is watching or reading. User profiles thus become a showcase of everyone's passion, where one can find their statistics, favorite works, and overall progression. This approach transforms the individual experience into a collective one, where users can exchange, compare tastes, and discover new recommendations through the activity of other members.",
                gamification_p1: "Another important aspect of Bingeki is the notion of progression. The platform values user engagement by integrating mechanisms inspired by progression systems found in video games. By following anime, discovering new works, or interacting with the platform, users can see their profile and activity evolve. This gamified approach makes the experience more motivating and immersive, while strengthening the sense of belonging to the community.",
                design_p1: "Ergonomics and accessibility have also been priorities in the design of Bingeki. The platform is developed as a modern web application, optimized for fluid use on computer, tablet, and smartphone. The interface has been designed to be clear, fast, and pleasant to use daily, so that users can easily access their content and progress wherever they are.",
                audience_p1: "Bingeki primarily targets a new generation of fans: connected users, accustomed to modern applications and personalization of their digital experience. Students, young adults, or long-time enthusiasts, all share the same need: to have a simple, modern, and engaging space to follow their passion for anime and manga.",
                future_p1: "The project is still evolving and continues to improve over time. New features are regularly developed to enrich the user experience and strengthen the community aspect of the platform. This progressive approach allows Bingeki to be built with a clear vision: creating a sustainable space capable of accompanying fans in their passion over the long term.",
                ecosystem_p1: "Beyond a simple application, Bingeki aims to become a true ecosystem for anime and manga fans. A place where one can organize their content consumption, discover new works, share their experience, and connect to a community that shares the same passion.",
                closing_p1: "Because following anime and manga should not just be a list to fill, but an experience to live and share."
            },
            person_details: {
                loading_title: "Loading...",
                loading_description: "Retrieving person information.",
                back: "BACK",
                not_found_title: "Person Not Found",
                not_found_description: "Unable to find this person.",
                not_found: "Person not found.",
                favorites: "favorites",
                sheet: "FACT SHEET",
                biography: "BIOGRAPHY",
                roles: "ROLES"
            },
            news: {
                not_found: "Article not found",
                back: "BACK",
                source_badge: "SOURCE",
                read_full: "READ THE FULL ORIGINAL STORY",
                disclaimer: "This article is an automated summary. To read the full content and support the original creators, please visit the source website.",
                go_to_source: "GO TO SOURCE",
                title: "ANIME & MANGA NEWS",
                description: "The latest Anime and Manga news in real time.",
                heading: "LATEST NEWS",
                featured: "FEATURED",
                empty: "No news found.",
                summary_box_title: "AT A GLANCE",
                toc: "Table of Contents",
                search_placeholder: "Search by title or tag...",
                filter_all_sources: "All sources",
                results_found: "{{count}} news item found",
                results_found_plural: "{{count}} news items found"
            },
            survey: {
                title: "Bingeki Survey",
                brand: "Bingeki",
                step_indicator: "Step {{current}} of {{total}}",
                landing: {
                    title: "Let's build the perfect <span>Anime</span> tracker",
                    desc: "Bingeki is a future social and gamified platform for your anime and manga consumption. Give us your opinion to create the platform of your dreams."
                },
                steps: {
                    profil: { title: "Profile", desc: "Getting to know you" },
                    habitudes: { title: "Habits", desc: "Your consumption" },
                    problemes: { title: "Frustrations", desc: "Current issues" },
                    interet: { title: "Bingeki", desc: "Your interest in the project" },
                    gamification: { title: "Gamification", desc: "Your motivation" },
                    monetisation: { title: "Premium", desc: "Going further?" },
                    communaute: { title: "Social", desc: "You and your friends" },
                    libre: { title: "Open feedback", desc: "Your final word" },
                    lead: { title: "Stay in touch", desc: "Don't miss out" }
                },
                questions: {
                    age: "How old are you?",
                    status: "What is your status?",
                    consumption_frequency: "How often do you consume anime or manga?",
                    anime_count: "How many animes do you follow in parallel?",
                    reads_manga: "Do you also read manga?",
                    devices: "What devices do you mainly use? (Multiple choices possible)",
                    forgets_progress: "Do you sometimes forget where you are in a series?",
                    current_tracking: "How do you track your progress today?",
                    frustrations: "What frustrates you in current solutions?",
                    interest_level: "Would a more social and gamified tracking platform interest you?",
                    attractive_features: "What attracts you the most? (Multiple choices)",
                    likes_gamification: "Do you like progression systems (levels, XP)?",
                    motivation_drivers: "What would motivate you the most? (Multiple choices)",
                    premium_interest: "Would you be willing to pay for premium features (on a free alternative without ads)?",
                    premium_features: "What would you want in premium? (Multiple choices)",
                    acceptable_price: "What monthly price would seem acceptable to you?",
                    shares_friends: "Do you often share your discoveries with your friends?",
                    social_platforms: "On which networks do you interact most around anime/manga?",
                    social_interest: "Would you be interested in social functions (Friend feed, reactions, comments)?",
                    must_have: "What feature would you ABSOLUTELY want to see in Bingeki?",
                    daily_return: "What would make you use the app every day?",
                    stay_in_touch: "Don't miss the launch 🎉",
                    stay_in_touch_desc: "Leave your email to be notified of the official release of the app (no spam, promised).",
                    wants_news: "Yes, I want to be contacted!",
                    no_news: "No thanks.",
                    referral_source: "How did you hear about us?",
                    ageRange: "Age Range",
                    interestLevel: "Interest Level",
                    mostAttractiveFeatures: "Attractive Features"
                },
                options: {
                    status: {
                        etudiant: "Student",
                        salarie: "Employee / Worker",
                        autre: "Other"
                    },
                    frequency: {
                        quotidien: "Every day",
                        hebdomadaire: "Several times a week",
                        mensuel: "A few times a month"
                    },
                    manga: {
                        oui_beaucoup: "Yes, a lot",
                        oui_un_peu: "Yes, once in a while",
                        non: "No, not at all"
                    },
                    devices: {
                        smartphone: "📱 Smartphone",
                        pc: "💻 PC / Mac",
                        tv: "📺 TV / Console",
                        tablette: "📱 Tablet"
                    },
                    forget: {
                        souvent: "Yes, very often",
                        parfois: "From time to time",
                        jamais: "No, I manage perfectly"
                    },
                    tracking: {
                        myanimelist: "MyAnimeList / Anilist",
                        notes: "Notepad / Notion / Excel",
                        memoire: "From memory (my memory is enough)",
                        autre: "Other"
                    },
                    interest: {
                        beaucoup: "Yes, definitely!",
                        un_peu: "Why not, to be tested.",
                        pas_du_tout: "No, no interest for me."
                    },
                    features: {
                        design: "🎨 A modern and mobile-first interface",
                        gamification: "🎮 Earn XP and level up",
                        social: "👥 See friends' activity and profile",
                        statistiques: "📊 Advanced statistics on my viewing"
                    },
                    gamification: {
                        like_much: "I love it!",
                        like_some: "It's nice but secondary",
                        no_interest: "I don't pay attention to it"
                    },
                    motivation: {
                        badges: "🏆 Collect badges (ex: Watched 50 Isekai)",
                        niveau: "⭐ Level up with my account",
                        classement: "📈 A leaderboard with my friends",
                        defis: "🎯 Challenges (Weekly goals for bonus)"
                    },
                    premium: {
                        oui: "Yes, if the added value is there",
                        peut_etre: "Maybe, it all depends on the price",
                        non: "No, never"
                    },
                    premium_features: {
                        personnalisation: "🎨 Max customization of my profile",
                        badges_exclusifs: "💎 Exclusive badges/titles",
                        stats_avancees: "📊 Super advanced viewing statistics",
                        soutien: "❤️ Just supporting the Bingeki project"
                    },
                    social: {
                        often: "Yes, all the time!",
                        sometimes: "From time to time",
                        solo: "I live my passion solo"
                    },
                    referral: {
                        tiktok: "📱 TikTok",
                        instagram: "📸 Instagram",
                        discord: "👾 Discord",
                        word_of_mouth: "🗣️ Word of mouth",
                        search: "🔍 Search (Google...)",
                        other: "✨ Other"
                    },
                    social_interest: {
                        feed: "Yes, a real news feed of my buddies!",
                        maybe: "A little, we'll see.",
                        no: "Not specifically."
                    }
                },
                placeholders: {
                    frustrations: "Aging interfaces, too complicated, lack of features...",
                    must_have: "The dream feature you haven't seen anywhere else...",
                    daily_return: "Release notifications? Friend feed? Challenges?",
                    email: "your@email.com"
                },
                footer: {
                    start: "Start",
                    next: "Next",
                    back: "Back",
                    finish: "Finish",
                    submitting: "Sending...",
                    join_title: "READY TO JOIN THE ADVENTURE?",
                    join_button: "JOIN BINGEKI",
                    follow_insta: "Follow us on Instagram"
                },
                errors: {
                    submit: "An error occurred. Please try again."
                },
                thank_you: {
                    title: "Thank you very much!",
                    message: "Your responses have been saved. Thanks to you, we will be able to build the platform we all dream of to follow our favorite anime and manga.",
                    next_steps: "Want to go further?",
                    join_site: "Join Bingeki",
                    discord: "Join Discord",
                    instagram: "Follow us on Instagram",
                    tiktok: "Follow us on TikTok",
                    home: "Back to home"
                }
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'fr',
        detection: {
            order: ['htmlTag', 'path', 'localStorage', 'navigator'],
            lookupFromPathIndex: 0,
            htmlTag: document.documentElement
        },
        supportedLngs: ['fr', 'en'],
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
