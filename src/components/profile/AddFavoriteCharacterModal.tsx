/**
 * Add Favorite Character Modal component (profile)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Modal } from '@/components/ui/Modal';

import { Button } from '@/components/ui/Button';
import { searchCharacters } from '@/services/animeApi';
import type { JikanCharacterFull } from '@/services/animeApi';
import { type FavoriteCharacter } from '@/types/character';
import { Loader2, Search, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { saveUserProfileToFirestore } from '@/firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { useLibraryStore } from '@/store/libraryStore';

interface AddFavoriteCharacterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFavorites: FavoriteCharacter[];
    onUpdate: (newFavorites: FavoriteCharacter[]) => void;
}

export function AddFavoriteCharacterModal({ isOpen, onClose, currentFavorites, onUpdate }: AddFavoriteCharacterModalProps) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { addToast } = useToast();
    const { setFavoriteCharacters } = useLibraryStore();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<JikanCharacterFull[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection state for batch adding
    const [selectedChars, setSelectedChars] = useState<FavoriteCharacter[]>([]);

    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Reset selection on open
    useEffect(() => {
        if (isOpen) {
            setSelectedChars([]);
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    useEffect(() => {
        const performSearch = async () => {
            if (debouncedQuery.trim().length < 3) return;
            setLoading(true);
            try {
                const data = await searchCharacters(debouncedQuery);
                setResults(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery]);

    const toggleSelection = (char: JikanCharacterFull) => {
        // Build minimal object
        const charObj: FavoriteCharacter = {
            id: char.mal_id,
            name: char.name,
            image: char.images.jpg.image_url
        };

        setSelectedChars(prev => {
            const exists = prev.some(c => c.id === charObj.id);
            if (exists) {
                return prev.filter(c => c.id !== charObj.id);
            } else {
                return [...prev, charObj];
            }
        });
    };

    const handleConfirmAdd = async () => {
        if (!user || selectedChars.length === 0) return;

        // Merge with current favorites
        // Filter out duplicates that might already be in currentFavorites
        const safeNewChars = selectedChars.filter(
            newC => !currentFavorites.some(curr => curr.id === newC.id)
        );

        if (safeNewChars.length === 0) {
            addToast("Ces personnages sont déjà dans vos favoris", "info");
            onClose();
            return;
        }

        const updatedFavorites = [...currentFavorites, ...safeNewChars];

        try {
            await saveUserProfileToFirestore({
                uid: user.uid,
                favoriteCharacters: updatedFavorites
            }, true);

            // Update Store AND Parent State
            setFavoriteCharacters(updatedFavorites);
            onUpdate(updatedFavorites);

            addToast(`${safeNewChars.length} personnage(s) ajouté(s) !`, 'success');
            onClose();
        } catch (error) {
            console.error(error);
            addToast(t('profile.toast.save_error'), 'error');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('profile.add_favorite_character') || "Ajouter un personnage"} variant="manga">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '60vh', maxHeight: '500px' }}>
                <div style={{
                    position: 'relative',
                    border: '3px solid var(--color-border-heavy)',
                    background: 'var(--color-surface)',
                    boxShadow: '6px 6px 0 var(--color-primary)'
                }}>
                    <Search
                        size={24}
                        style={{
                            position: 'absolute',
                            left: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-primary)'
                        }}
                    />
                    <input
                        placeholder={t('components.add_work_modal.search_placeholder') || "SEARCH..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 3.5rem',
                            fontSize: '1.2rem',
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

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
                    {loading && <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin mx-auto" size={40} /></div>}

                    {!loading && results.map(char => {
                        const isAlreadyFavorite = currentFavorites.some((c: FavoriteCharacter) => c.id === char.mal_id);
                        const isSelected = selectedChars.some(c => c.id === char.mal_id);

                        return (
                            <div
                                key={char.mal_id}
                                onClick={() => !isAlreadyFavorite && toggleSelection(char)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.75rem',
                                    background: isSelected ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                    border: isSelected ? '3px solid var(--color-primary)' : '2px solid var(--color-border)',
                                    cursor: isAlreadyFavorite ? 'default' : 'pointer',
                                    opacity: isAlreadyFavorite ? 0.6 : 1,
                                    transition: 'all 0.1s',
                                    position: 'relative',
                                    boxShadow: isSelected ? '4px 4px 0 var(--color-primary)' : 'none',
                                    transform: isSelected ? 'translate(-2px, -2px)' : 'none'
                                }}
                            >
                                <div style={{
                                    width: 50,
                                    height: 50,
                                    border: '2px solid var(--color-border-heavy)',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
                                            <OptimizedImage
                                                src={char.images.jpg.image_url}
                                                alt={char.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontFamily: 'var(--font-heading)',
                                        fontWeight: 900,
                                        fontSize: '1rem',
                                        textTransform: 'uppercase'
                                    }}>{char.name}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>{char.name_kanji}</div>
                                </div>

                                {isAlreadyFavorite && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 900,
                                        padding: '4px 8px',
                                        background: 'var(--color-border)',
                                        color: 'var(--color-text-inverse)',
                                        textTransform: 'uppercase'
                                    }}>
                                        ALREADY ADDED
                                    </span>
                                )}

                                {!isAlreadyFavorite && (
                                    <div style={{
                                        width: 24,
                                        height: 24,
                                        border: '2px solid var(--color-border-heavy)',
                                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        {isSelected && <Check size={16} strokeWidth={4} />}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!loading && query.length >= 3 && results.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            border: '2px dashed var(--color-border)',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            {t('components.add_work_modal.no_results') || "Aucun résultat"}
                        </div>
                    )}

                    {!loading && query.length < 3 && results.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <Search size={64} strokeWidth={1} style={{ opacity: 0.2 }} />
                            <p style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontWeight: 900 }}>
                                {t('components.add_work_modal.search_hint') || "TYPE A NAME TO START THE HUNT"}
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ paddingTop: '1rem', borderTop: '3px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <Button variant="ghost" onClick={onClose} style={{ textTransform: 'uppercase', fontWeight: 900 }}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleConfirmAdd}
                        disabled={selectedChars.length === 0}
                        style={{ textTransform: 'uppercase', fontWeight: 900 }}
                    >
                        {t('common.add')} {selectedChars.length > 0 && `(${selectedChars.length})`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
