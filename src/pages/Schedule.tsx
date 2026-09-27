/**
 * Schedule page — thin wrapper autour de SchedulePanel.
 *
 * Le vrai contenu vit dans components/releases/SchedulePanel.tsx pour
 * pouvoir être remonté à l'identique dans le conteneur unifié Releases.
 * Cette page reste accessible via l'URL /schedule pour rétro-compat.
 */

import { Layout } from '@/components/layout/Layout';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/components/layout/SEO';
import { SchedulePanel } from '@/components/releases/SchedulePanel';
import styles from './Schedule.module.css';

export default function Schedule() {
    const { t } = useTranslation();

    return (
        <Layout>
            <SEO title={t('schedule.title', 'Planning')} />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <Calendar style={{ verticalAlign: 'middle', marginRight: '1rem' }} size={40} />
                        {t('schedule.title')}
                    </h1>
                    <p style={{ opacity: 0.7 }}>{t('schedule.subtitle')}</p>
                </div>
                <SchedulePanel />
            </div>
        </Layout>
    );
}
