import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Trophy, Users, Search, UserPlus, Check, X, Activity, BookOpen, Flame, Clock, Swords, Tv, Library, Newspaper } from 'lucide-react';
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
    getUserProfile,
    type Friend,
    type UserProfile,
    type LeaderboardCategory,
    type LeaderboardPeriod
} from '@/firebase/firestore';
import type { ActivityEvent } from '@/types/activity';
import { ACTIVITY_EMOJIS, getActivityLabel } from '@/types/activity';
import { ChallengesSection } from '@/components/gamification/ChallengesSection';
import { WatchPartiesSection } from '@/components/social/WatchPartiesSection';
import { Podium } from '@/components/social/Podium';
import { RankingList } from '@/components/social/RankingList';
import { SocialFeed } from '@/components/social/SocialFeed';

import { useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { SEO } from '@/components/layout/SEO';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import styles from './Social.module.css';

export default function Social() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState<'feed' | 'ranking' | 'friends' | 'activity' | 'challenges' | 'parties'>('ranking');
    const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
    const [friends, setFriends] = useState<(Friend & { banner?: string; xp?: number; totalXp?: number; level?: number })[]>([]);
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [hoveredUser, setHoveredUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [requestSent, setRequestSent] = useState<Record<string, boolean>>({});

    // Leaderboard filters
    const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('xp');
    const [leaderboardPeriod] = useState<LeaderboardPeriod>('all');
    const [currentUserRank, setCurrentUserRank] = useState<{ rank: number; profile: UserProfile } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        // Always load friends to check status even in ranking
        if (user) {
            const friendsData = await getFriends(user.uid);
            
            // Enrich accepted friends with their full profile to get banner and stats
            const enrichedFriends = await Promise.all(friendsData.map(async (f) => {
                if (f.status === 'accepted') {
                    const profile = await getUserProfile(f.uid);
                    if (profile) {
                        return { ...f, banner: profile.banner, xp: profile.xp, totalXp: profile.totalXp, level: profile.level, photoURL: profile.photoURL || f.photoURL };
                    }
                }
                return f;
            }));
            
            setFriends(enrichedFriends);
        }

        if (activeTab === 'ranking') {
            const getLeaderboardFn = httpsCallable<
                { category: string; limit: number },
                { leaderboard: (UserProfile & { rank: number })[] }
            >(functions, 'getLeaderboard');

            // Fetch leaderboard and user rank in parallel
            const [result, rankData] = await Promise.all([
                getLeaderboardFn({ category: leaderboardCategory, limit: 20 }),
                user ? getUserRank(user.uid, leaderboardCategory) : Promise.resolve(null)
            ]);

            const data = result.data.leaderboard as UserProfile[];
            setLeaderboard(data);

            if (user) {
                const isInTop3 = data.slice(0, 3).some(u => u.uid === user.uid);
                setCurrentUserRank(isInTop3 ? null : rankData);
            }
        } else if (activeTab === 'activity' && user) {
            const activityData = await getFriendsActivity(user.uid, 30);
            setActivities(activityData);
        }
        setLoading(false);
    }, [activeTab, leaderboardCategory, leaderboardPeriod, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);


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
            console.error("Failed to add friend", error);
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
            console.error("Failed to send request", error);
            addToast(t('social.friends.request_error'), 'error');
        }
    };

    const handleAccept = async (friendUid: string) => {
        if (!user) return;
        try {
            await acceptFriendRequest(user.uid, friendUid);
            loadData(); // Refresh to show accepted status
        } catch (error) {
            console.error("Failed to accept", error);
        }
    };

    const handleReject = async (friendUid: string) => {
        if (!user) return;

        // Optimistic update: Remove immediately from UI
        setFriends(prev => prev.filter(f => f.uid !== friendUid));

        try {
            await rejectFriendRequest(user.uid, friendUid);
            console.log("Friend request rejected successfully");
            addToast(t('social.friends.reject_success'), 'info');
        } catch (error) {
            console.error("Failed to reject", error);
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
                            variant={activeTab === 'ranking' ? 'primary' : 'ghost'}
                            onClick={() => setActiveTab('ranking')}
                            icon={<Trophy size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.ranking')}
                        </Button>
                        <Button
                            variant={activeTab === 'feed' ? 'primary' : 'ghost'}
                            onClick={() => setActiveTab('feed')}
                            icon={<Newspaper size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.feed')}
                        </Button>
                        <Button
                            variant={activeTab === 'activity' ? 'primary' : 'ghost'}
                            onClick={() => setActiveTab('activity')}
                            icon={<Activity size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.activity')}
                        </Button>
                        <Button
                            variant={activeTab === 'challenges' ? 'primary' : 'ghost'}
                            onClick={() => setActiveTab('challenges')}
                            icon={<Swords size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.challenges')}
                        </Button>
                        <Button
                            variant={activeTab === 'parties' ? 'primary' : 'ghost'}
                            onClick={() => setActiveTab('parties')}
                            icon={<Tv size={20} />}
                            style={{ flexShrink: 0 }}
                        >
                            {t('social.tabs.parties')}
                        </Button>
                        <Button
                            variant={activeTab === 'friends' ? 'primary' : 'ghost'}
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
                        <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)' }}>
                            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Flame size={24} color="#ef4444" /> {t('social.activity.title')}
                            </h2>
                            {loading ? (
                                <p style={{ textAlign: 'center', opacity: 0.6 }}>{t('social.activity.loading')}</p>
                            ) : activities.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                    <p>{t('social.activity.no_activity')}</p>
                                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{t('social.activity.add_friends_hint')}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {activities.map((activity) => {
                                        /* eslint-disable-next-line */
                                        const timeDiff = Date.now() - activity.timestamp;
                                        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                                        const timeAgo = hours < 1 ? t('social.activity.time.less_than_hour') :
                                            hours < 24 ? t('social.activity.time.hours_ago', { hours }) :
                                                t('social.activity.time.days_ago', { days: Math.floor(hours / 24) });

                                        return (
                                            <div key={activity.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '1rem',
                                                background: 'var(--color-surface-hover)',
                                                borderRadius: '8px',
                                                border: '1px solid var(--color-border)'
                                            }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)', flexShrink: 0 }}>
                                                    <OptimizedImage 
                                                        src={activity.userPhoto || undefined} 
                                                        fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userName}`}
                                                        alt="Avatar" 
                                                    />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{
                                                        fontWeight: 600,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        lineHeight: '1.2'
                                                    }}>
                                                        {ACTIVITY_EMOJIS[activity.type]} <strong>{activity.userName}</strong> {getActivityLabel(activity.type, t)}
                                                        {activity.workTitle && <span style={{ color: 'var(--color-primary)' }}> {activity.workTitle}</span>}
                                                        {activity.episodeNumber && <span> (Ep. {activity.episodeNumber})</span>}
                                                        {activity.newLevel && <span style={{ color: 'var(--color-primary)' }}> {activity.newLevel}</span>}
                                                        {activity.badgeName && <span style={{ color: 'var(--color-primary)' }}> {activity.badgeName}</span>}
                                                    </p>
                                                    <p style={{ fontSize: '0.75rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                        <Clock size={12} /> {timeAgo}
                                                    </p>
                                                </div>
                                                {activity.workImage && (
                                                    <div style={{ width: 50, height: 70, borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                                        <OptimizedImage src={activity.workImage || undefined} alt="" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* RANKING VIEW */}
                    {activeTab === 'ranking' && (
                        <>
                            {/* Leaderboard Filters */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {/* <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t('social.ranking.filter_by')}</span> */}
                                    <Button
                                        variant={leaderboardCategory === 'xp' ? 'manga' : 'ghost'}
                                        size="sm"
                                        onClick={() => setLeaderboardCategory('xp')}
                                        icon={<Trophy size={14} />}
                                    >{t('social.ranking.xp')}</Button>
                                    <Button
                                        variant={leaderboardCategory === 'chapters' ? 'manga' : 'ghost'}
                                        size="sm"
                                        onClick={() => setLeaderboardCategory('chapters')}
                                        icon={<BookOpen size={14} />}
                                    >{t('social.ranking.chapters')}</Button>
                                    <Button
                                        variant={leaderboardCategory === 'streak' ? 'manga' : 'ghost'}
                                        size="sm"
                                        onClick={() => setLeaderboardCategory('streak')}
                                        icon={<Flame size={14} />}
                                    >{t('social.ranking.streak')}</Button>
                                </div>
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
