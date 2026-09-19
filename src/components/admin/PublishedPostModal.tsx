/**
 * PublishedPostModal — analytics detail for a published social post.
 * Reads reach as the flat metrics map + raw Buffer `metrics[]` array
 * captured by the pollReach cron, so it works whatever names Buffer
 * happens to return per platform.
 */
import { useState } from 'react';
import { X, Camera, Music2, ExternalLink, Clock, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import type { PublishedPost, PlatformReach, BufferMetric } from '@/shared/socialBot';
import { retryPublish } from '@/firebase/socialBot';
import { logger } from '@/utils/logger';
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

/** Buffer names are snake_case or camelCase depending on platform.
 *  Map what we know into friendly French labels; anything else is
 *  displayed as-is, humanised. */
const PRETTY_LABELS: Record<string, string> = {
    impressions: 'Impressions',
    reach: 'Portée',
    likes: 'Likes',
    comments: 'Commentaires',
    saves: 'Enregistrés',
    saved: 'Enregistrés',
    shares: 'Partages',
    views: 'Vues',
    video_views: 'Vues vidéo',
    plays: 'Lectures',
    profile_visits: 'Visites profil',
    total_interactions: 'Interactions',
    engagement: 'Engagement',
    engagement_rate: 'Taux engagement',
    follows: 'Nouveaux abonnés',
};

const humanize = (name: string): string =>
    PRETTY_LABELS[name] || name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

interface MetricEntry { name: string; value: number; unit?: string }

/** Extract displayable metrics from a PlatformReach: prefer the raw
 *  `metrics[]` (has unit info); fall back to the flat map keys. */
function extractMetrics(reach: PlatformReach | undefined): MetricEntry[] {
    if (!reach) return [];
    if (Array.isArray(reach.raw) && reach.raw.length > 0) {
        return (reach.raw as BufferMetric[])
            .filter((m) => m?.name && typeof m.value === 'number')
            .map((m) => ({ name: m.name, value: m.value, unit: m.unit }));
    }
    const skip = new Set(['raw', 'capturedAt', 'metricsUpdatedAt']);
    const out: MetricEntry[] = [];
    for (const [k, v] of Object.entries(reach)) {
        if (skip.has(k)) continue;
        if (typeof v === 'number') out.push({ name: k, value: v });
    }
    return out;
}

interface PlatformPanelProps {
    label: 'Instagram' | 'TikTok';
    icon: React.ReactNode;
    headBg?: string;
    reach: PlatformReach | undefined;
    permalink?: string;
}

function PlatformPanel({ label, icon, headBg, reach, permalink }: PlatformPanelProps) {
    const metrics = extractMetrics(reach);
    const capturedAt = reach?.capturedAt as number | undefined;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className={s.analyticsPlatformHead} style={headBg ? { background: headBg } : undefined}>
                {icon} {label}
            </div>

            {metrics.length > 0 ? (
                <div className={s.analyticsGrid}>
                    {metrics.map((m) => (
                        <div key={m.name} className={s.analyticsCell}>
                            <span className={s.analyticsLabel}>{humanize(m.name)}</span>
                            <span className={s.analyticsValue}>
                                {fmt(m.value)}{m.unit === 'PERCENT' ? '%' : ''}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    padding: '10px', background: '#f5f5f5', border: '1px dashed #ccc',
                    fontSize: '0.7rem', color: '#666',
                }}>
                    Aucune stat capturée. Le cron pollReach interroge Buffer toutes les 6h.
                </div>
            )}

            {capturedAt && (
                <div style={{ fontSize: '0.65rem', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} /> Capturé {dateTime(capturedAt)}
                </div>
            )}

            {permalink && (
                <a
                    href={permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.modalLink}
                >
                    <ExternalLink size={12} /> Voir sur {label}
                </a>
            )}
        </div>
    );
}

export function PublishedPostModal({ post, onClose }: Props) {
    const igReach = post.reach?.insta;
    const ttReach = post.reach?.tiktok;
    const errors = post.errors || null;
    const hasErrors = errors && Object.keys(errors).length > 0;
    const [retrying, setRetrying] = useState(false);
    const [retryMessage, setRetryMessage] = useState<string | null>(null);

    const handleRetry = async () => {
        if (retrying) return;
        setRetrying(true);
        setRetryMessage(null);
        try {
            const res = await retryPublish(post.id);
            if (res.errors && Object.keys(res.errors).length > 0) {
                setRetryMessage(`Partiel — reste en échec: ${Object.keys(res.errors).join(', ')}`);
            } else {
                setRetryMessage('Retry OK, toutes les plateformes publiées.');
            }
        } catch (err) {
            logger.error('[PublishedPostModal] retry failed:', err);
            setRetryMessage(err instanceof Error ? err.message : String(err));
        } finally {
            setRetrying(false);
        }
    };

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
                            {post.lastRetryAt && (
                                <span> · Dernier retry {dateTime(post.lastRetryAt)}</span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className={s.modalClose} aria-label="Fermer">
                        <X size={14} />
                    </button>
                </div>

                {hasErrors && (
                    <div style={{
                        background: '#fef2f2',
                        border: '2px solid #dc2626',
                        padding: '12px',
                        marginBottom: '4px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginBottom: 8,
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontFamily: 'Outfit, sans-serif',
                                fontWeight: 900,
                                fontSize: '0.78rem',
                                color: '#991b1b',
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                            }}>
                                <AlertTriangle size={14} /> Publish partiel · à retenter
                            </div>
                            <button
                                onClick={handleRetry}
                                disabled={retrying}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: retrying ? '#ccc' : '#dc2626',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    fontFamily: 'Outfit, sans-serif',
                                    fontWeight: 800,
                                    fontSize: '0.68rem',
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                    cursor: retrying ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {retrying ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                Retry publish
                            </button>
                        </div>
                        {Object.entries(errors).map(([platform, msg]) => (
                            <div key={platform} style={{
                                marginTop: 6,
                                padding: '6px 8px',
                                background: '#fff',
                                border: '1px solid #fca5a5',
                                fontSize: '0.7rem',
                                fontFamily: 'monospace',
                                color: '#7f1d1d',
                                wordBreak: 'break-word',
                            }}>
                                <strong>{platform}:</strong> {msg}
                            </div>
                        ))}
                        {retryMessage && (
                            <div style={{
                                marginTop: 8,
                                padding: '6px 8px',
                                background: '#fff',
                                border: '1px solid #94a3b8',
                                fontSize: '0.72rem',
                                color: '#334155',
                            }}>{retryMessage}</div>
                        )}
                    </div>
                )}

                {post.results?.insta && (
                    <PlatformPanel
                        label="Instagram"
                        icon={<Camera size={13} />}
                        reach={igReach}
                        permalink={post.results.insta.permalink}
                    />
                )}

                {post.results?.tiktok && (
                    <PlatformPanel
                        label="TikTok"
                        icon={<Music2 size={13} />}
                        headBg="#FF2E63"
                        reach={ttReach}
                    />
                )}
            </div>
        </div>
    );
}

export default PublishedPostModal;
