import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { XPBar } from '@/components/gamification/XPBar';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { HunterLicenseCard } from '@/components/profile/HunterLicenseCard';
import { Target, TrendingUp, BookOpen, Users, Flame, ChevronRight, Play, Plus, Star, Award, Library, Image as ImageIcon, Home, Compass, Book, Search, Menu, SlidersHorizontal, ArrowLeft, LayoutGrid, List, Calendar, Clock, Trophy, Activity, Swords, Mail, Lock } from 'lucide-react';
import styles from '../../pages/Dashboard.module.css';

// --- PLACEHOLDER UTILS ---
const PlaceholderImage = ({ height = '100%', text = 'IMAGE' }) => (
    <div style={{
        width: '100%',
        height: height,
        background: 'var(--color-surface-hover)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed var(--color-border)',
        color: 'var(--color-text-dim)'
    }}>
        <ImageIcon size={24} style={{ opacity: 0.5 }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '0.5rem', opacity: 0.5 }}>{text}</span>
    </div>
);

// --- GENERIC MOCK DATA ---
const MOCK_USER = {
    uid: '000000',
    displayName: 'Nom Utilisateur',
    photoURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Force placeholder

    banner: undefined,

    bio: 'Biographie de l\'utilisateur...',
    themeColor: '#FF2E63',
    borderColor: '#000000',
    cardBgColor: '#ffffff'
};

const MOCK_STATS = {
    level: 10,
    xp: 50,
    xpToNextLevel: 100,
    streak: 5,
    totalChaptersRead: 120,
    totalAnimeEpisodesWatched: 45,
    totalMoviesWatched: 5,
    badgeCount: 3,
    totalWorksAdded: 20,
    totalWorksCompleted: 2
};

const MOCK_BADGES = [
    { id: '1', name: 'Badge 1', icon: 'flag', rarity: 'legendary', description: 'Description du badge' },
    { id: '2', name: 'Badge 2', icon: 'book', rarity: 'epic', description: 'Description du badge' },
    { id: '3', name: 'Badge 3', icon: 'play', rarity: 'rare', description: 'Description du badge' },
];

const MOCK_CONTINUE_READING = {
    id: 1,
    title: 'Titre du Manga',
    type: 'Manga',
    currentChapter: 42,
    totalChapters: 100
};

const MOCK_IN_PROGRESS = [
    { id: 2, title: 'Titre Oeuvre 1', currentChapter: 12 },
    { id: 3, title: 'Titre Oeuvre 2', currentChapter: 8 },
    { id: 4, title: 'Titre Oeuvre 3', currentChapter: 24 },
    { id: 5, title: 'Titre Oeuvre 4', currentChapter: 156 },
];

const MOCK_ACTIVITY = [
    { userName: 'Ami 1', type: 'read_chapter', workTitle: 'Titre Manga', timestamp: Date.now() },
    { userName: 'Ami 2', type: 'watched_episode', workTitle: 'Titre Anime', timestamp: Date.now() },
    { userName: 'Ami 3', type: 'completed_work', workTitle: 'Titre Oeuvre', timestamp: Date.now() },
];

const MOCK_RECOMMENDATIONS = [
    { mal_id: 1, title: 'Recommandation 1', score: 9.5 },
    { mal_id: 2, title: 'Recommandation 2', score: 8.7 },
    { mal_id: 3, title: 'Recommandation 3', score: 9.0 },
];

// --- MOCKUP WRAPPER WITH BACKGROUND ---
const MockupContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position: 'relative', minHeight: '100%', overflow: 'hidden', isolation: 'isolate' }}>
        {/* Background Layers */}
        <div style={{
            position: 'absolute', inset: 0, zIndex: -1,
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)'
        }} />
        <div className="manga-halftone" style={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.1, backgroundImage: 'radial-gradient(var(--color-dots) 2px, transparent 2.5px)', backgroundSize: '20px 20px' }} />
        <div className="manga-speedlines" style={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.05, background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, var(--color-dots) 10deg 12deg)' }} />

        {/* Content */}
        <div style={{ padding: '2rem 1rem', paddingBottom: '4rem' }}> {/* Added padding to simulate container */}
            {children}
        </div>
    </div>
);


