import { Calendar, TrendingUp, Heart, Sparkles } from 'lucide-react';

type Format = 'feed' | 'story';

const DIM: Record<Format, { w: number; h: number }> = {
    feed: { w: 260, h: 325 },   // 4:5 (Insta Feed)
    story: { w: 200, h: 356 },  // 9:16 (Story / Reels / TikTok)
};

type AnimeKey = 'mha' | 'frieren' | 'onepiece' | 'dandadan' | 'bluelock' | 'solo2' | 'chainsaw' | 'jjk';

const COVERS: Record<AnimeKey, string> = {
    mha: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
    frieren: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
    onepiece: 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg',
    dandadan: 'https://cdn.myanimelist.net/images/anime/1584/143719l.jpg',
    bluelock: 'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg',
    solo2: 'https://cdn.myanimelist.net/images/anime/1448/147351l.jpg',
    chainsaw: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
    jjk: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
};

/* ==========================================================================
   SHARED
   ========================================================================== */

const SlideFrame: React.FC<{
    children: React.ReactNode;
    background?: string;
    format: Format;
    index?: number;
    total?: number;
}> = ({ children, background = '#f5f5f5', format, index, total }) => (
    <div style={{
        width: DIM[format].w, height: DIM[format].h, background,
        border: '4px solid #000', boxShadow: '6px 6px 0 #000',
        position: 'relative', overflow: 'hidden', color: '#000',
        fontFamily: '"Inter", sans-serif', flexShrink: 0,
    }}>
        {children}
        {index !== undefined && total !== undefined && (
            <div style={{
                position: 'absolute', top: '10px', right: '10px', zIndex: 10,
                background: '#fff', color: '#000', border: '2px solid #000',
                padding: '2px 6px',
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: '0.55rem', letterSpacing: '0.05em',
            }}>
                {index}/{total}
            </div>
        )}
    </div>
);

const HalftonePattern: React.FC<{ opacity?: number; color?: string }> = ({ opacity = 0.1, color = '#000' }) => (
    <div aria-hidden style={{
        position: 'absolute', inset: 0, opacity, pointerEvents: 'none',
        backgroundImage: `radial-gradient(${color} 2px, transparent 2.5px)`,
        backgroundSize: '18px 18px',
    }} />
);

/* ==========================================================================
   INTRO SLIDE
   ========================================================================== */

