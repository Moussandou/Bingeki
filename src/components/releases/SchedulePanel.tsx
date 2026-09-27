/**
 * SchedulePanel — contenu de la page /schedule extrait pour être monté
 * tel quel dans <Releases /> (l'onglet "Cette semaine"). Ne wrappe plus
 * dans Layout ni SEO — c'est le job du conteneur parent.
 *
 * Le style vient toujours de Schedule.module.css : cartes brutalist,
 * pill jours, bordure noire, grid responsive.
 */

import { useState, useEffect } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { getAnimeSchedule, type JikanResult } from '@/services/animeApi';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from '@/pages/Schedule.module.css';
import { logger } from '@/utils/logger';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function SchedulePanel() {
    const { t } = useTranslation();

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
                logger.error('Failed to fetch schedule', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, [selectedDay]);

    return (
        <>
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
        </>
    );
}

export default SchedulePanel;
