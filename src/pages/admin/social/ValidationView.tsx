/**
 * Onglet Valider : chiffres de la semaine, file des posts (à publier,
 * à valider, partira tout seul), post sélectionné, derniers publiés.
 */
import { useEffect, useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { BotConfig, PendingPost, PublishedPost } from '@/shared/socialBot';
import { TYPE_TO_MODE_KEY, getMode } from '@/shared/socialBot';
import { PostFocus } from './PostFocus';
import { PublishedCard } from './PublishedView';
import { formatCount, formatWhen, trend, weekStats } from './helpers';
import s from './SocialBot.module.css';

interface Props {
    pending: PendingPost[];
    published: PublishedPost[];
    config: BotConfig;
    loading: boolean;
    activeId: string | null;
    onSelect: (id: string | null) => void;
    onOpenPublished: (p: PublishedPost) => void;
    onShowAllPublished: () => void;
}

const thumbOf = (p: PendingPost) => p.slides.find((sl) => sl.format === 'feed')?.url ?? p.slides[0]?.url;

function QueueItem({ post, active, onSelect, note, warn }: {
    post: PendingPost; active: boolean; onSelect: () => void; note: string; warn?: boolean;
}) {
    const thumb = thumbOf(post);
    return (
        <button type="button" className={s.queueItem} aria-current={active ? 'true' : undefined} onClick={onSelect}>
            <span className={s.queueThumb}>{thumb ? <img src={thumb} alt="" /> : null}</span>
            <span className={s.queueText}>
                <strong>{post.title}</strong>
                <span className={warn ? s.warnText : s.small}>{note}</span>
            </span>
        </button>
    );
}

function Kpi({ label, value, sub, trendInfo }: {
    label: string; value: string; sub?: string; trendInfo?: { label: string; up: boolean } | null;
}) {
    return (
        <div className={s.kpi}>
            <span className={s.label}>{label}</span>
            <span className={s.kpiValue}>{value}</span>
            {trendInfo ? (
                <span className={trendInfo.up ? s.up : s.down}>
                    {trendInfo.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {trendInfo.label} vs sem. dernière
                </span>
            ) : sub ? <span className={s.small}>{sub}</span> : null}
        </div>
    );
}

export function ValidationView({
    pending, published, config, loading, activeId, onSelect, onOpenPublished, onShowAllPublished,
}: Props) {
    const groups = useMemo(() => {
        const toPublish: PendingPost[] = [];
        const toValidate: PendingPost[] = [];
        const auto: PendingPost[] = [];
        for (const p of pending) {
            if (p.validatedAt) toPublish.push(p);
            else if (getMode(config, TYPE_TO_MODE_KEY[p.type]) === 'auto' && !p.manualFallback) auto.push(p);
            else toValidate.push(p);
        }
        return { toPublish, toValidate, auto };
    }, [pending, config]);

    const ordered = useMemo(
        () => [...groups.toPublish, ...groups.toValidate, ...groups.auto],
        [groups],
    );

    useEffect(() => {
        if (ordered.length === 0) {
            if (activeId) onSelect(null);
            return;
        }
        if (!activeId || !ordered.find((p) => p.id === activeId)) onSelect(ordered[0].id);
    }, [ordered, activeId, onSelect]);

    const active = ordered.find((p) => p.id === activeId) ?? null;
    const idx = active ? ordered.indexOf(active) : -1;
    const stats = useMemo(() => weekStats(published), [published]);

    return (
        <div className={s.stack}>
            <section className={s.kpiRow} aria-label="Chiffres des 7 derniers jours">
                <Kpi
                    label="Publiés · 7 j"
                    value={String(stats.published)}
                    sub={`${stats.byHand} par toi · ${stats.auto} via Buffer`}
                />
                <Kpi
                    label="Vues TikTok · 7 j"
                    value={formatCount(stats.tiktokViews)}
                    trendInfo={trend(stats.tiktokViews, stats.tiktokViewsPrev)}
                    sub="Posts publiés via Buffer"
                />
                <Kpi
                    label="Likes Insta · 7 j"
                    value={formatCount(stats.instaLikes)}
                    trendInfo={trend(stats.instaLikes, stats.instaLikesPrev)}
                    sub="Posts publiés via Buffer"
                />
                <Kpi
                    label="Meilleure heure"
                    value={stats.bestHour ? `${stats.bestHour.hour}h` : '—'}
                    sub={stats.bestHour ? `${formatCount(stats.bestHour.avg)} vues TikTok en moyenne` : 'Pas encore assez de données'}
                />
            </section>

            <div className={s.mainGrid}>
                <aside className={s.queue} aria-label="File des posts">
                    {loading && <p className={s.muted}>Chargement…</p>}

                    {groups.toPublish.length > 0 && (
                        <div className={s.queueGroup}>
                            <h2 className={s.groupTitle}>À publier · {groups.toPublish.length}</h2>
                            <div className={s.queueItems}>
                            {groups.toPublish.map((p) => (
                                <QueueItem
                                    key={p.id}
                                    post={p}
                                    active={p.id === activeId}
                                    onSelect={() => onSelect(p.id)}
                                    note={`Prévu ${formatWhen(p.scheduledAt).toLowerCase()}`}
                                />
                            ))}
                            </div>
                        </div>
                    )}

                    <div className={s.queueGroup}>
                        <h2 className={s.groupTitle}>
                            À valider · {groups.toValidate.length}
                            <span className={`${s.small} ${s.desktopOnly}`}><kbd>J</kbd> <kbd>K</kbd></span>
                        </h2>
                        {!loading && groups.toValidate.length === 0 && (
                            <p className={s.emptyBox}>Rien à valider. Le prochain post arrivera avec son cron.</p>
                        )}
                        <div className={s.queueItems}>
                        {groups.toValidate.map((p) => (
                            <QueueItem
                                key={p.id}
                                post={p}
                                active={p.id === activeId}
                                onSelect={() => onSelect(p.id)}
                                warn={p.manualFallback || p.status === 'failed'}
                                note={p.manualFallback
                                    ? 'Buffer a échoué → passé en Manuel'
                                    : p.status === 'failed'
                                        ? 'Échec, à revoir'
                                        : `Prévu ${formatWhen(p.scheduledAt).toLowerCase()}`}
                            />
                        ))}
                        </div>
                    </div>

                    {groups.auto.length > 0 && (
                        <div className={s.queueGroup}>
                            <h2 className={s.groupTitle}>Partira tout seul · {groups.auto.length}</h2>
                            <div className={s.queueItems}>
                            {groups.auto.map((p) => (
                                <QueueItem
                                    key={p.id}
                                    post={p}
                                    active={p.id === activeId}
                                    onSelect={() => onSelect(p.id)}
                                    note={`Buffer · ${formatWhen(p.scheduledAt).toLowerCase()}`}
                                />
                            ))}
                            </div>
                        </div>
                    )}
                </aside>

                {active ? (
                    <PostFocus
                        key={active.id}
                        post={active}
                        config={config}
                        onNext={() => idx < ordered.length - 1 && onSelect(ordered[idx + 1].id)}
                        onPrev={() => idx > 0 && onSelect(ordered[idx - 1].id)}
                    />
                ) : (
                    <section className={`${s.focus} ${s.focusEmpty}`}>
                        <h2 className={s.focusTitle}>Tout est à jour</h2>
                        <p className={s.muted}>Aucun post en attente. Les automatisations continuent de tourner.</p>
                    </section>
                )}
            </div>

            {published.length > 0 && (
                <section className={s.stack} aria-labelledby="recent-title">
                    <div className={s.sectionHead}>
                        <h2 id="recent-title" className={s.groupTitle}>Derniers publiés</h2>
                        <button type="button" className={s.linkBtn} onClick={onShowAllPublished}>Tout l'historique →</button>
                    </div>
                    <div className={s.pubGrid}>
                        {published.slice(0, 4).map((p) => (
                            <PublishedCard key={p.id} post={p} onOpen={() => onOpenPublished(p)} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
