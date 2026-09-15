/**
 * Admin Social Bot page — post validation & publishing UI
 *
 * Phase 2: branché sur Firestore live (subscribeToPendingPosts /
 * subscribeToBotConfig / subscribeToPublishedPosts). Les actions
 * Publier / Rejeter / Régénérer appellent les callables backend qui
 * seront implémentées en Phase 4.
 */
import { useEffect, useState } from 'react';
import {
    Calendar, TrendingUp, Sparkles, Camera, Music2, MessageSquare,
    RefreshCw, Save, Trash2, Send, Clock, CheckCircle2, Users, Power, PowerOff,
    Loader2,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { useAuthStore } from '@/store/authStore';
import type { PendingPost, PublishedPost, BotConfig, PostType, PostPlatforms } from '@/shared/socialBot';
import { POST_TYPE_LABELS, POST_TYPE_COLORS, DEFAULT_BOT_CONFIG } from '@/shared/socialBot';
import {
    subscribeToPendingPosts,
    subscribeToPublishedPosts,
    subscribeToBotConfig,
    setBotEnabled,
    updatePendingPostDraft,
    publishPostNow,
    rejectPost,
    regeneratePost,
} from '@/firebase/socialBot';

/* ==========================================================================
   UI PIECES
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
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: colors.bg, color: colors.text, border: '2px solid #000',
            padding: '0.15rem 0.45rem',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
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

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function AdminSocial() {
    const isSuperAdmin = useAuthStore((s) => s.userProfile?.isSuperAdmin === true);

    const [pending, setPending] = useState<PendingPost[]>([]);
    const [published, setPublished] = useState<PublishedPost[]>([]);
    const [config, setConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);
    const [loading, setLoading] = useState(true);

    const [activeId, setActiveId] = useState<string | null>(null);

    // Draft state (unsaved edits)
    const [captionDraft, setCaptionDraft] = useState<string>('');
    const [hashtagsDraft, setHashtagsDraft] = useState<string>('');
    const [platformsDraft, setPlatformsDraft] = useState<PostPlatforms>({ insta: false, tiktok: false, x: false });
    const [savingDraft, setSavingDraft] = useState(false);
    const [actionBusy, setActionBusy] = useState<string | null>(null);

    // Subscribe to Firestore
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

    // Auto-select first pending post
    useEffect(() => {
        if (!activeId && pending.length > 0) {
            setActiveId(pending[0].id);
        } else if (activeId && !pending.find((p) => p.id === activeId)) {
            // Selected post was removed (published/rejected)
            setActiveId(pending[0]?.id ?? null);
        }
    }, [pending, activeId]);

    const active = pending.find((p) => p.id === activeId) ?? null;

    // Reset drafts when switching post
    useEffect(() => {
        if (active) {
            setCaptionDraft(active.caption);
            setHashtagsDraft(active.hashtags);
            setPlatformsDraft(active.platforms);
        }
    }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const dirty = Boolean(active && (
        captionDraft !== active.caption
        || hashtagsDraft !== active.hashtags
        || platformsDraft.insta !== active.platforms.insta
        || platformsDraft.tiktok !== active.platforms.tiktok
        || platformsDraft.x !== active.platforms.x
    ));

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

    const handleReject = async () => {
        if (!active) return;
        if (!confirm(`Rejeter "${active.title}" ? Le post sera supprimé.`)) return;
        setActionBusy('reject');
        try {
            await rejectPost(active.id);
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

    const cover = active?.slides.find((s) => s.format === 'feed')?.url ?? active?.slides[0]?.url;

    return (
        <div style={{
            padding: '20px', background: '#f5f5f5', minHeight: '100vh',
            color: '#000', fontFamily: '"Inter", sans-serif',
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{
                    background: '#000', color: '#fff', padding: '0.9rem 1.2rem',
                    border: '3px solid #000', boxShadow: '6px 6px 0 #000',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            background: '#FF2E63', color: '#fff', border: '2px solid #fff',
                            padding: '0.2rem 0.5rem',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.65rem', letterSpacing: '0.1em',
                        }}>
                            SOCIAL BOT
                        </div>
                        <h1 style={{
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '1.2rem', letterSpacing: '-0.5px', margin: 0,
                        }}>
                            Validation des publications
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{
                            background: '#FF2E63', color: '#fff', border: '2px solid #fff',
                            padding: '0.2rem 0.55rem',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.7rem',
                        }}>
                            <Clock size={11} style={{ verticalAlign: '-2px' }} /> {pending.length} EN ATTENTE
                        </div>
                        <div style={{
                            background: '#08D9D6', color: '#000', border: '2px solid #fff',
                            padding: '0.2rem 0.55rem',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.7rem',
                        }}>
                            <CheckCircle2 size={11} style={{ verticalAlign: '-2px' }} /> {published.length} PUBLIÉS
                        </div>
                        <button
                            onClick={handleToggleKillSwitch}
                            title={
                                !isSuperAdmin ? 'superAdmin uniquement' :
                                    config.enabled ? 'Kill-switch — désactiver le bot' : 'Activer le bot'
                            }
                            disabled={!isSuperAdmin}
                            style={{
                                background: config.enabled ? '#08D9D6' : '#ef4444',
                                color: config.enabled ? '#000' : '#fff',
                                border: '2px solid #fff',
                                cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
                                opacity: isSuperAdmin ? 1 : 0.6,
                                padding: '0.25rem 0.6rem',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.7rem', letterSpacing: '0.05em',
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            }}
                        >
                            {config.enabled ? <Power size={11} /> : <PowerOff size={11} />}
                            {config.enabled ? 'BOT ACTIF' : 'BOT DÉSACTIVÉ'}
                        </button>
                    </div>
                </div>

                {!config.enabled && (
                    <div style={{
                        background: '#fff3cd', border: '3px solid #f59e0b', boxShadow: '4px 4px 0 #000',
                        padding: '0.7rem 1rem', marginBottom: '1rem',
                        fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: '0.8rem',
                    }}>
                        Kill-switch actif — les crons ne génèrent plus de posts, aucune publication automatique.
                    </div>
                )}

                {/* Body : 2 columns */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.2rem',
                }}>
                    {/* Sidebar */}
                    <aside style={{
                        background: '#fff', border: '3px solid #000', boxShadow: '6px 6px 0 #000',
                        padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                        height: 'fit-content', position: 'sticky', top: '20px',
                    }}>
                        <div>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                            }}>
                                <h3 style={{
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                    fontSize: '0.75rem', textTransform: 'uppercase',
                                    letterSpacing: '0.08em', margin: 0,
                                }}>
                                    En attente
                                </h3>
                                <span style={{
                                    background: '#000', color: '#fff', border: '2px solid #000',
                                    padding: '1px 6px',
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                    fontSize: '0.65rem',
                                }}>
                                    {pending.length}
                                </span>
                            </div>
                            {loading && (
                                <div style={{
                                    padding: '1rem', textAlign: 'center', color: '#666',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                    fontSize: '0.8rem',
                                }}>
                                    <Loader2 size={14} className="animate-spin" /> Chargement...
                                </div>
                            )}
                            {!loading && pending.length === 0 && (
                                <div style={{
                                    padding: '1rem', textAlign: 'center', color: '#666',
                                    border: '2px dashed #ccc', fontSize: '0.75rem', lineHeight: 1.4,
                                }}>
                                    Aucun post en attente.<br />
                                    Le prochain cron déposera un post ici.
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {pending.map((p) => {
                                    const selected = p.id === activeId;
                                    const thumb = p.slides.find((s) => s.format === 'feed')?.url ?? p.slides[0]?.url;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setActiveId(p.id)}
                                            style={{
                                                textAlign: 'left', cursor: 'pointer',
                                                display: 'flex', gap: '0.6rem', padding: '0.6rem',
                                                background: selected ? '#000' : '#fff',
                                                color: selected ? '#fff' : '#000',
                                                border: '3px solid #000',
                                                boxShadow: selected ? 'inset 0 0 0 2px #FF2E63' : '3px 3px 0 #000',
                                            }}
                                        >
                                            <div style={{
                                                width: '44px', height: '58px', flexShrink: 0,
                                                background: '#252A34', border: '2px solid #000',
                                                position: 'relative', overflow: 'hidden',
                                            }}>
                                                {thumb && (
                                                    <img src={thumb} alt="" style={{
                                                        position: 'absolute', inset: 0,
                                                        width: '100%', height: '100%', objectFit: 'cover',
                                                    }} />
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <TypeBadge type={p.type} />
                                                <div style={{
                                                    fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                                                    fontSize: '0.7rem', lineHeight: 1.1,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {p.title}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.6rem', color: selected ? '#08D9D6' : '#666',
                                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                }}>
                                                    <Clock size={9} /> {formatSchedule(p.scheduledAt)}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {published.length > 0 && (
                            <div>
                                <div style={{
                                    borderTop: '2px dashed #ccc', paddingTop: '0.75rem', marginBottom: '0.5rem',
                                }}>
                                    <h3 style={{
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.7rem', textTransform: 'uppercase',
                                        letterSpacing: '0.08em', margin: 0,
                                    }}>
                                        Derniers publiés
                                    </h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {published.map((p) => (
                                        <div key={p.id} style={{
                                            padding: '0.5rem 0.6rem', background: '#f5f5f5',
                                            border: '2px solid #ccc',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{
                                                    fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                                                    fontSize: '0.7rem', color: '#333',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {p.title}
                                                </div>
                                                <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '2px' }}>
                                                    {formatSchedule(p.publishedAt)}
                                                </div>
                                            </div>
                                            {p.reach?.insta?.impressions && (
                                                <div style={{
                                                    background: '#08D9D6', color: '#000', border: '2px solid #000',
                                                    padding: '1px 5px',
                                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                                    fontSize: '0.6rem',
                                                }}>
                                                    {(p.reach.insta.impressions / 1000).toFixed(1)}K
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Preview panel */}
                    {!active ? (
                        <div style={{
                            background: '#fff', border: '3px solid #000', boxShadow: '6px 6px 0 #000',
                            padding: '3rem', textAlign: 'center', color: '#666',
                        }}>
                            <div style={{
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '1.2rem', color: '#000', marginBottom: '0.5rem',
                            }}>
                                Rien à valider pour l'instant
                            </div>
                            <div style={{ fontSize: '0.85rem' }}>
                                Le bot déposera un post à valider dès le prochain cron.
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            background: '#fff', border: '3px solid #000', boxShadow: '6px 6px 0 #000',
                            padding: '1.2rem', display: 'grid',
                            gridTemplateColumns: '260px 1fr', gap: '1.2rem',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{
                                    width: '260px', height: '325px',
                                    border: '3px solid #000', boxShadow: '5px 5px 0 #000',
                                    background: '#000', position: 'relative', overflow: 'hidden',
                                }}>
                                    {cover && (
                                        <img src={cover} alt="" style={{
                                            position: 'absolute', inset: 0,
                                            width: '100%', height: '100%', objectFit: 'cover',
                                        }} />
                                    )}
                                    <div aria-hidden style={{
                                        position: 'absolute', inset: 0,
                                        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.95) 100%)',
                                    }} />
                                    <div style={{
                                        position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                                        color: '#fff',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '1.1rem', letterSpacing: '-0.6px', lineHeight: 1,
                                        textTransform: 'uppercase',
                                        textShadow: '2px 2px 0 rgba(0,0,0,0.9)',
                                    }}>
                                        {active.title}
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.4rem 0.6rem', border: '2px solid #000', background: '#fff',
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: '0.65rem',
                                    color: '#666', textTransform: 'uppercase',
                                }}>
                                    {active.slides.length} slide{active.slides.length > 1 ? 's' : ''} · {active.slides.filter((s) => s.format === 'feed').length} feed / {active.slides.filter((s) => s.format === 'story').length} story
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', minWidth: 0 }}>
                                <div>
                                    <TypeBadge type={active.type} />
                                    <h2 style={{
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '1.4rem', letterSpacing: '-0.8px',
                                        margin: '0.4rem 0 0.3rem', textTransform: 'uppercase',
                                    }}>
                                        {active.title}
                                    </h2>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        fontSize: '0.75rem', color: '#666', fontWeight: 600,
                                    }}>
                                        <Clock size={12} /> Programmé — {formatSchedule(active.scheduledAt)}
                                    </div>
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.7rem', letterSpacing: '0.1em',
                                        textTransform: 'uppercase', color: '#666', marginBottom: '0.3rem',
                                    }}>
                                        Caption — généré par Gemini
                                    </label>
                                    <textarea
                                        value={captionDraft}
                                        onChange={(e) => setCaptionDraft(e.target.value)}
                                        rows={6}
                                        style={{
                                            width: '100%',
                                            background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0 #000',
                                            padding: '0.7rem 0.85rem',
                                            fontSize: '0.8rem', lineHeight: 1.5, color: '#1a1a1a',
                                            fontFamily: '"Inter", sans-serif', resize: 'vertical',
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.7rem', letterSpacing: '0.1em',
                                        textTransform: 'uppercase', color: '#666', marginBottom: '0.3rem',
                                    }}>
                                        Hashtags
                                    </label>
                                    <input
                                        value={hashtagsDraft}
                                        onChange={(e) => setHashtagsDraft(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0 #000',
                                            padding: '0.6rem 0.85rem',
                                            fontSize: '0.78rem', lineHeight: 1.5, color: '#FF2E63', fontWeight: 700,
                                            fontFamily: '"Inter", sans-serif',
                                        }}
                                    />
                                </div>

                                <div>
                                    <div style={{
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.7rem', letterSpacing: '0.1em',
                                        textTransform: 'uppercase', color: '#666', marginBottom: '0.3rem',
                                    }}>
                                        Publication sur
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {([
                                            { key: 'insta' as const, label: 'Instagram', icon: <Camera size={13} />, auto: true },
                                            { key: 'tiktok' as const, label: 'TikTok', icon: <Music2 size={13} />, auto: true },
                                            { key: 'x' as const, label: 'X (manuel)', icon: <MessageSquare size={13} />, auto: false },
                                        ]).map((p) => {
                                            const enabled = platformsDraft[p.key];
                                            return (
                                                <button
                                                    key={p.key}
                                                    onClick={() => togglePlatform(p.key)}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                                        background: enabled ? (p.auto ? '#000' : '#666') : '#fff',
                                                        color: enabled ? '#fff' : '#999',
                                                        border: '2px solid #000', cursor: 'pointer',
                                                        padding: '0.35rem 0.6rem',
                                                        fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                                                        fontSize: '0.7rem',
                                                    }}
                                                >
                                                    {p.icon} {p.label}
                                                    {enabled && !p.auto && (
                                                        <span style={{
                                                            marginLeft: '0.2rem', fontSize: '0.55rem',
                                                            background: '#FF2E63', color: '#fff',
                                                            padding: '1px 4px', letterSpacing: '0.05em',
                                                        }}>
                                                            COPY
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                                    paddingTop: '0.4rem', borderTop: '2px dashed #ccc', alignItems: 'center',
                                }}>
                                    <button
                                        onClick={handleRegenerate}
                                        disabled={actionBusy === 'regen'}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                            background: '#fff', color: '#000', border: '2px solid #000',
                                            boxShadow: '3px 3px 0 #000',
                                            padding: '0.5rem 0.85rem',
                                            cursor: actionBusy === 'regen' ? 'wait' : 'pointer',
                                            opacity: actionBusy === 'regen' ? 0.6 : 1,
                                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                            fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                                        }}
                                    >
                                        <RefreshCw size={13} /> Régénérer
                                    </button>
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={!dirty || savingDraft}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                            background: dirty ? '#08D9D6' : '#fff',
                                            color: dirty ? '#000' : '#999',
                                            border: '2px solid #000',
                                            boxShadow: '3px 3px 0 #000',
                                            padding: '0.5rem 0.85rem',
                                            cursor: dirty && !savingDraft ? 'pointer' : 'not-allowed',
                                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                            fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                                        }}
                                    >
                                        <Save size={13} /> {dirty ? 'Sauver édits' : 'Aucun changement'}
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={actionBusy === 'reject'}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                            background: '#fff', color: '#000', border: '2px solid #000',
                                            boxShadow: '3px 3px 0 #000',
                                            padding: '0.5rem 0.85rem',
                                            cursor: actionBusy === 'reject' ? 'wait' : 'pointer',
                                            opacity: actionBusy === 'reject' ? 0.6 : 1,
                                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                            fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                                        }}
                                    >
                                        <Trash2 size={13} /> Rejeter
                                    </button>
                                    <button
                                        onClick={handlePublish}
                                        disabled={!config.enabled || actionBusy === 'publish' || dirty}
                                        title={dirty ? 'Sauve tes édits avant de publier' : ''}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                            background: config.enabled && !dirty ? '#FF2E63' : '#ccc',
                                            color: '#fff', border: '2px solid #000',
                                            boxShadow: '3px 3px 0 #000',
                                            padding: '0.5rem 1.1rem',
                                            cursor: config.enabled && !dirty && actionBusy !== 'publish' ? 'pointer' : 'not-allowed',
                                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                            fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                                            marginLeft: 'auto',
                                        }}
                                    >
                                        <Send size={13} /> {actionBusy === 'publish' ? 'Publication...' : 'Publier maintenant'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