// --- MOCKUP DASHBOARD ---
export function MockupDashboard() {
    return (
        <MockupContentWrapper>
            {/* Hero Section */}
            <div className={`manga-panel ${styles.heroPanel}`}>
                <div className={styles.avatarContainer} style={{ background: '#eee' }}>
                    <PlaceholderImage text="AVATAR" height="100%" />
                </div>

                <div className={styles.heroInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', textTransform: 'uppercase', fontWeight: 900, margin: 0, lineHeight: 1 }}>
                            {MOCK_USER.displayName}
                        </h1>
                        <span className="manga-title" style={{ fontSize: '0.9rem', background: 'var(--color-surface)', color: '#FFD700', border: '2px solid var(--color-border)', boxShadow: '2px 2px 0 var(--color-shadow)' }}>
                            RANG X
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', alignItems: 'center' }}>
                        <StreakCounter count={MOCK_STATS.streak} />
                        <div style={{ flex: 1, maxWidth: '300px' }}>
                            <XPBar current={MOCK_STATS.xp} max={MOCK_STATS.xpToNextLevel} level={MOCK_STATS.level} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Button variant="manga" size="sm" icon={<Plus size={16} />}>ACTION</Button>
                    <Button variant="manga" size="sm">PROFIL</Button>
                </div>
            </div>

            {/* Stats HUD */}
            <div className={`manga-panel ${styles.statsHud}`}>
                <div className={styles.statItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                        <Target size={20} />
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>OBJECTIF</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                        XX<span style={{ fontSize: '1rem', opacity: 0.4 }}>/XX</span>
                    </div>
                    <div style={{ width: '60px', height: '4px', background: '#eee', marginTop: '0.5rem', borderRadius: '2px' }}>
                        <div style={{ width: '50%', height: '100%', background: 'var(--color-primary)' }} />
                    </div>
                </div>

                <div className={styles.statItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                        <TrendingUp size={20} />
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>TOTAL</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{MOCK_STATS.totalChaptersRead}</span>
                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>CHAPS</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{MOCK_STATS.totalAnimeEpisodesWatched}</span>
                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>EPS</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statItem} style={{ background: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                        <Flame size={20} color="var(--color-primary)" />
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>SÉRIE</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1, color: 'var(--color-primary)' }}>
                        {MOCK_STATS.streak}
                    </div>
                    <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>JOURS</p>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className={styles.dashboardGrid}>
                {/* Left Column */}
                <div>
                    {/* Continue Reading */}
                    <div className="manga-panel" style={{ marginBottom: '3rem', padding: 0 }}>
                        <div style={{ position: 'relative', height: '220px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333' }}>
                            {/* Background Placeholder */}
                            <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
                                <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, #444, #444 10px, #333 10px, #333 20px)' }} />
                            </div>

                            <div style={{ position: 'relative', zIndex: 10, height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff', width: '100%' }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', background: 'var(--color-primary)', padding: '4px 8px', width: 'fit-content', fontWeight: 800, marginBottom: '0.5rem' }}>
                                    {MOCK_CONTINUE_READING.type}
                                </span>
                                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.5rem', textShadow: '2px 2px 0 #000' }}>
                                    {MOCK_CONTINUE_READING.title}
                                </h3>
                                <p style={{ opacity: 0.9, fontSize: '1rem', fontWeight: 600 }}>
                                    Chapitre {MOCK_CONTINUE_READING.currentChapter} <span style={{ opacity: 0.6 }}>/ {MOCK_CONTINUE_READING.totalChapters}</span>
                                </p>
                                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.9rem' }}>
                                    <Play size={20} fill="currentColor" /> CONTINUER
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* In Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <BookOpen size={20} />
                            <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>EN COURS</span>
                        </div>
                        <Button variant="ghost" size="sm" style={{ fontWeight: 800 }}>TOUT VOIR <ChevronRight size={16} /></Button>
                    </div>

                    <div className={styles.progressGrid}>
                        {MOCK_IN_PROGRESS.map((work) => (
                            <div key={work.id}>
                                <Card variant="manga" style={{ overflow: 'hidden', marginBottom: '0.75rem', position: 'relative', padding: 0 }}>
                                    <div style={{ paddingTop: '140%', position: 'relative' }}>
                                        <div style={{ position: 'absolute', inset: 0 }}>
                                            <PlaceholderImage text="COVER" />
                                        </div>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '2rem 0.5rem 0.5rem', color: '#fff' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Ch. {work.currentChapter}</span>
                                    </div>
                                </Card>
                                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{work.title}</h4>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div>
                    {/* Friends Activity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Users size={20} />
                        <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>ACTIVITÉ</span>
                    </div>

                    <div className="manga-panel" style={{ background: 'var(--color-surface)', padding: '0', marginBottom: '3rem', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {MOCK_ACTIVITY.map((activity, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border)', boxShadow: '0 2px 4px var(--color-shadow)', flexShrink: 0, background: '#eee' }}>
                                        <PlaceholderImage text="" height="100%" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
                                            <span style={{ fontWeight: 700 }}>{activity.userName}</span>
                                            <span style={{ opacity: 0.8 }}> a fait une action sur </span>
                                            <span> <strong>{activity.workTitle}</strong></span>
                                        </p>
                                        <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>
                                            Il y a X h
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Star size={20} className="text-gradient" />
                        <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>À DÉCOUVRIR</span>
                    </div>

                    <div className={styles.recGrid}>
                        {MOCK_RECOMMENDATIONS.map(manga => (
                            <Card key={manga.mal_id} variant="manga" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
                                <div style={{ position: 'relative', paddingTop: '150%' }}>
                                    <div style={{ position: 'absolute', inset: 0 }}>
                                        <PlaceholderImage text="MANGA" />
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '2rem 0.5rem 0.5rem', color: '#fff' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{manga.title}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Star size={10} fill="#FFD700" color="#FFD700" /> {manga.score}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </MockupContentWrapper>
    );
}

// --- MOCKUP PROFILE ---
export function MockupProfile() {
    return (
        <MockupContentWrapper>
            <h1 className="text-outline" style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: 'var(--color-text)', textShadow: '2px 2px 0 var(--color-shadow)', marginBottom: '2rem' }}>
                PROFIL CHASSEUR
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* Hunter License */}
                <HunterLicenseCard
                    user={MOCK_USER}
                    stats={MOCK_STATS}
                    isOwnProfile={true}
                    featuredBadgeData={MOCK_BADGES[0]}
                    top3FavoritesData={[
                        { id: '1', title: 'Favoris 1', image: 'https://via.placeholder.com/150' },
                        { id: '2', title: 'Favoris 2', image: 'https://via.placeholder.com/150' },
                        { id: '3', title: 'Favoris 3', image: 'https://via.placeholder.com/150' }
                    ]}
                // Need to ensure license card doesn't try to load external images if we can help it, 
                // or we accept standard placeholders for now since LicenseCard is strict about props.
                // The LicenseCard component might need to be wrapped or we just pass a data url for placeholder.
                />

                {/* Content & Stats */}
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                        {/* Chapters */}
                        <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                            <div style={{ padding: '0.75rem', background: 'var(--color-border-heavy)', color: 'var(--color-text-inverse)' }}>
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{MOCK_STATS.totalChaptersRead}</div>
                                <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>CHAPITRES LUS</p>
                            </div>
                        </div>

                        {/* In Progress */}
                        <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-primary)', color: '#fff' }}>
                            <div style={{ padding: '0.75rem', background: 'var(--color-primary)', color: '#fff' }}>
                                <Flame size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>4</div>
                                <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>EN COURS</p>
                            </div>
                        </div>

                        {/* Collection */}
                        <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                            <div style={{ padding: '0.75rem', background: 'var(--color-border-heavy)', color: 'var(--color-text-inverse)' }}>
                                <Library size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{MOCK_STATS.totalWorksAdded}</div>
                                <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>COLLECTION</p>
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                            <div style={{ padding: '0.75rem', background: '#fbbf24', color: '#000' }}>
                                <Award size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{MOCK_STATS.badgeCount} / 16</div>
                                <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>BADGES</p>
                            </div>
                        </div>
                    </div>

                    <h3 className="manga-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', background: 'var(--color-secondary)', color: 'var(--color-text)' }}>BADGES RÉCENTS</h3>
                    <div className="manga-panel" style={{ padding: '2rem', background: 'var(--color-surface)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '2rem' }}>
                        {MOCK_BADGES.map((badge) => (
                            <div key={badge.id} style={{ textAlign: 'center', position: 'relative' }}>
                                <div style={{
                                    width: '80px', height: '80px', margin: '0 auto 0.5rem',
                                    background: badge.rarity === 'legendary' ? '#000' : '#fff',
                                    color: badge.rarity === 'legendary' ? '#FFD700' : '#000',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `3px solid ${badge.rarity === 'legendary' ? '#FFD700' : '#000'}`,
                                    boxShadow: badge.rarity === 'legendary' ? '0 0 20px rgba(255, 215, 0, 0.5)' : '4px 4px 0 rgba(0,0,0,0.2)'
                                }}>
                                    <Award size={32} />
                                </div>
                                <p style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text)' }}>{badge.name}</p>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </MockupContentWrapper>
    );
}

// --- MOBILE COMPONENTS ---

// Mobile Header Mockup (Simplified for mobile)
const MockupMobileHeader = () => (
    <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        padding: '1rem',
        paddingTop: '3rem', // Clear notch
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--color-surface)',
        borderBottom: '3px solid var(--color-border)',
        zIndex: 50
    }}>
        {/* Logo */}
        <div className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <img src="/logo.png" alt="Logo" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>Bingeki</span>
        </div>

        {/* Mobile Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ padding: '6px', border: '2px solid var(--color-border)', borderRadius: '4px', display: 'flex' }}>
                <Search size={18} />
            </div>
            <div style={{ padding: '6px', border: '2px solid var(--color-border)', borderRadius: '4px', display: 'flex' }}>
                <Menu size={18} />
            </div>
        </div>
    </div>
);

// Mobile Bottom Nav Mockup
const MockupBottomNav = () => (
    <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--color-surface)',
        padding: '0.5rem 1.5rem',
        border: '3px solid var(--color-border)',
        boxShadow: '4px 4px 0 var(--color-shadow-strong)',
        zIndex: 100,
        borderRadius: '50px',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center'
    }}>
        <div style={{ padding: '8px', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', display: 'flex' }}><Home size={22} /></div>
        <div style={{ padding: '8px', borderRadius: '12px', color: 'var(--color-text)', display: 'flex' }}><Compass size={22} /></div>
        <div style={{ padding: '8px', borderRadius: '12px', color: 'var(--color-text)', display: 'flex' }}><Book size={22} /></div>
    </div>
);

// Content Wrapper adjusted for Mobile
const MockupContentWrapperMobile = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position: 'relative', minHeight: '100%', overflow: 'hidden', isolation: 'isolate', background: 'var(--color-background)' }}>
        {/* Background Layers */}
        <div style={{
            position: 'absolute', inset: 0, zIndex: -1,
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)'
        }} />
        <div className="manga-halftone" style={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.1, backgroundImage: 'radial-gradient(var(--color-dots) 2px, transparent 2.5px)', backgroundSize: '20px 20px' }} />

        {/* Content */}
        <div style={{ padding: '1rem', paddingTop: '6rem', paddingBottom: '6rem' }}>
            {children}
        </div>
    </div>
);

export function MockupDashboardMobile() {
    return (
        <MockupContentWrapperMobile>
            <MockupMobileHeader />

            {/* Mobile Hero (Stacked) */}
            <div className={`manga-panel ${styles.heroPanel}`} style={{ gridTemplateColumns: '1fr', textAlign: 'center', padding: '1.5rem', gap: '1rem' }}>
                <div className={styles.avatarContainer} style={{ margin: '0 auto', width: '100px', height: '100px' }}>
                    <PlaceholderImage text="AVATAR" height="100%" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2, marginBottom: '0.5rem' }}>{MOCK_USER.displayName}</h1>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
                        <StreakCounter count={MOCK_STATS.streak} />
                        <div style={{ flex: 1 }}>
                            <XPBar current={MOCK_STATS.xp} max={MOCK_STATS.xpToNextLevel} level={MOCK_STATS.level} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Stats (Grid 2x2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="manga-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>CHAPITRES</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{MOCK_STATS.totalChaptersRead}</div>
                </div>
                <div className="manga-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>EPISODES</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{MOCK_STATS.totalAnimeEpisodesWatched}</div>
                </div>
            </div>

            {/* Continue Reading Mobile */}
            <div className="manga-panel" style={{ marginBottom: '2rem', padding: 0 }}>
                <div style={{ position: 'relative', height: '180px', background: '#333', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', background: 'var(--color-primary)', padding: '2px 6px', width: 'fit-content', fontWeight: 800, marginBottom: '0.5rem' }}>
                        {MOCK_CONTINUE_READING.type}
                    </span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.25rem' }}>
                        {MOCK_CONTINUE_READING.title}
                    </h3>
                    <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Ch. {MOCK_CONTINUE_READING.currentChapter}</p>
                </div>
            </div>

            <MockupBottomNav />
        </MockupContentWrapperMobile>
    );
}

export function MockupProfileMobile() {
    return (
        <MockupContentWrapperMobile>
            <MockupMobileHeader />

            <h1 className="text-outline" style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: 'var(--color-text)', textAlign: 'center', marginBottom: '1.5rem' }}>
                PROFIL
            </h1>

            {/* License Card scales naturally, just needs container */}
            <div style={{ marginBottom: '2rem' }}>
                <HunterLicenseCard
                    user={MOCK_USER}
                    stats={MOCK_STATS}
                    isOwnProfile={true}
                    featuredBadgeData={MOCK_BADGES[0]}
                />
            </div>

            {/* Mobile Stacked Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '5rem' }}>
                <div className="manga-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem', background: '#000', color: '#fff' }}><BookOpen size={20} /></div>
                    <div style={{ fontWeight: 900 }}>{MOCK_STATS.totalChaptersRead} CHAPITRES</div>
                </div>
                <div className="manga-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem', background: '#000', color: '#fff' }}><Library size={20} /></div>
                    <div style={{ fontWeight: 900 }}>{MOCK_STATS.totalWorksAdded} DANS LA COLLECTION</div>
                </div>
            </div>

            <MockupBottomNav />
        </MockupContentWrapperMobile>
    );
}

// --- DISCOVER / EXPLORE MOCKUPS ---

export function MockupDiscover() {
    return (
        <MockupContentWrapper>
            {/* Hero Section */}
            <div style={{
                height: '400px',
                background: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), radial-gradient(circle at 70% 30%, #444, #111)',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '3rem',
                borderBottom: '4px solid var(--color-border)',
                color: '#fff'
            }}>
                <div style={{ maxWidth: '600px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary)', color: '#fff', padding: '0.5rem 1rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', boxShadow: '4px 4px 0 #000' }}>
                        <Flame size={18} fill="#fff" /> A L'AFFICHE
                    </div>
                    <h1 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-heading)', fontWeight: 900, lineHeight: 1, marginBottom: '1rem', textShadow: '4px 4px 0 #000' }}>
                        CHAINSAW MAN
                    </h1>
                    <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem', lineHeight: 1.6, maxWidth: '500px' }}>
                        Denji est un jeune homme sans argent qui travaille comme Devil Hunter avec son chien démon Pochita...
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button variant="primary" icon={<Plus size={20} />}>AJOUTER</Button>
                        <Button variant="outline">DÉTAILS</Button>
                    </div>
                </div>
            </div>

            <div style={{ padding: '3rem' }}>
                {/* Search Bar */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', maxWidth: '800px', margin: '0 auto 3rem' }}>
                    <div style={{ flex: 1, background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '4px 4px 0 var(--color-shadow)' }}>
                        <Search size={24} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, opacity: 0.5, fontFamily: 'var(--font-heading)' }}>Rechercher un anime, manga...</span>
                    </div>
                    <div style={{ width: '60px', background: 'var(--color-surface)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0 var(--color-shadow)' }}>
                        <SlidersHorizontal size={24} />
                    </div>
                </div>

                {/* Categories */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
                    {['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy'].map(cat => (
                        <div key={cat} style={{ padding: '0.5rem 1.5rem', border: '2px solid var(--color-border)', fontWeight: 700, background: 'var(--color-surface)', boxShadow: '2px 2px 0 var(--color-shadow)' }}>
                            {cat}
                        </div>
                    ))}
                </div>

                {/* Seasonal Anime */}
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Flame size={24} color="#ef4444" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>ANIMES DE SAISON</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0.5rem' }}>
                                <PlaceholderImage height="220px" text={`ANIME ${i}`} />
                                <div style={{ padding: '1rem 0.5rem' }}>
                                    <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem' }}>JUJUTSU KAISEN</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7 }}>
                                        <span>TV</span>
                                        <span>★ 8.7</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MockupContentWrapper>
    );
}

export function MockupDiscoverMobile() {
    return (
        <MockupContentWrapperMobile>
            <MockupMobileHeader />

            {/* Hero Section Mobile */}
            <div style={{
                height: '350px',
                margin: '-6rem -1rem 1rem -1rem', // Negate padding
                background: 'linear-gradient(to bottom, transparent, var(--color-background)), radial-gradient(circle at 50% 30%, #444, #111)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '1.5rem',
                position: 'relative'
            }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5 }}>
                    <PlaceholderImage height="200px" text="HERO" />
                </div>
                <div style={{ position: 'relative', zIndex: 1, color: '#fff' }}>
                    <span style={{ background: 'var(--color-primary)', color: '#fff', padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 800 }}>A L'AFFICHE</span>
                    <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 900, lineHeight: 1, margin: '0.5rem 0' }}>CHAINSAW MAN</h1>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={{ flex: 1, background: '#fff', color: '#000', border: 'none', padding: '0.75rem', fontWeight: 800 }}>AJOUTER</button>
                        <button style={{ flex: 1, background: 'transparent', border: '2px solid #fff', color: '#fff', padding: '0.75rem', fontWeight: 800 }}>INFO</button>
                    </div>
                </div>
            </div>

            {/* Search Bar Mobile */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1, background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={18} style={{ opacity: 0.5 }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.5 }}>Rechercher...</span>
                </div>
                <div style={{ width: '45px', background: 'var(--color-surface)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SlidersHorizontal size={20} />
                </div>
            </div>

            {/* Carousel Mobile */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'var(--font-heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Flame size={18} color="#ef4444" /> ANIMES DE SAISON
                </h3>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ minWidth: '140px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0.25rem' }}>
                            <PlaceholderImage height="180px" text={`IMG ${i}`} />
                            <div style={{ padding: '0.5rem' }}>
                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>JUJUTSU...</h4>
                                <span style={{ fontSize: '0.7rem' }}>★ 8.7</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <MockupBottomNav />
        </MockupContentWrapperMobile>
    );
}

