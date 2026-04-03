import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/firebase/firestore';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, UserPlus, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './RankingList.module.css';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { calculateRank } from '@/utils/rankUtils';
import { MOCK_BADGES } from '@/types/badge';

// Only site design tokens — no rainbow palette
const getRankBadgeStyle = (rankLetter: string): React.CSSProperties => {
    if (rankLetter === 'S' || rankLetter === 'A')
        return { background: 'var(--color-primary)', color: '#fff' };
    if (rankLetter === 'B' || rankLetter === 'C')
        return { background: 'var(--color-secondary)', color: '#000' };
    return {}; // default = black bg via CSS class
};

const PAGE_SIZE = 10;

interface RankingListProps {
    users: UserProfile[];
    category: 'xp' | 'chapters' | 'streak';
    currentUserUid?: string;
    onAddFriend?: (user: UserProfile) => void;
    friendStatuses?: Record<string, string>;
    currentUserRank?: { rank: number; profile: UserProfile } | null;
    topScore?: number;
}

export const RankingList: React.FC<RankingListProps> = ({
    users,
    category,
    currentUserUid,
    onAddFriend,
    friendStatuses = {},
    currentUserRank,
    topScore,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [page, setPage] = useState(0);

    const totalPages = Math.ceil(users.length / PAGE_SIZE);
    const pageUsers = users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Rank range label for the page nav e.g. "4–13"
    const pageStart = page * PAGE_SIZE + 4;
    const pageEnd = Math.min((page + 1) * PAGE_SIZE + 3, users.length + 3);

    const getScore = (user: UserProfile): number => {
        if (category === 'xp') return user.totalXp ?? user.xp ?? 0;
        if (category === 'chapters') return user.totalChaptersRead ?? 0;
        if (category === 'streak') return user.streak ?? 0;
        return 0;
    };

    const formatScore = (user: UserProfile): string => {
        const val = getScore(user);
        if (category === 'xp') return `${val.toLocaleString()} XP`;
        if (category === 'chapters') return `${val} ch.`;
        if (category === 'streak') return `${val}j`;
        return '';
    };

    const getProgressPct = (user: UserProfile): number => {
        if (!topScore || topScore <= 0) return 0;
        return Math.min(100, Math.round((getScore(user) / topScore) * 100));
    };

    const getRankTierClass = (globalRank: number): string => {
        if (globalRank <= 6) return styles.rankTierTop;
        if (globalRank <= 10) return styles.rankTierMid;
        return styles.rankTierBase;
    };

    const renderItem = (user: UserProfile, globalRank: number, isCurrentUser: boolean) => {
        const rankLetter = calculateRank(user.level || 1);
        const progressPct = getProgressPct(user);
        // Resolve badge ID → display name
        const featuredBadgeName = user.featuredBadge
            ? MOCK_BADGES.find(b => b.id === user.featuredBadge)?.name ?? null
            : null;

        return (
            <motion.div
                key={user.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: Math.min((globalRank - pageStart) * 0.04, 0.3) }}
                className={`${styles.item} ${isCurrentUser ? styles.currentUser : ''}`}
                onClick={() => navigate(`/profile/${user.uid}`)}
            >
                {/* Rank number */}
                <span className={`${styles.rank} ${getRankTierClass(globalRank)}`}>
                    #{globalRank}
                </span>

                {/* Avatar */}
                <div className={`${styles.avatarFrame} ${globalRank <= 6 ? styles.avatarTop : ''}`}>
                    <OptimizedImage
                        src={user.photoURL || undefined}
                        alt={user.displayName || 'User'}
                        fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`}
                        className={styles.avatarImage}
                    />
                </div>

                {/* Info */}
                <div className={styles.info}>
                    <h4 className={styles.nameRow}>
                        <span className={styles.name}>{user.displayName || t('social.ranking.anonymous')}</span>
                        {featuredBadgeName && (
                            <span className={styles.featuredBadge}>{featuredBadgeName}</span>
                        )}
                    </h4>
                    <div className={styles.metaRow}>
                        <span className={styles.level}>Lvl {user.level || 1}</span>
                        <span className={styles.rankLetterBadge} style={getRankBadgeStyle(rankLetter)}>
                            {rankLetter}
                        </span>
                    </div>
                </div>

                {/* Stats + progress */}
                <div className={styles.stats}>
                    <span className={styles.score}>{formatScore(user)}</span>
                    {topScore !== undefined && topScore > 0 && (
                        <div className={styles.progressRow}>
                            <span className={styles.progressLabel}>{progressPct}% du #1</span>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Friend action */}
                {user.uid !== currentUserUid && onAddFriend && (
                    <div onClick={(e) => e.stopPropagation()} className={styles.actions}>
                        {friendStatuses[user.uid] === 'none' && (
                            <Button size="sm" variant="ghost" onClick={() => onAddFriend(user)}>
                                <UserPlus size={18} />
                            </Button>
                        )}
                        {friendStatuses[user.uid] === 'pending' && (
                            <span className={styles.pending}>{t('social.ranking.pending')}</span>
                        )}
                        {friendStatuses[user.uid] === 'accepted' && (
                            <User size={18} className={styles.accepted} />
                        )}
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className={styles.container}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={page}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className={styles.pageContent}
                >
                    {pageUsers.map((user, index) => {
                        const globalRank = page * PAGE_SIZE + index + 4;
                        return renderItem(user, globalRank, user.uid === currentUserUid);
                    })}
                </motion.div>
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <Button
                        variant="manga"
                        size="sm"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                        icon={<ChevronLeft size={16} />}
                    />
                    <div className={styles.pageInfo}>
                        <span className={styles.pageRange}>#{pageStart}–#{pageEnd}</span>
                        <span className={styles.pageCount}>{page + 1} / {totalPages}</span>
                    </div>
                    <Button
                        variant="manga"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                        icon={<ChevronRight size={16} />}
                    />
                </div>
            )}

            {/* Current user rank when not in visible list */}
            {currentUserRank && !pageUsers.some(u => u.uid === currentUserRank.profile.uid) && (
                <div className={styles.currentUserSection}>
                    <div className={styles.separator}>
                        <div className={styles.separatorLine} />
                        <span className={styles.separatorLabel}>{t('social.ranking.your_ranking', 'Votre classement')}</span>
                        <div className={styles.separatorLine} />
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderItem(currentUserRank.profile, currentUserRank.rank, true)}
                    </motion.div>
                </div>
            )}
        </div>
    );
};
