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

    return (
        <div className={styles.fabContainer}>
            {/* The Floating Action Button */}
            <motion.button
                className={styles.fabButton}
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open menu"
            >
                <Menu size={24} />
            </motion.button>

            {/* Bottom Sheet Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    >
                        {/* The Bottom Sheet */}
                        <motion.div
                            className={styles.bottomSheet}
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            onClick={(e) => {
                                // @ts-ignore
                                e.stopPropagation();
                            }} // Prevent clicks inside from closing
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100) {
                                    handleClose();
                                }
                            }}
                        >
                            <div className={styles.sheetHeader}>
                                <h2 className={styles.sheetTitle}>Menu</h2>
                                <button className={styles.closeButton} onClick={handleClose}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className={styles.menuGrid}>
                                <Link to="/social" className={styles.menuItem} onClick={handleClose}>
                                    <MessageSquare size={24} />
                                    <span>{t('header.community')}</span>
                                </Link>
                                <Link to="/schedule" className={styles.menuItem} onClick={handleClose}>
                                    <Calendar size={24} />
                                    <span>{t('header.agenda')}</span>
                                </Link>
                                <Link to="/changelog" className={styles.menuItem} onClick={handleClose}>
                                    <HistoryIcon size={24} />
                                    <span>{t('header.changelog')}</span>
                                </Link>
                                <Link to="/news" className={styles.menuItem} onClick={handleClose}>
                                    <Newspaper size={24} />
                                    <span>Anime News</span>
                                </Link>
                                <Link to="/lens" className={styles.menuItem} onClick={handleClose}>
                                    <ScanSearch size={24} />
                                    <span>{t('header.lens')}</span>
                                </Link>
                                <Link to="/feedback" className={styles.menuItem} onClick={handleClose}>
                                    <MessageCircle size={24} />
                                    <span>{t('header.feedback')}</span>
                                </Link>
                                {user && (
                                    <Link to="/feedback?tab=tickets" className={`${styles.menuItem} ${styles.authAction}`} onClick={handleClose}>
                                        <MessageSquare size={20} />
                                        <span>{t('feedback.my_tickets')}</span>
                                    </Link>
                                )}

                                {/* User specific actions if logged in, but not already in the bottom dock */}
                                {user && (
                                    <>
                                        <Link to="/profile" className={`${styles.menuItem} ${styles.authAction}`} onClick={handleClose}>
                                            <User size={20} />
                                            <span>{t('header.profile')}</span>
                                        </Link>
                                        <Link to="/settings" className={`${styles.menuItem} ${styles.authAction}`} onClick={handleClose}>
                                            <Settings size={20} />
                                            <span>{t('header.settings')}</span>
                                        </Link>
                                        <button className={`${styles.menuItem} ${styles.authAction} ${styles.logoutAction}`} onClick={handleLogout}>
                                            <LogOut size={20} />
                                            <span>{t('header.logout')}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
