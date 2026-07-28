import { useTranslation } from 'react-i18next';
import styles from '@/pages/WorkDetails.module.css';

interface WorkTabsProps {
    activeTab: 'info' | 'episodes' | 'gallery' | 'themes' | 'stats' | 'reviews' | 'news';
    setActiveTab: (tab: 'info' | 'episodes' | 'gallery' | 'themes' | 'stats' | 'reviews' | 'news') => void;
    workType: string | undefined;
}

export function WorkTabs({ activeTab, setActiveTab, workType }: WorkTabsProps) {
    const { t } = useTranslation();

    return (
        <div className={styles.tabsContainer}>
            <button
                onClick={() => setActiveTab('info')}
                className={`${styles.tabButton} ${activeTab === 'info' ? styles.activeTab : ''}`}
            >
                {t('work_details.tabs.general')}
            </button>
            {workType && (
                <button
                    onClick={() => setActiveTab('episodes')}
                    className={`${styles.tabButton} ${activeTab === 'episodes' ? styles.activeTab : ''}`}
                >
                    {workType === 'manga' ? t('work_details.tabs.chapters_list') : t('work_details.tabs.episodes_list')}
                </button>
            )}
            {workType !== 'manga' && (
                <button
                    className={`${styles.tabButton} ${activeTab === 'themes' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('themes')}
                >
                    {t('work_details.tabs.music')}
                </button>
            )}
            <button
                onClick={() => setActiveTab('reviews')}
                className={`${styles.tabButton} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
            >
                {t('work_details.tabs.reviews')}
            </button>
            <button
                onClick={() => setActiveTab('news')}
                className={`${styles.tabButton} ${activeTab === 'news' ? styles.activeTab : ''}`}
            >
                {t('work_details.tabs.news')}
            </button>
            <button
                onClick={() => setActiveTab('gallery')}
                className={`${styles.tabButton} ${activeTab === 'gallery' ? styles.activeTab : ''}`}
            >
                {t('work_details.tabs.gallery')}
            </button>
            <button
                onClick={() => setActiveTab('stats')}
                className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
            >
                {t('work_details.tabs.stats')}
            </button>
        </div>
    );
}
