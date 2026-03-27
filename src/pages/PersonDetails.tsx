import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Heart, Calendar, Loader2, Mic } from 'lucide-react';
import { getPersonFull, type JikanPersonFull, type JikanPersonVoice } from '@/services/animeApi';
import { SEO } from '@/components/layout/SEO';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import styles from './PersonDetails.module.css';

type PersonFullData = JikanPersonFull & {
    voices: JikanPersonVoice[];
    anime: { position: string; anime: { mal_id: number; title: string; images: { jpg: { image_url: string } } } }[];
};

export default function PersonDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [person, setPerson] = useState<PersonFullData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const loadPerson = async () => {
            setLoading(true);
            try {
                const data = await getPersonFull(Number(id));
                setPerson(data);
            } catch (error) {
                console.error("Failed to load person", error);
            } finally {
                setLoading(false);
            }
        };

        loadPerson();
    }, [id]);

    if (loading) {
        return (
            <Layout>
                <SEO
                    title={t('person_details.loading_title')}
                    description={t('person_details.loading_description')}
                />
                <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <Loader2 size={48} className="spin" />
                </div>
            </Layout>
        );
    }

    if (!person) {
        return (
            <Layout>
                <SEO
                    title={t('person_details.not_found_title')}
                    description={t('person_details.not_found_description')}
                />
                <div className={styles.container}>
                    <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={20} />}>
                        {t('person_details.back')}
                    </Button>
                    <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.6 }}>
                        {t('person_details.not_found')}
                    </div>
                </div>
            </Layout>
        );
    }

    const formatBirthday = (dateStr: string | null) => {
        if (!dateStr) return null;
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return null;
        }
    };

    return (
        <Layout>
            <SEO
                title={person.name}
                description={person.about?.slice(0, 160)}
                image={person.images?.jpg?.image_url}
            />
            <div className={styles.container}>
                {/* Back Button */}
                <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={20} />} className={styles.backButton}>
                    {t('person_details.back')}
                </Button>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.imageWrapper}>
                        <OptimizedImage
                            src={person.images?.jpg?.image_url}
                            alt={person.name}
                            className={styles.image}
                            objectFit="cover"
                        />
                    </div>
                    <div className={styles.infoSection}>
                        <h1 className={styles.name}>{person.name}</h1>
                        {person.alternate_names && person.alternate_names.length > 0 && (
                            <p className={styles.altNames}>
                                {person.alternate_names.slice(0, 3).join(' • ')}
                            </p>
                        )}
                        <div className={styles.metaContainer}>
                            <div className={styles.metaItem}>
                                <Heart size={16} fill="#e11d48" color="#e11d48" />
                                <span>{person.favorites?.toLocaleString() || 0} {t('person_details.favorites')}</span>
                            </div>
                            {formatBirthday(person.birthday) && (
                                <div className={styles.metaItem}>
                                    <Calendar size={16} />
                                    <span>{formatBirthday(person.birthday)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Wiki-Style About Section for Seiyuu */}
                {person.about && (() => {
                    const parseAbout = (text: string) => {
                        const lines = text.split('\n').filter(line => line.trim());
                        const data: { key: string; value: string }[] = [];
                        let description = '';
                        let source = '';

                        // Key patterns for seiyuu/staff
                        const keyPatterns = [
                            // Basic info
                            'Birth name', 'Birth Name', 'Real name', 'Real Name', 'Born', 'Birthdate', 'Birthday',
                            'Birthplace', 'Birth place', 'Hometown', 'Home town',
                            'Height', 'Weight', 'Blood Type', 'Blood type', 'Gender',
                            // Career
                            'Also known as', 'Nicknames', 'Stage name', 'Occupation', 'Years active',
                            'Debut', 'Agency', 'Labels', 'Label', 'Affiliated', 'Affiliation',
                            // Personal
                            'Spouse', 'Married to', 'Partner', 'Children', 'Family',
                            'Hobbies', 'Skills', 'Notable roles', 'Favorite',
                            // Social
                            'Twitter', 'Instagram', 'YouTube', 'Website', 'Blog',
                            // Awards
                            'Awards', 'Nominations'
                        ];

                        for (const line of lines) {
                            let matched = false;

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

                    const { data, description, source } = parseAbout(person.about);

                    return (
                        <div className={styles.aboutSection}>
                            <h2 className={styles.sectionTitle}>
                                <Mic size={20} /> {t('person_details.sheet')}
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

                            {/* Description */}
                            {description && (
                                <div className={styles.biographySection}>
                                    <h3 className={styles.biographyTitle}>{t('person_details.biography')}</h3>
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

                {/* Voice Acting Roles */}
                {person.voices && person.voices.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h2 className={styles.sectionTitle}>
                            <Mic size={20} /> {t('person_details.roles')} ({person.voices.length})
                        </h2>
                        <div className={styles.rolesGrid}>
                            {person.voices.slice(0, 20).map((v, idx) => (
                                <div
                                    key={`${v.character.mal_id}-${idx}`}
                                    className={styles.roleCard}
                                    onClick={() => navigate(`/character/${v.character.mal_id}`)}
                                >
                                    <OptimizedImage
                                        src={v.character.images?.jpg?.image_url}
                                        alt={v.character.name}
                                        className={styles.characterImage}
                                        objectFit="cover"
                                    />
                                    <OptimizedImage
                                        src={v.anime.images?.jpg?.image_url}
                                        alt={v.anime.title}
                                        className={styles.animeImage}
                                        objectFit="cover"
                                    />
                                    <div className={styles.roleInfo}>
                                        <div className={styles.characterName}>{v.character.name}</div>
                                        <div className={styles.animeTitle}>{v.anime.title}</div>
                                        <div className={styles.roleType}>{v.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
