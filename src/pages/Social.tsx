import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Trophy, Users, Search, UserPlus, Check, User, X, Activity, BookOpen, Flame, Clock, Swords, Tv, Library } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
    getFriends,
    searchUserByEmail,
    searchUserByName,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriendsActivity,
    getFilteredLeaderboard,
    getUserRank,
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

import { useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { SEO } from '@/components/layout/SEO';
import styles from './Social.module.css';

export default function Social() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState<'ranking' | 'friends' | 'activity' | 'challenges' | 'parties'>('ranking');
    const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    // Leaderboard filters
    const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('xp');
    const [leaderboardPeriod] = useState<LeaderboardPeriod>('all');
    const [currentUserRank, setCurrentUserRank] = useState<{ rank: number; profile: UserProfile } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        // Always load friends to check status even in ranking
        if (user) {
            const friendsData = await getFriends(user.uid);
            setFriends(friendsData);
        }

        if (activeTab === 'ranking') {
            const data = await getFilteredLeaderboard(leaderboardCategory, leaderboardPeriod, 20);
            setLeaderboard(data);
            // Check if current user is in the top 20, if not fetch their rank
            if (user) {
                const isInTop20 = data.some(u => u.uid === user.uid);
                if (!isInTop20) {
                    const rankData = await getUserRank(user.uid, leaderboardCategory);
                    setCurrentUserRank(rankData);
                } else {
                    setCurrentUserRank(null);
                }
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


    const handleSearch = async () => {
        if (!searchEmail) return;
        setLoading(true);
        setSearchResult(null);
        setRequestSent(false);

        // Try exact email match first
        let result = await searchUserByEmail(searchEmail);

        // If not found, try by display name
        if (!result) {
            result = await searchUserByName(searchEmail);
        }

        setSearchResult(result);
        setLoading(false);
    };

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


    const handleSendRequest = async () => {
        if (!user || !searchResult) return;
        try {
            await sendFriendRequest(
                user.uid,
                { displayName: user.displayName || 'Héros', photoURL: user.photoURL || '' },
                searchResult
            );
            setRequestSent(true);
            loadData(); // Refresh list
        } catch (error) {
            console.error("Failed to send request", error);
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
                                                    <img src={activity.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userName}`}
                                                        alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                                        <img src={activity.workImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                        <div>
                            {/* Add Friend Section */}
                            <div className="manga-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--color-surface)' }}>
                                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1rem' }}>{t('social.friends.add_title')}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', border: '2px solid var(--color-border-heavy)', padding: '0.5rem' }}>
                                        <Search size={20} style={{ marginRight: '0.5rem', opacity: 0.5 }} />
                                        <input
                                            type="email"
                                            placeholder={t('social.friends.search_placeholder')}
                                            value={searchEmail}
                                            onChange={(e) => setSearchEmail(e.target.value)}
                                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                    <Button onClick={handleSearch} disabled={loading}>{t('social.friends.search_btn')}</Button>
                                </div>

                                {/* Search Result */}
                                {searchResult && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', border: '2px dashed var(--color-border-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                                <img src={searchResult.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchResult.displayName}`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{searchResult.displayName}</div>
                                            </div>
                                        </div>
                                        {requestSent ? (
                                            <Button variant="ghost" icon={<Check size={18} />}>{t('social.friends.request_sent')}</Button>
                                        ) : (
                                            <Button variant="manga" onClick={handleSendRequest} icon={<UserPlus size={18} />}>{t('social.friends.add_btn')}</Button>
                                        )}
                                    </div>
                                )}
                                {searchResult === null && searchEmail && !loading && searchResult !== undefined && ( // Check if strictly null (not found) vs undefined (initial)
                                    <div style={{ marginTop: '0.5rem', color: 'red', fontWeight: 600 }}>{t('social.friends.not_found')}</div>
                                )}
                            </div>

                            {/* Requests List */}
                            {friends.filter(f => f.status === 'pending' && f.direction === 'incoming').length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1rem' }}>{t('social.friends.requests_title')}</h3>
                                    <div className="manga-panel" style={{ padding: 0 }}>
                                        {friends.filter(f => f.status === 'pending' && f.direction === 'incoming').map(friend => (
                                            <div key={friend.uid} style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                                        <img src={friend.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                    <div style={{ fontWeight: 700 }}>{friend.displayName}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleReject(friend.uid)}
                                                        style={{ color: '#ef4444' }}
                                                        title="Refuser"
                                                    >
                                                        <X size={20} />
                                                    </Button>
                                                    <Button variant="primary" onClick={() => handleAccept(friend.uid)}>{t('social.friends.accept')}</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Friends List */}
                            <div className="manga-panel" style={{ padding: 0 }}>
                                {friends.filter(f => f.status === 'accepted').length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                                        {t('social.friends.no_friends')}
                                    </div>
                                ) : (
                                    friends.filter(f => f.status === 'accepted').map(friend => (
                                        <div key={friend.uid} style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => navigate(`/profile/${friend.uid}`)}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                                <img src={friend.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1, fontWeight: 700 }}>{friend.displayName}</div>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/users/${friend.uid}/library`); }} title={t('profile.view_library')}>
                                                <Library size={20} />
                                            </Button>
                                            <Button variant="ghost" size="icon"><User size={20} /></Button>
                                        </div>
                                    ))
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
