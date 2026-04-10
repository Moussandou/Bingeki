/**
 * Layout component (layout)
 */
import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { GuestBanner } from './GuestBanner';
import { motion } from 'framer-motion';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <>
            <div className="manga-bg-container">
                <div className="manga-halftone" />
                <div className="manga-speedlines" />
            </div>
            <Header />
            <div style={{ paddingTop: '80px' }}>
                <GuestBanner />
            </div>
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}
            >
                {children}
                <Footer />
            </motion.main>
        </>
    );
}
