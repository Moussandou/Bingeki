import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { communityWrite, getCommunityDashboard, getCommunityReports, getCommunityInsights } from '@/firebase/community';
import { useAuthStore } from '@/store/authStore';
import type { CommunityDashboard, CommunityReport, CommunityCursor, CommunityInsights } from '@/types/community';
import styles from './Community.module.css';

export function CommunitySettings() {
    const { t } = useTranslation('community');
    const { userProfile } = useAuthStore();
    const [dashboard, setDashboard] = useState<CommunityDashboard | null>(null);
    const [reports, setReports] = useState<CommunityReport[]>([]);
    const [cursor, setCursor] = useState<CommunityCursor | null>(null);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [insights, setInsights] = useState<CommunityInsights | null>(null);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let cancelled = false;
        Promise.all([getCommunityDashboard(), userProfile?.isAdmin ? getCommunityReports() : Promise.resolve(null), userProfile?.isAdmin ? getCommunityInsights() : Promise.resolve(null)])
            .then(([data, moderation, metrics]) => {
                if (cancelled) return;
                setDashboard(data);
                setReports(moderation?.items || []);
                setCursor(moderation?.cursor || null);
                setInsights(metrics);
            }).catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [userProfile?.isAdmin, revision]);
    async function act(action: Parameters<typeof communityWrite>[0]) {
        setBusy(true); setError(false); setSaved(false);
        try {
            await communityWrite(action);
            setSaved(true);
            if (action.action === 'block') setDashboard(current => current ? { ...current, blocked: current.blocked.filter(uid => uid !== action.userId) } : null);
            if (action.action === 'moderate') setReports(current => current.filter(report => report.id !== action.reportId));
        } catch { setError(true); }
        finally { setBusy(false); }
    }
    async function moreReports() {
        if (!cursor) return;
        setBusy(true);
        try { const page = await getCommunityReports(cursor); setReports(current => [...current, ...page.items]); setCursor(page.cursor); }
        catch { setError(true); }
        finally { setBusy(false); }
    }
    return <section className={styles.settings}>
        <h2>{t('preferences')}</h2>
        {error && <p role="alert" className={styles.error}>{t('actionError')}</p>}
        {error && !dashboard && <Button variant="manga" onClick={() => { setError(false); setRevision(value => value + 1); }}>{t('retry')}</Button>}
        {!error && !dashboard && <div role="status" aria-label={t('loading')} className={styles.skeleton} />}
        {saved && <p role="status">{t('saved')}</p>}
        {dashboard && <>
            <label className={styles.check}><input type="checkbox" checked={dashboard.preferences.replies} onChange={e => setDashboard({ ...dashboard, preferences: { ...dashboard.preferences, replies: e.target.checked } })} />{t('notifyReplies')}</label>
            <label className={styles.check}><input type="checkbox" checked={dashboard.preferences.digest} onChange={e => setDashboard({ ...dashboard, preferences: { ...dashboard.preferences, digest: e.target.checked } })} />{t('notifyDigest')}</label>
            <p className={styles.meta}>{t('notificationPrivacy')}</p>
            <Button variant="manga" className={styles.primaryAction} disabled={busy} onClick={() => void act({ action: 'preferences', ...dashboard.preferences })}>{t('save')}</Button>
            <h3>{t('blockedReaders')}</h3>
            {!dashboard.blocked.length && <p>{t('noneBlocked')}</p>}
            {dashboard.blocked.map(uid => <div className={styles.blocked} key={uid}><span>{uid}</span><Button variant="manga" size="sm" disabled={busy} onClick={() => void act({ action: 'block', userId: uid, enabled: false })}>{t('unblock')}</Button></div>)}
        </>}
        {userProfile?.isAdmin && <>
            {insights && <section className={styles.insights}><h2>{t('insightsTitle')}</h2>
                <dl>{(['visitors', 'activeReaders', 'contributors', 'reviews', 'answered', 'returnedAfterSevenDays', 'emptyFeeds', 'reports'] as const).map(key => <div key={key}><dt>{t(`insights.${key}`)}</dt><dd>{insights[key]}</dd></div>)}</dl>
                <p className={styles.meta}>{t(insights.limited ? 'insightsLimited' : 'insightsScope')}</p>
            </section>}
            <h2>{t('moderation')}</h2>
            {dashboard && reports.length === 0 && <p>{t('noReports')}</p>}
            {reports.map(report => <article className={styles.reply} key={report.id}>
                <strong>{report.workTitle}</strong><p>{t(`reasons.${report.reason}`)}</p>
                <p className={styles.reviewText}>{report.text || t('unavailable')}</p>
                <div className={styles.formRow}><Button size="sm" variant="manga" className={styles.primaryAction} disabled={busy} onClick={() => void act({ action: 'moderate', id: report.postId, reportId: report.id, resolution: 'hide' })}>{t('hideContent')}</Button>
                    <Button variant="manga" size="sm" disabled={busy} onClick={() => void act({ action: 'moderate', id: report.postId, reportId: report.id, resolution: 'dismiss' })}>{t('dismissReport')}</Button></div>
            </article>)}
            {cursor && <Button variant="manga" disabled={busy} onClick={() => void moreReports()}>{t('loadMore')}</Button>}
        </>}
    </section>;
}
