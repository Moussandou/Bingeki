import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { Link } from '@/components/routing/LocalizedLink';
import { Flame } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface NewsCardProps {
    title: string;
    slug: string;
    imageUrl?: string | null;
    sourceName?: string;
    publishedAt: string;
    tags?: string[];
    featured?: boolean;
}

export function NewsCard({ title, slug, imageUrl, sourceName, publishedAt, tags = [], featured = false }: NewsCardProps) {
    const { i18n } = useTranslation();
    const dateLocale = i18n.language === 'fr' ? fr : enUS;

    let timeAgo = '';
    try {
        timeAgo = formatDistanceToNow(new Date(publishedAt), { addSuffix: true, locale: dateLocale });
    } catch (e) {
        timeAgo = publishedAt;
    }

    const primaryTag = tags.length > 0 ? tags[0] : 'News';

    return (
        <Link to={`/news/article/${slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
            <div
                className={`news-card-wrapper ${featured ? 'featured' : ''}`}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-4px, -4px)';
                    e.currentTarget.style.boxShadow = '12px 12px 0 var(--color-primary)';
                    const titleEl = e.currentTarget.querySelector('.news-title') as HTMLElement;
                    if (titleEl) titleEl.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = '8px 8px 0 var(--color-shadow-solid)';
                    const titleEl = e.currentTarget.querySelector('.news-title') as HTMLElement;
                    if (titleEl) titleEl.style.color = 'var(--color-text)';
                }}
            >
                {/* Thumbnail */}
                <div className="news-thumbnail">
                    {imageUrl ? (
                        <OptimizedImage
                            src={imageUrl}
                            alt={title}
                            objectFit="cover"
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-dim)', fontFamily: 'var(--font-heading)', background: 'repeating-linear-gradient(45deg, var(--color-surface-hover), var(--color-surface-hover) 10px, var(--color-border) 10px, var(--color-border) 20px)' }}>
                            <Flame size={48} opacity={0.3} />
                        </div>
                    )}
                    {/* Tag Badge */}
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '2px 2px 0 var(--color-shadow-solid)'
                    }}>
                        {primaryTag}
                    </div>
                </div>

                {/* Content */}
                <div className="news-content" style={{ padding: featured ? '2rem' : '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--color-text)' }}>{sourceName || 'Anime News'}</span>
                        <span>•</span>
                        <span>{timeAgo}</span>
                    </div>

                    <h3 className="news-title" style={{
                        fontSize: featured ? '1.75rem' : '1.2rem',
                        fontWeight: 900,
                        fontFamily: 'var(--font-heading)',
                        marginBottom: 'auto',
                        color: 'var(--color-text)',
                        display: '-webkit-box',
                        WebkitLineClamp: featured ? 4 : 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.3,
                        transition: 'color 0.2s'
                    }}>
                        {title}
                    </h3>

                    {featured && (
                        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, color: 'var(--color-primary)', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                            Lire l'article &rarr;
                        </div>
                    )}
                </div>
            </div>

            <style>
                {`
                .news-card-wrapper {
                    display: flex;
                    flex-direction: column;
                    background: var(--color-surface);
                    border: 3px solid var(--color-border-heavy);
                    box-shadow: 8px 8px 0 var(--color-shadow-solid);
                    transition: transform 0.2s, box-shadow 0.2s;
                    height: 100%;
                    position: relative;
                    cursor: pointer;
                }
                
                .news-card-wrapper.featured {
                    flex-direction: row;
                }

                .news-thumbnail {
                    position: relative;
                    flex-shrink: 0;
                    width: 100%;
                    height: auto;
                    border-bottom: 3px solid var(--color-border-heavy);
                    background-color: var(--color-border);
                    overflow: hidden;
                    aspect-ratio: 16/9;
                }

                .news-card-wrapper.featured .news-thumbnail {
                    width: 50%;
                    height: 100%;
                    border-right: 3px solid var(--color-border-heavy);
                    border-bottom: none;
                    aspect-ratio: auto;
                }

                @media (max-width: 768px) {
                    .news-card-wrapper.featured {
                        flex-direction: column;
                    }
                    .news-card-wrapper.featured .news-thumbnail {
                        width: 100%;
                        height: 250px;
                        border-right: none;
                        border-bottom: 3px solid var(--color-border-heavy);
                    }
                    .news-card-wrapper.featured .news-content {
                        padding: 1.25rem !important;
                    }
                    .news-card-wrapper.featured .news-title {
                        font-size: 1.5rem !important;
                        -webkit-line-clamp: 3 !important;
                    }
                }
                `}
            </style>
        </Link>
    );
}
