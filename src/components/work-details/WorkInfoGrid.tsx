import { Calendar, Video, Trophy, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '@/pages/WorkDetails.module.css';
import type { Work } from '@/store/libraryStore';

interface WorkInfoGridProps {
    work: Work;
}

export function WorkInfoGrid({ work }: WorkInfoGridProps) {
    const { t } = useTranslation();

    return (
        <div className={styles.infoGrid}>
            {work.season && (
                <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>
                        <Calendar size={14} strokeWidth={3} /> {t('work_details.info.season')}
                    </div>
                    <div className={styles.infoValue}>{work.season} {work.year}</div>
                </div>
            )}
            {work.studios && work.studios.length > 0 && (
                <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>
                        <Video size={14} strokeWidth={3} /> {t('work_details.info.studio')}
                    </div>
                    <div className={styles.infoValue}>{work.studios[0].name}</div>
                </div>
            )}
            {work.rank && (
                <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>
                        <Trophy size={14} strokeWidth={3} /> {t('work_details.info.rank')}
                    </div>
                    <div className={styles.infoValue}>#{work.rank}</div>
                </div>
            )}
            {work.popularity && (
                <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>
                        <BarChart size={14} strokeWidth={3} /> {t('work_details.info.popularity')}
                    </div>
                    <div className={styles.infoValue}>#{work.popularity}</div>
                </div>
            )}
        </div>
    );
}
