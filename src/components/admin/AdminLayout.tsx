/**
 * Admin Layout component (admin)
 */
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import styles from './AdminLayout.module.css';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export function AdminLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className={styles.container}>
            {/* Mobile Header */}
            <div className={styles.mobileHeader}>
                <button
                    className={styles.hamburger}
                    onClick={() => setIsMobileMenuOpen(true)}
                >
                    <Menu size={24} />
                </button>
                <div style={{ fontWeight: 900, fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>ADMIN</div>
            </div>

            <AdminSidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <main className={styles.main}>
                <div className={styles.contentWrapper}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