const IntroSlide: React.FC<{
    format: Format;
    badge: React.ReactNode;
    badgeColor?: string;
    badgeTextColor?: string;
    titleMain: React.ReactNode;
    subtitle: string;
    index?: number;
    total?: number;
}> = ({ format, badge, badgeColor = '#000', badgeTextColor = '#fff', titleMain, subtitle, index, total }) => (
    <SlideFrame format={format} index={index} total={total}>
        <HalftonePattern />

        <div style={{
            position: 'absolute', top: '14px', left: '14px', zIndex: 2,
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: badgeColor, color: badgeTextColor, border: '2px solid #000',
            padding: '0.2rem 0.45rem',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.55rem', letterSpacing: '0.1em',
        }}>
            {badge}
        </div>

        <div style={{
            position: 'absolute', top: '50%', left: '14px', right: '14px',
            transform: 'translateY(-50%)', textAlign: 'center', zIndex: 2,
        }}>
            <div style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: format === 'story' ? '1.6rem' : '1.75rem',
                letterSpacing: '-1.3px', lineHeight: 0.9,
                textTransform: 'uppercase',
            }}>
                {titleMain}
            </div>
            <div style={{
                marginTop: '0.6rem', fontFamily: '"Inter", sans-serif',
                fontSize: '0.7rem', color: '#666', fontWeight: 600,
            }}>
                {subtitle}
            </div>
        </div>

        <div style={{
            position: 'absolute', bottom: '14px', left: '14px', right: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2,
        }}>
            <span style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: '0.8rem', letterSpacing: '-0.5px',
            }}>
                Bingeki
            </span>
            <span style={{
                fontSize: '0.55rem', color: '#666', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
                Swipe →
            </span>
        </div>
    </SlideFrame>
);

/* ==========================================================================
   ANIME BANNER SLIDE (image en fond + titre bas)
   ========================================================================== */

const AnimeSlide: React.FC<{
    format: Format;
    title: string;
    line1?: string;
    line2?: string;
    cover?: string;
    fallbackGradient: string;
    accentBadge?: { text: string; color: string };
    ribbonLabel?: string;
    ribbonColor?: string;
    index?: number;
    total?: number;
}> = ({
    format, title, line1, line2, cover, fallbackGradient,
    accentBadge, ribbonLabel, ribbonColor = '#FF2E63',
    index, total,
}) => (
    <SlideFrame format={format} background="#000" index={index} total={total}>
        <div aria-hidden style={{
            position: 'absolute', inset: 0, background: fallbackGradient, zIndex: 0,
        }} />
        {cover && (
            <img
                src={cover} alt=""
                style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block', zIndex: 1,
                }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
        )}
        <div aria-hidden style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.95) 100%)',
        }} />

        {ribbonLabel && (
            <div style={{
                position: 'absolute', top: '14px', left: '14px', zIndex: 3,
                background: ribbonColor, color: ribbonColor === '#08D9D6' ? '#000' : '#fff',
                border: '2px solid #000', boxShadow: '3px 3px 0 #000',
                padding: '0.25rem 0.5rem',
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: '0.7rem', letterSpacing: '0.1em',
            }}>
                {ribbonLabel}
            </div>
        )}

        <div style={{
            position: 'absolute', top: '42px', right: '10px', zIndex: 3,
            background: '#fff', color: '#000', border: '2px solid #000',
            padding: '2px 6px',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.55rem', letterSpacing: '-0.3px',
        }}>
            Bingeki
        </div>

        <div style={{
            position: 'absolute', bottom: '14px', left: '14px', right: '14px', zIndex: 3,
            color: '#fff',
        }}>
            {(line1 || accentBadge) && (
                <div style={{
                    display: 'flex', gap: '0.35rem', marginBottom: '0.4rem',
                    flexWrap: 'wrap',
                }}>
                    {line1 && (
                        <span style={{
                            background: '#fff', color: '#000', border: '2px solid #000',
                            padding: '0.12rem 0.4rem',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.55rem', letterSpacing: '0.05em',
                        }}>
                            {line1}
                        </span>
                    )}
                    {accentBadge && (
                        <span style={{
                            background: accentBadge.color, color: accentBadge.color === '#08D9D6' ? '#000' : '#fff',
                            border: '2px solid #000',
                            padding: '0.12rem 0.4rem',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.55rem', letterSpacing: '0.05em',
                        }}>
                            {accentBadge.text}
                        </span>
                    )}
                </div>
            )}

            <h1 style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: format === 'story' ? '1.35rem' : '1.5rem',
                letterSpacing: '-1.1px', lineHeight: 0.95,
                textTransform: 'uppercase', margin: 0,
                textShadow: '2px 2px 0 rgba(0,0,0,0.9)',
            }}>
                {title}
            </h1>

            {line2 && (
                <div style={{
                    marginTop: '0.3rem', fontFamily: '"Outfit", sans-serif',
                    fontWeight: 800, fontSize: '0.65rem',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: '#08D9D6',
                }}>
                    {line2}
                </div>
            )}
        </div>
    </SlideFrame>
);

/* ==========================================================================
   ANNOUNCEMENT SLIDE (Type 4 · Nouvelle saison — hero événementiel)
   ========================================================================== */

