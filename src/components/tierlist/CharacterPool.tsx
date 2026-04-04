
import React, { useState } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { searchCharacters, getWorkCharacters, searchWorks } from '@/services/animeApi';
import type { JikanCharacter, JikanResult } from '@/services/animeApi';
import { useToast } from '@/context/ToastContext';
import styles from './CharacterPool.module.css';

// Define a unified Character type for the pool that covers both search results and work characters
interface PoolCharacter {
    mal_id: number;
    name: string;
    images: {
        jpg: {
            image_url: string;
        };
    };
}

// Draggable Item for the pool
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
            style={{
                ...style,
                backgroundImage: `url(${character.images?.jpg?.image_url})`
            }}
            {...listeners}
            {...attributes}
            className={styles.poolItem}
        />
    );
}

export function CharacterPool() {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [characters, setCharacters] = useState<PoolCharacter[]>([]);
    const [works, setWorks] = useState<JikanResult[]>([]);
    const [mode, setMode] = useState<'character' | 'work'>('character');
    const [workType, setWorkType] = useState<'anime' | 'manga'>('anime');

    // Quick Collections
    const handleLoadCollection = async (type: string) => {
        setIsLoading(true);
        setCharacters([]);
        setWorks([]);
        try {
            let results: JikanCharacter[] = [];
            if (type === 'jjk') {
                results = await getWorkCharacters(40748, 'anime'); // Jujutsu Kaisen
            } else if (type === 'naruto') {
                results = await getWorkCharacters(20, 'anime'); // Naruto
            } else if (type === 'aot') {
                results = await getWorkCharacters(16498, 'anime'); // Attack on Titan
            } else if (type === 'berserk') {
                results = await getWorkCharacters(2, 'manga'); // Berserk
            } else if (type === 'onepiece') {
                results = await getWorkCharacters(13, 'manga'); // One Piece
            }

            // Map to standard format
            const formatted: PoolCharacter[] = results.map((c: JikanCharacter) => ({
                mal_id: c.character.mal_id,
                name: c.character.name,
                images: c.character.images
            }));

            // Deduplicate by mal_id
            const unique = Array.from(new Map(formatted.map((item) => [item.mal_id, item])).values());

            setCharacters(unique);
            setMode('character'); // Force switch to character view
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setCharacters([]);
        setWorks([]);

        try {
            if (mode === 'character') {
                const results = await searchCharacters(query);
                // Deduplicate
                const unique = Array.from(new Map(results.map((item) => [item.mal_id, item])).values());
                setCharacters(unique);
            } else {
                const results = await searchWorks(query, workType);
                setWorks(results);
            }
        } catch (error) {
            console.error(error);
            if (error instanceof Error && error.message.includes('504')) {
                // Jikan often times out on popular queries
                addToast(t('tierlist.jikan_busy'), 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleWorkSelect = async (workId: number) => {
        setIsLoading(true);
        try {
            const results = await getWorkCharacters(workId, workType);
            const formatted: PoolCharacter[] = results.map((c: JikanCharacter) => ({
                mal_id: c.character.mal_id,
                name: c.character.name,
                images: c.character.images
            }));

            // Deduplicate
            const unique = Array.from(new Map(formatted.map((item) => [item.mal_id, item])).values());

            setCharacters(unique);
            setMode('character'); // Switch to view characters
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pool}>
            <div className={styles.poolHeader}>
                <h3 className={styles.poolTitle}>{t('tierlist.characters')}</h3>

                <div className={styles.modeTabs}>
                    <Button
                        size="sm"
                        variant={mode === 'character' ? 'primary' : 'outline'}
                        onClick={() => setMode('character')}
                        style={{ flex: 1, fontSize: '0.75rem', height: '32px' }}
                    >
                        {t('tierlist.by_name')}
                    </Button>
                    <Button
                        size="sm"
                        variant={mode === 'work' ? 'primary' : 'outline'}
                        onClick={() => setMode('work')}
                        style={{ flex: 1, fontSize: '0.75rem', height: '32px' }}
                    >
                        {workType === 'anime' ? t('tierlist.by_anime') : t('tierlist.by_manga')}
                    </Button>
                </div>

                {mode === 'work' && (
                    <div className={styles.workTypeTabs}>
                        <button
                            className={`${styles.workTypeButton} ${workType === 'anime' ? styles.workTypeButtonActive : ''}`}
                            onClick={() => setWorkType('anime')}
                        >
                            {t('tierlist.anime')}
                        </button>
                        <button
                            className={`${styles.workTypeButton} ${workType === 'manga' ? styles.workTypeButtonActive : ''}`}
                            onClick={() => setWorkType('manga')}
                        >
                            {t('tierlist.manga')}
                        </button>
                    </div>
                )}

                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={mode === 'character' ? t('tierlist.search_name') : (workType === 'anime' ? t('tierlist.search_anime') : t('tierlist.search_manga'))}
                        className={styles.searchInput}
                    />
                    <Button type="submit" size="sm" icon={<Search size={16} />}></Button>
                </form>

                <div className={styles.quickCollections}>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadCollection('jjk')}>JJK</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadCollection('onepiece')}>OP</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadCollection('berserk')}>Berserk</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadCollection('aot')}>AOT</Button>
                </div>
            </div>

            <div className={styles.poolContent}>
                {isLoading ? (
                    <div className={styles.loadingState}>{t('common.loading')}</div>
                ) : (
                    <>
                        {mode === 'character' ? (
                            <div className={styles.characterGrid}>
                                {characters.map(char => (
                                    <DraggablePoolItem key={char.mal_id} character={char} />
                                ))}
                                {characters.length === 0 && (
                                    <div className={styles.emptyState}>
                                        <Info size={24} />
                                        <p>{t('tierlist.no_characters')}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.workGrid}>
                                {works.map(work => (
                                    <div
                                        key={work.mal_id}
                                        onClick={() => handleWorkSelect(work.mal_id)}
                                        className={styles.workCard}
                                    >
                                        <OptimizedImage
                                            src={work.images?.jpg?.image_url}
                                            alt={work.title}
                                            style={{ width: '100%', aspectRatio: '2/3' }}
                                            objectFit="cover"
                                        />
                                        <div className={styles.workTitle}>
                                            {work.title}
                                        </div>
                                    </div>
                                ))}
                                {works.length === 0 && (
                                    <div className={styles.emptyState} style={{ gridColumn: 'span 2' }}>
                                        <Info size={24} />
                                        <p>{workType === 'anime' ? t('tierlist.no_anime') : t('tierlist.no_manga')}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