// --- DETAILS / WORK PAGE MOCKUPS ---

export function MockupDetails() {
    return (
        <MockupContentWrapper>
            <div style={{ display: 'flex', padding: '3rem', gap: '3rem' }}>
                {/* Sidebar / Cover */}
                <div style={{ width: '300px', flexShrink: 0 }}>
                    <PlaceholderImage height="450px" text="COVER" />
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Button variant="primary" icon={<Plus size={20} />}>AJOUTER À MA LISTE</Button>
                        <div style={{ padding: '1rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700 }}>
                                <span>Score</span>
                                <span>8.79</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700 }}>
                                <span>Rang</span>
                                <span>#32</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>Popularité</span>
                                <span>#5</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 900, lineHeight: 1, marginBottom: '0.5rem' }}>
                        ATTACK ON TITAN
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', opacity: 0.7, fontWeight: 700 }}>
                        <span>TV</span>
                        <span>•</span>
                        <span>2013</span>
                        <span>•</span>
                        <span>Wit Studio</span>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid var(--color-border)', marginBottom: '2rem' }}>
                        <div style={{ paddingBottom: '0.5rem', borderBottom: '4px solid var(--color-primary)', fontWeight: 800 }}>INFORMATIONS</div>
                        <div style={{ paddingBottom: '0.5rem', opacity: 0.5, fontWeight: 800 }}>ÉPISODES</div>
                        <div style={{ paddingBottom: '0.5rem', opacity: 0.5, fontWeight: 800 }}>PERSONNAGES</div>
                    </div>

                    {/* Synopsis */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1rem' }}>SYNOPSIS</h3>
                        <p style={{ lineHeight: 1.6, opacity: 0.9 }}>
                            Il y a plusieurs centaines d'années, l'humanité a failli être exterminée par des Titans. Ces géants, qui ne semblent n'avoir aucune trace d'intelligence, dévorent les humains pour le plaisir et non pour se nourrir...
                        </p>
                    </div>

                    {/* Episodes List Preview */}
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1rem' }}>ÉPISODES RÉCENTS</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--color-text)', color: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i}</div>
                                    <div style={{ flex: 1, fontWeight: 700 }}>À toi, 2000 ans plus tard</div>
                                    <div style={{ opacity: 0.5, fontSize: '0.9rem' }}>24 min</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </MockupContentWrapper>
    );
}

