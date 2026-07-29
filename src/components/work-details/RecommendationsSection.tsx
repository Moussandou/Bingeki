import { useTranslation } from 'react-i18next';
import { Link } from '@/components/routing/LocalizedLink';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import type { JikanRecommendation } from '@/services/animeApi';

interface RecommendationsSectionProps {
    recommendations: JikanRecommendation[];
    workType: string;
}

export function RecommendationsSection({ recommendations, workType }: RecommendationsSectionProps) {
    const { t } = useTranslation();

    if (recommendations.length === 0) return null;

    return (
        <div className="manga-panel" style={{ marginTop: '3rem', padding: '2rem' }}>
            <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2rem',
                marginBottom: '1.5rem',
                textTransform: 'uppercase',
                textAlign: 'center'
            }}>
                {t('work_details.recommendations.title')}
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '1.5rem'
            }}>
                {recommendations.map((rec) => (
                    <Link
                        key={rec.entry.mal_id}
                        to={`/work/${rec.entry.mal_id}?type=${workType}`}
                        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                        <div style={{
                            position: 'relative',
                            marginBottom: '0.75rem',
                            border: '3px solid var(--color-border-heavy)',
                            boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                            transition: 'transform 0.2s',
                            background: 'var(--color-border-heavy)'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-4px, -4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(0, 0)'}
                        >
                            <OptimizedImage
                                src={rec.entry.images.jpg.large_image_url}
                                alt={rec.entry.title}
                                objectFit="cover"
                                style={{ width: '100%', aspectRatio: '2/3', display: 'block' }}
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'var(--color-border-heavy)',
                                color: 'var(--color-text-inverse)',
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                textAlign: 'center'
                            }}>
                                {rec.votes} {t('work_details.recommendations.votes')}
                            </div>
                        </div>
                        <h4 style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            textTransform: 'uppercase'
                        }}>
                            {rec.entry.title}
                        </h4>
                    </Link>
                ))}
            </div>
        </div>
    );
}
