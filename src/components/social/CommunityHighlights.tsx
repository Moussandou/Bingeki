import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/routing/LocalizedLink';
import { getCommunityHighlights } from '@/firebase/community';
import type { CommunityHighlight } from '@/types/community';
import styles from './Community.module.css';

export function CommunityHighlights() {
    const { t } = useTranslation('community');
    const [items, setItems] = useState<CommunityHighlight[]>([]);
    const [error, setError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        getCommunityHighlights().then(result => { if (!cancelled) setItems(result.items); }).catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, []);
    return <section className={styles.highlights}>
        <div className={styles.eyebrow}>{t('activeDiscussions')}</div>
        <h3>{t('discussNow')}</h3>
        {error ? <p role="alert">{t('error')}</p> : items.length ? items.map(item => <Link key={`${item.workKey}:${item.unit}`} to={`/social?tab=discussions&work=${encodeURIComponent(item.workKey)}${item.unit ? `&unit=${item.unit}` : ''}`}>
            <strong>{item.workTitle}</strong><span>{item.unit ? t(item.workType === 'anime' ? 'episodeNumber' : 'chapterNumber', { n: item.unit }) : t('workReview')}</span>
            <span>{t('highlightCounts', { reviews: item.count, replies: item.responses })}</span>
        </Link>) : <p className={styles.meta}>{t('noActiveDiscussions')}</p>}
        <p className={styles.meta}>{t('highlightScope')}</p>
    </section>;
}
