import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { getPublicTierLists } from '@/firebase/firestore';
import type { TierList } from '@/firebase/firestore';
import { TierListCard } from '@/components/tierlist/TierListCard';
import { Button } from '@/components/ui/Button';
import { Plus, Flame, Clock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './TierListFeed.module.css';

export default function TierListFeed() {
    const { t } = useTranslation();
    const { lang } = useParams();
    const [lists, setLists] = useState<TierList[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'recent' | 'popular'>('recent');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLists = async () => {
            setLoading(true);
            try {
                const data = await getPublicTierLists(50);
                // Sort client-side
                if (filter === 'popular') {
                    data.sort((a, b) => b.likes.length - a.likes.length);
                }
                setLists(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchLists();
    }, [filter]);

    return (
        <Layout>
            <div className={`container ${styles.container}`}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h1>{t('tierlist.feed_title')}</h1>
                        <p>{t('tierlist.feed_subtitle')}</p>
                    </div>
                    <Button
                        size="lg"
                        variant="primary"
                        icon={<Plus size={20} />}
                        onClick={() => navigate(`/${lang}/tier-list/create`)}
                        className={styles.createButton}
                    >
                        {t('tierlist.create_button')}
                    </Button>
                </div>

                {/* Filters */}
                <div className={styles.filters}>
                    <Button
                        variant={filter === 'recent' ? 'primary' : 'outline'}
                        onClick={() => setFilter('recent')}
                        icon={<Clock size={16} />}
                        size="sm"
                    >
                        {t('tierlist.filter_recent')}
                    </Button>
                    <Button
                        variant={filter === 'popular' ? 'primary' : 'outline'}
                        onClick={() => setFilter('popular')}
                        icon={<Flame size={16} />}
                        size="sm"
                    >
                        {t('tierlist.filter_top')}
                    </Button>
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ color: 'white', textAlign: 'center', padding: '4rem' }}>
                        {t('common.loading')}
                    </div>
                ) : lists.length > 0 ? (
                    <div className={styles.grid}>
                        {lists.map(list => (
                            <TierListCard key={list.id} tierList={list} />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <h2>{t('tierlist.empty_state')}</h2>
                        <p>{t('tierlist.empty_cta')}</p>
                        <Button
                            className="mt-4"
                            onClick={() => navigate(`/${lang}/tier-list/create`)}
                            variant="primary"
                        >
                            {t('tierlist.create_now')}
                        </Button>
                    </div>
                )}
            </div>
        </Layout>
    );
}
