/**
 * Character Details page
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Heart, User, Loader2, Mic } from 'lucide-react';
import { getCharacterFull, type JikanCharacterFull, type JikanCharacterAnime, type JikanCharacterVoice, type JikanCharacterManga } from '@/services/animeApi'; // Ensure JikanCharacterManga is imported
import { SEO } from '@/components/layout/SEO';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/context/ToastContext';
import { saveUserProfileToFirestore } from '@/firebase/firestore'; // Added import
import styles from './CharacterDetails.module.css';

type CharacterFullData = JikanCharacterFull & {
    anime: JikanCharacterAnime[];
    manga: JikanCharacterManga[];
    voices: JikanCharacterVoice[];
};

import { useTranslation } from 'react-i18next'; // Added import

export default function CharacterDetails() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { addFavoriteCharacter, removeFavoriteCharacter, isFavoriteCharacter } = useLibraryStore();
    const { addToast } = useToast();
    const [character, setCharacter] = useState<CharacterFullData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        let active = true;
        const loadChar = async () => {
            setLoading(true);
            try {
                const data = await getCharacterFull(Number(id));
                if (active) setCharacter(data);
            } catch (err) {
                console.error(err);
            } finally {
                if (active) setLoading(false);
            }
        };
        loadChar();
        return () => { active = false; };
    }, [id]);

    if (loading) {
        return (
            <Layout>
                <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <Loader2 size={48} className="spin" />
                </div>
            </Layout>
        );
    }

    if (!character) {
        return (
            <Layout>
                <div className={styles.container}>
                    <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={20} />}>
                        {t('character_details.back')}
                    </Button>
                    <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.6 }}>
                        {t('character_details.not_found')}
                    </div>
                </div>
            </Layout>
        );
    }

    const jpVoice = character.voices?.find(v => v.language === 'Japanese');

    return (
        <Layout>
            <SEO
                title={character.name}
                description={character.about?.slice(0, 160)}
                image={character.images?.jpg?.image_url || character.images?.webp?.image_url}
            />
            <div className={styles.container}>
                {/* Back Button */}
                <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={20} />} className={styles.backButton}>
                    {t('character_details.back')}
                </Button>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.imageWrapper}>
                        <OptimizedImage
                            src={character.images?.jpg?.image_url || character.images?.webp?.image_url}
                            alt={character.name}
                            className={styles.image}
                            objectFit="cover"
                        />
                    </div>
                    <div className={styles.infoSection}>
                        <h1 className={styles.name}>{character.name}</h1>
                        {character.name_kanji && (
                            <p className={styles.nameKanji}>{character.name_kanji}</p>
                        )}
                        <div className={styles.metaContainer}>
                            <div className={styles.metaItem} style={{ cursor: 'pointer' }} onClick={() => {
                                if (!user) {
                                    addToast(t('auth.login_required'), 'error');
                                    return;
                                }
                                if (!character) return;
                                const charId = character.mal_id;
                                const currentFavorites = useLibraryStore.getState().favoriteCharacters;

                                if (isFavoriteCharacter(charId)) {
                                    removeFavoriteCharacter(charId);
                                    if (user) {
                                        const updatedFavorites = currentFavorites.filter(c => c.id !== charId);
                                        saveUserProfileToFirestore({ uid: user.uid, favoriteCharacters: updatedFavorites });
                                    }
                                    addToast(t('character_details.removed_from_favorites'), 'info');
                                } else {
                                    const newChar = {
                                        id: charId,
                                        name: character.name,
                                        image: character.images?.jpg?.image_url || '',
                                        role: 'Main',
                                        workId: 0,
                                        workTitle: ''
                                    };
                                    addFavoriteCharacter(newChar);
                                    if (user) {
                                        const updatedFavorites = [...currentFavorites, newChar];
                                        saveUserProfileToFirestore({ uid: user.uid, favoriteCharacters: updatedFavorites });
                                    }
                                    addToast(t('character_details.added_to_favorites'), 'success');
                                }
                            }}>
                                <Heart size={16} fill={character && isFavoriteCharacter(character.mal_id) ? "#e11d48" : "none"} color="#e11d48" />
                                <span>{character.favorites?.toLocaleString() || 0} {t('character_details.favorites')}</span>
                            </div>
                            {character.nicknames && character.nicknames.length > 0 && (
                                <div className={styles.metaItem}>
                                    <User size={16} />
                                    <span>{character.nicknames[0]}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Wiki-Style About Section */}
                {character.about && (() => {
                    // Parse the about text to extract key-value pairs
                    const parseAbout = (text: string) => {
                        const lines = text.split('\n').filter(line => line.trim());
                        const data: { key: string; value: string }[] = [];
                        let description = '';
                        let source = '';

                        // Extended key patterns for anime/manga characters
                        const keyPatterns = [
                            // Basic info
                            'Age', 'Birthday', 'Birthdate', 'Date of Birth', 'Date of birth', 'Birthplace', 'Birth place',
                            'Height', 'Weight', 'Blood Type', 'Blood type', 'Gender', 'Sex',
                            // Appearance
                            'Hair', 'Hair Color', 'Hair color', 'Eye', 'Eyes', 'Eye Color', 'Eye color',
                            // Identity
                            'Occupation', 'Affiliation', 'Affiliations', 'Status', 'Race', 'Species', 'Nationality',
                            'Planet of Origin', 'Horoscope', 'Zodiac', 'Sign',
                            // Rank & Position
                            'Rank', 'Position', 'Title', 'Class', 'Grade', 'Level',
                            // Naruto specific
                            'Ninja Registration', 'Ninja Registration No', 'Registration', 'Kekkei Genkai',
                            // Family & Relations
                            'Family', 'Parents', 'Relatives', 'Known relatives', 'Siblings', 'Married to', 'Spouse',
                            'Clan', 'Team', 'Squad', 'Group', 'Organization',
                            // Powers & Abilities
                            'Abilities', 'Skills', 'Powers', 'Quirk', 'Nen', 'Nen Type', 'Nen type',
                            'Magic', 'Magic Type', 'Djinn', 'Devil Fruit', 'Cursed Technique', 'Breathing Style',
                            'Weapon', 'Weapons', 'Fighting Style', 'Zanpakuto', 'Bankai', 'Kagune', 'Titan',
                            'Talents', 'Talent', 'Special Skill',
                            // Preferences
                            'Likes', 'Dislikes', 'Hates', 'Hobby', 'Hobbies', 'Favorite food', 'Favourite food',
                            // Enemies & Allies
                            'Enemies', 'Rivals', 'Allies', 'Partner', 'Master', 'Student', 'Mentor',
                            // Media
                            'Voice Actor', 'Seiyuu', 'CV', 'Voiced by',
                            'First Appearance', 'Debut', 'Manga Debut', 'Anime Debut',
                            // Other
                            'Alias', 'Aliases', 'Nickname', 'Nicknames', 'Also known as', 'Known as',
                            'Japanese', 'Romaji', 'Kanji'
                        ];

                        for (const line of lines) {
                            let matched = false;

                            // Check for Source line
                            if (line.toLowerCase().startsWith('source:') || line.toLowerCase().startsWith('(source:')) {
                                source = line.replace(/^\(?source:?\s*/i, '').replace(/\)$/, '').trim();
                                matched = true;
                            } else {
                                for (const key of keyPatterns) {
                                    const regex = new RegExp(`^${key}s?[:\\s]+(.+)`, 'i');
                                    const match = line.match(regex);
                                    if (match) {
                                        data.push({ key: key, value: match[1].trim() });
                                        matched = true;
                                        break;
                                    }
                                }
                            }
                            if (!matched && line.trim().length > 0) {
                                description += (description ? '\n\n' : '') + line.trim();
                            }
                        }
                        return { data, description, source };
                    };

                    const { data, description, source } = parseAbout(character.about);

                    return (
                        <div className={styles.aboutSection}>
                            <h2 className={styles.sectionTitle}>
                                <User size={20} /> {t('character_details.identity')}
                            </h2>

                            {/* Info tags */}
                            {data.length > 0 && (
                                <div className={styles.infoTags}>
                                    {data.map((item, idx) => (
                                        <div key={idx} className={styles.infoTag}>
                                            <span className={styles.infoTagLabel}>{item.key}</span>
                                            <span className={styles.infoTagValue}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Full description */}
                            {description && (
                                <div className={styles.biographySection}>
                                    <h3 className={styles.biographyTitle}>{t('character_details.biography')}</h3>
                                    <p className={styles.biographyText}>{description}</p>
                                </div>
                            )}

                            {/* Source */}
                            {source && (
                                <div className={styles.sourceTag}>
                                    {t('character_details.source')}: {source}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Japanese Voice Actor */}
                {jpVoice && (
                    <div className={styles.voiceActorSection}>
                        <h2 className={styles.sectionTitle}>
                            <Mic size={20} /> {t('character_details.seiyuu')}
                        </h2>
                        <div
                            className={styles.voiceActorCard}
                            onClick={() => navigate(`/person/${jpVoice.person.mal_id}`)}
                        >
                            <OptimizedImage
                                src={jpVoice.person.images?.jpg?.image_url}
                                alt={jpVoice.person.name}
                                className={styles.voiceActorImage}
                                objectFit="cover"
                            />
                            <div className={styles.voiceActorInfo}>
                                <div className={styles.voiceActorName}>{jpVoice.person.name}</div>
                                <div className={styles.voiceActorLang}>{jpVoice.language}</div>
                            </div>
                            <ArrowLeft size={20} style={{ transform: 'rotate(180deg)', opacity: 0.5 }} />
                        </div>
                    </div>
                )}

                {/* Anime Appearances */}
                {character.anime && character.anime.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h2 className={styles.sectionTitle}>{t('character_details.anime_appearances')}</h2>
                        <div className={styles.grid}>
                            {character.anime.slice(0, 12).map((a) => (
                                <div
                                    key={a.anime.mal_id}
                                    className={styles.card}
                                    onClick={() => navigate(`/work/${a.anime.mal_id}?type=anime`)}
                                >
                                    <OptimizedImage
                                        src={a.anime.images?.jpg?.image_url}
                                        alt={a.anime.title}
                                        className={styles.cardImage}
                                        objectFit="cover"
                                    />
                                    <div className={styles.cardTitle}>{a.anime.title}</div>
                                    <div className={styles.cardRole}>{a.role}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Manga Appearances */}
                {character.manga && character.manga.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h2 className={styles.sectionTitle}>{t('character_details.manga_appearances')}</h2>
                        <div className={styles.grid}>
                            {character.manga.slice(0, 12).filter((m) => m.manga?.images?.jpg?.image_url).map((m, idx) => (
                                <div
                                    key={m.manga?.mal_id || idx}
                                    className={styles.card}
                                    onClick={() => navigate(`/work/${m.manga?.mal_id}?type=manga`)}
                                >
                                    <OptimizedImage
                                        src={m.manga?.images?.jpg?.image_url}
                                        alt={m.manga?.title || 'Manga'}
                                        className={styles.cardImage}
                                        objectFit="cover"
                                    />
                                    <div className={styles.cardTitle}>{m.manga?.title || 'Unknown'}</div>
                                    <div className={styles.cardRole}>{m.role}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
