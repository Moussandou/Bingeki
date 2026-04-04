
import React, { useState, useEffect } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { Search, Info, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { searchCharacters, getWorkCharacters, searchWorks, getTopWorks } from '@/services/animeApi';
import type { JikanCharacter, JikanResult } from '@/services/animeApi';
import { useToast } from '@/context/ToastContext';
import styles from './CharacterPool.module.css';

// Types
export interface PoolCharacter {
    mal_id: number;
    name: string;
    images: {
        jpg: {
            image_url: string;
        };
    };
}

export type PoolTab = 'anime' | 'manga' | 'characters';
export type CharSubTab = 'by_name' | 'by_anime' | 'by_manga';
export type DemoFilter = 'all' | 'shonen' | 'seinen' | 'shojo' | 'josei';

const DEMO_GENRE_IDS: Record<DemoFilter, string | undefined> = {
    all: undefined,
    shonen: '27',
    seinen: '42',
    shojo: '25',
    josei: '43',
};

export const SUGGESTIONS: Record<PoolTab, Array<{ label: string; id: number; type: 'anime' | 'manga'; image: string }>> = {
    anime: [
        { label: 'JJK', id: 40748, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
        { label: 'AOT', id: 16498, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
        { label: 'Demon Slayer', id: 38000, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
        { label: 'Naruto', id: 20, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg' },
        { label: 'HxH', id: 11061, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
        { label: 'One Piece', id: 21, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
    ],
    manga: [
        { label: 'Berserk', id: 2, type: 'manga', image: 'https://cdn.myanimelist.net/images/manga/1/157897.jpg' },
        { label: 'One Piece', id: 13, type: 'manga', image: 'https://cdn.myanimelist.net/images/manga/2/253146.jpg' },
        { label: 'Vinland', id: 21881, type: 'manga', image: 'https://cdn.myanimelist.net/images/manga/2/188654.jpg' },
        { label: 'JJK', id: 113138, type: 'manga', image: 'https://cdn.myanimelist.net/images/manga/3/216464.jpg' },
        { label: 'Vagabond', id: 11, type: 'manga', image: 'https://cdn.myanimelist.net/images/manga/1/259070.jpg' },
    ],
    characters: [
        { label: 'JJK', id: 40748, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
        { label: 'One Piece', id: 13, type: 'manga', image: 'https://cdn.myanimelist.net/images/manga/2/253146.jpg' },
        { label: 'AOT', id: 16498, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
        { label: 'Berserk', id: 2, type: 'manga', image: 'https://cdn.myanimelist.net/images/manga/1/157897.jpg' },
        { label: 'Naruto', id: 20, type: 'anime', image: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg' },
    ],
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface CharacterPoolState {
    activeTab: PoolTab;
    charSubTab: CharSubTab;
    selectedDemo: DemoFilter;
    query: string;
    isLoading: boolean;
    characters: PoolCharacter[];
    works: JikanResult[];
    browsedWorkTitle: string | null;
    hasSearched: boolean;
    showDemoFilters: boolean;
    demoChips: DemoFilter[];
    setQuery: (q: string) => void;
    handleTabChange: (tab: PoolTab) => void;
    handleSubTabChange: (sub: CharSubTab) => void;
    handleDemoChange: (demo: DemoFilter) => void;
    handleSearch: (e: React.SyntheticEvent) => void;
    handleWorkSelect: (work: JikanResult) => void;
    handleBackToWorks: () => void;
    handleSuggestionClick: (s: typeof SUGGESTIONS['anime'][number]) => void;
    getSearchPlaceholder: () => string;
}

export function useCharacterPool(): CharacterPoolState {
    const { t } = useTranslation();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState<PoolTab>('characters');
    const [charSubTab, setCharSubTab] = useState<CharSubTab>('by_name');
    const [selectedDemo, setSelectedDemo] = useState<DemoFilter>('all');
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [characters, setCharacters] = useState<PoolCharacter[]>([]);
    const [works, setWorks] = useState<JikanResult[]>([]);
    const [browsedWorkTitle, setBrowsedWorkTitle] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const loadTopWorks = async (type: 'anime' | 'manga') => {
        setIsLoading(true);
        try {
            const results = await getTopWorks(type, 'bypopularity', 24);
            setWorks(results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-load popular anime on mount
    useEffect(() => {
        loadTopWorks('anime');
    }, []);

    const handleTabChange = async (tab: PoolTab) => {
        setActiveTab(tab);
        setCharacters([]);
        setWorks([]);
        setQuery('');
        setBrowsedWorkTitle(null);
        setSelectedDemo('all');
        setHasSearched(false);

        if (tab !== 'characters') {
            await loadTopWorks(tab);
        } else {
            // Default: load top anime for by_anime sub-tab
            await loadTopWorks('anime');
        }
    };

    const handleSubTabChange = async (sub: CharSubTab) => {
        setCharSubTab(sub);
        setCharacters([]);
        setWorks([]);
        setQuery('');
        setBrowsedWorkTitle(null);
        setSelectedDemo('all');
        setHasSearched(false);

        if (sub !== 'by_name') {
            await loadTopWorks(sub === 'by_anime' ? 'anime' : 'manga');
        }
    };

    const getDemoFilter = () => {
        const id = DEMO_GENRE_IDS[selectedDemo];
        return id ? { genres: id } : undefined;
    };

    const showDemoFilters =
        activeTab === 'anime' ||
        activeTab === 'manga' ||
        (activeTab === 'characters' && (charSubTab === 'by_anime' || charSubTab === 'by_manga'));

    const handleSearch = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        setCharacters([]);
        setWorks([]);
        setBrowsedWorkTitle(null);

        try {
            if (activeTab === 'anime') {
                setWorks(await searchWorks(query, 'anime', getDemoFilter()));
            } else if (activeTab === 'manga') {
                setWorks(await searchWorks(query, 'manga', getDemoFilter()));
            } else {
                if (charSubTab === 'by_name') {
                    const results = await searchCharacters(query);
                    const unique = Array.from(new Map(results.map(i => [i.mal_id, i])).values());
                    setCharacters(unique);
                } else {
                    const workType = charSubTab === 'by_anime' ? 'anime' : 'manga';
                    setWorks(await searchWorks(query, workType, getDemoFilter()));
                }
            }
        } catch (error) {
            console.error(error);
            if (error instanceof Error && error.message.includes('504')) {
                addToast(t('tierlist.jikan_busy'), 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleWorkSelect = async (work: JikanResult) => {
        setIsLoading(true);
        setBrowsedWorkTitle(work.title);
        const workType = charSubTab === 'by_manga' ? 'manga' : 'anime';
        try {
            const results = await getWorkCharacters(work.mal_id, workType);
            const sorted = [...results].sort((a, b) => (b.favorites ?? 0) - (a.favorites ?? 0));
            const formatted: PoolCharacter[] = sorted.map((c: JikanCharacter) => ({
                mal_id: c.character.mal_id,
                name: c.character.name,
                images: c.character.images
            }));
            const unique = Array.from(new Map(formatted.map(i => [i.mal_id, i])).values());
            setCharacters(unique);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToWorks = () => {
        setCharacters([]);
        setBrowsedWorkTitle(null);
    };

    const handleDemoChange = async (demo: DemoFilter) => {
        setSelectedDemo(demo);
        setIsLoading(true);
        setWorks([]);
        setCharacters([]);
        setBrowsedWorkTitle(null);

        const genreId = DEMO_GENRE_IDS[demo];
        const baseFilters: { genres?: string; order_by?: 'score' | 'popularity' | 'title'; sort?: 'asc' | 'desc' } = genreId ? { genres: genreId } : {};

        if (!query.trim()) {
            baseFilters.order_by = 'popularity';
            baseFilters.sort = 'asc';
        }

        try {
            if (activeTab === 'anime') {
                setWorks(await searchWorks(query, 'anime', baseFilters));
            } else if (activeTab === 'manga') {
                setWorks(await searchWorks(query, 'manga', baseFilters));
            } else if (charSubTab === 'by_anime') {
                setWorks(await searchWorks(query, 'anime', baseFilters));
            } else if (charSubTab === 'by_manga') {
                setWorks(await searchWorks(query, 'manga', baseFilters));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = async (s: typeof SUGGESTIONS['anime'][number]) => {
        setIsLoading(true);
        setCharacters([]);
        setWorks([]);
        setBrowsedWorkTitle(null);

        try {
            if (activeTab === 'characters') {
                const results = await getWorkCharacters(s.id, s.type);
                const sorted = [...results].sort((a, b) => (b.favorites ?? 0) - (a.favorites ?? 0));
                const formatted: PoolCharacter[] = sorted.map((c: JikanCharacter) => ({
                    mal_id: c.character.mal_id,
                    name: c.character.name,
                    images: c.character.images
                }));
                const unique = Array.from(new Map(formatted.map(i => [i.mal_id, i])).values());
                setCharacters(unique);
                setBrowsedWorkTitle(s.label);
            } else {
                const results = await searchWorks(s.label, s.type);
                setWorks(results);
                setQuery(s.label);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getSearchPlaceholder = () => {
        if (activeTab === 'anime') return t('tierlist.search_work_anime');
        if (activeTab === 'manga') return t('tierlist.search_work_manga');
        if (charSubTab === 'by_name') return t('tierlist.search_name');
        if (charSubTab === 'by_anime') return t('tierlist.search_work_anime');
        return t('tierlist.search_work_manga');
    };

    const demoChips: DemoFilter[] = ['all', 'shonen', 'seinen', 'shojo', 'josei'];

    return {
        activeTab, charSubTab, selectedDemo, query, isLoading,
        characters, works, browsedWorkTitle,
        hasSearched, showDemoFilters, demoChips,
        setQuery,
        handleTabChange, handleSubTabChange, handleDemoChange,
        handleSearch, handleWorkSelect, handleBackToWorks, handleSuggestionClick,
        getSearchPlaceholder,
    };
}

// ─── Draggable items ──────────────────────────────────────────────────────────

function DraggablePoolItem({ character }: { character: PoolCharacter }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `pool-${character.mal_id}`,
        data: { character }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        opacity: isDragging ? 0.8 : 1,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, backgroundImage: `url(${character.images?.jpg?.image_url})` }}
            {...listeners}
            {...attributes}
            className={styles.poolItem}
        >
            <div className={styles.nameOverlay}>{character.name}</div>
        </div>
    );
}

function DraggablePoolWork({ work }: { work: JikanResult }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `pool-work-${work.mal_id}`,
        data: { work }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        opacity: isDragging ? 0.8 : 1,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={styles.workDraggableCard}>
            <OptimizedImage
                src={work.images?.jpg?.image_url}
                alt={work.title}
                style={{ width: '100%', aspectRatio: '2/3' }}
                objectFit="cover"
            />
            <div className={styles.workTitle}>{work.title}</div>
        </div>
    );
}

// ─── CharacterPoolControls ────────────────────────────────────────────────────

export function CharacterPoolControls({ pool }: { pool: CharacterPoolState }) {
    const { t } = useTranslation();
    const {
        activeTab, charSubTab, selectedDemo, query,
        showDemoFilters, demoChips,
        setQuery,
        handleTabChange, handleSubTabChange, handleDemoChange,
        handleSearch, handleSuggestionClick, handleBackToWorks,
        browsedWorkTitle, getSearchPlaceholder,
    } = pool;

    return (
        <div className={styles.poolControls}>
            {/* Main 3 tabs */}
            <div className={styles.mainTabs}>
                {(['anime', 'manga', 'characters'] as PoolTab[]).map(tab => (
                    <button
                        key={tab}
                        className={`${styles.mainTab} ${activeTab === tab ? styles.mainTabActive : ''}`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {t(`tierlist.tab_${tab}`)}
                    </button>
                ))}
            </div>

            {/* Character sub-tabs */}
            {activeTab === 'characters' && (
                <div className={styles.subTabs}>
                    {(['by_name', 'by_anime', 'by_manga'] as CharSubTab[]).map(sub => (
                        <button
                            key={sub}
                            className={`${styles.subTab} ${charSubTab === sub ? styles.subTabActive : ''}`}
                            onClick={() => handleSubTabChange(sub)}
                        >
                            {t(`tierlist.sub_${sub}`)}
                        </button>
                    ))}
                </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={getSearchPlaceholder()}
                    className={styles.searchInput}
                />
                <Button type="submit" size="sm" icon={<Search size={16} />} />
            </form>

            {/* Demo filter chips */}
            {showDemoFilters && (
                <div className={styles.demoFilters}>
                    {demoChips.map(demo => (
                        <button
                            key={demo}
                            className={`${styles.demoChip} ${selectedDemo === demo ? styles.demoChipActive : ''}`}
                            onClick={() => handleDemoChange(demo)}
                        >
                            {t(`tierlist.demo_${demo}`)}
                        </button>
                    ))}
                </div>
            )}

            {/* Suggestions strip */}
            <div className={styles.suggestionsStrip}>
                {SUGGESTIONS[activeTab].map((s, idx) => (
                    <button
                        key={`${s.id}-${idx}`}
                        className={styles.suggestionCard}
                        onClick={() => handleSuggestionClick(s)}
                        title={s.label}
                    >
                        <img src={s.image} alt={s.label} className={styles.suggestionImage} />
                        <span className={styles.suggestionLabel}>{s.label}</span>
                    </button>
                ))}
            </div>

            {/* Breadcrumb */}
            {browsedWorkTitle && (
                <button className={styles.breadcrumb} onClick={handleBackToWorks}>
                    <ChevronLeft size={12} />
                    {t('tierlist.back_to_results')}
                    <span style={{ opacity: 0.7, marginLeft: 4 }}>{browsedWorkTitle}</span>
                </button>
            )}
        </div>
    );
}

// ─── CharacterPoolResults ─────────────────────────────────────────────────────

export function CharacterPoolResults({ pool, usedCharacterIds = [] }: { pool: CharacterPoolState, usedCharacterIds?: (string | number)[] }) {
    const { t } = useTranslation();
    const { activeTab, charSubTab, isLoading, characters, works, hasSearched, handleWorkSelect } = pool;

    const filteredCharacters = characters.filter(char => !usedCharacterIds.includes(char.mal_id));
    const filteredWorks = works.filter(work => !usedCharacterIds.includes(work.mal_id));

    if (isLoading) {
        return <div className={styles.loadingState}>{t('common.loading')}</div>;
    }

    // ANIME / MANGA tabs — draggable works
    if (activeTab === 'anime' || activeTab === 'manga') {
        return (
            <div className={styles.workGridWide}>
                {filteredWorks.map(work => <DraggablePoolWork key={work.mal_id} work={work} />)}
                {filteredWorks.length === 0 && (
                    <div className={styles.emptyState}>
                        <Info size={24} />
                        <p>{activeTab === 'anime' ? t('tierlist.no_anime') : t('tierlist.no_manga')}</p>
                    </div>
                )}
            </div>
        );
    }

    // CHARACTERS / by_name
    if (charSubTab === 'by_name') {
        return (
            <div className={styles.characterGridWide}>
                {filteredCharacters.map(char => <DraggablePoolItem key={char.mal_id} character={char} />)}
                {filteredCharacters.length === 0 && (
                    <div className={styles.emptyState}>
                        <Info size={24} />
                        <p>{hasSearched ? t('tierlist.no_characters') : t('tierlist.search_to_see_characters')}</p>
                    </div>
                )}
            </div>
        );
    }

    // CHARACTERS / by_anime or by_manga
    if (filteredCharacters.length > 0) {
        return (
            <div className={styles.characterGridWide}>
                {filteredCharacters.map(char => <DraggablePoolItem key={char.mal_id} character={char} />)}
            </div>
        );
    }

    return (
        <div className={styles.workGridWide}>
            {filteredWorks.map(work => (
                <div key={work.mal_id} onClick={() => handleWorkSelect(work)} className={styles.workCard}>
                    <OptimizedImage
                        src={work.images?.jpg?.image_url}
                        alt={work.title}
                        style={{ width: '100%', aspectRatio: '2/3' }}
                        objectFit="cover"
                    />
                    <div className={styles.workTitle}>{work.title}</div>
                </div>
            ))}
            {filteredWorks.length === 0 && (
                <div className={styles.emptyState}>
                    <Info size={24} />
                    <p>{charSubTab === 'by_anime' ? t('tierlist.no_anime') : t('tierlist.no_manga')}</p>
                </div>
            )}
        </div>
    );
}

// ─── Legacy export (kept for compatibility if used elsewhere) ─────────────────

export function CharacterPool({ usedCharacterIds = [] }: { usedCharacterIds?: (string | number)[] }) {
    const pool = useCharacterPool();
    return (
        <div className={styles.pool}>
            <div className={styles.poolHeader}>
                <CharacterPoolControls pool={pool} />
            </div>
            <div className={styles.poolContent}>
                <CharacterPoolResults pool={pool} usedCharacterIds={usedCharacterIds} />
            </div>
        </div>
    );
}
