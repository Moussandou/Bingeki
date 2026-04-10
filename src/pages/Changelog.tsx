/**
 * Changelog page
 */
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { changelogData } from '@/data/changelog';
import { Calendar, Tag, GitCommit, Check, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Changelog.module.css';
import { useTranslation } from 'react-i18next';

export default function Changelog() {
    const { t } = useTranslation();
    const [expandedEntries, setExpandedEntries] = useState<Record<number, boolean>>({ 0: true });

    const toggleEntry = (index: number) => {
        setExpandedEntries(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const totalUpdates = changelogData.length;
    const latestVersion = changelogData[0]?.version || 'v0.0';

    return (
        <Layout>
            <div className={styles.container}>

                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        {t('changelog.title')}
                    </h1>
                    <p className={styles.subtitle}>
                        {t('changelog.subtitle')}
                    </p>
                </div>

                {/* Stats Section */}
                <div className={styles.statsContainer}>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{totalUpdates}</span>
                        <span className={styles.statLabel}>{t('changelog.updates')}</span>
                    </div>
                    <div className={styles.statCard} style={{ transform: 'rotate(2deg)' }}>
                        <span className={styles.statValue}>{latestVersion}</span>
                        <span className={styles.statLabel}>{t('changelog.current_version')}</span>
                    </div>
                </div>

                {/* Timeline */}
                <div className={styles.timelineContainer}>
                    {/* Vertical Line */}
                    <div className={styles.timelineLine} />

                    {changelogData.map((entry, index) => {
                        const isLatest = index === 0;
                        const isExpanded = expandedEntries[index];
                        const versionKey = entry.version.replace('.', '_');

                        return (
                            <div key={index} className={styles.timelineEntry}>
                                {/* Timeline Node */}
                                <div className={`${styles.timelineNode} ${isLatest ? styles.latestNode : ''}`}>
                                    <GitCommit size={24} className={isLatest ? styles.latestIcon : styles.defaultIcon} />
                                </div>

                                {/* Content Card */}
                                <div
                                    className={`${styles.contentCard} ${isLatest ? styles.isNew : ''} ${isExpanded ? styles.expanded : ''}`}
                                    onClick={() => toggleEntry(index)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {/* Header: Version & Date */}
                                    <div className={styles.cardHeader}>
                                        <div className={styles.versionTag}>
                                            <div className={styles.versionBadge}>
                                                <Tag size={16} /> {entry.version}
                                            </div>
                                            {isLatest && (
                                                <span className={styles.newBadge}>
                                                    {t('changelog.new')}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.headerRight}>
                                            <div className={styles.dateTag}>
                                                <Calendar size={16} /> {t(`changelog.entries.${versionKey}.date`, entry.date)}
                                            </div>
                                            <div className={styles.expandIcon}>
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <h2 className={styles.entryTitle}>
                                        {t(`changelog.entries.${versionKey}.title`, entry.title)}
                                    </h2>

                                    {isExpanded && (
                                        <>
                                            <p className={styles.entryDescription}>
                                                {t(`changelog.entries.${versionKey}.description`, entry.description)}
                                            </p>

                                            {/* Changes List */}
                                            <ul className={styles.changesList}>
                                                {entry.changes.map((_, i) => (
                                                    <li key={i} className={styles.changeItem}>
                                                        <div className={styles.bulletPoint}>
                                                            <Check size={14} strokeWidth={4} />
                                                        </div>
                                                        <span style={{ fontWeight: 500 }}>
                                                            {t(`changelog.entries.${versionKey}.changes.${i}`, entry.changes[i])}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* End Marker */}
                <div className={styles.endMarkerContainer}>
                    <div className={styles.endMarker}>
                        {t('changelog.to_be_continued')}
                    </div>
                </div>

            </div>
        </Layout>
    );
}
