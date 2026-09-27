/**
 * SeasonsPanel — contenu de la page /seasons extrait pour être monté
 * dans <Releases /> (l'onglet "Par saison"). Comme SchedulePanel, ne
 * wrappe plus dans Layout ni SEO.
 *
 * Les query params year/season restent gérés côté panel — ils sont
 * partagés avec le param mode du conteneur (?mode=season&year=…&season=…).
 */

import { useState, useEffect, useMemo } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { getSeasonsList, getSeasonAnime, type JikanResult, type JikanSeasonEntry } from '@/services/animeApi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import { getDisplayTitle } from '@/utils/titleUtils';
import styles from '@/pages/Seasons.module.css';
import { logger } from '@/utils/logger';

const SEASON_ORDER = ['winter', 'spring', 'summer', 'fall'] as const;
type SeasonName = (typeof SEASON_ORDER)[number];

function currentSeason(): SeasonName {
    return SEASON_ORDER[Math.floor(new Date().getMonth() / 3)];
}

export function SeasonsPanel() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const titleLanguage = useSettingsStore(state => state.titleLanguage);
    const hideScores = useSettingsStore(state => state.hideScores);

    const [seasonsIndex, setSeasonsIndex] = useState<JikanSeasonEntry[]>([]);
    const [year, setYear] = useState<number>(Number(searchParams.get('year')) || new Date().getFullYear());
    const [season, setSeason] = useState<SeasonName>(
        (searchParams.get('season') as SeasonName) || currentSeason()
    );
    const [anime, setAnime] = useState<JikanResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSeasonsList()
            .then(setSeasonsIndex)
            .catch(err => logger.error('[Seasons] index', err));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        getSeasonAnime(year, season, 24, 1, { signal: controller.signal, priority: 'high' })
            .then(res => {
                if (controller.signal.aborted) return;
                const unique = Array.from(new Map((res.data || []).map(i => [i.mal_id, i])).values());
                setAnime(unique);
            })
            .catch(err => {
                if (!controller.signal.aborted) logger.error('[Seasons] fetch', err);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [year, season]);

    const years = useMemo(
        () => seasonsIndex.map(s => s.year).sort((a, b) => b - a),
        [seasonsIndex]
    );

    const availableSeasons = useMemo(() => {
        const entry = seasonsIndex.find(s => s.year === year);
        if (!entry) return SEASON_ORDER;
        const set = new Set(entry.seasons.map(s => s.toLowerCase()));
        const filtered = SEASON_ORDER.filter(s => set.has(s));
        return filtered.length > 0 ? filtered : SEASON_ORDER;
    }, [seasonsIndex, year]);

    const applySelection = (nextYear: number, nextSeason: SeasonName) => {
        if (nextYear === year && nextSeason === season) return;
        setLoading(true);
        setYear(nextYear);
        setSeason(nextSeason);
        // Preserve any other search params (like ?mode=season) on the URL.
        const params = new URLSearchParams(searchParams);
        params.set('year', String(nextYear));
        params.set('season', nextSeason);
        setSearchParams(params, { replace: true });
    };

    const handleYearChange = (nextYear: number) => {
        const entry = seasonsIndex.find(s => s.year === nextYear);
        const set = new Set((entry?.seasons || []).map(s => s.toLowerCase()));
        const nextSeason = set.has(season) || set.size === 0 ? season : (SEASON_ORDER.find(s => set.has(s)) ?? season);
        applySelection(nextYear, nextSeason);
    };

    return (
        <>
            <div className={styles.controls}>
                <label className={styles.yearLabel}>
                    {t('seasons.year')}
                    <select
                        className={styles.yearSelect}
                        value={year}
                        onChange={e => handleYearChange(Number(e.target.value))}
                    >
                        {years.length > 0
                            ? years.map(y => <option key={y} value={y}>{y}</option>)
                            : <option value={year}>{year}</option>}
                    </select>
                </label>

                <div className={styles.seasonsRow}>
                    {availableSeasons.map(s => (
                        <button
                            key={s}
                            className={`${styles.seasonButton} ${season === s ? styles.active : ''}`}
                            onClick={() => applySelection(year, s)}
                        >
                            {t(`seasons.names.${s}`)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <Loader2 className="spin" size={48} />
                </div>
            ) : (
                <div className={styles.grid}>
                    {anime.length > 0 ? (
                        anime.map(item => (
                            <motion.div
                                key={item.mal_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={styles.card}
                                onClick={() => navigate(`/work/${item.mal_id}?type=anime`)}
                            >
                                <div className={styles.imageContainer}>
                                    <OptimizedImage
                                        src={item.images.jpg.image_url}
                                        alt={getDisplayTitle(item, titleLanguage)}
                                        className={styles.image}
                                        objectFit="cover"
                                    />
                                </div>
                                <div className={styles.content}>
                                    <h3 className={styles.animeTitle}>{getDisplayTitle(item, titleLanguage)}</h3>
                                    <div className={styles.meta}>
                                        <span>{item.type || 'TV'}</span>
                                        {item.score && !hideScores && <span>★ {item.score}</span>}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.6 }}>
                            <p>{t('seasons.empty')}</p>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default SeasonsPanel;
