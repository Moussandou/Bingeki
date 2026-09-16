/**
 * PublishedPostModal — analytics detail for a published social post.
 * Shows per-platform reach (impressions, reach, likes, comments, saves,
 * shares if captured) and links to the platform permalinks.
 */
import { X, Camera, Music2, ExternalLink } from 'lucide-react';
import type { PublishedPost } from '@/shared/socialBot';
import s from '@/pages/admin/AdminSocial.module.css';

interface Props {
    post: PublishedPost;
    onClose: () => void;
}

const fmt = (n: number | undefined): string => {
    if (typeof n !== 'number') return '—';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
};

const dateTime = (ts: number | undefined): string =>
    typeof ts === 'number'
        ? new Date(ts).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';

export function PublishedPostModal({ post, onClose }: Props) {
    const igReach = post.reach?.insta;
    const ttReach = post.reach?.tiktok;

    return (
        <div
            className={s.modalBackdrop}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div className={s.modalCard} onClick={(e) => e.stopPropagation()}>
                <div className={s.modalHead}>
                    <div>
                        <h2 className={s.modalTitle}>{post.title}</h2>
                        <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '4px' }}>
                            Publié {dateTime(post.publishedAt)}
                        </div>
                    </div>
                    <button onClick={onClose} className={s.modalClose} aria-label="Fermer">
                        <X size={14} />
                    </button>
                </div>

                {/* Instagram */}
                {post.results?.insta && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className={s.analyticsPlatformHead}>
                            <Camera size={13} /> Instagram
                        </div>
                        <div className={s.analyticsGrid}>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Impressions</span>
                                <span className={s.analyticsValue}>{fmt(igReach?.impressions)}</span>
                            </div>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Reach</span>
                                <span className={s.analyticsValue}>{fmt((igReach as { reach?: number })?.reach)}</span>
                            </div>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Likes</span>
                                <span className={s.analyticsValue}>{fmt(igReach?.likes)}</span>
                            </div>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Commentaires</span>
                                <span className={s.analyticsValue}>{fmt(igReach?.comments)}</span>
                            </div>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Enregistrés</span>
                                <span className={s.analyticsValue}>{fmt((igReach as { saved?: number })?.saved)}</span>
                            </div>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Partages</span>
                                <span className={s.analyticsValue}>{fmt((igReach as { shares?: number })?.shares)}</span>
                            </div>
                        </div>
                        {post.results.insta.permalink && (
                            <a
                                href={post.results.insta.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.modalLink}
                            >
                                <ExternalLink size={12} /> Voir sur Instagram
                            </a>
                        )}
                    </div>
                )}

                {/* TikTok */}
                {post.results?.tiktok && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className={s.analyticsPlatformHead} style={{ background: '#FF2E63' }}>
                            <Music2 size={13} /> TikTok
                        </div>
                        <div className={s.analyticsGrid}>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Vues</span>
                                <span className={s.analyticsValue}>{fmt(ttReach?.views)}</span>
                            </div>
                            <div className={s.analyticsCell}>
                                <span className={s.analyticsLabel}>Likes</span>
                                <span className={s.analyticsValue}>{fmt(ttReach?.likes)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {!post.reach && (
                    <div style={{
                        padding: '12px', background: '#fff3cd', border: '2px solid #f59e0b',
                        fontSize: '0.75rem', color: '#78350f', fontWeight: 600,
                    }}>
                        Les stats sont capturées à j+1 puis j+7 par le cron pollReach.
                        Rien ici pour l'instant.
                    </div>
                )}
            </div>
        </div>
    );
}

export default PublishedPostModal;
