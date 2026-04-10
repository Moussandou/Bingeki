/**
 * Social page
 */
import { logger } from '@/utils/logger';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Trophy, Users, Search, UserPlus, Check, X, Activity, BookOpen, Flame, Clock, Swords, Tv, Library, Newspaper, PlusCircle, CheckCircle2, ArrowUpCircle, Award, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/config';
import {
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriendsActivity,
    getUserRank,
    searchUsersByPrefix,
    getUserProfiles,
    type Friend,
    type UserProfile,
    type LeaderboardCategory
} from '@/firebase/firestore';
import type { ActivityEvent } from '@/types/activity';
import { getActivityLabel } from '@/types/activity';
import { ChallengesSection } from '@/components/gamification/ChallengesSection';
import { WatchPartiesSection } from '@/components/social/WatchPartiesSection';
import { Podium } from '@/components/social/Podium';
import { RankingList } from '@/components/social/RankingList';
import { SocialFeed } from '@/components/social/SocialFeed';

import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { SEO } from '@/components/layout/SEO';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import styles from './Social.module.css';

// Mapping for activity types to icons
const ACTIVITY_ICONS: Record<ActivityEvent['type'], React.ReactNode> = {
    'watch': <Tv size={14} />,
    'read': <BookOpen size={14} />,
    'complete': <CheckCircle2 size={14} />,
    'add_work': <PlusCircle size={14} />,
    'level_up': <ArrowUpCircle size={14} />,
    'badge': <Award size={14} />,
};

