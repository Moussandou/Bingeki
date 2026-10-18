import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { useAuthStore } from '@/store/authStore';
import { communityWrite, getCommunityThread } from '@/firebase/community';
import type { CommunityThread as Thread } from '@/types/community';
import { CommunityPostCard } from './CommunityPostCard';
import styles from './Community.module.css';

export function CommunityThread({ id, reveal = false, onBack }: { id: string; reveal?: boolean; onBack: () => void }) {
    const { t } = useTranslation('community');
    const { user } = useAuthStore();
    const [revealed, setRevealed] = useState(reveal);
    const [thread, setThread] = useState<Thread | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [text, setText] = useState('');
    const replyId = useRef(crypto.randomUUID());
    const request = useRef(0);
    const load = useCallback(async () => {
        const token = ++request.current;
        setLoading(true);
        setError(false);
        try {
            const result = await getCommunityThread(id, revealed);
            if (token === request.current) setThread(result);
        } catch { if (token === request.current) setError(true); }
        finally { if (token === request.current) setLoading(false); }
    }, [id, revealed]);
    useEffect(() => {
        const tracker = request;
        void load();
        return () => { tracker.current++; };
    }, [load]);

    async function reply(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(false);
        try {
            await communityWrite({ action: 'reply', id, replyId: replyId.current, text });
            replyId.current = crypto.randomUUID();
            setText('');
            await load();
        } catch { setError(true); }
        finally { setBusy(false); }
    }
    async function more() {
        if (!thread?.cursor) return;
        setBusy(true);
        try {
            const next = await getCommunityThread(id, revealed, thread.cursor);
            setThread({ ...next, replies: [...thread.replies, ...next.replies] });
        } catch { setError(true); }
        finally { setBusy(false); }
    }
    async function removeReply(reply: string) {
        setBusy(true);
        try { await communityWrite({ action: 'deleteReply', id, replyId: reply }); await load(); }
        catch { setError(true); }
        finally { setBusy(false); }
    }
    async function reportReply(reply: string) {
        setBusy(true);
        try { await communityWrite({ action: 'report', id, replyId: reply, reason: 'other' }); }
        catch { setError(true); }
        finally { setBusy(false); }
    }

    return <section className={styles.thread} aria-label={t('discussion')}>
        <button className={styles.textButton} onClick={onBack}>← {t('backToFeed')}</button>
        {error && <div className={styles.error} role="alert">{t('threadError')} <button onClick={() => void load()}>{t('retry')}</button></div>}
        {loading ? <div className={styles.skeleton} role="status" aria-label={t('loading')} /> : thread && <>
            <CommunityPostCard post={thread.post} revealed={revealed} onOpen={(_id, explicit) => { if (explicit) setRevealed(true); }} onChanged={() => void load()} />
            <h2>{t('replies')}</h2>
            {thread.post.concealed ? <p className={styles.empty}>{t('revealBeforeReply')}</p> : <>
                <form className={styles.replyForm} onSubmit={reply}>
                    <label htmlFor="community-reply">{t('yourReply')}</label>
                    <textarea id="community-reply" rows={3} maxLength={2000} value={text} onChange={e => setText(e.target.value)} required />
                    <p className={styles.meta}>{t('replySpoilerHint')}</p>
                    <Button type="submit" disabled={busy || !text.trim()}>{t('sendReply')}</Button>
                </form>
                {thread.replies.length === 0 && <p className={styles.empty}>{t('noReplies')}</p>}
                {thread.replies.map(reply => <article key={reply.id} className={styles.reply}>
                    <Link to={`/profile/${reply.userId}`}><strong>{reply.userName || t('reader')}</strong></Link>
                    <p className={styles.reviewText}>{reply.text}</p>
                    <button className={styles.textButton} disabled={busy} onClick={() => void (reply.userId === user?.uid ? removeReply(reply.id) : reportReply(reply.id))}>{t(reply.userId === user?.uid ? 'delete' : 'report')}</button>
                </article>)}
                {thread.cursor && <Button variant="outline" disabled={busy} onClick={() => void more()}>{t('moreReplies')}</Button>}
            </>}
        </>}
    </section>;
}
