/**
 * Not Found page
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import styles from './NotFound.module.css';

const NotFound: React.FC = () => {
    const { t } = useTranslation();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || 'fr';

    return (
        <div className={styles.container}>
            {/* Manga Halftone Background */}
            <div className={styles.halftoneOverlay} />

            {/* Impact Lines Decoration */}
            <div className={styles.impactLines}>
                {[...Array(12)].map((_, i) => (
                    <div 
                        key={i} 
                        style={{ 
                            transform: `rotate(${i * 30}deg) translateY(-50%)` 
                        }} 
                    />
                ))}
            </div>

            <div className={styles.content}>
                <h1 className={styles.errorCode}>404</h1>
                
                <h2 className={styles.title}>
                    {t('not_found.title', 'LOST IN THE PANELS?')}
                </h2>
                
                <p className={styles.subtitle}>
                    {t('not_found.subtitle', 'This page does not exist or has been sucked into another dimension.')}
                </p>

                <div className={styles.buttonWrapper}>
                    <Link to={`/${currentLang}/dashboard`} className={styles.homeButton}>
                        <Home size={20} />
                        <span>{t('not_found.back_home', 'RETURN TO H.Q.')}</span>
                    </Link>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <Link 
                        to={`/${currentLang}/`} 
                        style={{ 
                            color: 'var(--color-text-dim)', 
                            textDecoration: 'none', 
                            fontSize: '0.9rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <ArrowLeft size={14} />
                        {t('common.back', 'Back')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
