import {
    Calendar, TrendingUp, Sparkles, Camera, Music2, MessageSquare,
    RefreshCw, Edit3, Trash2, Send, Clock, CheckCircle2, Users,
} from 'lucide-react';

/* ==========================================================================
   MOCK DATA
   ========================================================================== */

type PostType = 'daily' | 'weekly' | 'favorite' | 'newseason';

interface PendingPost {
    id: string;
    type: PostType;
    title: string;
    scheduledAt: string;
    thumbGradient: string;
    thumbImg?: string;
    slidesCount: number;
    caption: string;
    hashtags: string;
    platforms: { insta: boolean; tiktok: boolean; x: boolean };
}

const TYPE_META: Record<PostType, { label: string; color: string; textColor: string; icon: React.ReactNode }> = {
    daily: { label: 'SORTIES DU JOUR', color: '#000', textColor: '#fff', icon: <Calendar size={11} /> },
    weekly: { label: 'RÉCAP HEBDO', color: '#FF2E63', textColor: '#fff', icon: <TrendingUp size={11} /> },
    favorite: { label: 'COUP DE CŒUR', color: '#08D9D6', textColor: '#000', icon: <Users size={11} /> },
    newseason: { label: 'NOUVELLE SAISON', color: '#FF0844', textColor: '#fff', icon: <Sparkles size={11} /> },
};

const PENDING: PendingPost[] = [
    {
        id: 'p1', type: 'daily',
        title: "Sorties du jour · 12 mars",
        scheduledAt: "Aujourd'hui à 20h00",
        thumbGradient: 'linear-gradient(135deg, #FF2E63 0%, #1a1a1a 100%)',
        thumbImg: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
        slidesCount: 6,
        caption: `4 épisodes sont sortis aujourd'hui — et pas des moindres. MHA S8 continue sa dernière saison, Frieren se rapproche du final, One Piece dépasse les 1100 épisodes et Dandadan monte en puissance.\n\nVous suivez lesquels cette saison ? Dites-nous en commentaires 👇\n\nToute la liste et vos progressions sur Bingeki.`,
        hashtags: '#anime #mha #frieren #onepiece #dandadan #bingeki #animefr',
        platforms: { insta: true, tiktok: true, x: false },
    },
    {
        id: 'p2', type: 'newseason',
        title: "Chainsaw Man S2 · Announcement",
        scheduledAt: 'Vendredi 15 mars à 12h00',
        thumbGradient: 'linear-gradient(135deg, #FF0844 0%, #1a1a1a 100%)',
        thumbImg: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
        slidesCount: 3,
        caption: `Chainsaw Man revient. Le S2 débarque vendredi et on trépigne autant que vous.\n\n12 épisodes prévus, MAPPA aux commandes, la barre est haute après une S1 à 8.7/10. On l'ajoute déjà à notre liste — et vous ?`,
        hashtags: '#chainsawman #mappa #anime2026 #newseason #bingeki',
        platforms: { insta: true, tiktok: true, x: false },
    },
    {
        id: 'p3', type: 'weekly',
        title: 'Récap semaine 11',
        scheduledAt: 'Dimanche 15 mars à 19h00',
        thumbGradient: 'linear-gradient(135deg, #08D9D6 0%, #252A34 100%)',
        thumbImg: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
        slidesCount: 5,
        caption: `Le TOP 3 de la semaine 11 selon vous.\n\n🥇 Frieren — 9.4/10\n🥈 Dandadan — 9.1/10\n🥉 Blue Lock — 8.9/10\n\nMerci aux 6 800+ watchers qui ont noté leurs épisodes cette semaine. Vous avez fait le classement.`,
        hashtags: '#animeweeklyrecap #frieren #dandadan #bluelock #bingeki',
        platforms: { insta: true, tiktok: false, x: false },
    },
];

const PUBLISHED = [
    { id: 'x1', type: 'daily' as PostType, title: 'Sorties du jour · 11 mars', publishedAt: 'Hier 20h', reach: '2.3K' },
    { id: 'x2', type: 'favorite' as PostType, title: 'Coup de cœur · Solo Leveling', publishedAt: 'Il y a 3 jours', reach: '4.1K' },
    { id: 'x3', type: 'weekly' as PostType, title: 'Récap semaine 10', publishedAt: 'Il y a 6 jours', reach: '3.7K' },
];

/* ==========================================================================
   SHARED PIECES
   ========================================================================== */

const TypeBadge: React.FC<{ type: PostType }> = ({ type }) => {
    const meta = TYPE_META[type];
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: meta.color, color: meta.textColor, border: '2px solid #000',
            padding: '0.15rem 0.45rem',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.55rem', letterSpacing: '0.1em',
        }}>
            {meta.icon} {meta.label}
        </div>
    );
};

