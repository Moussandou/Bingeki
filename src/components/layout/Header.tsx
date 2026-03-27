import { Link } from '@/components/routing/LocalizedLink';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import {
    User, Book, Home, ChevronDown, Flame, Search,
    LogOut,
    Calendar,
    History as HistoryIcon,
    Settings,
    MessageSquare,
    MessageCircle, Sun, Moon, Compass,
    Newspaper,
    ScanSearch,
    ShieldCheck
} from 'lucide-react';

import { GlobalSearch } from '@/components/search/GlobalSearch';
import { useAuthStore } from '@/store/authStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { auth } from '@/firebase/config';
import styles from './Header.module.css';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';

function NotificationDropdown() {
    const { t } = useTranslation();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    // Close on outside click could be added here or via a wrapper

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={styles.iconButton}
                title={t('header.notifications') || 'Notifications'}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        background: 'var(--color-primary)',
                        color: 'white',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--color-surface)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'absolute',
                            top: '120%',
                            right: -50, // Slight offset
                            width: '320px',
                            background: 'var(--color-surface)',
                            border: '3px solid var(--color-border)',
                            boxShadow: '4px 4px 0 var(--color-shadow-strong)',
                            zIndex: 1000,
                            maxHeight: '400px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Dropdown Header */}
                        <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-background)' }}>
                            <span style={{ fontWeight: 900, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>Notifications</span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {t('common.mark_all_read') || 'Mark all read'}
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                                    {t('common.no_notifications') || 'No notifications yet'}
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <Link
                                        key={n.id}
                                        to={n.link || '#'}
                                        onClick={() => {
                                            markAsRead(n.id);
                                            setIsOpen(false);
                                        }}
                                        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <div style={{
                                            padding: '0.75rem',
                                            borderBottom: '1px solid var(--color-border-light)',
                                            background: n.read ? 'transparent' : 'rgba(var(--color-primary-rgb), 0.05)',
                                            position: 'relative',
                                            transition: 'background 0.2s'
                                        }}
                                            className="hover:bg-black/5 dark:hover:bg-white/5"
                                        >
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', marginTop: 6, flexShrink: 0 }} />}
                                                <div>
                                                    <p style={{ fontWeight: n.read ? 600 : 800, fontSize: '0.9rem', marginBottom: '0.1rem' }}>{n.title}</p>
                                                    <p style={{ fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.3 }}>{n.body}</p>
                                                    <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.3rem' }}>
                                                        {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '0.5rem', borderTop: '1px solid var(--color-border)', textAlign: 'center', background: 'var(--color-background)' }}>
                            <Link to="/notifications" onClick={() => setIsOpen(false)} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
                                {t('common.view_all') || 'View All'}
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function Header() {
    const { user, userProfile } = useAuthStore();
    const { level, xp, streak } = useGamificationStore();
    const { theme, toggleTheme } = useSettingsStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Scroll to top on navigation
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    // I18n setup
    const { t, i18n } = useTranslation();
    const toggleLanguage = () => {
        const newLang = i18n.language === 'fr' ? 'en' : 'fr';
        // The structure is guaranteed to be /:lang/... by LanguageManager
        const pathSegments = location.pathname.split('/');
        pathSegments[1] = newLang;
        navigate(pathSegments.join('/') + location.search);
    };

    const isActive = (path: string) => {
        const currentPath = location.pathname;
        const cleanPath = currentPath.replace(/^\/(fr|en)/, '') || '/';
        return cleanPath === path;
    };

    return (
        <>
            {/* Top Header */}
            <header className={styles.header}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>

                    {/* Left: Logo */}
                    <Link to="/" className={`${styles.logo} text-gradient`}>
                        <OptimizedImage src="/logo.png" alt="Bingeki Logo" style={{ width: 50, height: 50 }} objectFit="contain" showSkeleton={false} priority />
                        <div className={styles.logoText}>
                            <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', letterSpacing: '-1px' }}>BINGEKI</span>
                        </div>
                    </Link>

                    {/* Center: Navigation (Desktop) */}
                    {user && (
                        <nav className={styles.desktopNav} style={{ gap: '1rem' }}>
                            <Link to="/dashboard" className={`${styles.navLink} ${isActive('/dashboard') ? styles.activeLink : ''} `}>
                                <Home size={18} />
                                <span className="hidden-tablet">{t('header.dashboard')}</span>
                            </Link>
                            <Link to="/discover" className={`${styles.navLink} ${isActive('/discover') ? styles.activeLink : ''} `}>
                                <Compass size={18} />
                                <span className="hidden-tablet">{t('header.discover')}</span>
                            </Link>

                            <Link to="/library" className={`${styles.navLink} ${isActive('/library') ? styles.activeLink : ''} `}>
                                <Book size={18} />
                                <span className="hidden-tablet">{t('header.library')}</span>
                            </Link>

                            {/* More Dropdown */}
                            <div className={styles.navLink} style={{ cursor: 'pointer', position: 'relative' }}
                                onMouseEnter={() => document.getElementById('more-dropdown')?.style.setProperty('display', 'flex')}
                                onMouseLeave={() => document.getElementById('more-dropdown')?.style.setProperty('display', 'none')}
                            >
                                <span className="hidden-tablet">{t('header.more')}</span>
                                <ChevronDown size={14} />

                                <div id="more-dropdown" style={{
                                    display: 'none',
                                    position: 'absolute',
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--color-surface)',
                                    border: '3px solid var(--color-border)',
                                    boxShadow: '4px 4px 0 var(--color-shadow-strong)',
                                    padding: '0.5rem',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    zIndex: 100,
                                    minWidth: '180px'
                                }}>
                                    <Link to="/social" className={styles.dropdownItem} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <MessageSquare size={16} /> {t('header.community')}
                                    </Link>
                                    <Link to="/schedule" className={styles.dropdownItem} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <Calendar size={16} /> {t('header.agenda')}
                                    </Link>
                                    <Link to="/changelog" className={styles.dropdownItem} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <HistoryIcon size={16} /> {t('header.changelog')}
                                    </Link>
                                    <Link to="/news" className={styles.dropdownItem} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <Newspaper size={16} /> Anime News
                                    </Link>
                                    <Link to="/lens" className={styles.dropdownItem} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <ScanSearch size={16} /> {t('header.lens')}
                                    </Link>
                                    <Link to="/feedback" className={styles.dropdownItem} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <MessageCircle size={16} /> {t('header.feedback')}
                                    </Link>
                                    <Link to="/feedback?tab=tickets" className={styles.dropdownItem} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <MessageSquare size={16} /> {t('feedback.my_tickets')}
                                    </Link>
                                    {userProfile?.isAdmin && (
                                        <Link to="/admin" className={`${styles.dropdownItem} ${styles.adminOption}`} style={{ textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                            <ShieldCheck size={16} /> Admin Panel
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </nav>
                    )}

                    {/* Discover link - accessible to all */}
                    {!user && (
                        <nav className={styles.desktopNav} style={{ gap: '1rem' }}>
                            <Link to="/discover" className={`${styles.navLink} ${isActive('/discover') ? styles.activeLink : ''} `}>
                                <Search size={18} />
                                <span>{t('header.discover')}</span>
                            </Link>
                            <Link to="/schedule" className={`${styles.navLink} ${isActive('/schedule') ? styles.activeLink : ''} `}>
                                <Calendar size={18} />
                                <span className="hidden-tablet">{t('header.agenda')}</span>
                            </Link>
                            <Link to="/changelog" className={`${styles.navLink} ${isActive('/changelog') ? styles.activeLink : ''} `} title={t('header.changelog')}>
                                <HistoryIcon size={18} />
                                <span className="hidden-tablet">{t('header.changelog')}</span>
                            </Link>
                            <Link to="/news" className={`${styles.navLink} ${isActive('/news') ? styles.activeLink : ''} `} title="Anime News">
                                <Newspaper size={18} />
                                <span className="hidden-tablet">Anime News</span>
                            </Link>
                        </nav>
                    )}

                    {/* Right: Stats & Actions */}
                    <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>



                        {/* Search Button (Mobile) */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className={styles.iconButton}
                            title={t('header.search_placeholder') || "Search"}
                        >
                            <Search size={18} />
                        </button>




                        {/* Theme Switcher */}
                        <button
                            onClick={toggleTheme}
                            className={styles.iconButton}
                            title={`Theme: ${theme}`}
                        >
                            {theme === 'light' && <Sun size={18} />}
                            {theme === 'dark' && <Moon size={18} />}
                        </button>

                        {/* Language Switcher */}
                        <button
                            onClick={toggleLanguage}
                            className={styles.iconButton}
                            style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.9rem' }}
                            title={i18n.language === 'fr' ? 'Switch to English' : 'Passer en Français'}
                        >
                            {i18n.language === 'en' ? 'EN' : 'FR'}
                        </button>

                        {/* Notifications (Desktop) */}
                        <div className="desktopOnly">
                            <NotificationDropdown />
                        </div>

                        {user ? (
                            <>
                                {/* Stats (Desktop only mainly) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Streak - Desktop Only */}
                                    <div className={`${styles.streakContainer} desktopOnly`}>
                                        <Flame size={20} fill="currentColor" />
                                        <span>{streak}</span>
                                    </div>

                                    {/* Level Pill - Responsive & Animated */}
                                    <Link to="/profile" style={{ textDecoration: 'none' }}>
                                        <div className={styles.statusPill} style={{ cursor: 'pointer' }}>
                                            <span className={styles.levelValue}>Lvl {level}</span>
                                            <div className={styles.xpDetails}>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span>{xp} XP</span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>

                                {/* Profile Dropdown */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className={styles.profileDropdown}
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <div style={{ width: 30, height: 30, borderRadius: '0', background: '#333', overflow: 'hidden', border: '2px solid var(--color-border)' }}>
                                            <OptimizedImage src={userProfile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.displayName || user?.displayName || 'Bingeki'}`} alt="Avatar" style={{ width: '100%', height: '100%' }} objectFit="cover" showSkeleton={false} />
                                        </div >
                                        <ChevronDown size={16} style={{ opacity: 0.7, color: 'var(--color-text)', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                    </button >

                                    {/* Dropdown Menu */}
                                    {
                                        isDropdownOpen && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '120%',
                                                right: 0,
                                                width: '200px',
                                                background: 'var(--color-surface)',
                                                border: '3px solid var(--color-border)',
                                                boxShadow: '4px 4px 0 var(--color-shadow-strong)',
                                                padding: '0.5rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem',
                                                zIndex: 100
                                            }}>
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid transparent' }}
                                                    className={styles.dropdownItem}
                                                >
                                                    <User size={18} /> {t('header.profile')}
                                                </Link>
                                                <Link
                                                    to="/settings"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid transparent' }}
                                                    className={styles.dropdownItem}
                                                >
                                                    <Settings size={18} /> {t('header.settings')}
                                                </Link>
                                                <Link
                                                    to="/feedback?tab=tickets"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid transparent' }}
                                                    className={styles.dropdownItem}
                                                >
                                                    <MessageSquare size={18} /> {t('feedback.my_tickets')}
                                                </Link>
                                                <div style={{ height: '1px', background: '#eee', margin: '0.25rem 0' }}></div>
                                                <button
                                                    onClick={async () => {
                                                        await auth.signOut();
                                                        setIsDropdownOpen(false);
                                                        navigate('/'); // Redirect to home
                                                    }}
                                                    style={{ padding: '0.75rem', fontWeight: 700, color: 'red', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                                    className={styles.dropdownItem}
                                                >
                                                    <LogOut size={18} /> {t('header.logout')}
                                                </button>
                                            </div>
                                        )
                                    }
                                </div >
                            </>
                        ) : (
                            <Link to="/auth">
                                <Button size="sm">{t('header.login')}</Button>
                            </Link>
                        )}
                    </div >
                </div>
            </header >

            {/* Mobile Bottom Dock - REDUCED to Core Items */}
            {
                user && (
                    <nav className={styles.mobileNav}>
                        <Link to="/dashboard">
                            <Button variant={isActive('/dashboard') ? 'primary' : 'ghost'} size="icon" style={{ borderRadius: '12px' }}>
                                <Home size={22} />
                            </Button>
                        </Link>
                        <Link to="/discover">
                            <Button variant={isActive('/discover') ? 'primary' : 'ghost'} size="icon" style={{ borderRadius: '12px' }}>
                                <Compass size={22} />
                            </Button>
                        </Link>
                        <Link to="/library">
                            <Button variant={isActive('/library') ? 'primary' : 'ghost'} size="icon" style={{ borderRadius: '12px' }}>
                                <Book size={22} />
                            </Button>
                        </Link>
                    </nav>
                )
            }

            {/* Mobile Bottom Dock for Guests - Only Discover */}
            {
                !user && (
                    <nav className={styles.mobileNav}>
                        <Link to="/">
                            <Button variant={isActive('/') ? 'primary' : 'ghost'} size="icon" style={{ borderRadius: '12px' }}>
                                <Home size={22} />
                            </Button>
                        </Link>
                        <Link to="/discover">
                            <Button variant={isActive('/discover') ? 'primary' : 'ghost'} size="icon" style={{ borderRadius: '12px' }}>
                                <Compass size={22} />
                            </Button>
                        </Link>
                        <Link to="/auth">
                            <Button variant={isActive('/auth') ? 'primary' : 'ghost'} size="icon" style={{ borderRadius: '12px' }}>
                                <User size={22} />
                            </Button>
                        </Link>
                    </nav>
                )
            }
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
}

