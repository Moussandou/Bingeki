import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, BookOpen, MessageCircle, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { getCommunityDashboard, communityWrite } from '@/firebase/community';
import type { CommunityCategory, CommunityDashboard } from '@/types/community';
import styles from './Community.module.css';

export function CommunityDistinctions({ compact = false }: { compact?: boolean }) {
    const { t, i18n } = useTranslation('community');
    const [category, setCategory] = useState<CommunityCategory>('reviews');
    const [dashboard, setDashboard] = useState<CommunityDashboard | null>(null);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const request = useRef(0);
    const load = useCallback(async () => {
        const token = ++request.current;
        setError(false);
        try { const result = await getCommunityDashboard(category); if (token === request.current) setDashboard(result); }
        catch { if (token === request.current) setError(true); }
    }, [category]);
    useEffect(() => { const tracker = request; void load(); return () => { tracker.current++; }; }, [load]);
    async function equip(title: string | null) {
        setBusy(true);
        try { await communityWrite({ action: 'equip', title }); await load(); }
        catch { setError(true); }
        finally { setBusy(false); }
    }
    if (error) return <div role="alert" className={styles.error}>{t('error')} <button onClick={() => void load()}>{t('retry')}</button></div>;
    if (!dashboard) return <div className={styles.skeleton} role="status" aria-label={t('loading')} />;
    const goals = [
        { id: 'voice', value: dashboard.stats.reviews, total: 3, icon: <MessageCircle size={18} /> },
        { id: 'explore', value: dashboard.stats.explored.length, total: 3, icon: <BookOpen size={18} /> },
        { id: 'shonen', value: dashboard.stats.shonen, total: 20, icon: <Target size={18} /> },
    ];
    return <section className={styles.distinctions} aria-label={t('distinctions')}>
        <div className={styles.eyebrow}>{t('weeklyRendezvous')}</div>
        <h2>{t('thisWeek')}</h2>
        <p className={styles.meta}>{t('weekEnds', { date: new Date(dashboard.endsAt).toLocaleDateString(i18n.language) })}</p>
        <div className={styles.goals}>{goals.map(goal => <div key={goal.id} className={styles.goal}>
            <div>{goal.icon}<strong>{t(`goals.${goal.id}`)}</strong><span>{goal.value}/{goal.total}</span></div>
            <progress max={goal.total} value={Math.min(goal.value, goal.total)} aria-label={t(`goals.${goal.id}`)} />
        </div>)}</div>
        <p className={styles.meta}>{t('xpRules', { xp: dashboard.stats.xp })}</p>
        {compact ? <Link to="/social?tab=distinctions" className={styles.textButton}>{t('viewDistinctions')} →</Link> : <>
            <details className={styles.rules}><summary>{t('rulesTitle')}</summary><p>{t('rules')}</p><p>{t('usefulRules')}</p><p>{t('readingRules')}</p></details>
            <h3><Award size={18} />{t('yourDistinctions')}</h3>
            {dashboard.distinctions.length === 0 && <p>{t('noDistinctions')}</p>}
            <div className={styles.badges}>{dashboard.distinctions.map(distinction => {
                const expired = !!distinction.expiresAt && distinction.expiresAt <= Date.now();
                const equipped = dashboard.equipped?.id === distinction.id && !expired;
                return <div className={styles.badge} key={distinction.id}>
                    <Award size={20} /><strong>{t(`titles.${distinction.id}`)}</strong>
                    <span>{t(distinction.permanent ? 'permanentBadge' : expired ? 'expiredTitle' : 'temporaryTitle')}</span>
                    {!distinction.permanent && distinction.expiresAt && <small>{new Date(distinction.expiresAt).toLocaleDateString(i18n.language)}</small>}
                    <Button size="sm" variant="manga" className={equipped ? styles.primaryAction : undefined} disabled={busy || expired} onClick={() => void equip(equipped ? null : distinction.id)}>{t(equipped ? 'unequip' : 'equip')}</Button>
                </div>;
            })}</div>
            <h3>{t('weeklyBoards')}</h3>
            <label htmlFor="weekly-category">{t('category')}</label>
            <select id="weekly-category" value={category} onChange={e => setCategory(e.target.value as CommunityCategory)}>
                {(['reviews', 'shonen', 'chapters', 'explored', 'useful'] as const).map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
            </select>
            <p className={styles.meta}>{t('boardHint')}</p>
            {dashboard.leaders.length === 0 ? <p className={styles.empty}>{t('noLeaders')}</p> : <ol className={styles.leaders}>
                {dashboard.leaders.map(leader => <li key={leader.userId}><span className={styles.rank}>{dashboard.leaders.filter(item => item[category] > leader[category]).length + 1}</span><Link to={`/profile/${leader.userId}`}>{leader.userName || t('reader')}</Link><strong>{leader[category]}</strong></li>)}
            </ol>}
        </>}
    </section>;
}
