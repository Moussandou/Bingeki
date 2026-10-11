/**
 * Onglet Publiés : historique des posts avec leurs chiffres.
 */
import { AlertTriangle } from 'lucide-react';
import type { PublishedPost } from '@/shared/socialBot';
import { formatCount, formatWhen, isManualPost, likesOf, viewsOf } from './helpers';
import { TypeBadge } from './PostFocus';
import s from './SocialBot.module.css';

function statsLine(p: PublishedPost): string {
    const parts: string[] = [];
    const views = viewsOf(p.reach?.tiktok);
    const likes = likesOf(p.reach?.insta);
    if (views) parts.push(`TikTok ${formatCount(views)} vues`);
    if (likes) parts.push(`Insta ${formatCount(likes)} ♥`);
    if (parts.length) return parts.join(' · ');
    return isManualPost(p) ? 'Publié à la main · pas de stats' : 'Stats en attente';
}

export function PublishedCard({ post, onOpen }: { post: PublishedPost; onOpen: () => void }) {
    const thumb = post.slides?.find((sl) => sl.format === 'feed')?.url ?? post.slides?.[0]?.url;
    const hasErrors = !!post.errors && Object.keys(post.errors).length > 0;
    return (
        <button type="button" className={s.pubCard} onClick={onOpen}>
            <span className={s.pubThumb}>{thumb ? <img src={thumb} alt="" loading="lazy" /> : null}</span>
            <span className={s.pubText}>
                <strong>{post.title}</strong>
                <span className={s.small}>
                    {formatWhen(post.publishedAt)} · {isManualPost(post) ? 'par toi' : 'via Buffer'}
                </span>
                <span className={s.pubStats}>
                    {hasErrors && <AlertTriangle size={13} className={s.warnIcon} aria-label="Échec partiel" />}
                    {statsLine(post)}
                </span>
            </span>
        </button>
    );
}

export function PublishedView({ published, onOpen }: { published: PublishedPost[]; onOpen: (p: PublishedPost) => void }) {
    if (published.length === 0) {
        return <p className={s.emptyBox}>Aucun post publié pour l'instant.</p>;
    }
    return (
        <section className={s.stack} aria-labelledby="published-title">
            <h2 id="published-title" className={s.groupTitle}>Publiés · {published.length} derniers</h2>
            <div className={s.pubList}>
                {published.map((p) => (
                    <div key={p.id} className={s.pubRow}>
                        <TypeBadge type={p.type} />
                        <PublishedCard post={p} onOpen={() => onOpen(p)} />
                    </div>
                ))}
            </div>
        </section>
    );
}