export default function Social() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as any) || 'ranking';
    const [activeTab, setActiveTab] = useState<'feed' | 'ranking' | 'friends' | 'activity' | 'challenges' | 'parties'>(
        ['feed', 'ranking', 'friends', 'activity', 'challenges', 'parties'].includes(initialTab) ? initialTab : 'ranking'
    );
    const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
    const [friends, setFriends] = useState<(Friend & { banner?: string; xp?: number; totalXp?: number; level?: number; showActivityStatus?: boolean })[]>([]);
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [hoveredUser, setHoveredUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [requestSent, setRequestSent] = useState<Record<string, boolean>>({});

    const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('xp');
    const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
    const [friendsEnriched, setFriendsEnriched] = useState(false);
    const [activityLoaded, setActivityLoaded] = useState(false);

    type GroupedActivity = { 
        userId: string;
        userName: string;
        userPhoto: string;
        events: ActivityEvent[];
    };

    const groupedActivities = useMemo(() => {
        const groups: Record<string, GroupedActivity> = {};

        activities.forEach(event => {
            if (!groups[event.userId]) {
                groups[event.userId] = {
                    userId: event.userId,
                    userName: event.userName,
                    userPhoto: event.userPhoto || '',
                    events: []
                };
            } else if (!groups[event.userId].userPhoto && event.userPhoto) {
                // Ensure we have a photo even if the most recent event is missing it
                groups[event.userId].userPhoto = event.userPhoto;
            }
            groups[event.userId].events.push(event);
        });

        return Object.values(groups).sort((a, b) => 
            b.events[0].timestamp - a.events[0].timestamp
        );
    }, [activities]);
    const [currentUserRank, setCurrentUserRank] = useState<{ rank: number; profile: UserProfile } | null>(null);

    const fetchFriends = useCallback(async (forceEnrich = false) => {
        if (!user) return;
        
        // If friends not loaded at all or we need enrichment and they aren't enriched yet
        if (!friends.length || (forceEnrich && !friendsEnriched)) {
            const friendsData = await getFriends(user.uid);
            
            if (forceEnrich) {
                const acceptedFriendIds = friendsData
                    .filter(f => f.status === 'accepted')
                    .map(f => f.uid);
                
                if (acceptedFriendIds.length > 0) {
                    const profiles = await getUserProfiles(acceptedFriendIds);
                    const enrichedFriends = friendsData.map(f => {
                        const profile = profiles.find(p => p.uid === f.uid);
                        if (profile) {
                            return { 
                                ...f, 
                                banner: profile.banner, 
                                xp: profile.xp, 
                                totalXp: profile.totalXp, 
                                level: profile.level, 
                                showActivityStatus: profile.showActivityStatus,
                                photoURL: profile.photoURL || f.photoURL 
                            };
                        }
                        return f;
                    });
                    setFriends(enrichedFriends);
                    setFriendsEnriched(true);
                    return enrichedFriends;
                } else {
                    setFriends(friendsData);
                    return friendsData;
                }
            } else {
                setFriends(friendsData);
                return friendsData;
            }
        }
        return friends;
    }, [user, friends, friendsEnriched, getUserProfiles]);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
                        if (friends.length === 0) {
                await fetchFriends(false);
            }

            // 2. Tab-specific loading
            if (activeTab === 'ranking' && !leaderboardLoaded) {
                const getLeaderboardFn = httpsCallable<
                    { category: string; limit: number },
                    { leaderboard: (UserProfile & { rank: number })[] }
                >(functions, 'getLeaderboard');

                const [result, rankData] = await Promise.all([
                    getLeaderboardFn({ category: leaderboardCategory, limit: 50 }),
                    getUserRank(user.uid, leaderboardCategory)
                ]);

                const rawData = result.data.leaderboard as UserProfile[];
                // Filter out private profiles from the public leaderboard (except self)
                const data = rawData.filter(u => u.profileVisibility !== 'private' || u.uid === user.uid);
                setLeaderboard(data);

                const isInTop3 = data.slice(0, 3).some(u => u.uid === user.uid);
                setCurrentUserRank(isInTop3 ? null : rankData);
                setLeaderboardLoaded(true);
            } 
            else if (activeTab === 'friends' && !friendsEnriched) {
                await fetchFriends(true);
            }
            else if (activeTab === 'activity' && !activityLoaded) {
                // Ensure friends enriched for activity data injection
                let currentFriends = friends;
                if (!friendsEnriched) {
                    currentFriends = await fetchFriends(true) || [];
                }
                const activityLimit = 100;
                const activityData = await getFriendsActivity(user.uid, activityLimit, currentFriends);
                // Filter activities where the author has disabled activity status
                const filteredActivities = activityData.filter(a => {
                    const author = currentFriends.find(f => f.uid === a.userId);
                    return author?.showActivityStatus !== false;
                });
                setActivities(filteredActivities);
                setActivityLoaded(true);
            }
        } catch (error) {
            logger.error('[Social] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, leaderboardCategory, user, leaderboardLoaded, friendsEnriched, activityLoaded]);

    // Reset tab-specific loading states when filters change
    useEffect(() => {
        setLeaderboardLoaded(false);
    }, [leaderboardCategory]);

    useEffect(() => {
        loadData();
    // loadData is intentionally omitted — we depend on its stable inputs above
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, leaderboardCategory, user, leaderboardLoaded, friendsEnriched, activityLoaded]);


    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchEmail.trim().length >= 2) {
                setLoading(true);
                const results = await searchUsersByPrefix(searchEmail.trim(), 5);
                setSearchResults(results.filter(u => u.uid !== user?.uid)); // Don't show self
                setLoading(false);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchEmail, user]);

    const handleQuickAdd = async (targetUser: UserProfile) => {
        if (!user) return;
        try {
            await sendFriendRequest(
                user.uid,
                { displayName: user.displayName || 'Héros', photoURL: user.photoURL || '' },
                targetUser
            );
            // Refresh to update UI
            loadData();
            addToast(t('social.friends.request_sent_toast', { name: targetUser.displayName }), 'success');
        } catch (error) {
            logger.error("Failed to add friend", error);
            addToast(t('social.friends.request_error'), 'error');
        }
    };

    const getFriendStatus = (uid: string) => {
        const friend = friends.find(f => f.uid === uid);
        if (!friend) return 'none';
        return friend.status; // 'pending' or 'accepted'
    };


    const handleSendRequest = async (targetUser: UserProfile) => {
        if (!user) return;
        try {
            await sendFriendRequest(
                user.uid,
                { displayName: user.displayName || 'Héros', photoURL: user.photoURL || '' },
                targetUser
            );
            setRequestSent(prev => ({ ...prev, [targetUser.uid]: true }));
            loadData(); // Refresh list
            addToast(t('social.friends.request_sent_toast', { name: targetUser.displayName }), 'success');
        } catch (error) {
            logger.error("Failed to send request", error);
            addToast(t('social.friends.request_error'), 'error');
        }
    };

    const handleAccept = async (friendUid: string) => {
        if (!user) return;
        try {
            await acceptFriendRequest(user.uid, friendUid);
            loadData(); // Refresh to show accepted status
        } catch (error) {
            logger.error("Failed to accept", error);
        }
    };

    const handleReject = async (friendUid: string) => {
        if (!user) return;

        // Optimistic update: Remove immediately from UI
        setFriends(prev => prev.filter(f => f.uid !== friendUid));

        try {
            await rejectFriendRequest(user.uid, friendUid);
            logger.log("Friend request rejected successfully");
            addToast(t('social.friends.reject_success'), 'info');
        } catch (error) {
            logger.error("Failed to reject", error);
            addToast(t('social.friends.reject_error'), 'error');
            loadData(); // Revert state on error handling
        }
    };

    return (
        <Layout>
            <SEO title={t('social.title', 'Social')} />
            <div style={{ minHeight: 'calc(100vh - 80px)', overflowX: 'hidden' }}>
                <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
                    <h1 className={styles.title}>
                        {t('social.title')}
                    </h1>

                    {/* Tabs */}
                    <div className={styles.tabContainer}>
                        <Button
                            variant={activeTab === 'ranking' ? 'primary' : 'manga'}
                            onClick={() => setActiveTab('ranking')}
                            icon={<Trophy size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.ranking')}
                        </Button>
                        <Button
                            variant={activeTab === 'feed' ? 'primary' : 'manga'}
                            onClick={() => setActiveTab('feed')}
                            icon={<Newspaper size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.feed')}
                        </Button>
                        <Button
                            variant={activeTab === 'activity' ? 'primary' : 'manga'}
                            onClick={() => {
                                setActiveTab('activity');
                                setSearchParams({ tab: 'activity' });
                            }}
                            icon={<Activity size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.activity')}
                        </Button>
                        <Button
                            variant={activeTab === 'challenges' ? 'primary' : 'manga'}
                            onClick={() => setActiveTab('challenges')}
                            icon={<Swords size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.challenges')}
                        </Button>
                        <Button
                            variant={activeTab === 'parties' ? 'primary' : 'manga'}
                            onClick={() => setActiveTab('parties')}
                            icon={<Tv size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.parties')}
                        </Button>
                        <Button
                            variant={activeTab === 'friends' ? 'primary' : 'manga'}
                            onClick={() => setActiveTab('friends')}
                            icon={<Users size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.friends')}
                        </Button>
                    </div>

                    {/* FEED TAB */}
                    {activeTab === 'feed' && (
                        <SocialFeed />
                    )}

                    {/* PARTIES TAB */}
                    {activeTab === 'parties' && (
                        <WatchPartiesSection />
                    )}

                    {/* CHALLENGES TAB */}
                    {activeTab === 'challenges' && (
                        <ChallengesSection onNavigateToProfile={(uid) => navigate(`/profile/${uid}`)} />
                    )}

                    {/* ACTIVITY FEED */}
                    {activeTab === 'activity' && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '4px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>
                                <h2 className="manga-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Activity size={20} />
                                    {t('social.activity.title', "Activité des amis")}
                                </h2>
                                <span className="manga-badge" style={{ fontSize: '0.75rem' }}>
                                    {activities.length} UPDATES
                                </span>
                            </div>

                            {activities.length === 0 ? (
                                <div className="manga-panel" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.05)' }}>
                                    <Activity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p style={{ opacity: 0.6 }}>{t('social.activity.empty', "Aucune activité récente")}</p>
                                </div>
                            ) : (
                                <div className={styles.activityGrid}>
                                    {groupedActivities.map((group: GroupedActivity) => (
                                        <div key={group.userId} className={styles.friendCard}>
                                            <Link to={`/profile/${group.userId}`} className={styles.cardHeader}>
                                                <div style={{ 
                                                    width: 44, height: 44, 
                                                    borderRadius: '0', 
                                                    overflow: 'hidden', 
                                                    border: '2px solid var(--color-border-heavy)', 
                                                    boxShadow: '4px 4px 0 var(--color-primary)',
                                                    flexShrink: 0, 
                                                    background: 'var(--color-surface)',
                                                    position: 'relative'
                                                }}>
                                                    <OptimizedImage 
                                                        src={group.userPhoto && group.userPhoto !== '' ? group.userPhoto : undefined} 
                                                        fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${group.userName}`}
                                                        alt="Avatar" 
                                                    />
                                                </div>
                                                <div className={styles.friendName}>{group.userName}</div>
                                                <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                            </Link>

                                            <div className={styles.cardBody}>
                                                <div className={styles.activityList}>
                                                    {group.events.map((activity: ActivityEvent, idx: number) => {
                                                        const timeDiff = Date.now() - activity.timestamp;
                                                        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                                                        const timeAgo = hours < 1 ? t('social.activity.time.less_than_hour') :
                                                            hours < 24 ? t('social.activity.time.hours_ago', { hours }) :
                                                                t('social.activity.time.days_ago', { days: Math.floor(hours / 24) });

                                                        return (
                                                            <div key={activity.id} className={`${styles.activityItem} ${idx === 0 ? styles.latestHighlight : ''}`}>
                                                                <div className={styles.iconWrapper} style={{ 
                                                                    background: activity.type === 'complete' || activity.type === 'level_up' ? 'var(--color-primary)' : 'var(--color-manga-heavy)',
                                                                    color: activity.type === 'complete' || activity.type === 'level_up' ? 'white' : 'inherit',
                                                                    border: '1px solid var(--color-border-heavy)'
                                                                }}>
                                                                    {ACTIVITY_ICONS[activity.type]}
                                                                </div>
                                                                <div className={styles.activityContent}>
                                                                    <div style={{ fontWeight: 600 }}>
                                                                        {getActivityLabel(activity.type, t)}
                                                                        {activity.workTitle && activity.workId ? (
                                                                            <Link 
                                                                                to={`/work/${activity.workId}?type=${(activity.workType || (activity.episodeNumber ? 'anime' : 'manga')).toLowerCase()}`} 
                                                                                style={{ display: 'block', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 800, marginTop: '2px' }}
                                                                            >
                                                                                {activity.workTitle}
                                                                            </Link>
                                                                        ) : activity.workTitle && (
                                                                            <span style={{ display: 'block', color: 'var(--color-primary)', marginTop: '2px' }}> {activity.workTitle}</span>
                                                                        )}
                                                                        {activity.episodeNumber && <span style={{ opacity: 0.7 }}> (Ep. {activity.episodeNumber})</span>}
                                                                        {activity.newLevel && <span style={{ color: 'var(--color-primary)' }}> Lvl {activity.newLevel}</span>}
                                                                        {activity.badgeName && <span style={{ color: 'var(--color-primary)' }}> {activity.badgeName}</span>}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <Clock size={10} /> {timeAgo}
                                                                    </div>
                                                                </div>
                                                                {activity.workImage && (
                                                                    <div className={styles.workImageSmall}>
                                                                        <OptimizedImage src={activity.workImage || undefined} alt="" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* RANKING VIEW */}
                    {activeTab === 'ranking' && (
                        <>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                <h2 className="manga-title" style={{ fontSize: '1.1rem' }}>
                                    <Trophy size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} />
                                    {t('social.ranking.title', 'Classement')}
                                </h2>
                            </div>

                            {/* Category selector */}
                            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Button
                                    variant={leaderboardCategory === 'xp' ? 'primary' : 'manga'}
                                    onClick={() => setLeaderboardCategory('xp')}
                                    icon={<Trophy size={14} />}
                                >{t('social.ranking.xp')}</Button>
                                <Button
                                    variant={leaderboardCategory === 'chapters' ? 'primary' : 'manga'}
                                    onClick={() => setLeaderboardCategory('chapters')}
                                    icon={<BookOpen size={14} />}
                                >{t('social.ranking.chapters')}</Button>
                                <Button
                                    variant={leaderboardCategory === 'streak' ? 'primary' : 'manga'}
                                    onClick={() => setLeaderboardCategory('streak')}
                                    icon={<Flame size={14} />}
                                >{t('social.ranking.streak')}</Button>
                            </div>

                            {/* Podium (Top 3) */}
                            <Podium
                                users={leaderboard.slice(0, 3)}
                                category={leaderboardCategory}
                            />

                            {/* Ranking List (Rest) */}
                            <div className="mt-8">
                                <RankingList
                                    users={leaderboard.slice(3)}
                                    category={leaderboardCategory}
                                    currentUserUid={user?.uid}
                                    onAddFriend={handleQuickAdd}
                                    friendStatuses={
                                        leaderboard.slice(3).reduce((acc, curr) => ({
                                            ...acc,
                                            [curr.uid]: getFriendStatus(curr.uid)
                                        }), {} as Record<string, string>)
                                    }
                                    currentUserRank={currentUserRank}
                                    topScore={
                                        leaderboard.length > 0
                                            ? (leaderboardCategory === 'xp'
                                                ? (leaderboard[0].totalXp ?? leaderboard[0].xp ?? 0)
                                                : leaderboardCategory === 'chapters'
                                                    ? (leaderboard[0].totalChaptersRead ?? 0)
                                                    : (leaderboard[0].streak ?? 0))
                                            : undefined
                                    }
                                />
                            </div>
                        </>
                    )}

                    {/* FRIENDS VIEW */}
                    {activeTab === 'friends' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                            {/* HERO SEARCH SECTION */}
                            <div className="manga-panel" style={{ padding: '2.5rem 1rem', background: 'var(--color-surface)', textAlign: 'center', margin: '2rem 0' }}>
                                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                    {t('social.friends.add_title', 'Trouver des Héros')}
                                </h2>
                                <p style={{ opacity: 0.7, marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem auto', fontSize: '1.1rem' }}>
                                    Cherchez le pseudo de votre ami(e) pour l'ajouter à votre guilde !
                                </p>
                                
                                <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', textAlign: 'left', zIndex: 10 }}>
                                    <div className="manga-panel" style={{ 
                                        position: 'relative', 
                                        display: 'flex', 
                                        alignItems: 'stretch', 
                                        padding: 0,
                                        height: '64px'
                                    }}>
                                        <div style={{ 
                                            background: 'var(--color-primary)', 
                                            width: '64px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            borderRight: 'var(--manga-panel-border)'
                                        }}>
                                            <Search size={28} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={t('social.friends.search_placeholder', 'RECHERCHER...')}
                                            value={searchEmail}
                                            onChange={(e) => setSearchEmail(e.target.value)}
                                            style={{ 
                                                border: 'none', 
                                                outline: 'none', 
                                                width: '100%', 
                                                fontSize: '1.4rem', 
                                                fontFamily: 'var(--font-heading)', 
                                                fontWeight: 900,
                                                background: 'transparent', 
                                                color: 'var(--color-text)',
                                                padding: '0 1.5rem'
                                            }}
                                            autoComplete="off"
                                            autoCapitalize="off"
                                            spellCheck="false"
                                        />
                                        {loading && <div style={{ display: 'flex', alignItems: 'center', paddingRight: '1.5rem', animation: 'spin 1s linear infinite' }}><Activity size={24} style={{ color: 'var(--color-primary)' }} /></div>}
                                    </div>
                                    
                                    {/* Dropdown with search results */}
                                    {searchEmail.trim().length >= 2 && searchResults.length > 0 && !loading && (
                                        <div className="manga-panel" style={{
                                            position: 'absolute', top: 'calc(100% + 12px)', left: 0, right: 0,
                                            zIndex: 10, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                                        }}>
                                            {searchResults.map((result) => {
                                                const isFriend = getFriendStatus(result.uid) !== 'none';
                                                const isRequestSent = requestSent[result.uid];
                                                
                                                return (
                                                    <div 
                                                        key={result.uid} 
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                                            padding: '1rem', borderRadius: '8px', position: 'relative',
                                                            background: hoveredUser?.uid === result.uid ? 'var(--color-surface-hover)' : 'transparent',
                                                            transition: 'all 0.2s ease', cursor: 'pointer',
                                                            border: hoveredUser?.uid === result.uid ? `2px solid ${result.themeColor || 'var(--color-primary)'}` : '2px solid transparent'
                                                        }}
                                                        onMouseEnter={() => setHoveredUser(result)}
                                                        onMouseLeave={() => setHoveredUser(null)}
                                                        onClick={() => navigate(`/profile/${result.uid}`)}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                                            <div style={{ width: 48, height: 48, borderRadius: '0', overflow: 'hidden', border: `2px solid ${result.themeColor || 'var(--color-border-heavy)'}`, flexShrink: 0, boxShadow: `4px 4px 0 ${result.themeColor || 'var(--color-primary)'}` }}>
                                                                <OptimizedImage 
                                                                    src={result.photoURL || undefined} 
                                                                    fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${result.displayName}`} 
                                                                    alt="Avatar" 
                                                                />
                                                            </div>
                                                            <div style={{ minWidth: 0, paddingRight: '1rem' }}>
                                                                <div style={{ fontWeight: 800, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.displayName}</div>
                                                                
                                                                {/* Inline stats instead of floating card to prevent overflow issues */}
                                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--color-text)', opacity: 0.8 }}>
                                                                    <span style={{ color: result.themeColor || 'var(--color-primary)', fontWeight: 700 }}>Niveau {result.level || 1}</span>
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Trophy size={14} /> {(result.totalXp || result.xp || 0).toLocaleString()} XP</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {isFriend ? (
                                                            <div style={{ opacity: 0.5, fontSize: '0.9rem', fontWeight: 600 }}>Ami</div>
                                                        ) : isRequestSent ? (
                                                            <Button variant="ghost" icon={<Check size={18} />} onClick={(e) => { e.stopPropagation(); }}>Envoyé</Button>
                                                        ) : (
                                                            <Button variant="manga" onClick={(e) => { e.stopPropagation(); handleSendRequest(result); }} icon={<UserPlus size={18} />}>Ajouter</Button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {searchEmail.trim().length >= 2 && searchResults.length === 0 && !loading && (
                                        <div className="manga-panel" style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, right: 0, padding: '1.5rem', color: 'var(--color-text)', fontWeight: 800, textAlign: 'center', zIndex: 10 }}>
                                            {t('social.friends.not_found', 'AUCUN HÉROS TROUVÉ.')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PENDING REQUESTS */}
                            {friends.filter(f => f.status === 'pending' && f.direction === 'incoming').length > 0 && (
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={24} color="var(--color-primary)" /> {t('social.friends.requests_title', 'Demandes en attente')}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                                        {friends.filter(f => f.status === 'pending' && f.direction === 'incoming').map(friend => (
                                            <div key={friend.uid} className="manga-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '6px solid var(--color-primary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                                                    <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-primary)', flexShrink: 0 }}>
                                                        <OptimizedImage src={friend.photoURL || undefined} alt="Avatar" />
                                                    </div>
                                                    <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '1.1rem' }}>{friend.displayName}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                                    <Button variant="ghost" size="icon" onClick={() => handleReject(friend.uid)} style={{ color: '#ef4444' }} title="Refuser">
                                                        <X size={20} />
                                                    </Button>
                                                    <Button variant="manga" size="sm" onClick={() => handleAccept(friend.uid)}>{t('social.friends.accept', 'Accepter')}</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* FRIENDS GRID */}
                            <div>
                                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={24} color="var(--color-primary)" /> Mes Amis <span style={{ opacity: 0.5, fontSize: '1rem' }}>({friends.filter(f => f.status === 'accepted').length})</span>
                                </h3>
                                
                                {friends.filter(f => f.status === 'accepted').length === 0 ? (
                                    <div className="manga-panel" style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderStyle: 'dashed' }}>
                                        <Users size={64} style={{ opacity: 0.3 }} />
                                        <p style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{t('social.friends.no_friends', 'Votre guilde est vide pour le moment.')}</p>
                                        <p style={{ fontSize: '1rem' }}>Recherchez des amis dans la barre au-dessus pour commencer votre aventure à plusieurs !</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                                        {friends.filter(f => f.status === 'accepted').map(friend => (
                                            <div 
                                                key={friend.uid} 
                                                className="manga-panel"
                                                data-hoverable="true"
                                                style={{ 
                                                    padding: 0, 
                                                    display: 'flex', 
                                                    flexDirection: 'column',
                                                    cursor: 'pointer',
                                                    overflow: 'hidden',
                                                    height: '100%'
                                                }} 
                                                onClick={() => navigate(`/profile/${friend.uid}`)}
                                            >
                                                <div style={{ height: '80px', background: 'var(--color-border-heavy)', position: 'relative', borderBottom: 'var(--manga-panel-border)' }}>
                                                    {friend.banner ? (
                                                        <OptimizedImage src={friend.banner || undefined} alt="Banner" />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)' }} />
                                                    )}
                                                </div>
                                                
                                                {/* Move Avatar Outside of the Banner Container to avoid any overflow/clipping bugs! */}
                                                <div style={{ 
                                                    marginTop: '-32px', marginLeft: '1rem',
                                                    width: 64, height: 64, borderRadius: '0', overflow: 'hidden', 
                                                    border: 'var(--manga-panel-border)', background: 'var(--color-surface)',
                                                    position: 'relative', zIndex: 2
                                                }}>
                                                    <OptimizedImage src={friend.photoURL || undefined} alt="Avatar" />
                                                </div>
                                                
                                                <div style={{ padding: '0.5rem 1.5rem 1.5rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-heading)' }}>
                                                        {friend.displayName}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', fontWeight: 700, opacity: 0.8, marginBottom: '1rem' }}>
                                                        <span style={{ color: 'var(--color-primary)' }}>NIV {friend.level || 1}</span>
                                                        <span>{(friend.totalXp || friend.xp || 0).toLocaleString()} XP</span>
                                                    </div>
                                                    
                                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem', borderTop: 'var(--manga-panel-border)' }}>
                                                        <Button variant="manga" size="sm" style={{ flex: 1, borderRadius: 0, textTransform: 'uppercase' }} onClick={(e) => { e.stopPropagation(); navigate(`/users/${friend.uid}/library`); }} icon={<Library size={16} />}>
                                                            {t('profile.view_library', 'Médiathèque')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
