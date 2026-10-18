import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff, Heart, MessageCircle, MoreHorizontal, Star } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Link } from '@/components/routing/LocalizedLink';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { communityWrite } from '@/firebase/community';
import { useToast } from '@/context/ToastContext';
import { mustHideCommunityPost } from '@/utils/community';
import type { CommunityPost } from '@/types/community';
import { ReviewComposer } from './ReviewComposer';
import styles from './Community.module.css';

interface Props {
    post: CommunityPost;
    revealed?: boolean;
    onOpen: (id: string, reveal?: boolean) => void;
    onChanged: () => void;
}

export function CommunityPostCard({ post, revealed = false, onOpen, onChanged }: Props) {
    const { t, i18n } = useTranslation('community');
    const { user } = useAuthStore();
    const { works } = useLibraryStore();
    const { hideScores } = useSettingsStore();
    const { addToast } = useToast();
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(false);
    const [reason, setReason] = useState('spoiler');
    const [reported, setReported] = useState(false);
    const owner = post.userId === user?.uid;
    const hidden = !revealed && mustHideCommunityPost(post, works, user?.uid);
    const fallbackWork: Work = { id: post.workId, type: post.workType, title: post.workTitle, image: post.workImage, status: 'reading' };
    const editorWorks = works.some(w => `${w.type}:${w.id}` === post.workKey) ? works : [fallbackWork, ...works];

    async function act(action: Parameters<typeof communityWrite>[0]) {
        setBusy(true);
        try {
            await communityWrite(action);
            if (action.action === 'report') {
                setReported(true);
                addToast(t('reportSent'), 'success');
            } else onChanged();
        } catch {
            addToast(t('actionError'), 'error');
        } finally { setBusy(false); }
    }

    if (editing) return <ReviewComposer works={editorWorks} editing={post} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />;

    return (
        <article className={styles.post}>
            <header className={styles.postHeader}>
                <Link to={`/profile/${post.userId}`} className={styles.author}>
                    <span className={styles.avatar}><OptimizedImage src={post.userPhoto || undefined} alt={post.userName || t('reader')} /></span>
                    <span><strong>{post.userName || t('reader')}</strong>{post.title && <span className={styles.authorTitle}>{t(`titles.${post.title}`)}</span>}</span>
                </Link>
                <time className={styles.meta} dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}</time>
                <details className={styles.menu}>
                    <summary aria-label={t('actions')}><MoreHorizontal size={20} /></summary>
                    <div className={styles.menuBody}>
                        {owner ? <>
                            <button type="button" disabled={busy} onClick={() => setEditing(true)}>{t('editReview')}</button>
                            <details><summary>{t('delete')}</summary><p>{t('deleteConfirm')}</p><button disabled={busy} onClick={() => void act({ action: 'delete', id: post.id })}>{t('confirmDelete')}</button></details>
                        </> : <>
                            <button disabled={busy} onClick={() => void act({ action: 'follow', userId: post.userId, enabled: !post.following })}>{t(post.following ? 'unfollow' : 'follow')}</button>
                            <button disabled={busy} onClick={() => void act({ action: 'block', userId: post.userId, enabled: true })}>{t('block')}</button>
                            <label>{t('reportReason')}<select value={reason} onChange={e => setReason(e.target.value)}>{['spoiler', 'harassment', 'spam', 'other'].map(r => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}</select></label>
                            <button disabled={busy || reported} onClick={() => void act({ action: 'report', id: post.id, reason })}>{t(reported ? 'reportSent' : 'report')}</button>
                        </>}
                    </div>
                </details>
            </header>
            <div className={styles.postContent}>
                <Link to={`/work/${post.workId}?type=${post.workType}`} className={styles.cover}><OptimizedImage src={post.workImage || undefined} alt={post.workTitle} /></Link>
                <div className={styles.postText}>
                    <Link to={`/work/${post.workId}?type=${post.workType}`} className={styles.workTitle}>{post.workTitle}</Link>
                    <div className={styles.target}>
                        <span>{post.unit === null ? t('workReview') : t(post.workType === 'anime' ? 'episodeNumber' : 'chapterNumber', { n: post.unit })}</span>
                        <span>{t(post.visibility === 'friends' ? 'friendsOnly' : 'public')}</span>
                        {!hidden && post.rating !== null && !hideScores && <span className={styles.rating}><Star size={13} />{post.rating}/10</span>}
                    </div>
                    {hidden ? <div className={styles.spoiler}>
                        <EyeOff size={20} /><strong>{t('spoilerProtected')}</strong><p>{t('spoilerHint')}</p>
                        <button type="button" className={styles.textButton} onClick={() => onOpen(post.id, true)}>{t('reveal')}</button>
                    </div> : <p className={styles.reviewText}>{post.text}</p>}
                    {post.updatedAt > post.createdAt && <span className={styles.meta}>{t('edited')}</span>}
                </div>
            </div>
            <footer className={styles.postActions}>
                <button disabled={busy || owner || hidden} aria-pressed={post.reacted} onClick={() => void act({ action: 'react', id: post.id, enabled: !post.reacted })}><Heart size={16} fill={post.reacted ? 'currentColor' : 'none'} />{post.usefulCount} <span>{t('useful')}</span></button>
                <button onClick={() => onOpen(post.id)}><MessageCircle size={16} />{t('replyCount', { count: post.replyCount })}</button>
            </footer>
        </article>
    );
}
