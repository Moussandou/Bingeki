import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, Clock, ShieldCheck } from 'lucide-react';
import styles from './MaintenanceScreen.module.css';

export const MaintenanceScreen = () => {
    const { t } = useTranslation();
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.content}>

                {/* Icon Wrapper */}
                <div className={styles.iconWrapper}>
                    <div className={styles.iconPulse} />
                    <div className={styles.iconCircle}>
                        <WifiOff size={40} color="var(--color-primary)" />
                    </div>
                </div>

                <div>
                    <h1 className={styles.title}>
                        {t('maintenance.title', 'Maintenance en cours')}
                    </h1>

                    <p className={styles.description}>
                        {t('maintenance.description', 'Nous améliorons Bingeki pour vous offrir une meilleure expérience. Le service sera de retour très bientôt.')}
                    </p>
                </div>

                {/* Status Card */}
                <div className={styles.card}>
                    <div className={styles.statusRow}>
                        <div className={styles.statusItem} style={{ color: '#eab308' }}>
                            <Clock size={16} />
                            <span>Estimated: Unknown</span>
                        </div>
                        <div className={styles.divider} />
                        <div className={styles.statusItem} style={{ color: 'var(--color-primary)' }}>
                            <ShieldCheck size={16} />
                            <span>Data Safe</span>
                        </div>
                    </div>

                    <div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill}>
                                <div className={styles.shimmer} />
                            </div>
                        </div>
                        <p className={styles.terminalText}>
                            System Update{dots}
                        </p>
                    </div>
                </div>

                <div className={styles.footer}>
                    &copy; {new Date().getFullYear()} Bingeki
                </div>
            </div>
        </div>
    );
};
