import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/firebase/firestore';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp, UserPlus, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './RankingList.module.css';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface RankingListProps {
    users: UserProfile[]; // Users starting from rank 4
    category: 'xp' | 'chapters' | 'streak';
    currentUserUid?: string;
    onAddFriend?: (user: UserProfile) => void;
    friendStatuses?: Record<string, string>; // 'none' | 'pending' | 'accepted'
    currentUserRank?: { rank: number; profile: UserProfile } | null;
}

export const RankingList: React.FC<RankingListProps> = ({
    users,
    category,
    currentUserUid,
    onAddFriend,
    friendStatuses = {},
    currentUserRank
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);

    // Initial amount to show before expansion
    const INITIAL_COUNT = 5;
    const displayedUsers = isExpanded ? users : users.slice(0, INITIAL_COUNT);
    const hasMore = users.length > INITIAL_COUNT;

    const getScore = (user: UserProfile) => {
        if (category === 'xp') return `${(user.totalXp || user.xp || 0).toLocaleString()} XP`;
        if (category === 'chapters') return `${user.totalChaptersRead || 0}`;
        if (category === 'streak') return `${user.streak || 0}j`;
        return '';
    };

    return (
        <div className={styles.container}>
            <AnimatePresence>
                {displayedUsers.map((user, index) => {
                    const globalRank = index + 4; // Start at 4
                    return (
                        <motion.div
                            key={user.uid}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={`${styles.item} ${user.uid === currentUserUid ? styles.currentUser : ''}`}
                            onClick={() => navigate(`/profile/${user.uid}`)}
                        >
                            <span className={styles.rank}>#{globalRank}</span>

                            <div className={styles.avatarFrame}>
                                <OptimizedImage
                                    src={user.photoURL || undefined}
                                    alt={user.displayName || 'User'}
                                    fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`}
                                    className={styles.avatarImage}
                                />
                            </div>

                            <div className={styles.info}>
                                <h4 className={styles.nameRow}>
                                    <span className={styles.name}>{user.displayName || t('social.ranking.anonymous')}</span>
                                    {user.featuredBadge && (
                                        <span className={styles.badge}>
                                            {user.featuredBadge}
                                        </span>
                                    )}
                                </h4>
                                <p className={styles.level}>Lvl {user.level || 1}</p>
                            </div>

                            <div className={styles.stats}>
                                <span className={styles.score}>{getScore(user)}</span>
                                <span className={styles.category}>{category}</span>
                            </div>

                            {/* Optional: Add Friend Action (prevent click propagation) */}
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
                })}
            </AnimatePresence>

            {hasMore && (
                <div className={styles.showMoreContainer}>
                    <Button
                        variant="ghost"
                        onClick={() => setIsExpanded(!isExpanded)}
                        icon={isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        className={styles.showMoreButton}
                    >
                        {isExpanded ? t('social.ranking.show_less', 'Show Less') : t('social.ranking.show_more', 'Show More')}
                    </Button>
                </div>
            )}

            {/* Current user rank when not visible in the currently displayed items */}
            {currentUserRank && !displayedUsers.some(u => u.uid === currentUserRank.profile.uid) && (
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
                        className={`${styles.item} ${styles.currentUser}`}
                        onClick={() => navigate(`/profile/${currentUserRank.profile.uid}`)}
                    >
                        <span className={styles.rank}>#{currentUserRank.rank}</span>
                        <div className={styles.avatarFrame}>
                            <OptimizedImage
                                src={currentUserRank.profile.photoURL || undefined}
                                alt={currentUserRank.profile.displayName || 'User'}
                                fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserRank.profile.displayName}`}
                                className={styles.avatarImage}
                            />
                        </div>
                        <div className={styles.info}>
                            <h4 className={styles.nameRow}>
                                <span className={styles.name}>{currentUserRank.profile.displayName || t('social.ranking.anonymous')}</span>
                                {currentUserRank.profile.featuredBadge && (
                                    <span className={styles.badge}>{currentUserRank.profile.featuredBadge}</span>
                                )}
                            </h4>
                            <p className={styles.level}>Lvl {currentUserRank.profile.level || 1}</p>
                        </div>
                        <div className={styles.stats}>
                            <span className={styles.score}>{getScore(currentUserRank.profile)}</span>
                            <span className={styles.category}>{category}</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