const PostThumb: React.FC<{ post: PendingPost; selected?: boolean; onClick?: () => void }> = ({ post, selected }) => (
    <div style={{
        display: 'flex', gap: '0.6rem', padding: '0.6rem',
        background: selected ? '#000' : '#fff',
        color: selected ? '#fff' : '#000',
        border: '3px solid #000',
        boxShadow: selected ? 'inset 0 0 0 2px #FF2E63' : '3px 3px 0 #000',
        cursor: 'pointer', transition: 'all 0.15s',
    }}>
        <div style={{
            width: '48px', height: '60px', flexShrink: 0,
            background: post.thumbGradient, border: '2px solid #000',
            position: 'relative', overflow: 'hidden',
        }}>
            {post.thumbImg && (
                <img src={post.thumbImg} alt="" style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover',
                }} />
            )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <TypeBadge type={post.type} />
            <div style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                fontSize: '0.75rem', lineHeight: 1.1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {post.title}
            </div>
            <div style={{
                fontSize: '0.6rem', color: selected ? '#08D9D6' : '#666',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}>
                <Clock size={9} /> {post.scheduledAt}
            </div>
        </div>
    </div>
);

/* ==========================================================================
   ROOT LAYOUT
   ========================================================================== */

export default function AdminSocialMockup() {
    const active = PENDING[0]; // "Sorties du jour" pré-sélectionné pour la démo

    return (
        <div style={{
            width: '100%', minHeight: '620px', background: '#f5f5f5',
            border: '4px solid #000', boxShadow: '8px 8px 0 #000',
            color: '#000', fontFamily: '"Inter", sans-serif',
            display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Halftone bg */}
            <div aria-hidden style={{
                position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
                backgroundImage: 'radial-gradient(#000 2px, transparent 2.5px)',
                backgroundSize: '18px 18px',
            }} />

            {/* HEADER */}
            <div style={{
                background: '#000', color: '#fff', padding: '0.9rem 1.2rem',
                borderBottom: '3px solid #000',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'relative', zIndex: 1,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        background: '#FF2E63', color: '#fff', border: '2px solid #fff',
                        padding: '0.2rem 0.5rem',
                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '0.6rem', letterSpacing: '0.1em',
                    }}>
                        ADMIN · SOCIAL BOT
                    </div>
                    <span style={{
                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '1rem', letterSpacing: '-0.5px',
                    }}>
                        Bingeki
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{
                        background: '#FF2E63', color: '#fff', border: '2px solid #fff',
                        padding: '0.2rem 0.55rem',
                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '0.65rem', letterSpacing: '0.05em',
                    }}>
                        <Clock size={10} style={{ verticalAlign: '-1px' }} /> {PENDING.length} EN ATTENTE
                    </div>
                    <div style={{
                        background: '#08D9D6', color: '#000', border: '2px solid #fff',
                        padding: '0.2rem 0.55rem',
                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '0.65rem', letterSpacing: '0.05em',
                    }}>
                        <CheckCircle2 size={10} style={{ verticalAlign: '-1px' }} /> 12 PUBLIÉS · 7J
                    </div>
                </div>
            </div>

            {/* BODY : 2 columns */}
            <div style={{
                flex: 1, display: 'grid',
                gridTemplateColumns: '320px 1fr', gap: '0',
                position: 'relative', zIndex: 1,
            }}>
                {/* SIDEBAR */}
                <div style={{
                    background: '#fff', borderRight: '3px solid #000',
                    padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                    overflow: 'auto',
                }}>
                    {/* Section EN ATTENTE */}
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
                                {PENDING.length}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {PENDING.map((p) => (
                                <PostThumb key={p.id} post={p} selected={p.id === active.id} />
                            ))}
                        </div>
                    </div>

                    {/* Section PUBLIÉS */}
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: '0.5rem', borderTop: '2px dashed #ccc', paddingTop: '0.75rem',
                        }}>
                            <h3 style={{
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.75rem', textTransform: 'uppercase',
                                letterSpacing: '0.08em', margin: 0,
                            }}>
                                Publiés · 7 derniers jours
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {PUBLISHED.map((p) => (
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
                </div>

                {/* PREVIEW PANEL */}
                <div style={{
                    padding: '1.2rem', display: 'grid',
                    gridTemplateColumns: '260px 1fr', gap: '1.2rem',
                    overflow: 'auto',
                }}>
                    {/* Preview visuel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{
                            width: '260px', height: '325px',
                            border: '3px solid #000', boxShadow: '5px 5px 0 #000',
                            background: '#000', position: 'relative', overflow: 'hidden',
                        }}>
                            {active.thumbImg && (
                                <img src={active.thumbImg} alt="" style={{
                                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                                    objectFit: 'cover',
                                }} />
                            )}
                            <div aria-hidden style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.95) 100%)',
                            }} />
                            <div style={{
                                position: 'absolute', top: '10px', left: '10px',
                                background: '#FF2E63', color: '#fff', border: '2px solid #000',
                                boxShadow: '3px 3px 0 #000', padding: '0.25rem 0.5rem',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.7rem', letterSpacing: '0.1em',
                            }}>
                                NEW EP
                            </div>
                            <div style={{
                                position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                                color: '#fff',
                            }}>
                                <div style={{
                                    display: 'inline-block',
                                    background: '#fff', color: '#000', border: '2px solid #000',
                                    padding: '0.12rem 0.4rem',
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                    fontSize: '0.55rem', letterSpacing: '0.05em',
                                    marginBottom: '0.4rem',
                                }}>
                                    S8 · ÉPISODE 12
                                </div>
                                <div style={{
                                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                    fontSize: '1.4rem', letterSpacing: '-1px', lineHeight: 0.95,
                                    textTransform: 'uppercase',
                                    textShadow: '2px 2px 0 rgba(0,0,0,0.9)',
                                }}>
                                    MY HERO ACADEMIA
                                </div>
                            </div>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.4rem 0.5rem', border: '2px solid #000', background: '#fff',
                        }}>
                            <span style={{
                                fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                                fontSize: '0.65rem', color: '#666', textTransform: 'uppercase',
                            }}>
                                Slide 2 / {active.slidesCount}
                            </span>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                {Array.from({ length: active.slidesCount }).map((_, i) => (
                                    <div key={i} style={{
                                        width: '10px', height: '10px', border: '1.5px solid #000',
                                        background: i === 1 ? '#FF2E63' : 'transparent',
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Meta + caption + actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', minWidth: 0 }}>
                        {/* Header du post */}
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
                                <Clock size={12} /> Programmé — {active.scheduledAt}
                            </div>
                        </div>

                        {/* CAPTION */}
                        <div>
                            <div style={{
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.7rem', letterSpacing: '0.1em',
                                textTransform: 'uppercase', color: '#666', marginBottom: '0.3rem',
                            }}>
                                Caption — Généré par Gemini
                            </div>
                            <div style={{
                                background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0 #000',
                                padding: '0.7rem 0.85rem',
                                fontSize: '0.8rem', lineHeight: 1.5, color: '#1a1a1a',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {active.caption}
                            </div>
                        </div>

                        {/* HASHTAGS */}
                        <div>
                            <div style={{
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.7rem', letterSpacing: '0.1em',
                                textTransform: 'uppercase', color: '#666', marginBottom: '0.3rem',
                            }}>
                                Hashtags
                            </div>
                            <div style={{
                                background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0 #000',
                                padding: '0.6rem 0.85rem',
                                fontSize: '0.78rem', lineHeight: 1.5, color: '#FF2E63', fontWeight: 700,
                            }}>
                                {active.hashtags}
                            </div>
                        </div>

                        {/* PLATEFORMES */}
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
                                    { key: 'insta', label: 'Instagram', icon: <Camera size={13} />, enabled: active.platforms.insta, auto: true },
                                    { key: 'tiktok', label: 'TikTok', icon: <Music2 size={13} />, enabled: active.platforms.tiktok, auto: true },
                                    { key: 'x', label: 'X (manuel)', icon: <MessageSquare size={13} />, enabled: active.platforms.x, auto: false },
                                ] as const).map((p) => (
                                    <div key={p.key} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                        background: p.enabled ? (p.auto ? '#000' : '#666') : '#fff',
                                        color: p.enabled ? '#fff' : '#999',
                                        border: '2px solid #000',
                                        padding: '0.35rem 0.6rem',
                                        fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                                        fontSize: '0.7rem',
                                    }}>
                                        {p.icon} {p.label}
                                        {p.enabled && !p.auto && (
                                            <span style={{
                                                marginLeft: '0.2rem', fontSize: '0.55rem',
                                                background: '#FF2E63', color: '#fff',
                                                padding: '1px 4px', letterSpacing: '0.05em',
                                            }}>
                                                COPY
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div style={{
                            display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                            paddingTop: '0.4rem', borderTop: '2px dashed #ccc',
                        }}>
                            <button style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                background: '#fff', color: '#000', border: '2px solid #000',
                                boxShadow: '3px 3px 0 #000',
                                padding: '0.5rem 0.85rem', cursor: 'pointer',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>
                                <RefreshCw size={13} /> Régénérer
                            </button>
                            <button style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                background: '#fff', color: '#000', border: '2px solid #000',
                                boxShadow: '3px 3px 0 #000',
                                padding: '0.5rem 0.85rem', cursor: 'pointer',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>
                                <Edit3 size={13} /> Éditer
                            </button>
                            <button style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                background: '#fff', color: '#000', border: '2px solid #000',
                                boxShadow: '3px 3px 0 #000',
                                padding: '0.5rem 0.85rem', cursor: 'pointer',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>
                                <Trash2 size={13} /> Rejeter
                            </button>
                            <button style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                background: '#FF2E63', color: '#fff', border: '2px solid #000',
                                boxShadow: '3px 3px 0 #000',
                                padding: '0.5rem 1.1rem', cursor: 'pointer',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                                marginLeft: 'auto',
                            }}>
                                <Send size={13} /> Publier maintenant
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