const AnnouncementSlide: React.FC<{
    format: Format;
    title: string;
    seasonLabel: string;
    dateLabel: string;
    cover?: string;
    fallbackGradient: string;
    index?: number;
    total?: number;
}> = ({ format, title, seasonLabel, dateLabel, cover, fallbackGradient, index, total }) => (
    <SlideFrame format={format} background="#000" index={index} total={total}>
        <div aria-hidden style={{
            position: 'absolute', inset: 0, background: fallbackGradient, zIndex: 0,
        }} />
        {cover && (
            <img
                src={cover} alt=""
                style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block', zIndex: 1,
                }}
            />
        )}
        {/* Dramatic overlay top+bottom */}
        <div aria-hidden style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.95) 100%)',
        }} />

        {/* Diagonal accent stripe rose top */}
        <div aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: '#FF2E63', zIndex: 4,
        }} />

        {/* "C'EST PARTI" ribbon en diagonale top-right */}
        <div style={{
            position: 'absolute', top: '30px', right: '-30px', zIndex: 4,
            background: '#FF2E63', color: '#fff', border: '2px solid #000',
            padding: '0.35rem 3rem',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.65rem', letterSpacing: '0.15em',
            transform: 'rotate(35deg)', boxShadow: '2px 2px 0 #000',
        }}>
            C'EST PARTI
        </div>

        {/* Top badge event */}
        <div style={{
            position: 'absolute', top: '14px', left: '14px', zIndex: 4,
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: '#000', color: '#fff', border: '2px solid #fff',
            padding: '0.25rem 0.5rem',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.6rem', letterSpacing: '0.15em',
        }}>
            <Sparkles size={11} /> EVENT
        </div>

        {/* Bottom title */}
        <div style={{
            position: 'absolute', bottom: '14px', left: '14px', right: '14px', zIndex: 4,
            color: '#fff',
        }}>
            <div style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: '0.65rem', letterSpacing: '0.15em',
                color: '#08D9D6', marginBottom: '0.35rem',
            }}>
                NOUVELLE SAISON
            </div>
            <h1 style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: format === 'story' ? '1.75rem' : '2rem',
                letterSpacing: '-1.5px', lineHeight: 0.9,
                textTransform: 'uppercase', margin: 0,
                textShadow: '3px 3px 0 rgba(0,0,0,0.95)',
            }}>
                {title}
            </h1>
            <div style={{
                marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap',
            }}>
                <span style={{
                    background: '#FF2E63', color: '#fff', border: '2px solid #000',
                    padding: '0.15rem 0.45rem',
                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                    fontSize: '0.6rem', letterSpacing: '0.05em',
                }}>
                    {seasonLabel}
                </span>
                <span style={{
                    background: '#fff', color: '#000', border: '2px solid #000',
                    padding: '0.15rem 0.45rem',
                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                    fontSize: '0.6rem', letterSpacing: '0.05em',
                }}>
                    {dateLabel}
                </span>
            </div>
        </div>

        {/* Logo Bingeki bottom-right small */}
        <div style={{
            position: 'absolute', bottom: '14px', right: '14px', zIndex: 4,
            background: '#08D9D6', color: '#000', border: '2px solid #000',
            padding: '2px 5px',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.55rem', letterSpacing: '-0.3px',
            display: 'none',
        }}>
            Bingeki
        </div>
    </SlideFrame>
);

/* ==========================================================================
   INFO SLIDE (Type 4 · slide 2 : détails de la saison)
   ========================================================================== */

