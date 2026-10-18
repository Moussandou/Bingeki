import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Link } from '@/components/routing/LocalizedLink';
import { canPromptForReview, reviewPromptKey } from '@/utils/community';
import styles from './Community.module.css';

export function ProgressReviewPrompt() {
    const { t } = useTranslation('community');
    const { user } = useAuthStore();
    const [prompt, setPrompt] = useState<{ workKey: string; unit: number } | null>(null);
    useEffect(() => {
        function onProgress(event: Event) {
            if (!(event instanceof CustomEvent) || !user || !canPromptForReview(user.uid)) return;
            const detail: unknown = event.detail;
            if (!detail || typeof detail !== 'object' || !('workKey' in detail) || !('unit' in detail)
                || typeof detail.workKey !== 'string' || typeof detail.unit !== 'number') return;
            localStorage.setItem(reviewPromptKey(user.uid), String(Date.now()));
            setPrompt({ workKey: detail.workKey, unit: detail.unit });
        }
        window.addEventListener('bingeki:reading-progress', onProgress);
        return () => window.removeEventListener('bingeki:reading-progress', onProgress);
    }, [user]);
    if (!user || !prompt) return null;
    return <aside className={styles.progressPrompt} aria-label={t('writeReview')}>
        <p>{t('progressPrompt', { unit: prompt.unit })}</p>
        <Link to={`/social?compose=1&work=${encodeURIComponent(prompt.workKey)}&unit=${prompt.unit}`} className={styles.textButton} onClick={() => setPrompt(null)}>{t('writeReview')}</Link>
        <button className={styles.textButton} onClick={() => setPrompt(null)}>{t('dismissPrompt')}</button>
    </aside>;
}
