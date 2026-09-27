/**
 * Global Search component (search)
 *
 * Modal de recherche global : query + tabs ALL/ANIME/MANGA/CHARACTERS
 * + panneau de filtres brutalist (démographie, genres, thèmes, note,
 * statut, tri). Les filtres n'ont d'effet que sur ANIME et MANGA — sur
 * les onglets ALL et CHARACTERS ils sont ignorés (les personnages n'ont
 * pas de taxonomie MAL équivalente).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { searchWorks, searchCharacters, getGenres, type SearchFilters as ApiSearchFilters } from '@/services/animeApi';
import type { JikanResult, JikanCharacterFull } from '@/services/animeApi';
import { Loader2, Search, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { logger } from '@/utils/logger';
import { SearchFilters, ActiveFiltersBar } from './SearchFilters';
import { EMPTY_FILTERS, isEmptyFilters, type SearchFilterState } from './searchFilterTypes';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResults {
    anime: JikanResult[];
    manga: JikanResult[];
    characters: JikanCharacterFull[];
}

/**
 * Convertit l'état UI en filtres API (searchWorks). Le mediaType
 * détermine la nomenclature statut (airing vs publishing).
 */
function toApiFilters(state: SearchFilterState, mediaType: 'anime' | 'manga', limit: number): ApiSearchFilters {
    const out: ApiSearchFilters = { limit };
    // Genres + thèmes + démographie sont tous des IDs MAL → même param `genres`
    // (l'API accepte plusieurs IDs séparés par des virgules).
    const genreIds = [
        ...state.genres,
        ...state.themes,
        ...(state.demographic !== null ? [state.demographic] : []),
    ];
    if (genreIds.length > 0) out.genres = genreIds.join(',');
    if (state.minScore !== null) out.min_score = state.minScore;
    if (state.status) out.status = state.status;
    if (state.orderBy && state.orderBy !== 'relevance') {
        out.order_by = state.orderBy as ApiSearchFilters['order_by'];
        out.sort = state.orderBy === 'title' ? 'asc' : 'desc';
    }
    // mediaType retenu dans la signature pour permettre plus tard des
    // filtres spécifiques (rating dispo uniquement en anime, etc.)
    void mediaType;
    return out;
}

