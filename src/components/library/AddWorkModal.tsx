/**
 * Add Work Modal component (library)
 */
import { useState, useEffect } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { searchWorks, type JikanResult } from '@/services/animeApi';
import { PenTool, Globe, Loader2, Plus, Check, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
// Activity logging is now handled server-side by onLibraryUpdate trigger
import { isValidImageSrc } from '@/utils/validation';

interface AddWorkModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialWork?: JikanResult;
}

export function AddWorkModal({ isOpen, onClose, initialWork }: AddWorkModalProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'api' | 'manual'>('api');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<JikanResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'manga' | 'anime'>('manga');
    const { addWork, works } = useLibraryStore();
    const { recordActivity, recalculateStats } = useGamificationStore();


    // Manual mode state
    const [manualTitle, setManualTitle] = useState('');
    const [manualTotal, setManualTotal] = useState<number>(0);
    const [manualImage, setManualImage] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let file: File | null = null;

        if ('files' in e.target && e.target.files) {
            file = e.target.files[0];
        } else if ('dataTransfer' in e && e.dataTransfer.files) {
            file = e.dataTransfer.files[0];
        }

        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setManualImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e);
    };

    const handleManualAdd = () => {
        if (!manualTitle.trim()) return;

        // Ensure we only save valid image URLs
        const safeImage = isValidImageSrc(manualImage) ? manualImage : 'https://placehold.co/400x600/000000/FFFFFF/png?text=NO+IMAGE';

        const newWork: Work = {
            id: Date.now(), // Generate a temporary ID
            title: manualTitle,
            image: safeImage,
            type: type,
            totalChapters: manualTotal,
            currentChapter: 0,
            status: 'reading',
        };

        addWork(newWork);
        recordActivity();
        
        const updatedWorks = useLibraryStore.getState().works;
        recalculateStats(updatedWorks);

        // Activity logging is now handled server-side by onLibraryUpdate trigger

        // Reset and close
        setManualTitle('');
        setManualTotal(0);
        setManualImage('');
        onClose();
    };

    // Handle initial work if provided
    useEffect(() => {
        if (isOpen && initialWork) {
            setQuery(initialWork.title);
            setResults([initialWork]);
            setType(initialWork.type === 'Manga' ? 'manga' : 'anime'); // Simple heuristic
        } else if (isOpen && !initialWork) {
            // Reset if opening fresh
            setQuery('');
            setResults([]);
        }
    }, [isOpen, initialWork]);

    // Live Search with Debounce
    useEffect(() => {
        // Skip search if we are just viewing the initial work (query matches initial work title)
        if (initialWork && query === initialWork.title) return;

        const timer = setTimeout(async () => {
            if (query.trim().length > 2 && mode === 'api') {
                setLoading(true);
                try {
                    const data = await searchWorks(query, type);
                    setResults(data);
                } catch (error) {
                    console.error("Search error", error);
                } finally {
                    setLoading(false);
                }
            } else if (query.trim().length === 0) {
                setResults([]);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [query, type, mode, initialWork]);

    const handleAdd = (work: JikanResult) => {
        const newWork: Work = {
            id: work.mal_id,
            title: work.title,
            image: work.images.jpg.image_url,
            type: type,
            format: work.type, // Capture format (TV, Movie, etc.)
            totalChapters: (type === 'manga' ? work.chapters : work.episodes) || 0, // Fallback to 0 if null
            currentChapter: 0,
            status: 'reading',
            score: work.score || undefined, // Fallback to undefined if null
            synopsis: work.synopsis || '', // Fallback to empty string if null
        };
        addWork(newWork);
        recordActivity();
        
        const updatedWorks = useLibraryStore.getState().works;
        recalculateStats(updatedWorks);

        // Activity logging is now handled server-side by onLibraryUpdate trigger
    };

    const isAdded = (id: number) => works.some(w => w.id === id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('components.add_work_modal.title')} variant="manga">
            {/* Manga Style Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', border: '3px solid var(--color-border-heavy)' }}>
                <button
                    onClick={() => setMode('api')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: mode === 'api' ? 'var(--color-text)' : 'var(--color-surface)',
                        color: mode === 'api' ? 'var(--color-surface)' : 'var(--color-text)',
                        fontSize: '1rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        border: 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Globe size={18} />
                    {t('components.add_work_modal.tab_search')}
                </button>
                <div style={{ width: '3px', background: 'var(--color-border-heavy)' }}></div>
                <button
                    onClick={() => setMode('manual')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: mode === 'manual' ? 'var(--color-text)' : 'var(--color-surface)',
                        color: mode === 'manual' ? 'var(--color-surface)' : 'var(--color-text)',
                        fontSize: '1rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        border: 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <PenTool size={18} />
                    {t('components.add_work_modal.tab_manual')}
                </button>
            </div>

            {mode === 'api' ? (
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as 'manga' | 'anime')}
                            style={{
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                border: '3px solid var(--color-border-heavy)',
                                padding: '0 1rem',
                                fontWeight: 900,
                                fontFamily: 'var(--font-heading)',
                                textTransform: 'uppercase',
                                height: 'auto',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="manga">MANGA</option>
                            <option value="anime">ANIME</option>
                        </select>
                        <div style={{ position: 'relative', flex: 1, border: '3px solid var(--color-border-heavy)', background: 'var(--color-surface)', boxShadow: '4px 4px 0 var(--color-primary)' }}>
                            <Input
                                placeholder={t('components.add_work_modal.search_placeholder')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                style={{
                                    border: 'none',
                                    borderRadius: 0,
                                    height: '100%',
                                    padding: '1rem',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    background: 'transparent',
                                    color: 'var(--color-text)',
                                    textTransform: 'uppercase'
                                }}
                            />
                            {loading && (
                                <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)' }}>
                                    <Loader2 className="animate-spin" size={24} color="var(--color-primary)" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        paddingRight: '0.5rem'
                    }}>
                        <AnimatePresence>
                            {results.map((work) => {
                                const added = isAdded(work.mal_id);
                                return (
                                    <motion.div
                                        key={work.mal_id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="manga-panel"
                                        style={{
                                            display: 'flex',
                                            gap: '1rem',
                                            padding: '0.75rem',
                                            border: '2px solid var(--color-border)',
                                            background: 'var(--color-surface)',
                                            boxShadow: 'none',
                                            alignItems: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        whileHover={{ borderColor: 'var(--color-primary)', x: 4 }}
                                    >
                                        <div style={{ width: '50px', height: '70px', border: '2px solid var(--color-border-heavy)', flexShrink: 0 }}>
                                            <OptimizedImage
                                                src={work.images.jpg.image_url}
                                                alt={work.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%'
                                                }}
                                                objectFit="cover"
                                                showSkeleton={false}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{
                                                fontSize: '1rem',
                                                fontWeight: 900,
                                                color: 'var(--color-text)',
                                                marginBottom: '0.25rem',
                                                textTransform: 'uppercase',
                                                fontFamily: 'var(--font-heading)',
                                                lineHeight: 1.1
                                            }}>
                                                {work.title}
                                            </h4>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
                                                {work.type} • <span style={{ color: 'var(--color-primary)' }}>{work.chapters || work.episodes || '?'} {type === 'manga' ? t('components.add_work_modal.chapters_abbr') : t('components.add_work_modal.episodes_abbr')}</span>
                                                {work.score && ` • ★ ${work.score}`}
                                            </p>
                                        </div>
                                        <Button
                                            variant={added ? "ghost" : "manga"}
                                            size="sm"
                                            onClick={() => !added && handleAdd(work)}
                                            style={{
                                                opacity: added ? 0.6 : 1,
                                                pointerEvents: added ? 'none' : 'auto'
                                            }}
                                            disabled={added}
                                        >
                                            {added ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                                        </Button>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {!loading && results.length === 0 && query.length > 2 && (
                            <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--color-border)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
                                {t('components.add_work_modal.no_results')}
                            </div>
                        )}
                        {!loading && !query && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <Globe size={48} strokeWidth={1} style={{ opacity: 0.2 }} />
                                <p style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontWeight: 900 }}>
                                    {t('components.add_work_modal.search_hint')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 900, fontSize: '0.9em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>{t('components.add_work_modal.label_title')}</label>
                        <Input
                            placeholder={t('components.add_work_modal.title_placeholder')}
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            style={{ border: '3px solid var(--color-border-heavy)', borderRadius: 0, padding: '1rem', fontWeight: 700, background: 'var(--color-surface)', color: 'var(--color-text)' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 900, fontSize: '0.9em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>{t('components.add_work_modal.label_type')}</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as 'manga' | 'anime')}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text)',
                                    border: '3px solid var(--color-border-heavy)',
                                    fontWeight: 900,
                                    height: 'auto',
                                    fontFamily: 'var(--font-heading)'
                                }}
                            >
                                <option value="manga">MANGA</option>
                                <option value="anime">ANIME</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 900, fontSize: '0.9em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                                {type === 'manga' ? t('components.add_work_modal.label_chapters') : t('components.add_work_modal.label_episodes')}
                            </label>
                            <Input
                                type="number"
                                placeholder={t('components.add_work_modal.total_placeholder')}
                                value={manualTotal || ''}
                                onChange={(e) => setManualTotal(parseInt(e.target.value) || 0)}
                                style={{ border: '3px solid var(--color-border-heavy)', borderRadius: 0, padding: '1rem', fontWeight: 700, background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 900, fontSize: '0.9em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>{t('components.add_work_modal.label_image')}</label>

                        {!manualImage ? (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                style={{
                                    border: `3px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border-heavy)'}`,
                                    background: isDragging ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => document.getElementById('file-upload')?.click()}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <Upload size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p style={{ fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                    {t('components.add_work_modal.drag_and_drop')}
                                </p>
                                <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.25rem' }}>
                                    {t('components.add_work_modal.or_paste_url')}
                                </p>
                            </div>
                        ) : (
                            <div style={{ position: 'relative', width: '100px', height: '140px', border: '3px solid var(--color-border-heavy)' }}>
                                <OptimizedImage
                                    src={isValidImageSrc(manualImage) ? manualImage : ""}
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%' }}
                                    objectFit="cover"
                                    showSkeleton={false}
                                />
                                <button
                                    onClick={() => setManualImage('')}
                                    style={{
                                        position: 'absolute',
                                        top: -12,
                                        right: -12,
                                        background: 'var(--color-primary)',
                                        color: '#fff',
                                        border: '3px solid var(--color-border-heavy)',
                                        borderRadius: '0',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '2px 2px 0 var(--color-shadow-solid)'
                                    }}
                                >
                                    <X size={18} strokeWidth={3} />
                                </button>
                            </div>
                        )}

                        {!manualImage && (
                            <Input
                                placeholder={t('components.add_work_modal.url_placeholder')}
                                value={manualImage}
                                onChange={(e) => setManualImage(e.target.value)}
                                style={{ border: '3px solid var(--color-border-heavy)', borderRadius: 0, marginTop: '0.5rem', padding: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                        )}
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleManualAdd}
                        disabled={!manualTitle.trim()}
                        style={{ marginTop: '1rem' }}
                    >
                        {t('components.add_work_modal.add_work')}
                    </Button>
                </div>
            )}
        </Modal>
    );
}
