import { logger } from '@/utils/logger';
import { Layout } from '@/components/layout/Layout';
// Card component removed as part of redesign
import { Button } from '@/components/ui/Button';
import { XPBar } from '@/components/gamification/XPBar';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { Play, Plus, ChevronRight, Target, TrendingUp, BookOpen, Users, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useLibraryStore } from '@/store/libraryStore';
import { Link } from '@/components/routing/LocalizedLink';
import { calculateRank, getRankColor } from '@/utils/rankUtils';
import { useState, useEffect, useCallback } from 'react';
import { useLocalizedNavigate } from '@/components/routing/LocalizedLink';
import { getFriendsActivity } from '@/firebase/firestore';
import type { ActivityEvent } from '@/types/activity';
import { ACTIVITY_EMOJIS, getActivityLabel } from '@/types/activity';
import { getTopWorks } from '@/services/animeApi';
import type { JikanResult } from '@/services/animeApi';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AddWorkModal } from '@/components/library/AddWorkModal';
import { Card } from '@/components/ui/Card';
import { SEO } from '@/components/layout/SEO';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { useTutorialStore } from '@/store/tutorialStore';
import { SocialLinksBanner } from '@/components/social/SocialLinksBanner';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import styles from './Dashboard.module.css';
import { useMounted } from '@/hooks/useMounted';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useLocalizedNavigate();
    const isMounted = useMounted();
    const { user, userProfile } = useAuthStore();
    const { level, xp, totalXp, xpToNextLevel, streak, totalChaptersRead, totalAnimeEpisodesWatched, totalMoviesWatched, recalculateStats } = useGamificationStore();
    const { works } = useLibraryStore();

    const [friendsActivity, setFriendsActivity] = useState<ActivityEvent[]>([]);
    const [isLoadingActivity, setIsLoadingActivity] = useState(true);
    const [recommendations, setRecommendations] = useState<JikanResult[]>([]);

    // Modal state
    const [selectedWork, setSelectedWork] = useState<JikanResult | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filter works
    const inProgressWorks = works.filter(w => w.status === 'reading').slice(0, 4);
    const lastUpdatedWork = inProgressWorks[0]; // Just use first in-progress work

    // Weekly stats calculation
    const weeklyChapters = inProgressWorks.reduce((sum, w) => sum + (w.currentChapter || 0), 0);
    const dailyGoal = 3;
    const todayProgress = Math.min(weeklyChapters % 10, dailyGoal); // Simplified daily tracking

    const loadFriendsActivity = useCallback(async () => {
        if (!user) return;
        setIsLoadingActivity(true);
        const activity = await getFriendsActivity(user.uid, 5);
        setFriendsActivity(activity);
        setIsLoadingActivity(false);
    }, [user]);

    const loadRecommendations = useCallback(async () => {
        // Fetch top manga by popularity
        const topManga = await getTopWorks('manga', 'bypopularity', 6); // Fetch 6 for a better grid
        setRecommendations(topManga);
    }, []);



    useEffect(() => {
        if (user) {
            loadFriendsActivity();

            // Trigger Tutorial if not seen
            const { hasSeenTutorial, startTutorial } = useTutorialStore.getState();
            if (!hasSeenTutorial) {
                // Small delay to ensure load
                setTimeout(() => startTutorial(), 1000);
            }

            // Force recalculation if totalXp is missing but works exist (Migration & Validation)
            if (works.length > 0 && totalXp === 0) {
                logger.log('[Dashboard] Forcing stat recalculation (Missing totalXp)');
                recalculateStats(works);
            }
        }
        loadRecommendations();
    }, [user, loadFriendsActivity, loadRecommendations, works, totalXp, recalculateStats]);

    const handleRecommendationClick = (work: JikanResult) => {
        setSelectedWork(work);
        setIsModalOpen(true);
    };

    const formatTimeAgo = (timestamp: number) => {
        if (!isMounted) return '...';
        /* eslint-disable-next-line */
        const diff = Date.now() - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return t('dashboard.just_now');
        if (hours < 24) return t('dashboard.hours_ago', { hours });
        return t('dashboard.days_ago', { days: Math.floor(hours / 24) });
    };

    return (
        <Layout>
            <TutorialOverlay />
            <SEO title={t('dashboard.title', 'Q.G.')} />
            <div style={{ minHeight: 'calc(100vh - 80px)' }}>
                <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>

                    {/* ID Card / Hero Section */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`manga-panel ${styles.heroPanel}`}
                    >
                        <div className={styles.avatarContainer}>
                            <OptimizedImage src={userProfile?.photoURL || user?.photoURL || undefined} alt="Avatar" fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'Bingeki'}`} />
                        </div>

                        <div className={styles.heroInfo}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                <h1 style={{
                                    fontFamily: 'var(--font-heading)',
                                    fontSize: '2.5rem',
                                    textTransform: 'uppercase',
                                    fontWeight: 900,
                                    margin: 0,
                                    lineHeight: 1
                                }}>
                                    {user?.displayName || t('dashboard.hero_default')}
                                </h1>
                                <span className="manga-title" style={{
                                    fontSize: '0.9rem',
                                    background: 'var(--color-surface)',
                                    color: getRankColor(calculateRank(level)),
                                    border: '2px solid var(--color-border)',
                                    boxShadow: '2px 2px 0 var(--color-shadow)'
                                }}>
                                    {t('dashboard.rank')} {calculateRank(level)}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', alignItems: 'center' }}>
                                <StreakCounter count={streak} />
                                <div style={{ flex: 1, maxWidth: '300px' }}>
                                    <XPBar current={xp} max={xpToNextLevel} level={level} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Link to="/discover">
                                <Button variant="manga" size="sm" icon={<Plus size={16} />}>{t('dashboard.discover_btn')}</Button>
                            </Link>
                            <Link to="/profile">
                                <Button variant="manga" size="sm">{t('dashboard.profile_btn')}</Button>
                            </Link>
                        </div>
                    </motion.section>

                    {/* Stats HUD (Bar Style) */}
                    <div className={`manga-panel ${styles.statsHud}`}>
                        {/* Daily Goal */}
                        <div className={styles.statItem}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                <Target size={20} />
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('dashboard.goal')}</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                                {todayProgress}<span style={{ fontSize: '1rem', opacity: 0.4 }}>/{dailyGoal}</span>
                            </div>
                            <div style={{ width: '60px', height: '4px', background: '#eee', marginTop: '0.5rem', borderRadius: '2px' }}>
                                <div style={{ width: `${(todayProgress / dailyGoal) * 100}%`, height: '100%', background: 'var(--color-primary)' }} />
                            </div>
                        </div>

                        {/* Total Stats */}
                        <div className={styles.statItem}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                <TrendingUp size={20} />
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>TOTAL</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{totalChaptersRead}</span>
                                    <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>CHAPS</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{totalAnimeEpisodesWatched}</span>
                                    <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>EPS</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{totalMoviesWatched}</span>
                                    <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>FILMS</span>
                                </div>
                            </div>
                        </div>

                        {/* Streak */}
                        <div className={styles.statItem} style={{ background: 'var(--color-surface)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                <Flame size={20} color={streak > 0 ? 'var(--color-primary)' : 'currentColor'} />
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('dashboard.streak')}</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1, color: streak > 0 ? 'var(--color-primary)' : 'inherit' }}>
                                {streak}
                            </div>
                            <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>{t('dashboard.days')}</p>
                        </div>
                    </div>

                    <SocialLinksBanner />

                    {/* Two Column Layout */}
                    <div className={styles.dashboardGrid}>

                        {/* Left Column - Continue Reading */}
                        <div>
                            {/* Last Read HERO BANNER */}
                            {lastUpdatedWork && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{ marginBottom: '3rem' }}
                                    className="manga-panel"
                                >
                                    <Link to={`/work/${lastUpdatedWork.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                        <div style={{
                                            position: 'relative',
                                            height: '220px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            backgroundColor: '#0a0a0b'
                                        }}>
                                            {/* Background Image - OptimizedImage handles proxy and referrer */}
                                            <div style={{ position: 'absolute', inset: 0 }}>
                                                <OptimizedImage 
                                                    src={lastUpdatedWork.image} 
                                                    alt="" 
                                                    fill
                                                    priority={true}
                                                    style={{ filter: 'brightness(0.6)' }}
                                                />
                                            </div>

                                            {/* Gradient Overlay */}
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)'
                                            }} />

                                            {/* Content */}
                                            <div style={{
                                                position: 'relative',
                                                zIndex: 10,
                                                height: '100%',
                                                padding: '2rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                maxWidth: '70%'
                                            }}>
                                                <span style={{
                                                    fontSize: '0.8rem',
                                                    textTransform: 'uppercase',
                                                    background: 'var(--color-primary)',
                                                    padding: '4px 8px',
                                                    width: 'fit-content',
                                                    fontWeight: 800,
                                                    marginBottom: '0.5rem',
                                                }}>
                                                    {lastUpdatedWork.type}
                                                </span>
                                                <h3 style={{
                                                    fontFamily: 'var(--font-heading)',
                                                    fontSize: '2rem',
                                                    fontWeight: 900,
                                                    lineHeight: 1.1,
                                                    marginBottom: '0.5rem',
                                                    textShadow: '2px 2px 0 #000'
                                                }}>
                                                    {lastUpdatedWork.title}
                                                </h3>
                                                <p style={{ opacity: 0.9, fontSize: '1rem', fontWeight: 600 }}>
                                                    {t('dashboard.chapter')} {lastUpdatedWork.currentChapter} <span style={{ opacity: 0.6 }}>/ {lastUpdatedWork.totalChapters || '?'}</span>
                                                </p>
                                                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.9rem' }}>
                                                    <Play size={20} fill="currentColor" /> {t('dashboard.continue_reading')}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            )}

                            {/* In Progress Section */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <BookOpen size={20} />
                                    <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>{t('dashboard.in_progress')}</span>
                                </div>
                                <Link to="/library">
                                    <Button variant="ghost" size="sm" style={{ fontWeight: 800 }}>{t('dashboard.see_all')} <ChevronRight size={16} /></Button>
                                </Link>
                            </div>

                            <div className={styles.progressGrid}>
                                {inProgressWorks.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                                        <p style={{ marginBottom: '1rem', opacity: 0.7 }}>{t('dashboard.no_reading')}</p>
                                        <Link to="/discover">
                                            <Button variant="primary" icon={<Plus size={18} />}>{t('dashboard.discover')}</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    inProgressWorks.map((work) => (
                                        <motion.div key={work.id} whileHover={{ y: -5 }}>
                                            <Link to={`/work/${work.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                                <Card
                                                    variant="manga"
                                                    hoverable
                                                    style={{
                                                        overflow: 'hidden',
                                                        marginBottom: '0.75rem',
                                                        position: 'relative',
                                                        padding: 0
                                                    }}
                                                >
                                                    <div style={{ paddingTop: '140%', position: 'relative' }}>
                                                        <OptimizedImage src={work.image} alt="" fill priority={true} />
                                                    </div>
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                                                        padding: '2rem 0.5rem 0.5rem',
                                                        color: '#fff'
                                                    }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Ch. {work.currentChapter}</span>
                                                    </div>
                                                </Card>
                                                <h4 style={{
                                                    fontFamily: 'var(--font-heading)',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 700,
                                                    lineHeight: 1.2,
                                                    color: 'var(--color-text)',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}>{work.title}</h4>
                                            </Link>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right Column - Activity Feed */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Users size={20} />
                                <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>{t('dashboard.friends_activity')}</span>
                            </div>

                            <div className="manga-panel" style={{
                                background: 'var(--color-surface)',
                                padding: '0',
                                marginBottom: '3rem',
                                overflow: 'hidden'
                            }}>
                                {isLoadingActivity ? (
                                    <p style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>{t('dashboard.loading')}</p>
                                ) : friendsActivity.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Users size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                        <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{t('dashboard.no_activity')}</p>
                                        <Link to="/social">
                                            <Button size="sm" variant="ghost" style={{ marginTop: '0.5rem' }}>{t('dashboard.add_friends')}</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {friendsActivity.map((activity, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '1rem',
                                                padding: '1rem',
                                                borderBottom: i < friendsActivity.length - 1 ? '1px solid var(--color-border)' : 'none',
                                                transition: 'background 0.2s',
                                                cursor: 'pointer',
                                            }}
                                                onClick={(e) => {
                                                    // Don't navigate if clicking a sub-link (like the work title)
                                                    if ((e.target as HTMLElement).closest('a')) return;
                                                    navigate('/social?tab=activity');
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-glow)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ width: 40, height: 40, borderRadius: '0', overflow: 'hidden', border: '2px solid var(--color-border)', boxShadow: '4px 4px 0 var(--color-primary)', flexShrink: 0, position: 'relative' }}>
                                                    <OptimizedImage src={activity.userPhoto || undefined} alt="" fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userName}`} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
                                                        <span style={{ fontWeight: 700 }}>{activity.userName}</span>
                                                        <span style={{ opacity: 0.8 }}> {getActivityLabel(activity.type, t)}</span>
                                                        {activity.workTitle && activity.workId ? (
                                                            <Link to={`/work/${activity.workId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 800 }}>
                                                                {' '}{activity.workTitle}
                                                            </Link>
                                                        ) : activity.workTitle && (
                                                            <span style={{ color: 'var(--color-primary)' }}> {activity.workTitle}</span>
                                                        )}
                                                    </p>
                                                    <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>
                                                        {ACTIVITY_EMOJIS[activity.type]} {formatTimeAgo(activity.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <Link to="/social?tab=activity" style={{ textAlign: 'center', padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>{t('dashboard.see_all_activity')}</span>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Recommendations Section */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Star size={20} className="text-gradient" />
                                <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>{t('dashboard.to_discover')}</span>
                            </div>

                            <div className={styles.recGrid}>
                                {recommendations.length > 0 ? (
                                    <>
                                        {recommendations.map(manga => (
                                            <motion.div
                                                key={manga.mal_id}
                                                whileHover={{ y: -5 }}
                                                onClick={() => handleRecommendationClick(manga)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Card variant="manga" hoverable style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
                                                    <div style={{ position: 'relative', paddingTop: '150%' }}>
                                                        <OptimizedImage
                                                            src={manga.images.jpg.large_image_url || manga.images.jpg.image_url}
                                                            alt={manga.title}
                                                            fill
                                                            priority={true}
                                                        />
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                                            padding: '2rem 0.5rem 0.5rem',
                                                            color: '#fff'
                                                        }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {manga.title}
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                <Star size={10} fill="#FFD700" color="#FFD700" /> {manga.score}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="manga-panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                                        <p style={{ opacity: 0.6 }}>{t('dashboard.loading')}</p>
                                    </div>
                                )}
                                <Link to="/discover" style={{ gridColumn: '1/-1' }}>
                                    <Button variant="ghost" size="sm" style={{ width: '100%' }}>{t('dashboard.see_more_suggestions')}</Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Add Work Modal */}
                    {selectedWork && (
                        <AddWorkModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            initialWork={selectedWork}
                        />
                    )}

                </div>
            </div>
        </Layout>
    )
}