/** Détermine si les filtres ont un impact sur la requête (hors tri). */
function hasEffectiveFilters(state: SearchFilterState): boolean {
    return state.demographic !== null
        || state.genres.length > 0
        || state.themes.length > 0
        || state.minScore !== null
        || state.status !== null;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'anime' | 'manga' | 'characters'>('all');
    const [results, setResults] = useState<SearchResults>({ anime: [], manga: [], characters: [] });
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<SearchFilterState>(EMPTY_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const searchControllerRef = useRef<AbortController | null>(null);

    // Le mediaType effectif pour les taxonomies : sur "characters" on
    // n'a rien à filtrer, sur "all" on prend anime par défaut.
    const filtersMediaType: 'anime' | 'manga' = activeTab === 'manga' ? 'manga' : 'anime';

    // Lookups pour la barre des filtres actifs (id → nom lisible).
    const [genreLookup, setGenreLookup] = useState<Map<number, string>>(new Map());
    const [themeLookup, setThemeLookup] = useState<Map<number, string>>(new Map());
    const [demographicLookup, setDemographicLookup] = useState<Map<number, string>>(new Map());

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        Promise.all([
            getGenres(filtersMediaType),
            getGenres(filtersMediaType, 'themes'),
            getGenres(filtersMediaType, 'demographics'),
        ]).then(([g, th, demo]) => {
            if (cancelled) return;
            setGenreLookup(new Map((g || []).map(x => [x.mal_id, x.name])));
            setThemeLookup(new Map((th || []).map(x => [x.mal_id, x.name])));
            setDemographicLookup(new Map((demo || []).map(x => [x.mal_id, x.name])));
        }).catch(err => {
            if (!cancelled) logger.warn('[GlobalSearch] taxonomies lookup failed', err);
        });
        return () => { cancelled = true; };
    }, [isOpen, filtersMediaType]);

    const performSearch = useCallback(async () => {
        // Cancel any in-flight search from a previous keystroke
        searchControllerRef.current?.abort();
        const controller = new AbortController();
        searchControllerRef.current = controller;
        const signal = controller.signal;

        setLoading(true);
        try {
            let animeData: JikanResult[] = [];
            let mangaData: JikanResult[] = [];
            let charData: JikanCharacterFull[] = [];

            const opts = { priority: 'high' as const, signal };

            if (activeTab === 'all') {
                const animeFilters = toApiFilters(filters, 'anime', 3);
                const mangaFilters = toApiFilters(filters, 'manga', 3);
                [animeData, mangaData, charData] = await Promise.all([
                    searchWorks(query, 'anime', animeFilters, 1, opts),
                    searchWorks(query, 'manga', mangaFilters, 1, opts),
                    searchCharacters(query, 3, opts),
                ]);
            } else if (activeTab === 'anime') {
                animeData = await searchWorks(query, 'anime', toApiFilters(filters, 'anime', 15), 1, opts);
            } else if (activeTab === 'manga') {
                mangaData = await searchWorks(query, 'manga', toApiFilters(filters, 'manga', 15), 1, opts);
            } else if (activeTab === 'characters') {
                charData = await searchCharacters(query, 10, opts);
            }

            if (signal.aborted) return;

            setResults({
                anime: animeData || [],
                manga: mangaData || [],
                characters: charData || [],
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            logger.error('Search error:', error);
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, [query, activeTab, filters]);

    /*
     * Déclenche la recherche quand :
     *   - la query fait ≥ 3 caractères, ou
     *   - la query est vide MAIS des filtres sont actifs (mode "découverte")
     *
     * Les filtres ne s'appliquent pas sur "characters" (rien à filtrer côté MAL)
     * ni sur "all" tant qu'il n'y a pas au moins une query : on éviterait sinon
     * de charger des tonnes d'animes populaires à l'ouverture du modal.
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            const hasQuery = query.trim().length >= 3;
            const canDiscover = hasEffectiveFilters(filters)
                && (activeTab === 'anime' || activeTab === 'manga');
            if (hasQuery || canDiscover) {
                performSearch();
            } else {
                // Rien à afficher : reset pour ne pas garder des résultats stale
                setResults({ anime: [], manga: [], characters: [] });
            }
        }, 500);
        return () => {
            clearTimeout(timer);
            searchControllerRef.current?.abort();
        };
    }, [query, performSearch, activeTab, filters]);

    // Reset les filtres si on switche vers characters (pas de taxonomie applicable).
    useEffect(() => {
        if (activeTab === 'characters' && !isEmptyFilters(filters)) {
            setFilters(EMPTY_FILTERS);
        }
    }, [activeTab, filters]);

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (filters.demographic !== null) n++;
        n += filters.genres.length;
        n += filters.themes.length;
        if (filters.minScore !== null) n++;
        if (filters.status !== null) n++;
        return n;
    }, [filters]);

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose();
    };

    type ItemProps =
        | { item: JikanResult; type: 'anime' | 'manga' }
        | { item: JikanCharacterFull; type: 'character' };

    const ResultItem = ({ item, type }: ItemProps) => {
        let image = '';
        let title = '';
        let subtitle: string | null = null;
        let year: number | null | undefined = null;

        if (type === 'character') {
            const char = item as JikanCharacterFull;
            image = char.images?.jpg?.image_url;
            title = char.name;
            subtitle = char.name_kanji;
        } else {
            const work = item as JikanResult;
            image = work.images?.jpg?.image_url;
            title = work.title;
            year = work.year;
        }

        let link = '';
        if (type === 'anime') link = `/work/${item.mal_id}?type=anime`;
        if (type === 'manga') link = `/work/${item.mal_id}?type=manga`;
        if (type === 'character') link = `/character/${item.mal_id}`;

        return (
            <div
                onClick={() => handleNavigate(link)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                }}
                className="group relative hover:-translate-y-1 hover:shadow-[4px_4px_0_var(--color-primary)] active:translate-y-0 active:shadow-none"
            >
                <div style={{
                    width: 45,
                    height: 65,
                    border: '2px solid var(--color-border-heavy)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'var(--color-surface-hover)'
                }}>
                    <OptimizedImage src={image} alt={title} style={{ width: '100%', height: '100%' }} objectFit="cover" showSkeleton={false} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 900,
                        fontSize: '1rem',
                        lineHeight: 1.1,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>{title}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        {type === 'anime' && <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'var(--color-primary)', color: '#fff', padding: '2px 6px' }}>ANIME</span>}
                        {type === 'manga' && <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#22c55e', color: '#fff', padding: '2px 6px' }}>MANGA</span>}
                        {type === 'character' && <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#e11d48', color: '#fff', padding: '2px 6px' }}>CHAR</span>}

                        <div style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {year && <span style={{ marginRight: '0.5rem' }}>{year}</span>}
                            {subtitle && <span>{subtitle}</span>}
                        </div>
                    </div>
                </div>
                <ChevronRight size={20} style={{ opacity: 0.3 }} />
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" variant="manga">
            <style>{`
                .search-container {
                    min-height: 450px;
                    display: flex;
                    flex-direction: column;
                }
                .search-input {
                    font-size: 1.5rem;
                    padding: 1rem;
                }
                .search-icon-box {
                    width: 60px;
                }
                @media (max-width: 640px) {
                    .search-container {
                        min-height: 60vh;
                    }
                    .search-input {
                        font-size: 1.1rem;
                        padding: 0.75rem;
                    }
                    .search-icon-box {
                        width: 45px;
                    }
                }
            `}</style>
            <div className="search-container">
                {/* Search Header - Stylized */}
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        border: '3px solid var(--color-border-heavy)',
                        background: 'var(--color-surface)',
                        boxShadow: '6px 6px 0 var(--color-primary)'
                    }}>
                        <div className="search-icon-box" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--color-primary)',
                            borderRight: '3px solid var(--color-border-heavy)'
                        }}>
                            <Search size={24} color="#fff" strokeWidth={3} />
                        </div>
                        <input
                            placeholder={t('header.search_placeholder') || 'SEARCH...'}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="search-input"
                            style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontFamily: 'var(--font-heading)',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                color: 'var(--color-text)'
                            }}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Tabs + bouton Filtres */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.9rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {(['all', 'anime', 'manga', 'characters'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: '2px solid var(--color-border-heavy)',
                                    background: activeTab === tab ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: activeTab === tab ? '#fff' : 'var(--color-text)',
                                    fontFamily: 'var(--font-heading)',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: activeTab === tab ? 'none' : '3px 3px 0 var(--color-shadow-solid)',
                                    transform: activeTab === tab ? 'translate(2px, 2px)' : 'none',
                                    transition: 'all 0.1s',
                                    fontSize: '0.8rem',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    {(activeTab === 'anime' || activeTab === 'manga' || activeTab === 'all') && (
                        <button
                            type="button"
                            onClick={() => setShowFilters(v => !v)}
                            aria-pressed={showFilters}
                            style={{
                                marginLeft: 'auto',
                                padding: '0.5rem 0.9rem',
                                border: '2px solid var(--color-border-heavy)',
                                background: showFilters || activeFilterCount > 0
                                    ? 'var(--color-secondary)' : 'var(--color-surface)',
                                color: showFilters || activeFilterCount > 0
                                    ? '#000' : 'var(--color-text)',
                                fontFamily: 'var(--font-heading)',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '3px 3px 0 var(--color-shadow-solid)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                            }}
                        >
                            <SlidersHorizontal size={14} strokeWidth={3} />
                            Filtres
                            {activeFilterCount > 0 && (
                                <span style={{
                                    background: 'var(--color-primary)',
                                    color: '#fff',
                                    padding: '0 6px',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    marginLeft: '0.2rem',
                                }}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Active filters row (toujours visible s'il y en a) */}
                <ActiveFiltersBar
                    filters={filters}
                    genreLookup={genreLookup}
                    themeLookup={themeLookup}
                    demographicLookup={demographicLookup}
                    onChange={setFilters}
                    onClearAll={() => setFilters(EMPTY_FILTERS)}
                />

                {/* Panneau filtres (toggle) */}
                {showFilters && (activeTab === 'anime' || activeTab === 'manga' || activeTab === 'all') && (
                    <div style={{ marginBottom: '1rem' }}>
                        <SearchFilters
                            mediaType={filtersMediaType}
                            filters={filters}
                            onChange={setFilters}
                        />
                    </div>
                )}

                {/* Results - Card Style grid items */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
                            <p style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontWeight: 800 }}>Loading...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'all' && (
                                <>
                                    {results.anime.length > 0 && <div><h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 900, marginBottom: '0.75rem', borderLeft: '4px solid var(--color-primary)', paddingLeft: '0.5rem', color: 'var(--color-text)' }}>ANIME</h4>{results.anime.map(item => <ResultItem key={item.mal_id} item={item} type="anime" />)}</div>}
                                    {results.manga.length > 0 && <div><h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 900, marginBottom: '0.75rem', marginTop: '1.5rem', borderLeft: '4px solid #22c55e', paddingLeft: '0.5rem', color: 'var(--color-text)' }}>MANGA</h4>{results.manga.map(item => <ResultItem key={item.mal_id} item={item} type="manga" />)}</div>}
                                    {results.characters.length > 0 && <div><h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 900, marginBottom: '0.75rem', marginTop: '1.5rem', borderLeft: '4px solid #e11d48', paddingLeft: '0.5rem', color: 'var(--color-text)' }}>CHARACTERS</h4>{results.characters.map(item => <ResultItem key={item.mal_id} item={item} type="character" />)}</div>}
                                </>
                            )}

                            {activeTab === 'anime' && results.anime.map(item => <ResultItem key={item.mal_id} item={item} type="anime" />)}
                            {activeTab === 'manga' && results.manga.map(item => <ResultItem key={item.mal_id} item={item} type="manga" />)}
                            {activeTab === 'characters' && results.characters.map(item => <ResultItem key={item.mal_id} item={item} type="character" />)}

                            {!loading && query.length >= 3 &&
                                results.anime.length === 0 && results.manga.length === 0 && results.characters.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, border: '2px dashed var(--color-border)', borderRadius: '8px' }}>
                                        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem' }}>No results found</p>
                                    </div>
                                )}
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}
