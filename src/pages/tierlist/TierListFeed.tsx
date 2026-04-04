import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { getPublicTierLists } from '@/firebase/firestore';
import type { TierList } from '@/firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { TierListCard } from '@/components/tierlist/TierListCard';
import { TierListPreviewModal } from '@/components/tierlist/TierListPreviewModal';
import { Button } from '@/components/ui/Button';
import { Plus, Flame, Clock, TrendingUp, Search, Filter } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './TierListFeed.module.css';

export default function TierListFeed() {
    const { t } = useTranslation();
    const { lang } = useParams();
    const navigate = useNavigate();
    
    // State
    const [lists, setLists] = useState<TierList[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filter, setFilter] = useState<'recent' | 'popular' | 'trending'>('trending');
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTierList, setSelectedTierList] = useState<TierList | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Mock data for initial empty state
    const mockTierLists: TierList[] = [
        {
            id: 'mock-1',
            userId: 'system',
            category: 'characters',
            title: 'TOP 10 SHONEN PROTAGONISTS',
            authorName: 'Bingeki_Bot',
            createdAt: Date.now(),
            isPublic: true,
            likes: ['1', '2', '3'],
            tiers: [
                { 
                    id: 's', 
                    label: 'S', 
                    color: '#ff7f7f', 
                    items: [
                        { id: 1, name: 'Luffy', image: { jpg: { image_url: 'https://cdn.myanimelist.net/images/characters/9/310307.jpg', small_image_url: 'https://cdn.myanimelist.net/images/characters/9/310307t.jpg' } } },
                        { id: 2, name: 'Naruto', image: { jpg: { image_url: 'https://cdn.myanimelist.net/images/characters/9/131317.jpg', small_image_url: 'https://cdn.myanimelist.net/images/characters/9/131317t.jpg' } } }
                    ] 
                },
                { 
                    id: 'a', 
                    label: 'A', 
                    color: '#ffbf7f', 
                    items: [
                        { id: 3, name: 'Ichigo', image: { jpg: { image_url: 'https://cdn.myanimelist.net/images/characters/10/152041.jpg', small_image_url: 'https://cdn.myanimelist.net/images/characters/10/152041t.jpg' } } }
                    ] 
                },
                { 
                    id: 'b', 
                    label: 'B', 
                    color: '#ffdf7f', 
                    items: [
                        { id: 4, name: 'Goku', image: { jpg: { image_url: 'https://cdn.myanimelist.net/images/characters/15/496030.jpg', small_image_url: 'https://cdn.myanimelist.net/images/characters/15/496030t.jpg' } } }
                    ] 
                }
            ]
        },
        {
            id: 'mock-2',
            userId: 'system',
            category: 'anime',
            title: 'BEST ANIME OF 2024 (SO FAR)',
            authorName: 'Manga_Fan_99',
            createdAt: Date.now() - 86400000,
            isPublic: true,
            likes: ['1', '2'],
            tiers: [
                { 
                    id: 's', 
                    label: 'GOD', 
                    color: '#ff7f7f', 
                    items: [
                        { id: 5, name: 'Solo Leveling', image: { jpg: { image_url: 'https://cdn.myanimelist.net/images/anime/1160/141029.jpg', small_image_url: 'https://cdn.myanimelist.net/images/anime/1160/141029t.jpg' } } }
                    ] 
                },
                { 
                    id: 'a', 
                    label: 'TOP', 
                    color: '#ffbf7f', 
                    items: [
                        { id: 6, name: 'Kaiju No. 8', image: { jpg: { image_url: 'https://cdn.myanimelist.net/images/anime/1458/141885.jpg', small_image_url: 'https://cdn.myanimelist.net/images/anime/1458/141885t.jpg' } } }
                    ] 
                },
                { 
                    id: 'b', 
                    label: 'GOOD', 
                    color: '#ffdf7f', 
                    items: [
                        { id: 7, name: 'Dandadan', image: { jpg: { image_url: 'https://cdn.myanimelist.net/images/anime/1018/144574.jpg', small_image_url: 'https://cdn.myanimelist.net/images/anime/1018/144574t.jpg' } } }
                    ] 
                }
            ]
        }
    ];

    // Infinite Scroll Intersection Observer
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingMore) {
                fetchMoreLists();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadingMore]);

    // Initial Fetch
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                const { lists: freshLists, lastVisible: last } = await getPublicTierLists(12, undefined, filter);
                if (freshLists.length > 0) {
                    setLists(freshLists);
                } else {
                    setLists(mockTierLists);
                }
                setLastVisible(last);
                setHasMore(freshLists.length === 12);
            } catch (error) {
                console.error(error);
                setLists(mockTierLists);
            } finally {
                setLoading(false);
            }
        };

        fetchInitial();
    }, [filter]);

    // Load More
    const fetchMoreLists = async () => {
        if (!lastVisible || loadingMore) return;
        setLoadingMore(true);
        try {
            const { lists: moreLists, lastVisible: last } = await getPublicTierLists(12, lastVisible, filter);
            setLists(prev => [...prev, ...moreLists]);
            setLastVisible(last);
            setHasMore(moreLists.length === 12);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleCardClick = (list: TierList) => {
        setSelectedTierList(list);
        setIsPreviewOpen(true);
    };

    // Filter results locally if search is active
    const filteredLists = lists.filter(list => 
        list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        list.authorName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout>
            <div className={styles.wrapper}>
                {/* Hero Section */}
                <section className={styles.hero}>
                    <div className={styles.heroContent}>
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.heroTitle}
                        >
                            {t('tierlist.feed_title')}
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={styles.heroSubtitle}
                        >
                            {t('tierlist.feed_subtitle')}
                        </motion.p>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={styles.heroActions}
                        >
                            <div className={styles.searchBar}>
                                <Search size={20} className={styles.searchIcon} />
                                <input 
                                    type="text" 
                                    placeholder={t('header.search_placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button
                                size="lg"
                                variant="primary"
                                icon={<Plus size={20} />}
                                onClick={() => navigate(`/${lang}/tierlist/create`)}
                                className={styles.createButton}
                            >
                                {t('tierlist.create_button')}
                            </Button>
                        </motion.div>
                    </div>
                </section>

                <div className={`container ${styles.feedContainer}`}>
                    {/* Filter Tabs */}
                    <div className={styles.filterTabs}>
                        <button 
                            className={`${styles.filterTab} ${filter === 'trending' ? styles.active : ''}`}
                            onClick={() => setFilter('trending')}
                        >
                            <TrendingUp size={18} />
                            {t('tierlist.filter_trending')}
                        </button>
                        <button 
                            className={`${styles.filterTab} ${filter === 'popular' ? styles.active : ''}`}
                            onClick={() => setFilter('popular')}
                        >
                            <Flame size={18} />
                            {t('tierlist.filter_popular')}
                        </button>
                        <button 
                            className={`${styles.filterTab} ${filter === 'recent' ? styles.active : ''}`}
                            onClick={() => setFilter('recent')}
                        >
                            <Clock size={18} />
                            {t('tierlist.filter_recent')}
                        </button>
                    </div>

                    {/* Main Feed Grid */}
                    {loading ? (
                        <div className={styles.loadingGrid}>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={styles.skeletonCard} />
                            ))}
                        </div>
                    ) : filteredLists.length > 0 ? (
                        <div className={styles.grid}>
                            <AnimatePresence>
                                {filteredLists.map((list, index) => (
                                    <motion.div
                                        key={list.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index % 6 * 0.05 }}
                                        ref={index === filteredLists.length - 1 ? lastElementRef : null}
                                        onClick={() => handleCardClick(list)}
                                    >
                                        <TierListCard tierList={list} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Filter size={48} />
                            </div>
                            <h2>{t('tierlist.empty_state')}</h2>
                            <p>{t('tierlist.empty_cta')}</p>
                            <Button
                                className="mt-4"
                                onClick={() => navigate(`/${lang}/tierlist/create`)}
                                variant="primary"
                            >
                                {t('tierlist.create_now')}
                            </Button>
                        </div>
                    )}

                    {loadingMore && (
                        <div className={styles.loadMoreContainer}>
                            <div className={styles.spinner} />
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            <TierListPreviewModal 
                tierList={selectedTierList}
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
            />
        </Layout>
    );
}
