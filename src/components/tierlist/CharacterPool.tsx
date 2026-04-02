
import React, { useState } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { searchCharacters, getWorkCharacters, searchWorks } from '@/services/animeApi';
import type { JikanCharacter, JikanResult } from '@/services/animeApi';
import { useToast } from '@/context/ToastContext';

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
            style={style}
            {...listeners}
            {...attributes}
            className="pool-item"
        >
            <div style={{
                width: '60px',
                height: '60px',
                backgroundImage: `url(${character.images?.jpg?.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '4px',
                border: '2px solid black',
                cursor: 'grab'
            }} />
        </div>
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
                const results = await searchWorks(query, 'anime');
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
            const results = await getWorkCharacters(workId, 'anime');
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
        <div style={{ background: 'white', border: '2px solid black', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '2px solid black', background: '#f5f5f5' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', margin: 0, marginBottom: '0.5rem' }}>{t('tierlist.characters')}</h3>

                <div style={{ display: 'flex', marginBottom: '1rem', gap: '1rem' }}>
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
                        {t('tierlist.by_anime')}
                    </Button>
                </div>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={mode === 'character' ? t('tierlist.search_name') : t('tierlist.search_anime')}
                        style={{ flex: 1, padding: '0.5rem', border: '2px solid black' }}
                    />
                    <Button type="submit" size="sm" icon={<Search size={16} />}></Button>
                </form>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadCollection('jjk')}>JJK</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadCollection('naruto')}>Naruto</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadCollection('aot')}>AOT</Button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', opacity: 0.5 }}>{t('common.loading')}</div>
                ) : (
                    <>
                        {mode === 'character' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                                {characters.map(char => (
                                    <DraggablePoolItem key={char.mal_id} character={char} />
                                ))}
                                {characters.length === 0 && !isLoading && (
                                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>
                                        <Info size={24} style={{ marginBottom: '0.5rem' }} />
                                        <p>{t('tierlist.no_characters')}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                {works.map(work => (
                                    <div
                                        key={work.mal_id}
                                        onClick={() => handleWorkSelect(work.mal_id)}
                                        style={{
                                            cursor: 'pointer',
                                            border: '2px solid transparent',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}
                                        className="hover:border-black transition-colors"
                                    >
                                        <OptimizedImage src={work.images?.jpg?.image_url} alt={work.title} style={{ width: '100%', aspectRatio: '2/3' }} objectFit="cover" />
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            background: 'rgba(0,0,0,0.8)', color: 'white',
                                            fontSize: '0.7rem', padding: '4px', textAlign: 'center',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>
                                            {work.title}
                                        </div>
                                    </div>
                                ))}
                                {works.length === 0 && !isLoading && (
                                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem', gridColumn: 'span 2' }}>
                                        <Info size={24} style={{ marginBottom: '0.5rem' }} />
                                        <p>{t('tierlist.no_anime')}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
