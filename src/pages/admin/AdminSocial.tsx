/**
 * Admin Social Bot page — post validation & publishing UI.
 *
 * Responsive: desktop grid (sidebar + preview + edit), tablet narrows
 * both cols, mobile stacks everything vertically. All layout lives in
 * AdminSocial.module.css so media queries can do their job.
 */
import { useEffect, useMemo, useState } from 'react';
import {
    Calendar, TrendingUp, Sparkles, Camera, Music2, MessageSquare,
    RefreshCw, Save, Trash2, Send, Clock, CheckCircle2, Users, Power, PowerOff,
    Loader2,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { useAuthStore } from '@/store/authStore';
import type { PendingPost, PublishedPost, BotConfig, PostType, PostPlatforms, PostSourceAnime } from '@/shared/socialBot';
import { POST_TYPE_LABELS, POST_TYPE_COLORS, DEFAULT_BOT_CONFIG } from '@/shared/socialBot';
import { buildSlidesHTML } from '@/shared/socialTemplates';
import type { AnimeSlideData } from '@/shared/socialTemplates';
import {
    subscribeToPendingPosts,
    subscribeToPublishedPosts,
    subscribeToBotConfig,
    setBotEnabled,
    setScheduleEnabled,
    setScheduleTime,
    setPlatformMode,
    updatePendingPostDraft,
    publishPostNow,
    rejectPost,
    regeneratePost,
} from '@/firebase/socialBot';
import { SlideHtmlPreview } from '@/components/admin/SlideHtmlPreview';
import { SlidesEditor } from '@/components/admin/SlidesEditor';
import { PublishedPostModal } from '@/components/admin/PublishedPostModal';
import { RejectModal } from '@/components/admin/RejectModal';
import s from './AdminSocial.module.css';

/* ==========================================================================
   HELPERS
   ========================================================================== */

const TYPE_ICONS: Record<PostType, React.ReactNode> = {
    daily: <Calendar size={11} />,
    weekly: <TrendingUp size={11} />,
    favorite: <Users size={11} />,
    newseason: <Sparkles size={11} />,
};

const TypeBadge: React.FC<{ type: PostType }> = ({ type }) => {
    const colors = POST_TYPE_COLORS[type];
    return (
        <div
            className={s.typeBadge}
            style={{ background: colors.bg, color: colors.text }}
        >
            {TYPE_ICONS[type]} {POST_TYPE_LABELS[type]}
        </div>
    );
};

const formatSchedule = (ts: number): string => {
    if (!ts) return '—';
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return `Aujourd'hui ${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
    const days = Math.round((ts - now.getTime()) / 86_400_000);
    if (days === 1) return `Demain ${d.getHours()}h`;
    if (days > 1 && days < 7) return `Dans ${days}j · ${d.getHours()}h`;
    if (days < 0 && days > -7) return `Il y a ${Math.abs(days)}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const animesToTemplateData = (
    type: PostType,
    animes: PostSourceAnime[],
): AnimeSlideData | AnimeSlideData[] | null => {
    if (!animes || animes.length === 0) return null;
    if (type === 'newseason') return animes[0];
    return animes;
};

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function AdminSocial() {
    const previewSuper = typeof window !== 'undefined'
        && window.location?.pathname?.includes('/_preview/admin-social');
    const isSuperAdmin = useAuthStore((state) => state.userProfile?.isSuperAdmin === true) || previewSuper;

    const [pending, setPending] = useState<PendingPost[]>([]);
    const [published, setPublished] = useState<PublishedPost[]>([]);
    const [config, setConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);
    const [loading, setLoading] = useState(true);

    const [activeId, setActiveId] = useState<string | null>(null);

    const [captionDraft, setCaptionDraft] = useState<string>('');
    const [hashtagsDraft, setHashtagsDraft] = useState<string>('');
    const [platformsDraft, setPlatformsDraft] = useState<PostPlatforms>({ insta: false, tiktok: false, x: false });
    const [savingDraft, setSavingDraft] = useState(false);
    const [actionBusy, setActionBusy] = useState<string | null>(null);
    const [slideFormat, setSlideFormat] = useState<'feed' | 'story'>('feed');
    const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
    const [typeFilter, setTypeFilter] = useState<PostType | 'all'>('all');
    const [analyticsPost, setAnalyticsPost] = useState<PublishedPost | null>(null);
    const [rejectModal, setRejectModal] = useState<boolean>(false);

    // Subscribe
    useEffect(() => {
        const unsubPending = subscribeToPendingPosts((posts) => {
            setPending(posts);
            setLoading(false);
        });
        const unsubPublished = subscribeToPublishedPosts(setPublished, 8);
        const unsubConfig = subscribeToBotConfig(setConfig);
        return () => {
            unsubPending();
            unsubPublished();
            unsubConfig();
        };
    }, []);

    const filteredPending = typeFilter === 'all'
        ? pending
        : pending.filter((p) => p.type === typeFilter);

    useEffect(() => {
        if (!activeId && filteredPending.length > 0) {
            setActiveId(filteredPending[0].id);
        } else if (activeId && !filteredPending.find((p) => p.id === activeId)) {
            setActiveId(filteredPending[0]?.id ?? null);
        }
    }, [filteredPending, activeId]);

    const active = pending.find((p) => p.id === activeId) ?? null;

    useEffect(() => {
        if (active) {
            setCaptionDraft(active.caption);
            setHashtagsDraft(active.hashtags);
            setPlatformsDraft(active.platforms);
            setActiveSlideIndex(0);
        }
    }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const dirty = Boolean(active && (
        captionDraft !== active.caption
        || hashtagsDraft !== active.hashtags
        || platformsDraft.insta !== active.platforms.insta
        || platformsDraft.tiktok !== active.platforms.tiktok
        || platformsDraft.x !== active.platforms.x
    ));

    /* --------------- Slides derivation ---------------
       Template drives navigation when we have sourceData.animes
       (intro + N animes + outro). Fallback to Firestore-stored slide
       URLs (Puppeteer PNGs) otherwise. */
    const animesForLive = active?.sourceData?.animes;
    const templateData = active && animesForLive
        ? animesToTemplateData(active.type, animesForLive)
        : null;
    const templateSlides = useMemo(() => {
        if (!active || !templateData) return [];
        return buildSlidesHTML(active.type, templateData);
    }, [active?.type, templateData, active]);

    const puppeteerSlides = active?.slides.filter((sl) => sl.format === slideFormat) ?? [];
    const hasTemplate = templateSlides.length > 0;
    const slideCount = hasTemplate ? templateSlides.length : puppeteerSlides.length;
    // The templates always know how to render both formats; the puppeteer
    // fallback only exposes what's actually in Firestore.
    const hasStory = hasTemplate
        ? true
        : (active?.slides.some((sl) => sl.format === 'story') ?? true);

    // Clamp active index if slideCount shrinks
    useEffect(() => {
        if (activeSlideIndex >= slideCount && slideCount > 0) {
            setActiveSlideIndex(0);
        }
    }, [slideCount, activeSlideIndex]);

    const togglePlatform = (key: keyof PostPlatforms) => {
        setPlatformsDraft((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleKillSwitch = async () => {
        if (!isSuperAdmin) {
            alert("Seul un superAdmin peut activer/désactiver le bot.");
            return;
        }
        try {
            await setBotEnabled(!config.enabled);
        } catch (e) {
            logger.error('[AdminSocial] toggle kill-switch failed:', e);
            alert('Impossible de basculer le kill-switch (voir console).');
        }
    };

    const handleSaveDraft = async () => {
        if (!active) return;
        setSavingDraft(true);
        try {
            await updatePendingPostDraft(active.id, {
                caption: captionDraft,
                hashtags: hashtagsDraft,
                platforms: platformsDraft,
            });
        } catch (e) {
            logger.error('[AdminSocial] save draft failed:', e);
            alert('Impossible de sauver les modifications.');
        } finally {
            setSavingDraft(false);
        }
    };

    const handleSaveSlides = async (nextAnimes: PostSourceAnime[]) => {
        if (!active) return;
        try {
            await updatePendingPostDraft(active.id, {
                sourceData: {
                    ...active.sourceData,
                    animes: nextAnimes,
                    animeIds: nextAnimes.map((a) => a.mal_id).filter(Boolean) as number[],
                },
            });
        } catch (e) {
            logger.error('[AdminSocial] save slides failed:', e);
            alert('Impossible de sauver les slides.');
        }
    };

    const handlePublish = async () => {
        if (!active) return;
        if (dirty) {
            alert("Sauve d'abord tes modifications avant de publier.");
            return;
        }
        if (!confirm(`Publier "${active.title}" maintenant ?`)) return;
        setActionBusy('publish');
        try {
            await publishPostNow(active.id);
        } catch (e) {
            logger.error('[AdminSocial] publish failed:', e);
            alert('Publication échouée (voir console).');
        } finally {
            setActionBusy(null);
        }
    };

    const handleRejectSubmit = async (reason: string) => {
        if (!active) return;
        setActionBusy('reject');
        try {
            await rejectPost(active.id, reason);
            setRejectModal(false);
        } catch (e) {
            logger.error('[AdminSocial] reject failed:', e);
            alert('Rejet échoué (voir console).');
        } finally {
            setActionBusy(null);
        }
    };

    const handleRegenerate = async () => {
        if (!active) return;
        if (!confirm(`Régénérer la caption pour "${active.title}" ?`)) return;
        setActionBusy('regen');
        try {
            await regeneratePost(active.id);
        } catch (e) {
            logger.error('[AdminSocial] regenerate failed:', e);
            alert('Régénération échouée (voir console).');
        } finally {
            setActionBusy(null);
        }
    };

    /* ==========================================================================
       RENDER
       ========================================================================== */

    return (
        <div className={s.page}>
            <div className={s.container}>

                {/* HEADER */}
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <span className={s.brandChip}>SOCIAL BOT</span>
                        <h1 className={s.headerTitle}>Validation des publications</h1>
                    </div>
                    <div className={s.headerBadges}>
                        <span className={s.statChip}>
                            <Clock size={11} /> {pending.length} EN ATTENTE
                        </span>
                        <span className={`${s.statChip} ${s.cyan}`}>
                            <CheckCircle2 size={11} /> {published.length} PUBLIÉS
                        </span>
                        <button
                            onClick={handleToggleKillSwitch}
                            disabled={!isSuperAdmin}
                            title={!isSuperAdmin
                                ? 'superAdmin uniquement'
                                : config.enabled ? 'Kill-switch — désactiver' : 'Activer le bot'}
                            className={`${s.killSwitch} ${config.enabled ? s.enabled : s.disabled}`}
                        >
                            {config.enabled ? <Power size={11} /> : <PowerOff size={11} />}
                            {config.enabled ? 'BOT ACTIF' : 'BOT DÉSACTIVÉ'}
                        </button>
                    </div>
                </div>

                {!config.enabled && (
                    <div className={s.banner}>
                        Kill-switch actif — les crons ne génèrent plus de posts, aucune publication automatique.
                    </div>
                )}

                {/* BODY */}
                <div className={s.body}>

                    {/* SIDEBAR */}
                    <aside className={s.sidebar}>

                        {/* Pending list */}
                        <div className={s.sidebarSection}>
                            <div className={s.sectionHead}>
                                <h3 className={s.sectionTitle}>En attente</h3>
                                <span className={s.sectionCount}>{filteredPending.length}{typeFilter !== 'all' ? `/${pending.length}` : ''}</span>
                            </div>
                            {pending.length > 1 && (
                                <div className={s.filterChips}>
                                    {([
                                        { key: 'all' as const, label: 'Tous' },
                                        { key: 'daily' as const, label: 'Sorties' },
                                        { key: 'weekly' as const, label: 'Hebdo' },
                                        { key: 'favorite' as const, label: 'Coup' },
                                        { key: 'newseason' as const, label: 'Saison' },
                                    ]).map((f) => (
                                        <button
                                            key={f.key}
                                            onClick={() => setTypeFilter(f.key)}
                                            className={`${s.filterChip} ${typeFilter === f.key ? s.active : ''}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {loading && (
                                <div className={s.emptyBox}>
                                    <Loader2 size={14} className="animate-spin" /> Chargement...
                                </div>
                            )}
                            {!loading && filteredPending.length === 0 && (
                                <div className={s.emptyBox}>
                                    {typeFilter === 'all'
                                        ? "Aucun post en attente. Le prochain cron déposera un post ici."
                                        : `Aucun post de ce type. Change le filtre pour voir les autres.`}
                                </div>
                            )}
                            {filteredPending.map((p) => {
                                const selected = p.id === activeId;
                                const thumb = p.slides.find((sl) => sl.format === 'feed')?.url ?? p.slides[0]?.url;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setActiveId(p.id)}
                                        className={`${s.postThumb} ${selected ? s.selected : ''}`}
                                    >
                                        <div className={s.thumbCover}>
                                            {thumb && <img src={thumb} alt="" />}
                                        </div>
                                        <div className={s.thumbInfo}>
                                            <TypeBadge type={p.type} />
                                            <div className={s.thumbTitle}>{p.title}</div>
                                            <div className={s.thumbMeta}>
                                                <Clock size={9} /> {formatSchedule(p.scheduledAt)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Schedules — superAdmin only */}
                        {isSuperAdmin && (
                            <div className={s.sidebarSection}>
                                <div className={s.sectionHead}>
                                    <h3 className={s.sectionTitle}>Crons</h3>
                                </div>
                                {([
                                    { key: 'daily' as const, label: 'Sorties du jour', hasDay: false },
                                    { key: 'weekly' as const, label: 'Récap hebdo', hasDay: true },
                                    { key: 'favorite' as const, label: 'Coup de cœur', hasDay: true },
                                ]).map((row) => {
                                    const sched = config.schedules?.[row.key];
                                    const enabled = sched?.enabled ?? true;
                                    const hour = sched?.hour ?? 12;
                                    const dayOfWeek = (sched && 'dayOfWeek' in sched) ? sched.dayOfWeek : 0;
                                    return (
                                        <div key={row.key} className={`${s.cronRow} ${enabled ? s.enabled : s.disabled}`}>
                                            <label className={s.cronLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={enabled}
                                                    onChange={(e) => setScheduleEnabled(row.key, e.target.checked).catch((err) => {
                                                        logger.error('[AdminSocial] set schedule failed:', err);
                                                        alert('Toggle échoué.');
                                                    })}
                                                    style={{ width: 16, height: 16 }}
                                                />
                                                {row.label}
                                            </label>
                                            <div className={s.cronTime}>
                                                {row.hasDay && (
                                                    <select
                                                        value={dayOfWeek}
                                                        disabled={!enabled}
                                                        onChange={(e) => setScheduleTime(row.key, { dayOfWeek: parseInt(e.target.value, 10) }).catch((err) => logger.error(err))}
                                                    >
                                                        {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d, i) => (
                                                            <option key={i} value={i}>{d}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                <input
                                                    type="number"
                                                    min={0} max={23}
                                                    value={hour}
                                                    disabled={!enabled}
                                                    onChange={(e) => {
                                                        const v = parseInt(e.target.value, 10);
                                                        if (v >= 0 && v <= 23) setScheduleTime(row.key, { hour: v }).catch((err) => logger.error(err));
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700 }}>h</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className={s.cronNotice}>
                                    Horaires stockés en config. Changer l'heure d'exécution demande de modifier le code du cron et de redéployer.
                                </div>

                                {/* Publish mode per platform */}
                                {([
                                    { key: 'insta' as const, label: 'Instagram', icon: <Camera size={12} /> },
                                    { key: 'tiktok' as const, label: 'TikTok', icon: <Music2 size={12} /> },
                                ]).map((p) => {
                                    const mode = config.platforms?.[p.key]?.mode ?? 'photo';
                                    return (
                                        <div key={p.key} className={s.platformModeRow}>
                                            <div className={s.platformModeLabel}>
                                                {p.icon} {p.label} — mode publication
                                            </div>
                                            <div className={s.modeSegmented}>
                                                <button
                                                    onClick={() => setPlatformMode(p.key, 'photo').catch((err) => logger.error(err))}
                                                    className={mode === 'photo' ? s.active : ''}
                                                >
                                                    Carousel photo
                                                </button>
                                                <button
                                                    onClick={() => setPlatformMode(p.key, 'video').catch((err) => logger.error(err))}
                                                    className={mode === 'video' ? `${s.active} ${s.cyan}` : ''}
                                                >
                                                    {p.key === 'insta' ? 'Reel vidéo' : 'Vidéo'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Recently published */}
                        {published.length > 0 && (
                            <div className={s.sidebarSection}>
                                <div className={s.sectionHead}>
                                    <h3 className={s.sectionTitle}>Derniers publiés</h3>
                                </div>
                                {published.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setAnalyticsPost(p)}
                                        className={s.publishedItem}
                                    >
                                        <div className={s.thumbInfo}>
                                            <div className={s.thumbTitle}>{p.title}</div>
                                            <div className={s.thumbMeta}>{formatSchedule(p.publishedAt)}</div>
                                        </div>
                                        {p.reach?.insta?.impressions && (
                                            <span className={`${s.statChip} ${s.cyan}`} style={{ padding: '1px 6px', fontSize: '0.6rem' }}>
                                                {(p.reach.insta.impressions / 1000).toFixed(1)}K
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </aside>

                    {/* MAIN PANEL */}
                    {!active ? (
                        <div className={s.mainPanel} style={{ display: 'block', textAlign: 'center', padding: '3rem' }}>
                            <div style={{
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '1.2rem', marginBottom: '0.5rem',
                            }}>
                                Rien à valider pour l'instant
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Le bot déposera un post à valider dès le prochain cron.
                            </div>
                        </div>
                    ) : (
                        <div className={s.mainPanel}>

                            {/* Preview column */}
                            <div className={s.previewCol}>
                                {hasStory && (
                                    <div className={s.formatToggle}>
                                        {(['feed', 'story'] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => { setSlideFormat(f); setActiveSlideIndex(0); }}
                                                className={slideFormat === f ? s.active : ''}
                                            >
                                                {f === 'feed' ? 'Feed 4:5' : 'Story 9:16'}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className={`${s.previewFrame} ${slideFormat === 'story' ? s.story : ''}`}>
                                    {hasTemplate && templateData ? (
                                        <SlideHtmlPreview
                                            type={active.type}
                                            data={templateData}
                                            slideIndex={activeSlideIndex}
                                            format={slideFormat}
                                        />
                                    ) : puppeteerSlides[activeSlideIndex] ? (
                                        <img src={puppeteerSlides[activeSlideIndex].url} alt="" style={{
                                            position: 'absolute', inset: 0,
                                            width: '100%', height: '100%', objectFit: 'cover',
                                        }} />
                                    ) : (
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#666', fontSize: '0.75rem', textAlign: 'center', padding: '1rem',
                                        }}>
                                            Aucune slide {slideFormat}
                                        </div>
                                    )}
                                </div>

                                {slideCount > 1 && (
                                    <div className={s.dotNav}>
                                        {Array.from({ length: slideCount }).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveSlideIndex(i)}
                                                className={i === activeSlideIndex ? s.active : ''}
                                                aria-label={`Slide ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}

                                {slideCount > 1 && (
                                    <div className={s.thumbRow}>
                                        {Array.from({ length: slideCount }).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveSlideIndex(i)}
                                                className={`${s.thumbSlide} ${slideFormat === 'story' ? s.story : ''} ${i === activeSlideIndex ? s.active : ''}`}
                                            >
                                                <span className={s.idx}>{i + 1}</span>
                                                {hasTemplate && templateData ? (
                                                    <SlideHtmlPreview
                                                        type={active.type}
                                                        data={templateData}
                                                        slideIndex={i}
                                                        format={slideFormat}
                                                    />
                                                ) : puppeteerSlides[i]?.url ? (
                                                    <img src={puppeteerSlides[i].url} alt="" style={{
                                                        position: 'absolute', inset: 0,
                                                        width: '100%', height: '100%', objectFit: 'cover',
                                                    }} />
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className={s.slideCounter}>
                                    <span>Slide {activeSlideIndex + 1} / {slideCount}</span>
                                    <span>{slideFormat.toUpperCase()}</span>
                                </div>
                            </div>

                            {/* Edit column */}
                            <div className={s.editCol}>
                                <div>
                                    <TypeBadge type={active.type} />
                                    <h2 className={s.postTitle}>{active.title}</h2>
                                    <div className={s.postSchedule}>
                                        <Clock size={12} /> Programmé — {formatSchedule(active.scheduledAt)}
                                    </div>
                                </div>

                                <div className={s.fieldGroup}>
                                    <div className={s.fieldLabel}>
                                        <span>Caption — généré par Gemini</span>
                                        {active.variantB && (
                                            <div className={s.abToggle}>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#666', letterSpacing: '0.05em' }}>A/B</span>
                                                <button
                                                    onClick={() => {
                                                        setCaptionDraft(active.caption);
                                                        setHashtagsDraft(active.hashtags);
                                                    }}
                                                    className={captionDraft === active.caption ? s.activeA : ''}
                                                >
                                                    A (nouvelle)
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCaptionDraft(active.variantB!.caption);
                                                        setHashtagsDraft(active.variantB!.hashtags);
                                                    }}
                                                    className={captionDraft === active.variantB.caption ? s.activeB : ''}
                                                >
                                                    B (précédente)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <textarea
                                        value={captionDraft}
                                        onChange={(e) => setCaptionDraft(e.target.value)}
                                        rows={6}
                                        className={s.captionArea}
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className={s.fieldLabel}>Hashtags</label>
                                    <input
                                        value={hashtagsDraft}
                                        onChange={(e) => setHashtagsDraft(e.target.value)}
                                        className={s.hashtagsInput}
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className={s.fieldLabel}>Publication sur</label>
                                    <div className={s.platformRow}>
                                        {([
                                            { key: 'insta' as const, label: 'Instagram', icon: <Camera size={13} />, auto: true },
                                            { key: 'tiktok' as const, label: 'TikTok', icon: <Music2 size={13} />, auto: true },
                                            { key: 'x' as const, label: 'X (manuel)', icon: <MessageSquare size={13} />, auto: false },
                                        ]).map((p) => {
                                            const enabled = platformsDraft[p.key];
                                            const cls = !enabled ? '' : p.auto ? s.enabled : s.enabledManual;
                                            return (
                                                <button
                                                    key={p.key}
                                                    onClick={() => togglePlatform(p.key)}
                                                    className={`${s.platformChip} ${cls}`}
                                                >
                                                    {p.icon} {p.label}
                                                    {enabled && !p.auto && <span className={s.copyMark}>COPY</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={s.actionRow}>
                                    <button
                                        onClick={handleRegenerate}
                                        disabled={actionBusy === 'regen'}
                                        className={s.actionBtn}
                                    >
                                        <RefreshCw size={13} /> Régénérer
                                    </button>
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={!dirty || savingDraft}
                                        className={`${s.actionBtn} ${dirty ? s.save : ''}`}
                                    >
                                        <Save size={13} /> {dirty ? 'Sauver édits' : 'Aucun changement'}
                                    </button>
                                    <button
                                        onClick={() => setRejectModal(true)}
                                        disabled={actionBusy === 'reject'}
                                        className={s.actionBtn}
                                    >
                                        <Trash2 size={13} /> Rejeter
                                    </button>
                                    <button
                                        onClick={handlePublish}
                                        disabled={!config.enabled || actionBusy === 'publish' || dirty}
                                        title={dirty ? 'Sauve tes édits avant de publier' : ''}
                                        className={`${s.actionBtn} ${s.publish}`}
                                    >
                                        <Send size={13} /> {actionBusy === 'publish' ? 'Publication...' : 'Publier maintenant'}
                                    </button>
                                </div>

                                {/* Slides editor */}
                                {animesForLive && animesForLive.length > 0 && (
                                    <SlidesEditor
                                        type={active.type}
                                        animes={animesForLive}
                                        onSave={handleSaveSlides}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {analyticsPost && (
                <PublishedPostModal
                    post={analyticsPost}
                    onClose={() => setAnalyticsPost(null)}
                />
            )}

            {rejectModal && active && (
                <RejectModal
                    postTitle={active.title}
                    onCancel={() => setRejectModal(false)}
                    onConfirm={handleRejectSubmit}
                    busy={actionBusy === 'reject'}
                />
            )}
        </div>
    );
}
