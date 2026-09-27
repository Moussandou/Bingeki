/**
 * Seasons explorer page — thin wrapper autour de SeasonsPanel.
 *
 * Le vrai contenu vit dans components/releases/SeasonsPanel.tsx pour
 * pouvoir être remonté à l'identique dans le conteneur unifié Releases.
 * Cette page reste accessible via l'URL /seasons pour rétro-compat.
 */

import { Layout } from '@/components/layout/Layout';
import { CalendarRange } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/components/layout/SEO';
import { SeasonsPanel } from '@/components/releases/SeasonsPanel';
import styles from './Seasons.module.css';

export default function Seasons() {
    const { t } = useTranslation();

    return (
        <Layout>
            <SEO title={t('seasons.title', 'Saisons')} />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <CalendarRange style={{ verticalAlign: 'middle', marginRight: '1rem' }} size={40} />
                        {t('seasons.title')}
                    </h1>
                    <p style={{ opacity: 0.7 }}>{t('seasons.subtitle')}</p>
                </div>
                <SeasonsPanel />
            </div>
        </Layout>
    );
}
