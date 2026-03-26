import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/firebase/firestore';
import { Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './Podium.module.css';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface PodiumProps {
    users: UserProfile[]; // Expecting sorted array, top 3 will be used
    category: 'xp' | 'chapters' | 'streak';
}

const PodiumStep = ({ user, rank, delay, category }: { user: UserProfile | null, rank: 1 | 2 | 3, delay: number, category: 'xp' | 'chapters' | 'streak' }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (!user) return <div style={{ flex: 1 }} />;

    const isFirst = rank === 1;
    const rankClass = isFirst ? styles.firstPlace : rank === 2 ? styles.secondPlace : styles.thirdPlace;

    // Helper to format score
    const getScore = (user: UserProfile) => {
        if (category === 'xp') return `${(user.totalXp || user.xp || 0).toLocaleString()} XP`;
        if (category === 'chapters') return `${user.totalChaptersRead || 0} Ch.`;
        if (category === 'streak') return `${user.streak || 0} Days`;
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`${styles.step} ${rankClass}`}
            onClick={() => navigate(`/profile/${user.uid}`)}
        >
            {/* Avatar */}
            <div className={styles.avatarContainer}>
                <div className={styles.avatarFrame}>
                    <OptimizedImage
                        src={user.photoURL || undefined}
                        alt={user.displayName || 'User'}
                        fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`}
                        className={styles.avatarImage}
                    />
                </div>
                {isFirst && (
                    <div className={styles.crown}>
                        <Crown size={32} fill="currentColor" strokeWidth={1.5} />
                    </div>
                )}
                <div className={styles.levelBadge}>
                    Lvl {user.level || 1}
                </div>
            </div>

            {/* Name & Score */}
            <div className={styles.info}>
                <h3 className={styles.name}>{user.displayName || t('social.ranking.anonymous')}</h3>
                <p className={styles.score}>{getScore(user)}</p>
            </div>

            {/* Podium Box */}
            <div className={styles.box}>
                <span className={styles.boxContent}>
                    #{rank}
                </span>
            </div>
        </motion.div>
    );
};

export const Podium: React.FC<PodiumProps> = ({ users, category }) => {
    // We need at least 1 user to show something.
    if (users.length === 0) return null;

    const first = users[0];
    const second = users.length > 1 ? users[1] : null;
    const third = users.length > 2 ? users[2] : null;

    return (
        <div className={styles.container}>
            {/* Order: 2 - 1 - 3 */}
            <PodiumStep user={second} rank={2} delay={0.2} category={category} />
            <PodiumStep user={first} rank={1} delay={0.1} category={category} />
            <PodiumStep user={third} rank={3} delay={0.3} category={category} />
        </div>
    );
};
