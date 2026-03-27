
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { getAnimeSchedule, type JikanResult } from '@/services/animeApi';
import { useNavigate } from 'react-router-dom';
import { Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/components/layout/SEO';
import styles from './Schedule.module.css';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function Schedule() {
    const { t } = useTranslation();

    // Determine current day (default to today)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const [selectedDay, setSelectedDay] = useState(DAY_KEYS.find(d => d === today) || 'monday');
    const [animeList, setAnimeList] = useState<JikanResult[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSchedule = async () => {
            setLoading(true);
            try {
                const data = await getAnimeSchedule(selectedDay);
                const uniqueData = Array.from(new Map(data.map(item => [item.mal_id, item])).values());
                setAnimeList(uniqueData);
            } catch (error) {
                console.error("Failed to fetch schedule", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [selectedDay]);

    return (
        <Layout>
            <SEO title={t('schedule.title', 'Planning')} />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <Calendar style={{ verticalAlign: 'middle', marginRight: '1rem' }} size={40} />
                        {t('schedule.title')}
                    </h1>
                    <p style={{ opacity: 0.7 }}>{t('schedule.subtitle')}</p>
                </div>

                <div className={styles.daysContainer}>
                    {DAY_KEYS.map((day) => (
                        <button
                            key={day}
                            className={`${styles.dayButton} ${selectedDay === day ? styles.active : ''}`}
                            onClick={() => setSelectedDay(day)}
                        >
                            {t(`schedule.days.${day}`)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <Loader2 className="spin" size={48} />
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {animeList.length > 0 ? (
                            animeList.map((anime) => (
                                <motion.div
                                    key={anime.mal_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={styles.card}
                                    onClick={() => navigate(`/work/${anime.mal_id}?type=anime`)}
                                >
                                    <div className={styles.imageContainer}>
                                        <OptimizedImage
                                            src={anime.images.jpg.image_url}
                                            alt={anime.title}
                                            className={styles.image}
                                            objectFit="cover"
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'rgba(0,0,0,0.8)',
                                            color: '#fff',
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.8rem',
                                            fontWeight: 700
                                        }}>
                                            {anime.broadcast?.time ? `${anime.broadcast.time} (UTC+9)` : t('schedule.unknown_time')}
                                        </div>
                                    </div>
                                    <div className={styles.content}>
                                        <h3 className={styles.animeTitle}>{anime.title}</h3>
                                        <div className={styles.meta}>
                                            <span>{anime.type || 'TV'}</span>
                                            {anime.score && <span>★ {anime.score}</span>}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.6 }}>
                                <p>{t('schedule.no_anime')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

