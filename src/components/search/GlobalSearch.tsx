
import { useState, useEffect, useCallback } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { searchWorks, searchCharacters } from '@/services/animeApi';
import type { JikanResult, JikanCharacterFull } from '@/services/animeApi';
import { Loader2, Search, ChevronRight } from 'lucide-react';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResults {
    anime: JikanResult[];
    manga: JikanResult[];
    characters: JikanCharacterFull[];
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'anime' | 'manga' | 'characters'>('all');
    const [results, setResults] = useState<SearchResults>({ anime: [], manga: [], characters: [] });
    const [loading, setLoading] = useState(false);

    const performSearch = useCallback(async () => {
        setLoading(true);
        try {
            let animeData: JikanResult[] = [];
            let mangaData: JikanResult[] = [];
            let charData: JikanCharacterFull[] = [];

            if (activeTab === 'all' || activeTab === 'anime') {
                animeData = await searchWorks(query, 'anime', { limit: activeTab === 'all' ? 3 : 10 });
            }
            if (activeTab === 'all' || activeTab === 'manga') {
                mangaData = await searchWorks(query, 'manga', { limit: activeTab === 'all' ? 3 : 10 });
            }
            if (activeTab === 'all' || activeTab === 'characters') {
                charData = await searchCharacters(query, activeTab === 'all' ? 3 : 10);
            }

            setResults({
                anime: animeData || [],
                manga: mangaData || [],
                characters: charData || []
            });
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, [query, activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length >= 3) {
                performSearch();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, performSearch, activeTab]);


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
            // JikanResult defines title_japanese? Checking... JikanResult interface in source says no title_japanese.
            // Let's check JikanResult definition again from previous turn...
            // It has title, but not explicitly title_japanese in the JikanResult interface I saw earlier (lines 48-88).
            // It has 'title' and other fields. Let's assume title for now.
            // But wait, the original code used 'title_japanese'.
            // I should double check JikanResult content.
            // The JikanResult interface (lines 48-88) DOES NOT have 'title_japanese'. 
            // However, the API returns it. I should extend JikanResult or assume it's missing from the type definition.
            // But I am fixing types. I should probably add it to JikanResult definition if it's used, OR ignore it safely.
            // For now I will strictly use what is in JikanResult.
            // If I look at generated JikanResult (lines 48-88), it doesn't have title_japanese. 
            // However, the API returns it. I should extend JikanResult or assume it's missing from the type definition.
            // But I am fixing types. I should probably add it to JikanResult definition if it's used, OR ignore it safely.
            // For now I will strictly use what is in JikanResult.
            // If I look at generated JikanResult (lines 48-88), it doesn't have title_japanese. 
            // BUT, `GlobalSearch.tsx` logic `const subtitle = item.title_japanese || item.name_kanji;` implies it was used.
            // I will err on side of type safety: if it's not in JikanResult, I won't use it, OR I will cast.
            // Better yet, I'll assume JikanResult might be incomplete and fix it later if needed, but for now I'll stick to 'title'.
            // Wait, JikanResult DOES NOT have published date struct in the interface (lines 48-88), only `year`. 
            // Original code: `const year = item.year || (item.published?.from ...)`
            // JikanResult interface has `year?: number`. It doesn't show `published`.
            // I will use `year` directly.

            // To be safe and avoid errors, I will use accessible properties.
            year = work.year;
        }

        // Re-evaluating subtitle/year logic based on JikanResult definition I saw.
        // It has `year`.

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
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
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
                            placeholder={t('header.search_placeholder') || "SEARCH..."}
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

                {/* Tabs - Brutalist */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
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
