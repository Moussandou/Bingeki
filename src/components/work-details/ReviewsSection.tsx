import { Star, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import styles from '@/pages/WorkDetails.module.css';
import type { JikanReview } from '@/services/animeApi';

interface ReviewsSectionProps {
    reviews: JikanReview[];
    hideScores: boolean;
}

export function ReviewsSection({ reviews, hideScores }: ReviewsSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="animate-fade-in">
            <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={24} fill="currentColor" /> {t('community:externalReviews')}
            </h2>

            {reviews.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', alignContent: 'start' }}>
                    {reviews.map((review) => (
                        <div key={review.mal_id} style={{
                            background: 'var(--color-surface)',
                            border: '3px solid var(--color-border-heavy)',
                            boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            {/* Header: User & Score */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-border)', paddingBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                        <OptimizedImage
                                            src={review.user.images.jpg.image_url}
                                            alt={review.user.username}
                                            objectFit="cover"
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{review.user.username}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>{new Date(review.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div style={{
                                    background: 'var(--color-border-heavy)',
                                    color: 'var(--color-text-inverse)',
                                    padding: '0.25rem 0.5rem',
                                    fontWeight: 900,
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    {!hideScores && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                            <Star size={14} fill="currentColor" /> {review.score}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Tags */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {review.tags.map(tag => (
                                    <span key={tag} style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        border: '1px solid var(--color-border-heavy)',
                                        padding: '2px 6px',
                                        textTransform: 'uppercase',
                                        background: tag.toLowerCase().includes('recommended') ? '#dcfce7' : tag.toLowerCase().includes('mixed') ? '#fef9c3' : 'var(--color-surface)'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Review Content */}
                            <div style={{ fontSize: '0.9rem', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }} className="scrollbar-thin">
                                {review.review}
                            </div>

                            {/* Footer: Read More */}
                            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                <a
                                    href={review.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontWeight: 800,
                                        color: 'var(--color-text)',
                                        textDecoration: 'none',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {t('work_details.reviews.read_full')} <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '3rem', textAlign: 'center', border: '2px dashed var(--color-border-heavy)', opacity: 0.7 }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>{t('work_details.reviews.none_found')}</h3>
                    <p>{t('work_details.reviews.be_first')}</p>
                </div>
            )}
        </div>
    );
}
