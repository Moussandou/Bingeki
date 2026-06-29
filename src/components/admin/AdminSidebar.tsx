/**
 * Admin Sidebar component (admin)
 */
import { NavLink } from '@/components/routing/LocalizedLink';
import { LayoutDashboard, Users, MessageSquare, LogOut, Home, X, Palette, Clipboard, HeartPulse, ClipboardList } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { auth } from '@/firebase/config';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AdminSidebar.module.css';
import { logger } from '@/utils/logger';

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenCommandPalette?: () => void;
}

export function AdminSidebar({ isOpen, onClose, onOpenCommandPalette }: AdminSidebarProps) {
    const { logout } = useAuthStore();
    const [isHovered, setIsHovered] = useState(false);
    const { t } = useTranslation();

    // Combined state for expansion (either hovered on desktop or open on mobile)
    const isExpanded = isHovered || isOpen;

    const handleLogout = async () => {
        try {
            await auth.signOut();
            logout();
        } catch (error) {
            logger.error('Error signing out:', error);
        }
    };

    const navItems = [
        { to: "/admin", icon: LayoutDashboard, label: t('admin.sidebar.dashboard'), end: true },
        { to: "/admin/users", icon: Users, label: t('admin.sidebar.users') },
        { to: "/admin/feedback", icon: MessageSquare, label: t('admin.sidebar.feedback') },
        { to: "/admin/survey", icon: Clipboard, label: t('admin.sidebar.survey', 'Questionnaire') },
        { to: "/admin/assets", icon: Palette, label: "Assets", end: false },
        { to: "/admin/health", icon: HeartPulse, label: t('admin.sidebar.system_health', 'Système & Santé'), end: false },
        { to: "/admin/orga", icon: ClipboardList, label: "Orga" },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className={styles.backdrop}
                    onClick={onClose}
                />
            )}

            <aside
                className={`${styles.sidebar} ${isExpanded ? styles.expanded : ''} ${isOpen ? styles.mobileOpen : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Header */}
                <div className={`${styles.header} ${isExpanded ? styles.headerExpanded : ''}`}>
                    <div className={styles.logoText}>
                        <span style={{
                            background: '#ef4444',
                            padding: '0.25rem 0.5rem',
                            display: isExpanded ? 'block' : 'none'
                        }}>ADMIN</span>
                        <span style={{ display: isExpanded ? 'block' : 'none' }}>PANEL</span>
                        <span style={{ display: !isExpanded ? 'block' : 'none', color: '#ef4444' }}>A</span>
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        style={{
                            display: isOpen ? 'block' : 'none',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            position: 'absolute',
                            right: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Trigger */}
                {onOpenCommandPalette && (
                    <div style={{ padding: '0.5rem 1rem' }}>
                        <button
                            onClick={onOpenCommandPalette}
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isExpanded ? 'space-between' : 'center',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                {isExpanded && <span style={{ fontSize: '0.8rem' }}>Rechercher...</span>}
                            </div>
                            {isExpanded && (
                                <span style={{ 
                                    fontSize: '0.65rem', 
                                    background: 'var(--color-surface)', 
                                    padding: '0.15rem 0.35rem', 
                                    borderRadius: '3px',
                                    fontWeight: 'bold',
                                    opacity: 0.8
                                }}>⌘K</span>
                            )}
                        </button>
                    </div>
                )}

                {/* Navigation */}
                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            title={!isExpanded ? item.label : ''}
                            className={({ isActive }) => `
                                ${styles.navLink} 
                                ${isExpanded ? styles.navLinkExpanded : ''} 
                                ${isActive ? styles.navLinkActive : ''} 
                                ${isActive && isExpanded ? styles.navLinkActiveExpanded : ''}
                            `}
                            onClick={() => {
                                if (window.innerWidth <= 768) onClose();
                            }}
                        >
                            <item.icon size={24} strokeWidth={2.5} />
                            <span className={`${styles.labelText} ${isExpanded ? styles.labelTextVisible : ''}`}>
                                {item.label}
                            </span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer Actions */}
                <div className={styles.footer}>
                    <NavLink to="/" className={`${styles.footerLink} ${isExpanded ? styles.footerLinkExpanded : ''}`}>
                        <Home size={20} />
                        <span style={{ display: isExpanded ? 'block' : 'none' }}>{t('admin.sidebar.back_to_site')}</span>
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className={`${styles.logoutButton} ${isExpanded ? styles.logoutButtonExpanded : ''}`}
                    >
                        <LogOut size={20} />
                        <span style={{ display: isExpanded ? 'block' : 'none' }}>{t('admin.sidebar.exit')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
