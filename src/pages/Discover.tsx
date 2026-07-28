/**
 * Discover page
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Carousel } from '@/components/ui/Carousel';
import {
    searchWorks, getTopWorks, getSeasonalAnime, getRandomAnime, getRandomManga,
    getUpcomingAnime, getGenres, getProducers, getProducerName, getRecentRecommendations,
    type JikanResult, type SearchFilters, type JikanGenre, type JikanProducer
} from '@/services/animeApi';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';
import { Search, Check, Loader2, Flame, Sparkles, Star, Dice5, TrendingUp, Plus, SlidersHorizontal, X, CalendarClock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AddWorkModal } from '@/components/library/AddWorkModal';
import { FriendRecommendations } from '@/components/social/FriendRecommendations';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { SEO } from '@/components/layout/SEO';
import { useSettingsStore } from '@/store/settingsStore';
import { getDisplayTitle } from '@/utils/titleUtils';
import styles from './Discover.module.css';
import { logger } from '@/utils/logger';

export default function Discover() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const user = useAuthStore(state => state.user);
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [searchResults, setSearchResults] = useState<JikanResult[]>([]);
    const [loading, setLoading] = useState(false);
    const titleLanguage = useSettingsStore(state => state.titleLanguage);
    const hideScores = useSettingsStore(state => state.hideScores);

    // Filter States
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterRating, setFilterRating] = useState<string>('');
    const [filterScore, setFilterScore] = useState<number>(0);
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterStudio, setFilterStudio] = useState<string>('');

    // Carousel Data States
    const [seasonalAnime, setSeasonalAnime] = useState<JikanResult[]>([]);
    const [topAnime, setTopAnime] = useState<JikanResult[]>([]);
    const [popularManga, setPopularManga] = useState<JikanResult[]>([]);
    const [topManga, setTopManga] = useState<JikanResult[]>([]);
    const [upcomingAnime, setUpcomingAnime] = useState<JikanResult[]>([]);
    const [communityRecs, setCommunityRecs] = useState<JikanResult[]>([]);

    // Taxonomies chargées depuis l'API (remplacent les listes autrefois codées en dur)
    const [genres, setGenres] = useState<JikanGenre[]>([]);
    const [studios, setStudios] = useState<JikanProducer[]>([]);

    const [isLoadingSections, setIsLoadingSections] = useState(true);
    const [selectedWork, setSelectedWork] = useState<JikanResult | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const works = useLibraryStore(state => state.works);
    const libraryIds = useMemo(() => new Set<string | number>(works.map(w => w.id)), [works]);

    const dataFetched = useRef(false);

    const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

    // Raccourcis affichés sous la barre de recherche : les genres les plus utilisés,
    // pris dans la liste complète renvoyée par l'API (triée par nombre d'œuvres).
    const QUICK_GENRE_IDS = [1, 2, 4, 8, 10, 24];
    const quickGenres = useMemo(
        () => QUICK_GENRE_IDS.map(id => genres.find(g => g.mal_id === id)).filter((g): g is JikanGenre => !!g),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [genres]
    );

    // Fetch Home Data
    useEffect(() => {
        if (dataFetched.current) return;
        dataFetched.current = true;

        const fetchHomeData = async () => {
            setIsLoadingSections(true);
            try {
                // Deduplicate all home data just in case
                const dedup = (arr: JikanResult[]) => {
                    const map = new Map();
                    arr.forEach(i => map.set(`${i.type || 'unknown'}-${i.mal_id}`, i));
                    return Array.from(map.values());
                };

                // Tout en parallèle — apiQueue gère le débit ; les taxonomies sont
                // cachées 7 jours donc gratuites après la première visite.
                const [season, topA, popM, topM, upcoming, recs, genreList, studioList] = await Promise.all([
                    getSeasonalAnime(15),
                    getTopWorks('anime', 'favorite', 15),
                    getTopWorks('manga', 'bypopularity', 15),
                    getTopWorks('manga', 'favorite', 15),
                    getUpcomingAnime(15),
                    getRecentRecommendations('anime', 15),
                    getGenres('anime'),
                    getProducers(30)
                ]);

                setSeasonalAnime(dedup(season));
                setTopAnime(dedup(topA));
                setPopularManga(dedup(popM));
                setTopManga(dedup(topM));
                setUpcomingAnime(dedup(upcoming));
                setGenres(genreList);
                setStudios(studioList);

                // Les recommandations arrivent en paires « si tu as aimé A, essaie B » :
                // on aplatit vers la forme JikanResult attendue par Carousel.
                setCommunityRecs(dedup(
                    recs.flatMap(pair => (pair.entry || []).map(e => ({
                        mal_id: e.mal_id,
                        title: e.title,
                        images: { jpg: { image_url: e.images?.jpg?.image_url, small_image_url: e.images?.jpg?.image_url, large_image_url: e.images?.jpg?.large_image_url } },
                        type: 'anime',
                        synopsis: '',
                        status: '',
                    } as JikanResult)))
                ).slice(0, 20));
            } catch (error) {
                logger.error("[Discover] ❌ Failed to load discovery data", error);
            } finally {
                setIsLoadingSections(false);
            }
        };
        fetchHomeData();
    }, []);

    // Search Logic with Filters
    useEffect(() => {
        const abortController = new AbortController();
        const delayDebounceFn = setTimeout(async () => {
            // Année partielle ("2", "20"…) ignorée : elle déclenchait des recherches start_date invalides
            const validYear = filterYear.length === 4 ? filterYear : '';
            const hasActiveFilters = filterStatus || filterRating || filterScore > 0 || validYear || selectedGenre || filterStudio;

            if (searchQuery.length > 2 || hasActiveFilters) {
                logger.time('[Perf] Search Lifecycle');
                setLoading(true);

                const filters: SearchFilters = {};
                if (filterStatus) filters.status = filterStatus;
                if (filterRating) filters.rating = filterRating as SearchFilters['rating'];
                if (filterScore > 0) filters.min_score = filterScore;
                if (validYear) filters.start_date = `${validYear}-01-01`;
                if (selectedGenre) filters.genres = selectedGenre.toString();
                if (filterStudio) filters.producers = filterStudio;

                const searchOptions = { priority: 'high' as const, signal: abortController.signal };

                try {
                    // Perform search for Anime and default to searching both if technically possible
                    // If filterStudio is set, it typically applies well to Anime.

                    const promises = [
                        searchWorks(searchQuery, 'anime', filters, 1, searchOptions)
                    ];

                    // Only search manga if we aren't filtering by strictly Anime-only fields
                    if (!filterStudio) {
                        promises.push(searchWorks(searchQuery, 'manga', filters, 1, searchOptions));
                    }

                    const [animeResults, mangaResults = []] = await Promise.all(promises);
                    if (abortController.signal.aborted) return;

                    // Concat: Anime first (primary), then Manga.
                    const allResults = [...animeResults, ...mangaResults];

                    // Filter out duplicates using composite key (type + id)
                    const resultsMap = new Map();
                    allResults.forEach(item => {
                        const key = `${item.type || 'unknown'}-${item.mal_id}`;
                        if (resultsMap.has(key)) {
                            logger.debug(`[Perf] Duplicate caught: ${key}`);
                        }
                        resultsMap.set(key, item);
                    });
                    
                    const uniqueResults = Array.from(resultsMap.values());
                    
                    logger.info(`[Perf] Search: Found ${allResults.length} total, ${uniqueResults.length} unique items.`);
                    if (uniqueResults.length > 0) {
                        logger.table(uniqueResults.slice(0, 5).map(r => ({ id: r.mal_id, type: r.type, title: r.title })));
                    }
                    logger.timeEnd('[Perf] Search Lifecycle');
                    setSearchResults(uniqueResults);
                } catch (err) {
                    // Une recherche annulée par la suivante ne doit pas écraser son état
                    if (!abortController.signal.aborted) {
                        logger.error("Search failed", err);
                        setSearchResults([]);
                    }
                } finally {
                    if (!abortController.signal.aborted) setLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => {
            clearTimeout(delayDebounceFn);
            abortController.abort();
        };
    }, [searchQuery, selectedGenre, filterStatus, filterRating, filterScore, filterYear, filterStudio]);

    const handleGenreClick = (id: number) => {
        // setSearchQuery(''); // Allow combining search + genre
        setSelectedGenre(id === selectedGenre ? null : id);
    };

    const handleWorkClick = (work: JikanResult) => {
        navigate(`/work/${work.mal_id}?type=${work.type?.toLowerCase() || 'anime'}`);
    };

    const handleQuickAdd = (work: JikanResult) => {
        if (!user) {
            navigate('/auth');
            return;
        }
        setSelectedWork(work);
        setIsModalOpen(true);
    };

    const [heroWork, setHeroWork] = useState<JikanResult | null>(null);

    // Update hero when data loads
    useEffect(() => {
        if (seasonalAnime.length > 0) {
            setHeroWork(seasonalAnime[0]);
        } else if (topAnime.length > 0) {
            setHeroWork(topAnime[0]);
        }
    }, [seasonalAnime, topAnime]);

    // Handle Surprise Me — anime ou manga, Bingeki suivant les deux
    const handleSurpriseMe = async (type: 'anime' | 'manga') => {
        setLoading(true);
        try {
            const randomWork = type === 'manga' ? await getRandomManga() : await getRandomAnime();
            if (randomWork) {
                navigate(`/work/${randomWork.mal_id}?type=${type}`);
            }
        } catch (error) {
            logger.error(`Failed to get random ${type}`, error);
        } finally {
            setLoading(false);
        }
    };

    // Reset Filters
    const resetFilters = () => {
        setFilterStatus('');
        setFilterRating('');
        setFilterScore(0);
        setFilterYear('');
        setFilterStudio('');
        setSelectedGenre(null);
        setSearchQuery('');
    };

    const hasFilters = filterStatus || filterRating || filterScore > 0 || filterYear || selectedGenre || filterStudio;

    return (
        <Layout>
            <SEO title={t('discover.title', 'Découvrir')} />
            <div style={{ minHeight: 'calc(100vh - 80px)', paddingBottom: '6rem' }}>
                {/* Hero Section */}
                {heroWork && !searchQuery && !hasFilters && (
                    <div className={styles.heroSection}>
                        {/* Background */}
                        <div
                            className={styles.heroBackground}
                            style={{ backgroundImage: `url(${heroWork.images.jpg.image_url})` }}
                        />

                        <div className={`container ${styles.heroContainer}`}>
                            {/* Hero Image */}
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className={styles.heroImageContainer}
                            >
                                <OptimizedImage
                                    src={heroWork.images.jpg.image_url}
                                    lowResSrc={heroWork.images.jpg.small_image_url}
                                    alt={heroWork.title}
                                    className={styles.heroImage}
                                    priority={true}
                                />
                            </motion.div>

                            {/* Hero Content */}
                            <div className={styles.heroContent}>
                                <motion.div
                                    initial={{ opacity: 0, x: -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary)', color: '#fff', padding: '0.5rem 1rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}>
                                        <Flame size={18} fill="#fff" /> {t('discover.hero.featured')}
                                    </div>
                                    <h1 className={styles.heroTitle}>
                                        {getDisplayTitle(heroWork, titleLanguage)}
                                    </h1>
                                    <p className={styles.heroSynopsis}>
                                        {heroWork.synopsis}
                                    </p>

                                    <div className={styles.heroActions}>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={() => handleQuickAdd(heroWork)}
                                            icon={<Plus size={24} />}
                                            style={{
                                                fontSize: '1.1rem',
                                                padding: '0.75rem 1.5rem',
                                                border: 'none',
                                                boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                                background: 'var(--color-primary)',
                                                color: '#fff'
                                            }}
                                        >
                                            {t('discover.hero.add_to_list')}
                                        </Button>
                                        <Button
                                            variant="manga"
                                            size="lg"
                                            onClick={() => navigate(`/work/${heroWork.mal_id}?type=${heroWork.type?.toLowerCase() || 'anime'}`)}
                                            style={{
                                                fontSize: '1.1rem',
                                                padding: '0.75rem 1.5rem',
                                                background: '#fff',
                                                color: 'var(--color-text)',
                                                borderColor: 'var(--color-text)'
                                            }}
                                        >
                                            {t('discover.hero.more_details')}
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="container" style={{ marginTop: '1rem' }}>
                    {/* Search Section */}
                    <div style={{ margin: '0 auto 2rem', maxWidth: '800px' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Card
                                variant="manga"
                                style={{
                                    padding: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    background: 'var(--color-surface)',
                                    borderColor: 'var(--color-border-heavy)',
                                    boxShadow: '8px 8px 0 var(--color-shadow-solid)',
                                    flex: 1
                                }}
                                whileHover={{
                                    borderColor: 'var(--color-primary)',
                                    boxShadow: '8px 8px 0 var(--color-primary)'
                                }}
                                transition={{ duration: 0.2 }}
                            >
                                <Search size={28} style={{ marginLeft: '1rem', opacity: 0.4, color: 'var(--color-text)' }} />
                                <input
                                    placeholder={t('discover.search.placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        border: 'none',
                                        outline: 'none',
                                        width: '100%',
                                        fontSize: '1.5rem',
                                        background: 'transparent',
                                        fontFamily: 'var(--font-heading)',
                                        fontWeight: 700,
                                        padding: '1rem 0',
                                        color: 'var(--color-text)'
                                    }}
                                />
                            </Card>
                            <Button
                                variant="manga"
                                onClick={() => setShowFilters(!showFilters)}
                                style={{
                                    padding: '0 1.5rem',
                                    background: showFilters ? 'var(--color-text)' : 'var(--color-surface)',
                                    color: showFilters ? 'var(--color-surface)' : 'var(--color-text)',
                                    border: '3px solid var(--color-border)'
                                }}
                            >
                                <SlidersHorizontal size={24} />
                            </Button>
                        </div>

                        {/* Advanced Filters Panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                    animate={{ height: 'auto', opacity: 1, marginTop: 20 }}
                                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                    style={{ overflow: 'hidden', padding: '4px' }} // Padding prevents shadow clipping
                                >
                                    <div style={{
                                        background: 'var(--color-surface)',
                                        border: '3px solid var(--color-border-heavy)',
                                        boxShadow: '8px 8px 0 var(--color-shadow-solid)',
                                        padding: '2rem',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '1.5rem',
                                        position: 'relative'
                                    }}>
                                        {/* Status */}
                                        <div>
                                            <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.9rem', color: 'var(--color-text)' }}>{t('discover.filters.status')}</label>
                                            <select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: '2px solid var(--color-border-heavy)',
                                                    borderRadius: 0,
                                                    fontWeight: 700,
                                                    background: 'var(--color-surface)',
                                                    color: 'var(--color-text-contrast)',
                                                    fontFamily: 'inherit',
                                                    boxShadow: '4px 4px 0 var(--color-shadow)'
                                                }}
                                            >
                                                <option value="">{t('discover.filters.all')}</option>
                                                <option value="airing">{t('discover.filters.airing')}</option>
                                                <option value="complete">{t('discover.filters.complete')}</option>
                                                <option value="upcoming">{t('discover.filters.upcoming')}</option>
                                            </select>
                                        </div>

                                        {/* Rating */}
                                        <div>
                                            <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.9rem', color: 'var(--color-text)' }}>{t('discover.filters.rating')}</label>
                                            <select
                                                value={filterRating}
                                                onChange={(e) => setFilterRating(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: '2px solid var(--color-border-heavy)',
                                                    borderRadius: 0,
                                                    fontWeight: 700,
                                                    background: 'var(--color-surface)',
                                                    color: 'var(--color-text-contrast)',
                                                    fontFamily: 'inherit',
                                                    boxShadow: '4px 4px 0 var(--color-shadow)'
                                                }}
                                            >
                                                <option value="">{t('discover.filters.all')}</option>
                                                <option value="g">{t('discover.filters.all_ages')}</option>
                                                <option value="pg13">{t('discover.filters.teen')}</option>
                                                <option value="r17">{t('discover.filters.adult')}</option>
                                            </select>
                                        </div>

                                        {/* Score */}
                                        <div>
                                            <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.9rem', color: 'var(--color-text)' }}>{t('discover.filters.min_score')} : <span style={{ color: 'var(--color-primary)' }}>{filterScore}</span></label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                step="1"
                                                value={filterScore}
                                                onChange={(e) => setFilterScore(Number(e.target.value))}
                                                style={{
                                                    width: '100%',
                                                    height: '10px',
                                                    accentColor: 'var(--color-primary)',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-dim)' }}>
                                                <span>0</span>
                                                <span>5</span>
                                                <span>10</span>
                                            </div>
                                        </div>

                                        {/* Year */}
                                        <div>
                                            <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.9rem', color: 'var(--color-text)' }}>{t('discover.filters.year')}</label>
                                            <input
                                                type="number"
                                                placeholder={t('discover.filters.year_placeholder')}
                                                value={filterYear}
                                                onChange={(e) => setFilterYear(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: '2px solid var(--color-border-heavy)',
                                                    borderRadius: 0,
                                                    fontWeight: 700,
                                                    fontFamily: 'inherit',
                                                    background: 'var(--color-surface)',
                                                    color: 'var(--color-text-contrast)',
                                                    boxShadow: '4px 4px 0 var(--color-shadow)'
                                                }}
                                            />
                                        </div>

                                        {/* Studio */}
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.9rem', color: 'var(--color-text)' }}>{t('discover.filters.studio')}</label>
                                            <select
                                                value={filterStudio}
                                                onChange={(e) => setFilterStudio(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: '2px solid var(--color-border-heavy)',
                                                    borderRadius: 0,
                                                    fontWeight: 700,
                                                    background: 'var(--color-surface)',
                                                    color: 'var(--color-text-contrast)',
                                                    fontFamily: 'inherit',
                                                    boxShadow: '4px 4px 0 var(--color-shadow)'
                                                }}
                                            >
                                                <option value="">{t('discover.filters.all_studios')}</option>
                                                {studios.map(studio => (
                                                    <option key={studio.mal_id} value={String(studio.mal_id)}>
                                                        {getProducerName(studio).toUpperCase()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Reset Button */}
                                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                            <button
                                                onClick={resetFilters}
                                                style={{
                                                    background: 'var(--color-text)',
                                                    color: 'var(--color-surface)',
                                                    border: 'none',
                                                    padding: '0.5rem 1.5rem',
                                                    cursor: 'pointer',
                                                    fontWeight: 900,
                                                    fontFamily: 'var(--font-heading)',
                                                    textTransform: 'uppercase',
                                                    fontSize: '0.9rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <X size={16} /> {t('discover.filters.reset')}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Quick Genres */}
                        {!searchQuery && !showFilters && (
                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                {quickGenres.map(genre => {
                                    const isActive = selectedGenre === genre.mal_id;
                                    return (
                                        <button
                                            key={genre.mal_id}
                                            onClick={() => handleGenreClick(genre.mal_id)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0',
                                                border: isActive ? 'none' : '2px solid var(--color-border)',
                                                background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                                                color: isActive ? '#fff' : 'var(--color-text)',
                                                fontWeight: 700,
                                                fontSize: '0.9rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: isActive ? 'inset 2px 2px 5px rgba(0,0,0,0.2)' : '2px 2px 0 var(--color-shadow)',
                                                transform: isActive ? 'translate(1px, 1px)' : 'none'
                                            }}
                                        >
                                            {genre.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    {searchQuery.length > 2 || hasFilters ? (
                        /* Search Results */
                        <div>
                            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '2rem', color: 'var(--color-text-contrast)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Search size={32} />
                                {t('discover.search.results_title')}
                            </h2>

                            {/* Filter Chips (if any active) */}
                            {hasFilters && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                                    {selectedGenre && <span style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>{t('discover.filters.genre')}: {genres.find(g => g.mal_id === selectedGenre)?.name || selectedGenre}</span>}
                                    {filterStatus && <span style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>{t('discover.filters.status')}: {filterStatus}</span>}
                                    {filterYear && <span style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>{t('discover.filters.year')}: {filterYear}</span>}
                                    {filterScore > 0 && <span style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>{t('discover.filters.score')} : {filterScore}</span>}
                                    {filterStudio && <span style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>{t('discover.filters.studio')}: {(() => { const s = studios.find(x => String(x.mal_id) === filterStudio); return s ? getProducerName(s) : filterStudio; })()}</span>}
                                </div>
                            )}

                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                                    <Loader2 className="spin" size={48} />
                                </div>
                            ) : (
                                <div className={styles.resultsGrid}>
                                    {searchResults.map((work, index) => {
                                        const isOwned = libraryIds.has(work.mal_id);
                                        const compositeKey = `${work.type || 'unknown'}-${work.mal_id}`;
                                        return (
                                            <motion.div key={compositeKey} whileHover={{ y: -5 }}>
                                                <Card
                                                    variant="manga"
                                                    hoverable
                                                    style={{
                                                        padding: 0,
                                                        overflow: 'hidden',
                                                        height: '100%',
                                                        border: '2px solid var(--color-border-heavy)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        background: 'var(--color-surface)'
                                                    }}
                                                    onClick={() => handleWorkClick(work)}
                                                >
                                                    <div style={{ position: 'relative', aspectRatio: '2/3', borderBottom: '2px solid var(--color-border-heavy)', flexShrink: 0 }}>
                                                        <OptimizedImage
                                                            src={work.images.jpg.image_url}
                                                            alt={getDisplayTitle(work, titleLanguage)}
                                                            priority={index < 4}
                                                        />
                                                        {isOwned && (
                                                            <div style={{ position: 'absolute', top: 5, right: 5, background: 'var(--color-primary)', color: '#fff', padding: '4px', borderRadius: '0' }}>
                                                                <Check size={14} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ padding: '1rem', background: 'var(--color-surface)', flex: 1, color: 'var(--color-text)' }}>
                                                        <h3 style={{
                                                            fontSize: '1rem',
                                                            fontWeight: 800,
                                                            fontFamily: 'var(--font-heading)',
                                                            lineHeight: 1.2,
                                                            marginBottom: '0.5rem',
                                                            overflow: 'hidden',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            color: 'var(--color-text)'
                                                        }}>{getDisplayTitle(work, titleLanguage)}</h3>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7 }}>
                                                            <span style={{ fontWeight: 600 }}>{work.type}</span>
                                                            {work.score && !hideScores && <span>★ {work.score}</span>}
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        );
                                    })}
                                    {searchResults.length === 0 && !loading && (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', fontSize: '1.2rem', fontWeight: 600 }}>
                                            {t('discover.search.no_results')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Home Content */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                            {/* Surprise Me Section */}
                            <div style={{ marginBottom: '2rem' }}>
                                <Card variant="manga" style={{
                                    padding: '2rem',
                                    background: 'linear-gradient(135deg, #000 0%, #333 100%)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '2rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <div>
                                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '0.5rem', color: '#fff' }}>
                                            {t('discover.surprise.title')}
                                        </h2>
                                        <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>{t('discover.surprise.subtitle')}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        {(['anime', 'manga'] as const).map(kind => (
                                            <Button
                                                key={kind}
                                                variant="manga"
                                                onClick={() => handleSurpriseMe(kind)}
                                                icon={loading ? <Loader2 className="spin" size={24} /> : <Dice5 size={24} />}
                                                disabled={loading}
                                                style={{
                                                    fontSize: '1.1rem',
                                                    padding: '1rem 1.5rem',
                                                    background: 'var(--color-surface)',
                                                    border: 'none',
                                                    color: 'var(--color-text-contrast)',
                                                    boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                                    transition: 'all 0.2s',
                                                    opacity: loading ? 0.7 : 1
                                                }}
                                                whileHover={{
                                                    borderColor: 'var(--color-primary)',
                                                    color: 'var(--color-primary)',
                                                    boxShadow: '4px 4px 0 var(--color-primary)'
                                                }}
                                            >
                                                {t(`discover.surprise.button_${kind}`)}
                                            </Button>
                                        ))}
                                    </div>
                                </Card>
                            </div>

                            {/* Carousels */}
                            <Carousel
                                title={<><Flame size={24} color="#ef4444" /> {t('discover.carousels.seasonal')}</>}
                                items={seasonalAnime}
                                onItemClick={handleWorkClick}
                                libraryIds={libraryIds}
                                onAdd={handleQuickAdd}
                                loading={isLoadingSections}
                                priority={true}
                            />

                            <Carousel
                                title={<><Sparkles size={24} color="#eab308" /> {t('discover.carousels.top_anime')}</>}
                                items={topAnime}
                                onItemClick={handleWorkClick}
                                libraryIds={libraryIds}
                                onAdd={handleQuickAdd}
                                loading={isLoadingSections}
                                showRank
                            />

                            <Carousel
                                title={<><CalendarClock size={24} color="#8b5cf6" /> {t('discover.carousels.upcoming')}</>}
                                items={upcomingAnime}
                                onItemClick={handleWorkClick}
                                libraryIds={libraryIds}
                                onAdd={handleQuickAdd}
                                loading={isLoadingSections}
                            />

                            <Carousel
                                title={<><Users size={24} color="#10b981" /> {t('discover.carousels.community_recs')}</>}
                                items={communityRecs}
                                onItemClick={handleWorkClick}
                                libraryIds={libraryIds}
                                onAdd={handleQuickAdd}
                                loading={isLoadingSections}
                            />

                            <Carousel
                                title={<><TrendingUp size={24} color="var(--color-primary)" /> {t('discover.carousels.popular_manga')}</>}
                                items={popularManga}
                                onItemClick={handleWorkClick}
                                libraryIds={libraryIds}
                                onAdd={handleQuickAdd}
                                loading={isLoadingSections}
                            />

                            <Carousel
                                title={<><Star size={24} color="#f59e0b" /> {t('discover.carousels.top_manga')}</>}
                                items={topManga}
                                onItemClick={handleWorkClick}
                                libraryIds={libraryIds}
                                onAdd={handleQuickAdd}
                                loading={isLoadingSections}
                                showRank
                            />

                            <FriendRecommendations />
                        </div>
                    )}

                    {/* Modals */}
                    {selectedWork && (
                        <AddWorkModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            initialWork={selectedWork}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
}
