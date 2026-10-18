import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { useAuthStore } from '@/store/authStore';
import { getCommunityFeed, communityWrite } from '@/firebase/community';
import type { CommunityFilter, CommunityPage } from '@/types/community';
import { CommunityPostCard } from './CommunityPostCard';
import styles from './Community.module.css';

interface Props {
    filter?: CommunityFilter;
    workKey?: string;
    unit?: number | null;
    authorId?: string;
    refresh?: number;
    onOpen: (id: string, reveal?: boolean) => void;
    onDiscover?: () => void;
}

export function CommunityFeed(props: Props) {
    const { user } = useAuthStore();
    return <CommunityFeedContent key={`${user?.uid || 'guest'}:${props.filter}:${props.workKey}:${props.authorId}:${props.unit}`} {...props} />;
}

function CommunityFeedContent({ filter = 'discover', workKey, unit, authorId, refresh = 0, onOpen, onDiscover }: Props) {
    const { t } = useTranslation('community');
    const { user } = useAuthStore();
    const uid = user?.uid;
    const [page, setPage] = useState<CommunityPage>({ items: [], cursor: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const request = useRef(0);
    const load = useCallback(async () => {
        if (!uid) return;
        const token = ++request.current;
        setLoading(true);
        setError(false);
        try {
            const result = await getCommunityFeed({ filter, ...(workKey ? { workKey } : {}), ...(authorId ? { authorId } : {}), ...(unit ? { unit } : {}) });
            if (token !== request.current) return;
            setPage(result);
            if (!authorId && !workKey) {
                void communityWrite({ action: 'visit', empty: !result.items.length }).catch(() => {
                    // Telemetry failure must not replace the successfully loaded feed.
                });
            }
        } catch { if (token === request.current) setError(true); }
        finally { if (token === request.current) setLoading(false); }
    }, [uid, filter, workKey, unit, authorId]);
    useEffect(() => {
        const tracker = request;
        void load();
        return () => { tracker.current++; };
    }, [load, refresh]);

    async function more() {
        if (!page.cursor) return;
        const token = ++request.current;
        setLoading(true);
        setError(false);
        try {
            const next = await getCommunityFeed({ filter, ...(workKey ? { workKey } : {}), ...(authorId ? { authorId } : {}), ...(unit ? { unit } : {}), cursor: page.cursor });
            if (token === request.current) setPage(current => ({
                items: [...current.items, ...next.items.filter(item => !current.items.some(p => p.id === item.id))],
                cursor: next.cursor,
            }));
        } catch { if (token === request.current) setError(true); }
        finally { if (token === request.current) setLoading(false); }
    }

    if (!user) return <div className={styles.empty}><MessageSquare size={28} /><h3>{t('joinTitle')}</h3><p>{t('joinHint')}</p><Link to="/auth" className={styles.textButton}>{t('signIn')}</Link></div>;

    return <div aria-busy={loading}>
        {error && <div className={styles.error} role="alert">{t('error')} <button onClick={() => void load()}>{t('retry')}</button></div>}
        {!error && !loading && page.items.length === 0 && <div className={styles.empty}>
            <BookOpen size={28} /><h3>{t('emptyTitle')}</h3><p>{t(filter === 'readings' ? 'emptyReadings' : filter === 'following' ? 'emptyFollowing' : 'emptyHint')}</p>
            {onDiscover && filter !== 'discover' && <Button variant="manga" onClick={onDiscover}>{t('discover')}</Button>}
            <Link to="/discover" className={styles.textButton}>{t('findWork')}</Link>
        </div>}
        {!loading && page.items.length > 0 && <button className={styles.refresh} onClick={() => void load()}><RefreshCw size={14} />{t('refresh')}</button>}
        {page.items.map(post => <CommunityPostCard key={post.id} post={post} onOpen={onOpen} onChanged={() => void load()} />)}
        {loading && <div role="status" aria-label={t('loading')} className={styles.skeleton} />}
        {page.cursor && !error && <Button variant="manga" disabled={loading} onClick={() => void more()}>{t('loadMore')}</Button>}
    </div>;
}