export function MockupDetailsMobile() {
    return (
        <MockupContentWrapperMobile>
            <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
                    <div style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', color: '#fff' }}><ArrowLeft size={20} /></div>
                </div>

                {/* Header Image */}
                <div style={{ height: '250px', background: '#333', overflow: 'hidden' }}>
                    <PlaceholderImage height="100%" text="COVER" />
                </div>

                <div style={{ padding: '1.5rem', marginTop: '-2rem', background: 'var(--color-background)', position: 'relative', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)' }}>ACTION • DRAMA</span>
                    <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', fontWeight: 900, lineHeight: 1.1, margin: '0.5rem 0' }}>ATTACK ON TITAN</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Star size={16} fill="var(--color-primary)" color="var(--color-primary)" />
                        <span style={{ fontWeight: 800 }}>8.79</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span style={{ opacity: 0.7 }}>2013</span>
                    </div>

                    <Button variant="primary" style={{ width: '100%', marginBottom: '2rem' }}>AJOUTER À MA LISTE</Button>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1, textAlign: 'center', paddingBottom: '0.5rem', borderBottom: '3px solid var(--color-primary)', fontWeight: 800 }}>INFO</div>
                        <div style={{ flex: 1, textAlign: 'center', paddingBottom: '0.5rem', opacity: 0.5, fontWeight: 800 }}>EP</div>
                        <div style={{ flex: 1, textAlign: 'center', paddingBottom: '0.5rem', opacity: 0.5, fontWeight: 800 }}>PERSO</div>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.5rem' }}>SYNOPSIS</h3>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8, marginBottom: '2rem' }}>
                        Il y a plusieurs centaines d'années, l'humanité a failli être exterminée par des Titans...
                    </p>

                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1rem' }}>ÉPISODES</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '4rem' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                                <Play size={16} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Épisode {i}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>24 min</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MockupContentWrapperMobile>
    );
}


