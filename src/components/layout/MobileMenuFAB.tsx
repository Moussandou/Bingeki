import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { auth } from '@/firebase/config';
import {
    Menu, X, MessageSquare, Calendar, History as HistoryIcon,
    Newspaper, ScanSearch, MessageCircle, User, Settings, LogOut
} from 'lucide-react';
import styles from './MobileMenuFAB.module.css';

export function MobileMenuFAB() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => setIsOpen(false);

    const handleLogout = async () => {
        await auth.signOut();
        handleClose();
        navigate('/');
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        },
        exit: {
            opacity: 0,
            transition: {
                staggerChildren: 0.05,
                staggerDirection: -1
            }
        }
    } as const;

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.8 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring' as const,
                damping: 12,
                stiffness: 200
            }
        },
        exit: {
            opacity: 0,
            y: 10,
            scale: 0.8,
            transition: {
                duration: 0.2
            }
        }
    } as const;

    const menuItems = [
        { to: '/social', icon: MessageSquare, label: t('header.community') },
        { to: '/schedule', icon: Calendar, label: t('header.agenda') },
        { to: '/changelog', icon: HistoryIcon, label: t('header.changelog') },
        { to: '/news', icon: Newspaper, label: 'Anime News' },
        { to: '/lens', icon: ScanSearch, label: t('header.lens') },
        { to: '/feedback', icon: MessageCircle, label: t('header.feedback') },
    ];

    const authItems = user ? [
        { to: '/feedback?tab=tickets', icon: MessageSquare, label: t('feedback.my_tickets'), className: styles.authAction },
        { to: '/profile', icon: User, label: t('header.profile'), className: styles.authAction },
        { to: '/settings', icon: Settings, label: t('header.settings'), className: styles.authAction },
    ] : [];

    return (
        <div className={styles.fabContainer}>
            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />
                )}
            </AnimatePresence>

            {/* Menu Items */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.menuList}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* Logout button first (bottom-most in the list above FAB) */}
                        {user && (
                            <motion.button
                                variants={itemVariants}
                                className={`${styles.menuItemCard} ${styles.authAction} ${styles.logoutAction}`}
                                onClick={handleLogout}
                            >
                                <LogOut size={20} />
                                <span>{t('header.logout')}</span>
                            </motion.button>
                        )}

                        {/* Auth items */}
                        {authItems.map((item, index) => (
                            <motion.div key={`auth-${index}`} variants={itemVariants}>
                                <Link to={item.to} className={`${styles.menuItemCard} ${item.className}`} onClick={handleClose}>
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            </motion.div>
                        ))}

                        {/* Standard items */}
                        {[...menuItems].reverse().map((item, index) => (
                            <motion.div key={`menu-${index}`} variants={itemVariants}>
                                <Link to={item.to} className={styles.menuItemCard} onClick={handleClose}>
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The Floating Action Button */}
            <motion.button
                className={`${styles.fabButton} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={isOpen ? "Close menu" : "Open menu"}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X size={28} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="menu"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Menu size={28} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
