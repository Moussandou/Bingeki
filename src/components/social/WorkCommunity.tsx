import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Link, useLocalizedNavigate } from '@/components/routing/LocalizedLink';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { ReviewComposer } from './ReviewComposer';
import { CommunityFeed } from './CommunityFeed';
import styles from './Community.module.css';

export function WorkCommunity({ work }: { work: Work }) {
    const { t } = useTranslation('community');
    const navigate = useLocalizedNavigate();
    const { user } = useAuthStore();
    const { works } = useLibraryStore();
    const [composing, setComposing] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const key = `${work.type}:${work.id}`;
    const choices = works.some(w => `${w.type}:${w.id}` === key) ? works : [work, ...works];
    return <section className={styles.journal} aria-label={t('workCommunity')}>
        <h2>{t('workCommunity')}</h2><p className={styles.meta}>{t('workCommunityHint')}</p>
        {user && <Button variant="manga" onClick={() => setComposing(true)}>{t('writeReview')}</Button>}
        {composing && <ReviewComposer works={choices} initialWorkKey={key} onCancel={() => setComposing(false)} onSaved={() => { setComposing(false); setRefresh(v => v + 1); }} />}
        <CommunityFeed workKey={key} refresh={refresh} onOpen={id => navigate(`/social?post=${id}`)} />
        <Link to={`/social?tab=discussions&work=${encodeURIComponent(key)}`} className={styles.textButton}>{t('openDiscussions')} →</Link>
    </section>;
}
