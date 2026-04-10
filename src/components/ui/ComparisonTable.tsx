/**
 * Comparison Table component (ui)
 */
import React from 'react';
import styles from './ComparisonTable.module.css';

interface ComparisonRow {
    feature: string;
    bingeki: boolean;
    mal: boolean;
}

const comparisonData: ComparisonRow[] = [
    { feature: "GAMIFICATION & XP", bingeki: true, mal: false },
    { feature: "UTILISATEUR PROTAGONISTE", bingeki: true, mal: false },
    { feature: "PROFIL & STATS RPG", bingeki: true, mal: false },
    { feature: "INTERFACE (UI/UX) MODERNE", bingeki: true, mal: false },
    { feature: "DÉFIS & SUCCÈS", bingeki: true, mal: false },
    { feature: "ENGAGEMENT GAMIFIÉ", bingeki: true, mal: false },
    { feature: "STATS VISUELLES", bingeki: true, mal: false },
    { feature: "DÉCOUVERTE INTUITIVE", bingeki: true, mal: false },
];

export const ComparisonTable: React.FC = () => {
    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>BINGEKI VS MYANIMELIST</h2>

            <div className={styles.tableContainer}>
                {/* Header */}
                <div className={styles.headerRow}>
                    <div className={styles.headerCell}>FONCTIONNALITÉS / VISION</div>
                    <div className={`${styles.headerCell} ${styles.headerBingeki}`}>BINGEKI</div>
                    <div className={`${styles.headerCell} ${styles.headerMal}`}>MYANIMELIST</div>
                </div>

                {/* Rows */}
                {comparisonData.map((row, index) => (
                    <div key={index} className={styles.row}>
                        <div className={styles.featureCell}>{row.feature}</div>
                        <div className={`${styles.checkCell} ${styles.checkBingeki}`}>
                            {row.bingeki ? 'V' : 'X'}
                        </div>
                        <div className={`${styles.checkCell} ${styles.checkMal}`}>
                            {row.mal ? 'V' : 'X'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
