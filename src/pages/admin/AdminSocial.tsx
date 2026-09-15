/**
 * Admin Social Bot page — post validation & publishing UI
 *
 * Phase 1: local state (mock data) — Phase 2 will wire onSnapshot from
 * Firestore + callable Cloud Functions for the actions.
 */
import { useState } from 'react';
import {
    Calendar, TrendingUp, Sparkles, Camera, Music2, MessageSquare,
    RefreshCw, Edit3, Trash2, Send, Clock, CheckCircle2, Users, Power, PowerOff,
} from 'lucide-react';
import type { PostType, PendingPost, PostPlatforms } from '@/shared/socialBot';
import { POST_TYPE_LABELS, POST_TYPE_COLORS } from '@/shared/socialBot';

/* ==========================================================================
   MOCK DATA (Phase 1) — replace with Firestore onSnapshot in Phase 2
   ========================================================================== */

const MOCK_PENDING: PendingPost[] = [
    {
        id: 'p1',
        type: 'daily',
        createdAt: Date.now() - 3600_000,
        scheduledAt: Date.now() + 3600_000 * 6,
        status: 'ready',
        title: "Sorties du jour · 12 mars",
        caption: `4 épisodes sont sortis aujourd'hui — et pas des moindres. MHA S8 continue sa dernière saison, Frieren se rapproche du final, One Piece dépasse les 1100 épisodes et Dandadan monte en puissance.\n\nVous suivez lesquels cette saison ? Dites-nous en commentaires 👇\n\nToute la liste et vos progressions sur Bingeki.`,
        hashtags: '#anime #mha #frieren #onepiece #dandadan #bingeki #animefr',
        slides: [
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg', index: 1 },
        ],
        sourceData: { animeIds: [31964, 52991, 21, 57334] },
        platforms: { insta: true, tiktok: true, x: false },
    },
    {
        id: 'p2',
        type: 'newseason',
        createdAt: Date.now() - 7200_000,
        scheduledAt: Date.now() + 3600_000 * 72,
        status: 'ready',
        title: "Chainsaw Man S2 · Announcement",
        caption: `Chainsaw Man revient. Le S2 débarque vendredi et on trépigne autant que vous.\n\n12 épisodes prévus, MAPPA aux commandes, la barre est haute après une S1 à 8.7/10. On l'ajoute déjà à notre liste — et vous ?`,
        hashtags: '#chainsawman #mappa #anime2026 #newseason #bingeki',
        slides: [
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg', index: 1 },
        ],
        sourceData: { animeIds: [44511] },
        platforms: { insta: true, tiktok: true, x: false },
    },
    {
        id: 'p3',
        type: 'weekly',
        createdAt: Date.now() - 10800_000,
        scheduledAt: Date.now() + 3600_000 * 96,
        status: 'ready',
        title: 'Récap semaine 11',
        caption: `Le TOP 3 de la semaine 11 selon vous.\n\n🥇 Frieren — 9.4/10\n🥈 Dandadan — 9.1/10\n🥉 Blue Lock — 8.9/10\n\nMerci aux 6 800+ watchers qui ont noté leurs épisodes cette semaine. Vous avez fait le classement.`,
        hashtags: '#animeweeklyrecap #frieren #dandadan #bluelock #bingeki',
        slides: [
            { format: 'feed', url: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', index: 1 },
        ],
        sourceData: { weekNumber: 11 },
        platforms: { insta: true, tiktok: false, x: false },
    },
];

const MOCK_PUBLISHED = [
    { id: 'x1', type: 'daily' as PostType, title: 'Sorties du jour · 11 mars', publishedAt: 'Hier 20h', reach: '2.3K' },
    { id: 'x2', type: 'favorite' as PostType, title: 'Coup de cœur · Solo Leveling', publishedAt: 'Il y a 3 jours', reach: '4.1K' },
    { id: 'x3', type: 'weekly' as PostType, title: 'Récap semaine 10', publishedAt: 'Il y a 6 jours', reach: '3.7K' },
];

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
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return `Aujourd'hui ${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
    const days = Math.round((ts - now.getTime()) / 86_400_000);
    if (days < 7) return `Dans ${days}j · ${d.getHours()}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function AdminSocial() {
    const [pending] = useState<PendingPost[]>(MOCK_PENDING);
    const [activeId, setActiveId] = useState<string>(MOCK_PENDING[0].id);
    const [botEnabled, setBotEnabled] = useState<boolean>(true);

    const active = pending.find((p) => p.id === activeId) ?? pending[0];

    // Editable local state (would be pushed back to Firestore on save)
    const [captionDraft, setCaptionDraft] = useState<string>(active.caption);
    const [hashtagsDraft, setHashtagsDraft] = useState<string>(active.hashtags);
    const [platforms, setPlatforms] = useState<PostPlatforms>(active.platforms);

    // Reset drafts when switching post
    const handleSelect = (id: string) => {
        const p = pending.find((x) => x.id === id);
        if (!p) return;
        setActiveId(id);
        setCaptionDraft(p.caption);
        setHashtagsDraft(p.hashtags);
        setPlatforms(p.platforms);
    };

    const togglePlatform = (key: keyof PostPlatforms) => {
        setPlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Action handlers (stubbed — Phase 4 will call Cloud Functions)
    const handlePublish = () => {
        alert(`[Stub] Publier "${active.title}" sur : ${
            Object.entries(platforms).filter(([, v]) => v).map(([k]) => k).join(', ')
        }`);
    };
    const handleRegenerate = () => alert(`[Stub] Régénérer "${active.title}"`);
    const handleReject = () => alert(`[Stub] Rejeter "${active.title}"`);
    const handleEditToggle = () => alert('[Stub] Édition inline — Phase 2');

    const cover = active.slides[0]?.url;

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
                            <CheckCircle2 size={11} style={{ verticalAlign: '-2px' }} /> {MOCK_PUBLISHED.length} PUBLIÉS · 7J
                        </div>
                        <button
                            onClick={() => setBotEnabled((b) => !b)}
                            title={botEnabled ? 'Kill-switch — désactiver le bot' : 'Activer le bot'}
                            style={{
                                background: botEnabled ? '#08D9D6' : '#ef4444',
                                color: botEnabled ? '#000' : '#fff',
                                border: '2px solid #fff', cursor: 'pointer',
                                padding: '0.25rem 0.6rem',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.7rem', letterSpacing: '0.05em',
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            }}
                        >
                            {botEnabled ? <Power size={11} /> : <PowerOff size={11} />}
                            {botEnabled ? 'BOT ACTIF' : 'BOT DÉSACTIVÉ'}
                        </button>
                    </div>
                </div>

                {!botEnabled && (
                    <div style={{
                        background: '#fff3cd', border: '3px solid #f59e0b', boxShadow: '4px 4px 0 #000',
                        padding: '0.7rem 1rem', marginBottom: '1rem',
                        fontFamily: '"Outfit", sans-serif', fontWeight: 800, fontSize: '0.8rem',
                    }}>
                        Le kill-switch est actif — les crons ne génèrent plus de posts, aucune publication automatique ne se déclenche.
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {pending.map((p) => {
                                    const selected = p.id === activeId;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelect(p.id)}
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
                                                {p.slides[0]?.url && (
                                                    <img src={p.slides[0].url} alt="" style={{
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

                        <div>
                            <div style={{
                                borderTop: '2px dashed #ccc', paddingTop: '0.75rem', marginBottom: '0.5rem',
                            }}>
                                <h3 style={{
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                    fontSize: '0.7rem', textTransform: 'uppercase',
                                    letterSpacing: '0.08em', margin: 0,
                                }}>
                                    Publiés · 7 derniers jours
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {MOCK_PUBLISHED.map((p) => (
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
                                                {p.publishedAt}
                                            </div>
                                        </div>
                                        <div style={{
                                            background: '#08D9D6', color: '#000', border: '2px solid #000',
                                            padding: '1px 5px',
                                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                            fontSize: '0.6rem',
                                        }}>
                                            {p.reach}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Preview panel */}
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
                                Preview · slide 1 / {active.slides.length}
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
                                        const enabled = platforms[p.key];
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
                                paddingTop: '0.4rem', borderTop: '2px dashed #ccc',
                            }}>
                                <button
                                    onClick={handleRegenerate}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                        background: '#fff', color: '#000', border: '2px solid #000',
                                        boxShadow: '3px 3px 0 #000',
                                        padding: '0.5rem 0.85rem', cursor: 'pointer',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                                    }}
                                >
                                    <RefreshCw size={13} /> Régénérer
                                </button>
                                <button
                                    onClick={handleEditToggle}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                        background: '#fff', color: '#000', border: '2px solid #000',
                                        boxShadow: '3px 3px 0 #000',
                                        padding: '0.5rem 0.85rem', cursor: 'pointer',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                                    }}
                                >
                                    <Edit3 size={13} /> Sauver édits
                                </button>
                                <button
                                    onClick={handleReject}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                        background: '#fff', color: '#000', border: '2px solid #000',
                                        boxShadow: '3px 3px 0 #000',
                                        padding: '0.5rem 0.85rem', cursor: 'pointer',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                                    }}
                                >
                                    <Trash2 size={13} /> Rejeter
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={!botEnabled}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                        background: botEnabled ? '#FF2E63' : '#ccc',
                                        color: '#fff', border: '2px solid #000',
                                        boxShadow: '3px 3px 0 #000',
                                        padding: '0.5rem 1.1rem',
                                        cursor: botEnabled ? 'pointer' : 'not-allowed',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                        fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                                        marginLeft: 'auto',
                                    }}
                                >
                                    <Send size={13} /> Publier maintenant
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
