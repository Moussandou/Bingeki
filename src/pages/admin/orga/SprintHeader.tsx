import { Calendar, Edit3 } from 'lucide-react';
import type { OrgaSprint } from '@/types/orga';
import styles from './Orga.module.css';

interface SprintHeaderProps {
    sprint: OrgaSprint;
    stats: { total: number; done: number; progress: number };
    isSuperAdmin: boolean;
    onEdit: () => void;
}

export function SprintHeader({ sprint, stats, isSuperAdmin, onEdit }: SprintHeaderProps) {
    const startStr = new Date(sprint.startDate.seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short',
    });
    const endStr = new Date(sprint.endDate.seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short',
    });

    return (
        <div className={styles.sprintHeader}>
            <div className={styles.sprintTopBar}>
                <div className={styles.sprintBadgeAndDate}>
                    <span className={styles.sprintBadge}>{sprint.name}</span>
                    <div className={styles.sprintDates}>
                        <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, marginTop: -2 }} />
                        {startStr} — {endStr}
                    </div>
                </div>
                {isSuperAdmin && (
                    <div className={styles.sprintActions}>
                        <button
                            className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                            onClick={onEdit}
                        >
                            <Edit3 size={14} />
                            Éditer
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.sprintMainContent}>
                <h1 className={styles.sprintObjectif}>{sprint.objectif}</h1>
            </div>

            <div className={styles.progressBarContainer}>
                <div className={styles.progressBarLabel}>
                    <span>Progression du sprint</span>
                    <span>{stats.done}/{stats.total}</span>
                </div>
                <div className={styles.progressBarTrack}>
                    <div
                        className={styles.progressBarFill}
                        style={{ width: `${stats.progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