const InfoSlide: React.FC<{
    format: Format;
    title: string;
    items: Array<{ label: string; value: string }>;
    accentColor?: string;
    index?: number;
    total?: number;
}> = ({ format, title, items, accentColor = '#FF2E63', index, total }) => (
    <SlideFrame format={format} index={index} total={total}>
        <HalftonePattern />

        <div style={{
            position: 'absolute', top: '14px', left: '14px', right: '14px', zIndex: 2,
        }}>
            <div style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                fontSize: '0.55rem', letterSpacing: '0.15em',
                textTransform: 'uppercase', color: '#666',
            }}>
                Fiche saison
            </div>
            <h2 style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: format === 'story' ? '1.3rem' : '1.4rem',
                letterSpacing: '-1px', lineHeight: 0.95,
                textTransform: 'uppercase', margin: '0.2rem 0 0',
            }}>
                {title}
            </h2>
        </div>

        <div style={{
            position: 'absolute', top: format === 'story' ? '90px' : '85px',
            left: '14px', right: '14px', bottom: '50px', zIndex: 2,
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
            justifyContent: 'center',
        }}>
            {items.map((item, i) => (
                <div key={i} style={{
                    background: '#fff', padding: '0.5rem 0.7rem',
                    border: '3px solid #000', boxShadow: '3px 3px 0 #000',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{
                        fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                        fontSize: '0.6rem', textTransform: 'uppercase',
                        color: '#666', letterSpacing: '0.05em',
                    }}>
                        {item.label}
                    </span>
                    <span style={{
                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '0.85rem', color: accentColor,
                        letterSpacing: '-0.3px',
                    }}>
                        {item.value}
                    </span>
                </div>
            ))}
        </div>

        <div style={{
            position: 'absolute', bottom: '14px', left: '14px', right: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2,
        }}>
            <span style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: '0.8rem', letterSpacing: '-0.5px',
            }}>
                Bingeki
            </span>
            <span style={{
                fontSize: '0.55rem', color: '#666', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
                Swipe →
            </span>
        </div>
    </SlideFrame>
);

/* ==========================================================================
   OUTRO SLIDE
   ========================================================================== */

const OutroSlide: React.FC<{
    format: Format;
    ctaMain: React.ReactNode;
    ctaSub: string;
    accentColor?: string;
    index?: number;
    total?: number;
}> = ({ format, ctaMain, ctaSub, accentColor = '#FF2E63', index, total }) => (
    <SlideFrame format={format} background="#000" index={index} total={total}>
        <div aria-hidden style={{
            position: 'absolute', inset: 0, opacity: 0.15,
            background: `repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg 10deg, ${accentColor} 10deg 12deg)`,
        }} />

        <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem 1rem', textAlign: 'center', color: '#fff', zIndex: 2,
        }}>
            <div style={{
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: format === 'story' ? '1.7rem' : '1.9rem',
                letterSpacing: '-1.2px', lineHeight: 0.95,
                textTransform: 'uppercase',
                textShadow: `2px 2px 0 ${accentColor}`,
            }}>
                {ctaMain}
            </div>
            <div style={{
                marginTop: '1rem',
                background: accentColor, color: accentColor === '#08D9D6' ? '#000' : '#fff',
                border: '3px solid #fff', boxShadow: '4px 4px 0 #fff',
                padding: '0.55rem 0.9rem',
                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
                {ctaSub}
            </div>
            <div style={{
                marginTop: '1.2rem', fontFamily: '"Outfit", sans-serif',
                fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.5px',
                color: '#fff',
            }}>
                bingeki.app
            </div>
        </div>
    </SlideFrame>
);

/* ==========================================================================
   DATA
   ========================================================================== */

const DAILY: Array<{
    key: AnimeKey; title: string; line1: string; line2: string; gradient: string;
}> = [
    { key: 'mha', title: "My Hero Academia", line1: "S8 · ÉPISODE 12", line2: "Jeudi 12 mars",
        gradient: "linear-gradient(180deg, #1a1a1a 0%, #FF2E63 100%)" },
    { key: 'frieren', title: "Frieren", line1: "S1 · ÉPISODE 24", line2: "Jeudi 12 mars",
        gradient: "linear-gradient(180deg, #08D9D6 0%, #252A34 100%)" },
    { key: 'onepiece', title: "One Piece", line1: "ÉPISODE 1108", line2: "Jeudi 12 mars",
        gradient: "linear-gradient(180deg, #FF2E63 0%, #FF0844 100%)" },
    { key: 'dandadan', title: "Dandadan", line1: "S1 · ÉPISODE 9", line2: "Jeudi 12 mars",
        gradient: "linear-gradient(180deg, #252A34 0%, #08D9D6 100%)" },
];

const WEEKLY_TOP: Array<{
    key: AnimeKey; title: string; line1: string; rank: number; gradient: string;
}> = [
    { key: 'frieren', title: "Frieren", line1: "9.4 ★ · 2 847 WATCHERS", rank: 1,
        gradient: "linear-gradient(180deg, #08D9D6 0%, #252A34 100%)" },
    { key: 'dandadan', title: "Dandadan", line1: "9.1 ★ · 2 103 WATCHERS", rank: 2,
        gradient: "linear-gradient(180deg, #252A34 0%, #FF2E63 100%)" },
    { key: 'bluelock', title: "Blue Lock", line1: "8.9 ★ · 1 876 WATCHERS", rank: 3,
        gradient: "linear-gradient(180deg, #FF2E63 0%, #08D9D6 100%)" },
];

const FAVORITES: Array<{
    key: AnimeKey; title: string; line1: string; line2: string; watchers: string; gradient: string;
}> = [
    {
        key: 'solo2', title: 'Solo Leveling',
        line1: 'SAISON 2 · 12 ÉPISODES', line2: '9.6 ★ · #1 CETTE SEMAINE',
        watchers: '3.2K WATCHERS',
        gradient: 'linear-gradient(180deg, #1a1a1a 0%, #FF2E63 100%)',
    },
    {
        key: 'frieren', title: 'Frieren',
        line1: 'SAISON 1 · 28 ÉPISODES', line2: '9.6 ★ · #1 EX ÆQUO',
        watchers: '2.8K WATCHERS',
        gradient: 'linear-gradient(180deg, #08D9D6 0%, #252A34 100%)',
    },
];

const NEW_SEASON = {
    key: 'chainsaw' as AnimeKey,
    title: 'Chainsaw Man',
    seasonLabel: 'SAISON 2',
    dateLabel: 'VENDREDI 15 MARS',
    gradient: 'linear-gradient(180deg, #1a1a1a 0%, #FF0844 100%)',
    info: [
        { label: 'Studio', value: 'MAPPA' },
        { label: 'Épisodes prévus', value: '12' },
        { label: 'Note S1', value: '8.7 ★' },
        { label: 'Genre', value: 'ACTION · HORROR' },
    ],
};

/* ==========================================================================
   CAROUSELS
   ========================================================================== */

const CarouselRow: React.FC<{
    label: string;
    labelBg: string;
    labelColor?: string;
    children: React.ReactNode;
}> = ({ label, labelBg, labelColor = '#fff', children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div style={{
            display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
            background: labelBg, color: labelColor, border: '2px solid #000',
            padding: '0.25rem 0.6rem',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
            {label}
        </div>
        <div style={{
            display: 'flex', gap: '1rem', overflowX: 'auto',
            padding: '0.5rem 0 1rem',
        }}>
            {children}
        </div>
    </div>
);

export const DailyReleasesCarousel: React.FC<{ format: Format }> = ({ format }) => {
    const total = DAILY.length + 2;
    return (
        <CarouselRow label={`1 · Sorties du jour (${format})`} labelBg="#000">
            <IntroSlide
                format={format} index={1} total={total}
                badge={<><Calendar size={10} /> SORTIES DU JOUR</>}
                titleMain={
                    <>
                        Aujourd'hui,{' '}
                        <span style={{
                            color: '#FF2E63', textShadow: '2px 2px 0 #000',
                            display: 'inline-block', transform: 'rotate(-2deg)',
                        }}>
                            {DAILY.length} épisodes
                        </span>
                    </>
                }
                subtitle="Jeudi 12 mars · Swipe pour voir la liste"
            />
            {DAILY.map((a, i) => (
                <AnimeSlide
                    key={i} format={format}
                    index={i + 2} total={total}
                    title={a.title} line1={a.line1} line2={a.line2}
                    cover={COVERS[a.key]} fallbackGradient={a.gradient}
                    ribbonLabel="NEW EP" ribbonColor="#FF2E63"
                />
            ))}
            <OutroSlide
                format={format} index={total} total={total}
                ctaMain={<>Suis ta<br />liste</>}
                ctaSub="Ouvrir Bingeki →"
                accentColor="#FF2E63"
            />
        </CarouselRow>
    );
};

export const WeeklyRecapCarousel: React.FC<{ format: Format }> = ({ format }) => {
    const total = WEEKLY_TOP.length + 2;
    return (
        <CarouselRow label={`2 · Récap hebdo (${format})`} labelBg="#FF2E63">
            <IntroSlide
                format={format} index={1} total={total}
                badge={<><TrendingUp size={10} /> RÉCAP HEBDO</>}
                badgeColor="#FF2E63"
                titleMain={
                    <>
                        Le{' '}
                        <span style={{
                            color: '#FF2E63', textShadow: '2px 2px 0 #000',
                            display: 'inline-block', transform: 'rotate(-2deg)',
                        }}>
                            TOP 3
                        </span>
                        <br />de la semaine
                    </>
                }
                subtitle="Semaine 11 · Mars 2026"
            />
            {WEEKLY_TOP.map((w, i) => (
                <AnimeSlide
                    key={i} format={format}
                    index={i + 2} total={total}
                    title={w.title} line1={w.line1}
                    cover={COVERS[w.key]} fallbackGradient={w.gradient}
                    ribbonLabel={`#${w.rank}`}
                    ribbonColor={w.rank === 1 ? '#FF2E63' : w.rank === 2 ? '#000' : '#08D9D6'}
                />
            ))}
            <OutroSlide
                format={format} index={total} total={total}
                ctaMain={<>Note tes<br />anime</>}
                ctaSub="Rejoins Bingeki →"
                accentColor="#FF2E63"
            />
        </CarouselRow>
    );
};

export const CommunityFavoriteCarousel: React.FC<{ format: Format }> = ({ format }) => {
    const isTie = FAVORITES.length > 1;
    const total = FAVORITES.length + 2;

    return (
        <CarouselRow label={`3 · Coup de cœur (${format})`} labelBg="#08D9D6" labelColor="#000">
            <IntroSlide
                format={format} index={1} total={total}
                badge={<><Heart size={10} fill="#FF2E63" color="#FF2E63" /> {isTie ? 'COUPS DE CŒUR' : 'COUP DE CŒUR'}</>}
                badgeColor="#08D9D6" badgeTextColor="#000"
                titleMain={
                    isTie ? (
                        <>
                            {FAVORITES.length}{' '}
                            <span style={{
                                color: '#FF2E63', textShadow: '2px 2px 0 #000',
                                display: 'inline-block', transform: 'rotate(-2deg)',
                            }}>ex æquo</span>
                            <br />cette semaine
                        </>
                    ) : (
                        <>La commu{' '}
                            <span style={{
                                color: '#FF2E63', textShadow: '2px 2px 0 #000',
                                display: 'inline-block', transform: 'rotate(-2deg)',
                            }}>a adoré</span>
                        </>
                    )
                }
                subtitle={isTie
                    ? `Semaine 11 · ${FAVORITES.length} animes à la même note`
                    : 'Semaine 11 · Choix des watchers Bingeki'}
            />
            {FAVORITES.map((fav, i) => (
                <AnimeSlide
                    key={fav.key} format={format}
                    index={i + 2} total={total}
                    title={fav.title} line1={fav.line1} line2={fav.line2}
                    cover={COVERS[fav.key]} fallbackGradient={fav.gradient}
                    ribbonLabel={isTie ? `EX ÆQUO · ${i + 1}/${FAVORITES.length}` : '9.6 ★'}
                    ribbonColor="#08D9D6"
                    accentBadge={{ text: fav.watchers, color: '#FF2E63' }}
                />
            ))}
            <OutroSlide
                format={format} index={total} total={total}
                ctaMain={isTie ? <>Découvre-les<br />sur Bingeki</> : <>Découvre-le<br />sur Bingeki</>}
                ctaSub="Ajouter à ma liste →"
                accentColor="#08D9D6"
            />
        </CarouselRow>
    );
};

export const NewSeasonCarousel: React.FC<{ format: Format }> = ({ format }) => {
    const total = 3;
    return (
        <CarouselRow label={`4 · Nouvelle saison (${format})`} labelBg="#FF0844">
            <AnnouncementSlide
                format={format} index={1} total={total}
                title={NEW_SEASON.title}
                seasonLabel={NEW_SEASON.seasonLabel}
                dateLabel={NEW_SEASON.dateLabel}
                cover={COVERS[NEW_SEASON.key]}
                fallbackGradient={NEW_SEASON.gradient}
            />
            <InfoSlide
                format={format} index={2} total={total}
                title={`${NEW_SEASON.title} S2`}
                items={NEW_SEASON.info}
                accentColor="#FF2E63"
            />
            <OutroSlide
                format={format} index={3} total={total}
                ctaMain={<>Ne rate<br />pas le S2</>}
                ctaSub="Ajouter à ma liste →"
                accentColor="#FF2E63"
            />
        </CarouselRow>
    );
};

/* ==========================================================================
   ROOT
   ========================================================================== */

const FormatSection: React.FC<{ format: Format }> = ({ format }) => (
    <div style={{
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        padding: '1.5rem', background: '#fff',
        border: '3px solid #000', boxShadow: '6px 6px 0 #000',
    }}>
        <div style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            background: format === 'feed' ? '#000' : '#FF2E63',
            color: '#fff', border: '2px solid #000',
            padding: '0.4rem 0.8rem',
            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
            fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
            {format === 'feed' ? 'Format 4:5 · Instagram Feed' : 'Format 9:16 · Story / Reels / TikTok'}
        </div>
        <DailyReleasesCarousel format={format} />
        <WeeklyRecapCarousel format={format} />
        <CommunityFavoriteCarousel format={format} />
        <NewSeasonCarousel format={format} />
    </div>
);

export default function SocialPostMockup() {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '2rem',
            padding: '2rem', background: '#f5f5f5',
        }}>
            <FormatSection format="feed" />
            <FormatSection format="story" />
        </div>
    );
}
