import { LogOut, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { type UserProfile } from '@/firebase/firestore';
import { BADGE_ICONS } from '@/utils/badges';
import { NenChart } from './NenChart';
import styles from './HunterLicenseCard.module.css';
import { useTranslation } from 'react-i18next';
import Tilt from 'react-parallax-tilt';

interface HunterLicenseCardProps {
    user: Partial<UserProfile> & { uid: string, photoURL?: string | null, displayName?: string | null };
    stats: {
        level: number;
        xp: number;
        xpToNextLevel: number;
        streak: number;
        badgeCount: number;
        totalChaptersRead?: number;
        totalWorksAdded?: number;
        totalWorksCompleted?: number;
    };
    isOwnProfile?: boolean;
    onLogout?: () => void;
    featuredBadgeData?: { icon: string, rarity: string, name: string } | null;
    favoriteMangaData?: { title: string, image: string } | null;
    top3FavoritesData?: { id: string, title: string, image: string }[];
}

export function HunterLicenseCard({ user, stats, isOwnProfile, onLogout, featuredBadgeData, favoriteMangaData, top3FavoritesData }: HunterLicenseCardProps) {
    const { t } = useTranslation();
    const borderColor = user.borderColor || 'var(--color-border)';
    const accentColor = user.themeColor || 'var(--color-primary)';
    // If no custom background set, use theme surface. Otherwise use custom.
    const bgColor = user.cardBgColor || 'var(--color-surface)';

    // Determine text color:
    // 1. If user has a custom bg color, try to pick contrasting text (simple check for black/white)
    // 2. If no custom bg (using theme), use theme text color
    const isCustomBg = !!user.cardBgColor;
    let textColor = 'var(--color-text)'; // Default to theme text

    if (isCustomBg) {
        // Simple heuristic for legacy/hardcoded custom backgrounds
        if (user.cardBgColor === '#000000' || user.cardBgColor === '#000') textColor = '#fff';
        else if (user.cardBgColor === '#ffffff' || user.cardBgColor === '#fff') textColor = '#000';
        // else leave as theme text or could default to black for unknown light colors
    }

    const cardContent = (
        <div className="manga-panel" style={{ padding: '0', overflow: 'hidden', background: bgColor, color: textColor, position: 'relative', border: `3px solid ${borderColor} ` }}>
            {user.isSuperAdmin && <div className={styles.scanlineOverlay} />}
            {user.isSuperAdmin && <div className={styles.holofoilOverlay} />}

            {/* Banner */}
            <div style={{
                height: '120px',
                background: user.banner ? `url(${user.banner}) center / cover` : accentColor,
                backgroundPosition: `center ${user.bannerPosition || 'center'}`,
                backgroundSize: 'cover',
                borderBottom: `2px solid ${borderColor} `,
                position: 'relative'
            }}>
                {!user.banner && <div className="manga-halftone" style={{ opacity: 0.2 }}></div>}
            </div>

            {/* Header Strip */}
            <div style={{ background: borderColor, color: '#fff', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontWeight: 900, letterSpacing: '2px' }}>{t('hunter_license.title')}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Stars or Rank could go here */}
                </div>
            </div>

            <div style={{ padding: '2rem', textAlign: 'center', position: 'relative' }}>
                {/* Avatar with Level Badge */}
                <div className={styles.avatarContainer}>
                    <div className={styles.avatarBox} style={{ border: `3px solid ${borderColor} ` }}>
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName || 'Bingeki'}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div >
                    <div className={`${styles.levelBadge} manga-title`} style={{ background: accentColor, border: `2px solid ${borderColor}` }}>
                        LVL {stats.level}
                    </div>
                </div >

                {/* Name & ID */}
                <h2 className={styles.name} style={{ color: textColor }}> {user.displayName || 'Chasseur'}</h2>
                <p className={styles.idText}>{t('hunter_license.id_prefix')}: {user.uid.slice(0, 8).toUpperCase()}</p>

                {user.isSuperAdmin && (
                    <div className={styles.creatorBadge}>
                        <Crown size={16} fill="currentColor" />
                        {t('roles.creator')}
                    </div>
                )}

                {/* Bio */}
                {user.bio && (
                    <p style={{ fontStyle: 'italic', marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem', borderLeft: `2px solid ${accentColor}`, paddingLeft: '1rem' }}>
                        "{user.bio}"
                    </p>
                )}

                <div className={styles.mainGrid}>

                    {/* Left Col: Favorites & Badge */}
                    <div className={styles.favoritesSection}>

                        {/* Featured Badge */}
                        {featuredBadgeData && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${borderColor}`, padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                                <div className={featuredBadgeData.rarity === 'legendary' ? 'holo-badge' : ''} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: featuredBadgeData.rarity === 'legendary' ? '#ffd700' : textColor, border: `2px solid ${borderColor}`, borderRadius: '50%', background: '#fff' }}>
                                    {BADGE_ICONS[featuredBadgeData.icon] || <Star size={20} />}
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.7, textTransform: 'uppercase' }}>BADGE</div>
                                    <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>{featuredBadgeData.name}</div>
                                </div>
                            </div>
                        )}

                        {/* Top 3 Favorites */}
                        {(top3FavoritesData && top3FavoritesData.length > 0) ? (
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase', opacity: 0.8 }}>{t('hunter_license.top_3')}</div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {top3FavoritesData.map(fav => (
                                        <div key={fav.id} style={{ width: '50px', position: 'relative' }}>
                                            <div style={{ height: '70px', border: `1px solid ${borderColor}`, borderRadius: '2px', overflow: 'hidden' }}>
                                                <img src={fav.image} alt={fav.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        </div>
                                    ))}
                                    {/* Fill empty slots if less than 3 */}
                                    {[...Array(3 - top3FavoritesData.length)].map((_, i) => (
                                        <div key={`empty-${i}`} style={{ width: '50px', height: '70px', border: `1px dashed ${borderColor}`, borderRadius: '2px', opacity: 0.3 }} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Fallback to single favorite if no top 3 set yet */
                            favoriteMangaData && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${borderColor}`, padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                                    <img src={favoriteMangaData.image} alt="Fav" style={{ width: '30px', height: '40px', objectFit: 'cover' }} />
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.7, textTransform: 'uppercase' }}>{t('hunter_license.favorite')}</div>
                                        <div style={{ fontWeight: 900, fontSize: '0.8rem', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{favoriteMangaData.title}</div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    {/* Right Col: Nen Chart */}
                    <div className={styles.chartContainer}>
                        <NenChart stats={{
                            level: stats.level,
                            xp: stats.xp,
                            streak: stats.streak,
                            totalChaptersRead: stats.totalChaptersRead || 0,
                            totalWorksAdded: stats.totalWorksAdded || 0,
                            totalWorksCompleted: stats.totalWorksCompleted || 0
                        }} themeColor={accentColor} />
                    </div>

                </div>

                {/* XP Bar */}
                <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700 }}>
                        <span>{t('stats.xp')}</span>
                        <span>{stats.xp} / {stats.xpToNextLevel}</span>
                    </div>
                    <div style={{ height: '12px', background: '#eee', border: `2px solid ${borderColor}` }}>
                        <div style={{ height: '100%', width: `${Math.min((stats.xp / stats.xpToNextLevel) * 100, 100)}%`, background: accentColor }} />
                    </div>
                </div>

                {/* Grid Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ border: `2px solid ${borderColor}`, padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{stats.streak}</div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('stats.streak')}</div>
                    </div>
                    <div style={{ border: `2px solid ${borderColor}`, padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{stats.badgeCount}</div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('stats.badges')}</div>
                    </div>
                </div>

                {isOwnProfile && onLogout && (
                    <Button variant="outline" style={{ width: '100%', borderRadius: 0, fontWeight: 900, borderColor: borderColor, color: textColor === '#fff' ? borderColor : undefined }} icon={<LogOut size={16} />} onClick={onLogout}>{t('hunter_license.logout')}</Button>
                )}
            </div >
        </div >
    );

    if (user.isSuperAdmin) {
        return (
            <div className={styles.cardWrapper}>
                <Tilt
                    tiltMaxAngleX={10}
                    tiltMaxAngleY={10}
                    perspective={1000}
                    scale={1.02}
                    transitionSpeed={500}
                    gyroscope={true}
                    glareEnable={false}
                >
                    {cardContent}
                </Tilt>
            </div>
        );
    }

    return cardContent;
}
