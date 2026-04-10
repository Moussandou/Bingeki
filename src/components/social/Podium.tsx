/**
 * Podium component (social)
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/firebase/firestore';
import { Crown, Zap, BookOpen, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './Podium.module.css';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { calculateRank } from '@/utils/rankUtils';

interface PodiumProps {
    users: UserProfile[];
    category: 'xp' | 'chapters' | 'streak';
}

// Only site design tokens — no rainbow palette
const getRankBadgeStyle = (rankLetter: string): React.CSSProperties => {
    if (rankLetter === 'S' || rankLetter === 'A')
        return { background: 'var(--color-primary)', color: '#fff' };
    if (rankLetter === 'B' || rankLetter === 'C')
        return { background: 'var(--color-secondary)', color: '#000' };
    return {}; // default handled by CSS (.rankLetterBadge = black bg)
};

const categoryIcons = {
    xp: <Zap size={14} />,
    chapters: <BookOpen size={14} />,
    streak: <Flame size={14} />,
};

const PodiumStep = ({ user, rank, delay, category }: {
    user: UserProfile | null;
    rank: 1 | 2 | 3;
    delay: number;
    category: 'xp' | 'chapters' | 'streak';
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (!user) return <div style={{ flex: 1 }} />;

    const isFirst = rank === 1;
    const rankClass = isFirst ? styles.firstPlace : rank === 2 ? styles.secondPlace : styles.thirdPlace;
    const rankLetter = calculateRank(user.level || 1);

    const getScore = () => {
        if (category === 'xp') return `${(user.totalXp || user.xp || 0).toLocaleString()}`;
        if (category === 'chapters') return `${user.totalChaptersRead || 0}`;
        if (category === 'streak') return `${user.streak || 0}`;
        return '';
    };

    const getUnit = () => {
        if (category === 'xp') return 'XP';
        if (category === 'chapters') return 'Ch.';
        return 'j.';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.19, 1, 0.22, 1] }}
            className={`${styles.step} ${rankClass}`}
            onClick={() => navigate(`/profile/${user.uid}`)}
        >
            {/* Avatar */}
            <div className={styles.avatarContainer}>
                {isFirst && (
                    <div className={styles.crown}>
                        <Crown size={64} fill="currentColor" strokeWidth={1.5} />
                    </div>
                )}
                <div className={`${styles.avatarFrame} ${isFirst ? styles.avatarFrameFirst : ''}`}>
                    <OptimizedImage
                        src={user.photoURL || undefined}
                        alt={user.displayName || 'User'}
                        fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`}
                        className={styles.avatarImage}
                    />
                </div>
                <div className={styles.badgesRow}>
                    <div className={styles.levelBadge}>Lvl {user.level || 1}</div>
                    <div className={styles.rankLetterBadge} style={getRankBadgeStyle(rankLetter)}>
                        {rankLetter}
                    </div>
                </div>
            </div>

            {/* Name & Score */}
            <div className={styles.info}>
                <h3 className={styles.name}>{user.displayName || t('social.ranking.anonymous')}</h3>
                <p className={styles.score}>
                    <span className={styles.scoreValue}>{getScore()}</span>
                    <span className={styles.scoreUnit}>{getUnit()}</span>
                    <span className={styles.categoryIcon}>{categoryIcons[category]}</span>
                </p>
            </div>

            {/* Podium Box */}
            <div className={`${styles.box} ${isFirst ? styles.boxGold : ''}`}>
                <span className={styles.boxContent}>#{rank}</span>
            </div>
        </motion.div>
    );
};

export const Podium: React.FC<PodiumProps> = ({ users, category }) => {
    if (users.length === 0) return null;

    const first = users[0];
    const second = users.length > 1 ? users[1] : null;
    const third = users.length > 2 ? users[2] : null;

    return (
        <div className={styles.wrapper}>
            <div className={styles.wrapperBg} aria-hidden="true" />
            <div className={styles.wrapperHeader}>
                <span className={`manga-title ${styles.podiumLabel}`}>TOP 3</span>
            </div>
            <div className={styles.container}>
                <PodiumStep user={second} rank={2} delay={0.2} category={category} />
                <PodiumStep user={first} rank={1} delay={0.1} category={category} />
                <PodiumStep user={third} rank={3} delay={0.3} category={category} />
            </div>
        </div>
    );
};
