/**
 * Actualités MyAnimeList liées à une œuvre (work-details)
 */
import { useTranslation } from 'react-i18next';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import type { JikanNewsItem } from '@/services/animeApi';
import styles from './WorkNewsSection.module.css';

interface WorkNewsSectionProps {
    news: JikanNewsItem[];
    loading?: boolean;
}

export function WorkNewsSection({ news, loading }: WorkNewsSectionProps) {
    const { t, i18n } = useTranslation();

    if (loading) {
        return <div className={styles.empty}>{t('work_details.news.loading')}</div>;
    }

    if (news.length === 0) {
        return <div className={styles.empty}>{t('work_details.news.empty')}</div>;
    }

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return '';
        }
    };

    return (
        <div className={styles.list}>
            {news.map(item => (
                <a
                    key={item.mal_id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.item}
                >
                    {item.images?.jpg?.image_url && (
                        <div className={styles.thumb}>
                            <OptimizedImage src={item.images.jpg.image_url} alt={item.title} />
                        </div>
                    )}
                    <div className={styles.body}>
                        <h3 className={styles.title}>{item.title}</h3>
                        <p className={styles.excerpt}>{item.excerpt}</p>
                        <div className={styles.meta}>
                            <span>{formatDate(item.date)}</span>
                            <span className={styles.metaRight}>
                                <MessageSquare size={14} /> {item.comments}
                                <ExternalLink size={14} />
                            </span>
                        </div>
                    </div>
                </a>
            ))}
        </div>
    );
}