// --- LIBRARY MOCKUPS ---

export function MockupLibrary() {
    return (
        <MockupContentWrapper>
            <div style={{ padding: '2rem' }}>
                {/* Stats Panel */}
                <div style={{ display: 'flex', background: 'var(--color-surface)', border: '2px solid var(--color-border)', marginBottom: '2rem' }}>
                    <div style={{ flex: 1, padding: '1.5rem', borderRight: '2px solid var(--color-border)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.6, marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}>
                            <BookOpen size={16} /> TOTAL
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>42</div>
                    </div>
                    <div style={{ flex: 1, padding: '1.5rem', borderRight: '2px solid var(--color-border)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.6, marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor' }}></div> TERMINÉS
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>12</div>
                    </div>
                    <div style={{ flex: 1, padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.6, marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}>
                            <TrendingUp size={16} /> PROGRESSION
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>65%</div>
                    </div>
                    <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', borderLeft: '2px solid var(--color-border)' }}>
                        <Button variant="primary" icon={<Plus size={20} />}>AJOUTER</Button>
                    </div>
                </div>

                {/* Folders Bar */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff', fontWeight: 800, border: '2px solid var(--color-primary)' }}>TOUT <span style={{ background: 'rgba(0,0,0,0.2)', padding: '0 4px', fontSize: '0.8em' }}>42</span></button>
                    <button style={{ padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800 }}>FAVORIS</button>
                    <button style={{ padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800 }}>A LIRE</button>
                </div>

                {/* Controls Bar */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', boxShadow: '4px 4px 0 var(--color-shadow)' }}>
                        <Search size={20} style={{ opacity: 0.5 }} />
                        <span style={{ opacity: 0.5, fontWeight: 700 }}>Rechercher...</span>
                    </div>
                    <Button variant="outline" icon={<SlidersHorizontal size={18} />}>FILTRES</Button>
                    <div style={{ display: 'flex', border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                        <button style={{ padding: '0.5rem', background: 'var(--color-text)', color: '#fff', border: 'none' }}><LayoutGrid size={20} /></button>
                        <button style={{ padding: '0.5rem', background: 'transparent', border: 'none' }}><List size={20} /></button>
                    </div>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', boxShadow: '4px 4px 0 var(--color-shadow)' }}>
                            <div style={{ height: '200px', background: '#ccc', borderBottom: '2px solid var(--color-border)', position: 'relative' }}>
                                <PlaceholderImage height="100%" text="" />
                                <span style={{ position: 'absolute', top: 8, left: 8, background: '#000', color: '#fff', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 800 }}>MANGA</span>
                            </div>
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', marginBottom: '0.5rem' }}>TITRE DU MANGA {i}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', opacity: 0.7 }}>
                                    <span>EN COURS</span>
                                    <span>CH. 45/120</span>
                                </div>
                                <div style={{ height: '6px', background: '#eee', border: '1px solid #000' }}>
                                    <div style={{ width: '40%', height: '100%', background: 'var(--color-primary)' }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </MockupContentWrapper>
    );
}

export function MockupLibraryMobile() {
    return (
        <MockupContentWrapperMobile>
            <MockupMobileHeader />

            {/* Stats Panel Mobile */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', border: '2px solid var(--color-border)', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', fontWeight: 800, opacity: 0.7 }}><BookOpen size={16} /> TOTAL</div>
                    <div style={{ fontWeight: 900, fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>42</div>
                </div>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', fontWeight: 800, opacity: 0.7 }}>TERMINÉS</div>
                    <div style={{ fontWeight: 900, fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>12</div>
                </div>
                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', fontWeight: 800, opacity: 0.7 }}><TrendingUp size={16} /> PROGRESSION</div>
                    <div style={{ fontWeight: 900, fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>65%</div>
                </div>
            </div>

            {/* Folders Mobile */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '0.5rem', scrollbarWidth: 'none' }}>
                <button style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff', fontWeight: 800, border: '2px solid var(--color-primary)', flexShrink: 0 }}>TOUT <span style={{ background: 'rgba(0,0,0,0.2)', padding: '0 4px', fontSize: '0.8em' }}>42</span></button>
                <button style={{ padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800, flexShrink: 0 }}>FAVORIS</button>
                <button style={{ padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800, flexShrink: 0 }}>A LIRE</button>
            </div>

            {/* Controls Mobile */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', marginBottom: '0.5rem' }}>
                    <Search size={18} style={{ opacity: 0.5 }} />
                    <span style={{ opacity: 0.5, fontWeight: 700, fontSize: '0.9rem' }}>Rechercher...</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button style={{ padding: '0.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}><SlidersHorizontal size={16} /> FILTRES</button>
                    <button style={{ padding: '0.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>TRIER</button>
                </div>
            </div>

            {/* Grid Mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingBottom: '5rem' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                        <div style={{ height: '150px', background: '#ccc', borderBottom: '2px solid var(--color-border)', position: 'relative' }}>
                            <PlaceholderImage height="100%" text="" />
                            <span style={{ position: 'absolute', top: 4, left: 4, background: '#000', color: '#fff', padding: '2px 4px', fontSize: '0.6rem', fontWeight: 800 }}>MANGA</span>
                        </div>
                        <div style={{ padding: '0.5rem' }}>
                            <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.25rem' }}>TITRE {i}</h4>
                            <div style={{ height: '4px', background: '#eee', border: '1px solid #000' }}>
                                <div style={{ width: '40%', height: '100%', background: 'var(--color-primary)' }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <MockupBottomNav />
        </MockupContentWrapperMobile>
    );
}

// --- SCHEDULE MOCKUPS ---

export function MockupSchedule() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const activeDay = 'wed';

    return (
        <MockupContentWrapper>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: 1 }}>
                        <Calendar size={32} /> Planning
                    </h1>
                    <p style={{ opacity: 0.6 }}>Sorties de la semaine (Simulcast)</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ padding: '0.5rem 1rem', background: '#fff', border: '2px solid #000', fontWeight: 700, boxShadow: '4px 4px 0 #000' }}>
                        UTC+1
                    </div>
                </div>
            </div>

            {/* Days Selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {days.map(day => (
                    <div key={day} style={{
                        padding: '0.75rem 1.5rem',
                        border: '2px solid #000',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        background: day === activeDay ? '#FF2E63' : '#fff',
                        color: day === activeDay ? '#fff' : '#000',
                        boxShadow: day === activeDay ? '2px 2px 0 #000' : '4px 4px 0 #000',
                        transform: day === activeDay ? 'translate(2px, 2px)' : 'none',
                        cursor: 'default'
                    }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="manga-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ aspectRatio: '16/9', background: '#333', position: 'relative' }}>
                            <PlaceholderImage text={`Anime ${i}`} />
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: 'rgba(0,0,0,0.8)', color: '#fff',
                                padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '0.25rem'
                            }}>
                                <Clock size={12} /> 18:30
                            </div>
                        </div>
                        <div style={{ padding: '0.75rem', background: '#fff', flex: 1 }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.25rem', lineHeight: 1.2 }}>
                                Jujutsu Kaisen: Shibuya Arc
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.7 }}>
                                <span>EP 12</span>
                                <span>TV</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </MockupContentWrapper>
    );
}

export function MockupScheduleMobile() {
    const days = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
    const activeDay = 'mer';

    return (
        <MockupContentWrapperMobile>
            <MockupMobileHeader />

            {/* Header */}
            <div style={{ padding: '1rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Calendar size={24} /> Planning
                </h1>
            </div>

            {/* Days Scroll */}
            <div style={{
                display: 'flex', gap: '0.5rem', padding: '0 1rem 1rem 1rem', overflowX: 'hidden',
                maskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
            }}>
                {days.map(day => (
                    <div key={day} style={{
                        padding: '0.5rem 1rem',
                        border: '2px solid #000',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        background: day === activeDay ? '#FF2E63' : '#fff',
                        color: day === activeDay ? '#fff' : '#000',
                        boxShadow: day === activeDay ? '1px 1px 0 #000' : '2px 2px 0 #000',
                        flexShrink: 0
                    }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* List */}
            <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '6rem' }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="manga-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', height: '80px' }}>
                        <div style={{ width: '60px', background: '#333', position: 'relative' }}>
                            <PlaceholderImage text="" />
                        </div>
                        <div style={{ padding: '0.5rem', background: '#fff', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#FF2E63', marginBottom: '0.1rem' }}>18:30</div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.1rem', lineHeight: 1.1 }}>
                                Jujutsu Kaisen
                            </h3>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Episode 12 • TV</div>
                        </div>
                    </div>
                ))}
            </div>

            <MockupBottomNav />
        </MockupContentWrapperMobile>
    );
}

// --- SOCIAL MOCKUPS ---

export function MockupSocial() {
    return (
        <MockupContentWrapper>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid var(--color-border)', marginBottom: '2rem' }}>
                <div style={{ paddingBottom: '1rem', borderBottom: '4px solid var(--color-primary)', fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trophy size={24} /> CLASSEMENT
                </div>
                <div style={{ paddingBottom: '1rem', opacity: 0.5, fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={24} /> ACTIVITÉ
                </div>
                <div style={{ paddingBottom: '1rem', opacity: 0.5, fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Swords size={24} /> DÉFIS
                </div>
                <div style={{ paddingBottom: '1rem', opacity: 0.5, fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={24} /> AMIS
                </div>
            </div>

            {/* Podium */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1rem', marginBottom: '3rem', height: '300px' }}>
                {/* 2nd Place */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#ccc', border: '4px solid silver', marginBottom: '1rem', position: 'relative' }}>
                        <PlaceholderImage text="AVATAR" />
                        <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: 'silver', color: '#000', fontWeight: 900, padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>2</div>
                    </div>
                    <div style={{ fontWeight: 800, marginBottom: '0.5rem' }}>SilverSurfer</div>
                    <div style={{ height: '120px', width: '100%', background: 'silver', border: '2px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', fontWeight: 900, fontSize: '1.5rem', boxShadow: '4px 4px 0 #000' }}>
                        2
                    </div>
                </div>

                {/* 1st Place */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px', zIndex: 1 }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#ccc', border: '4px solid gold', marginBottom: '1rem', position: 'relative' }}>
                        <PlaceholderImage text="AVATAR" />
                        <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: 'gold', color: '#000', fontWeight: 900, padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>1</div>
                        <Trophy size={32} color="gold" style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)' }} />
                    </div>
                    <div style={{ fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.2rem' }}>GoldKing</div>
                    <div style={{ height: '160px', width: '100%', background: 'gold', border: '2px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', fontWeight: 900, fontSize: '2rem', boxShadow: '4px 4px 0 #000' }}>
                        1
                    </div>
                </div>

                {/* 3rd Place */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#ccc', border: '4px solid #cd7f32', marginBottom: '1rem', position: 'relative' }}>
                        <PlaceholderImage text="AVATAR" />
                        <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#cd7f32', color: '#fff', fontWeight: 900, padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>3</div>
                    </div>
                    <div style={{ fontWeight: 800, marginBottom: '0.5rem' }}>BronzeBoi</div>
                    <div style={{ height: '80px', width: '100%', background: '#cd7f32', border: '2px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', fontWeight: 900, fontSize: '1.5rem', boxShadow: '4px 4px 0 #000' }}>
                        3
                    </div>
                </div>
            </div>

            {/* List */}
            <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', boxShadow: '4px 4px 0 var(--color-shadow)' }}>
                {[4, 5, 6].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: i === 6 ? 'none' : '1px solid var(--color-border)' }}>
                        <div style={{ width: '40px', fontWeight: 900, fontSize: '1.2rem', opacity: 0.5 }}>{i}</div>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#ccc', marginRight: '1rem', overflow: 'hidden' }}>
                            <PlaceholderImage text="" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800 }}>User_{i}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Level {20 - i} • 4500 XP</div>
                        </div>
                        <div style={{ fontWeight: 900 }}>12,450 pts</div>
                    </div>
                ))}
            </div>
        </MockupContentWrapper>
    );
}

export function MockupSocialMobile() {
    return (
        <MockupContentWrapperMobile>
            <MockupMobileHeader />

            {/* Header */}
            <div style={{ padding: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={24} /> Communauté
                </h1>
            </div>

            {/* Tabs Mobile */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0 1rem 1rem 1rem', scrollbarWidth: 'none' }}>
                <button style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff', fontWeight: 800, border: '2px solid var(--color-primary)', flexShrink: 0 }}>CLASSEMENT</button>
                <button style={{ padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800, flexShrink: 0 }}>ACTIVITÉ</button>
                <button style={{ padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', fontWeight: 800, flexShrink: 0 }}>AMIS</button>
            </div>

            {/* Activity Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1rem 5rem 1rem' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '1rem', boxShadow: '2px 2px 0 var(--color-shadow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', overflow: 'hidden' }}>
                                <PlaceholderImage text="" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>User_{i}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Il y a 2h</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                            A terminé l'épisode 12 de <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>Jujutsu Kaisen</span>.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Flame size={14} /> 24</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Commenter</span>
                        </div>
                    </div>
                ))}
            </div>

            <MockupBottomNav />
        </MockupContentWrapperMobile>
    );
}

// --- AUTH MOCKUPS ---

export function MockupAuth() {
    return (
        <MockupContentWrapper>
            <div style={{ display: 'flex', height: '100%', minHeight: '500px' }}>
                {/* Left: Visuals */}
                <div style={{ flex: 1, background: '#333', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlaceholderImage text="ARTWORK" />
                    <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', color: '#fff', maxWidth: '80%' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>REJOINS L'AVENTURE.</h1>
                        <p style={{ fontSize: '1.2rem', opacity: 0.8, marginTop: '1rem' }}>Suis tes animes préférés, partage ta passion et découvre de nouvelles pépites.</p>
                    </div>
                </div>

                {/* Right: Form */}
                <div style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-background)' }}>
                    <div style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>CONNEXION</h2>
                        <p style={{ opacity: 0.6 }}>Content de te revoir, Hunter.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', fontSize: '0.9rem' }}>EMAIL</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                                <Mail size={20} style={{ opacity: 0.5 }} />
                                <span style={{ opacity: 0.5 }}>exemple@email.com</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem', fontSize: '0.9rem' }}>MOT DE PASSE</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                                <Lock size={20} style={{ opacity: 0.5 }} />
                                <span style={{ opacity: 0.5 }}>••••••••</span>
                            </div>
                        </div>
                    </div>

                    <Button variant="primary" style={{ width: '100%', marginBottom: '1.5rem' }}>SE CONNECTER</Button>
                    <div style={{ textAlign: 'center', fontSize: '0.9rem', opacity: 0.6, marginBottom: '1.5rem' }}>OU CONTINUER AVEC</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button style={{ padding: '0.75rem', background: '#fff', border: '2px solid #000', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 20, height: 20, background: 'red', borderRadius: '50%' }}></div> Google
                        </button>
                        <button style={{ padding: '0.75rem', background: '#5865F2', color: '#fff', border: '2px solid #000', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%' }}></div> Discord
                        </button>
                    </div>
                </div>
            </div>
        </MockupContentWrapper>
    );
}

export function MockupAuthMobile() {
    return (
        <MockupContentWrapperMobile>
            <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, background: '#000', margin: '0 auto 1.5rem', borderRadius: '50%' }}></div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem' }}>BINGEKI</h1>
                    <p style={{ opacity: 0.6 }}>La plateforme ultime pour les fans.</p>
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '1rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Mail size={20} style={{ opacity: 0.5 }} />
                            <span style={{ opacity: 0.5 }}>Email</span>
                        </div>
                        <div style={{ padding: '1rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Lock size={20} style={{ opacity: 0.5 }} />
                            <span style={{ opacity: 0.5 }}>Mot de passe</span>
                        </div>
                    </div>

                    <button style={{ width: '100%', padding: '1rem', background: 'var(--color-primary)', color: '#fff', fontWeight: 900, border: '2px solid #000', boxShadow: '4px 4px 0 #000', marginBottom: '2rem' }}>
                        SE CONNECTER
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <button style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>G</button>
                        <button style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#5865F2', color: '#fff' }}>D</button>
                    </div>
                </div>

                <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem', marginTop: 'auto' }}>
                    Pas encore de compte ? <span style={{ fontWeight: 800, textDecoration: 'underline' }}>S'inscrire</span>
                </div>
            </div>
        </MockupContentWrapperMobile>
    );
}

