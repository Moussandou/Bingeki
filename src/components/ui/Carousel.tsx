import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import type { JikanResult } from '@/services/animeApi';
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useSettingsStore } from '@/store/settingsStore';
import { getDisplayTitle } from '@/utils/titleUtils';

interface CarouselProps {
    title: React.ReactNode;
    items: JikanResult[];
    onItemClick: (work: JikanResult) => void;
    libraryIds: Set<string | number>; // For checking if owned
    onAdd: (work: JikanResult) => void;
    loading?: boolean;
    showRank?: boolean;
    priority?: boolean;
}

export function Carousel({ title, items, onItemClick, libraryIds, onAdd, loading, showRank, priority }: CarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { titleLanguage, hideScores } = useSettingsStore();

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -300 : 300;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!loading && items.length === 0) return null;

    return (
        <div style={{ marginBottom: '3rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-contrast)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {title}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => scroll('left')}
                        style={{ border: '2px solid var(--color-border-heavy)', background: 'var(--color-surface)', color: 'var(--color-text-contrast)', cursor: 'pointer', padding: '0.75rem', boxShadow: '4px 4px 0 var(--color-shadow-solid)', transition: 'transform 0.1s' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'translate(2px, 2px)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'translate(0, 0)'}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        style={{ border: '2px solid var(--color-border-heavy)', background: 'var(--color-surface)', color: 'var(--color-text-contrast)', cursor: 'pointer', padding: '0.75rem', boxShadow: '4px 4px 0 var(--color-shadow-solid)', transition: 'transform 0.1s' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'translate(2px, 2px)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'translate(0, 0)'}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                style={{
                    display: 'flex',
                    gap: '2rem',
                    overflowX: 'auto',
                    padding: '1rem 0.5rem 2rem 0.5rem', // Extra bottom padding for shadows
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none' // IE/Edge
                }}
                className="hide-scrollbar"
            >
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{ flex: '0 0 220px', scrollSnapAlign: 'start' }}>
                            <Card variant="manga" style={{ padding: 0, overflow: 'hidden', height: '100%', border: '2px solid var(--color-border-heavy)', background: 'var(--color-surface)' }}>
                                <div style={{ aspectRatio: '2/3', background: 'var(--color-surface-dim)', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ 
                                        position: 'absolute', 
                                        inset: 0, 
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                                        animation: 'shimmer 1.5s infinite' 
                                    }} />
                                    <style>{`
                                        @keyframes shimmer {
                                            0% { transform: translateX(-100%); }
                                            100% { transform: translateX(100%); }
                                        }
                                    `}</style>
                                </div>
                                <div style={{ padding: '0.75rem', background: 'var(--color-surface)' }}>
                                    <div style={{ height: '1.2rem', background: 'var(--color-surface-dim)', marginBottom: '0.5rem', width: '90%' }}></div>
                                    <div style={{ height: '0.8rem', background: 'var(--color-surface-dim)', width: '40%' }}></div>
                                </div>
                            </Card>
                        </div>
                    ))
                    : items.map((work, index) => {
                        const isOwned = libraryIds.has(work.mal_id);
                        const compositeKey = `${work.type || 'anime'}-${work.mal_id}`;
                        return (
                            <motion.div
                                key={compositeKey}
                                whileHover={{ y: -10 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                style={{
                                    flex: '0 0 220px', // Fixed width cards
                                    scrollSnapAlign: 'start',
                                    position: 'relative'
                                }}
                            >
                                <Card
                                    variant="manga"
                                    hoverable
                                    style={{ padding: 0, overflow: 'hidden', height: '100%', border: '2px solid var(--color-border-heavy)', cursor: 'pointer', background: 'var(--color-surface)' }}
                                    onClick={() => onItemClick(work)}
                                >
                                    <div style={{ position: 'relative', aspectRatio: '2/3', borderBottom: '2px solid var(--color-border)' }}>
                                        <OptimizedImage
                                            src={work.images.jpg.image_url}
                                            lowResSrc={work.images.jpg.small_image_url}
                                            alt={getDisplayTitle(work, titleLanguage)}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            priority={priority && index < 4}
                                        />

                                        {/* Rank Badge */}
                                        {showRank && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                background: index < 3 ? 'var(--color-primary)' : 'var(--color-text)',
                                                color: 'var(--color-surface)',
                                                width: '40px',
                                                height: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.2rem',
                                                fontWeight: 900,
                                                fontFamily: 'var(--font-heading)',
                                                borderRight: '2px solid var(--color-border-heavy)',
                                                borderBottom: '2px solid var(--color-border-heavy)',
                                                zIndex: 10
                                            }}>
                                                #{index + 1}
                                            </div>
                                        )}

                                        {isOwned && (
                                            <div style={{ position: 'absolute', top: 5, right: 5, background: 'var(--color-primary)', color: '#fff', padding: '4px', borderRadius: '50%', border: '2px solid var(--color-border-heavy)', zIndex: 10 }}>
                                                <Check size={16} strokeWidth={4} />
                                            </div>
                                        )}

                                        {/* Overlay Add Button on Hover (group needed in framer motion or CSS, simpler to put absolute bottom right) */}
                                        {!isOwned && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 10,
                                                    right: 10,
                                                    zIndex: 20
                                                }}
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAdd(work);
                                                    }}
                                                    style={{ padding: '0.5rem', height: 'auto', borderRadius: '50%', aspectRatio: '1/1', boxShadow: '4px 4px 0 var(--color-shadow)' }}
                                                >
                                                    <Plus size={20} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: 900,
                                            fontFamily: 'var(--font-heading)',
                                            lineHeight: 1.1,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            height: '2.2em',
                                            marginBottom: '0.5rem',
                                            color: 'var(--color-text)'
                                        }}>
                                            {getDisplayTitle(work, titleLanguage)}
                                        </h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', background: 'var(--color-text)', color: 'var(--color-surface)' }}>{work.type}</span>
                                            {work.score && !hideScores && (
                                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-contrast)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    ★ {work.score}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
            </div>
        </div>
    );
}
