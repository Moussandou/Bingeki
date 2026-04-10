/**
 * News Index page
 */
import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { NewsCard } from '@/components/news/NewsCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/layout/SEO';
import { useTranslation } from 'react-i18next';
import { Newspaper, Flame, Search, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsItem {
    slug: string;
    title: string;
    imageUrl?: string;
    sourceName?: string;
    publishedAt: string;
    tags?: string[];
    contentSnippet?: string;
}

export default function NewsIndex() {
    const { t } = useTranslation();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');

    useEffect(() => {
        async function fetchNews() {
            try {
                const q = query(collection(db, 'news'), orderBy('publishedAt', 'desc'), limit(50));
                const snapshot = await getDocs(q);
                const fetchedNews: NewsItem[] = [];
                snapshot.forEach((doc) => {
                    fetchedNews.push(doc.data() as NewsItem);
                });
                setNews(fetchedNews);
            } catch (error) {
                console.error('Error fetching news:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchNews();
    }, []);

    const sources = useMemo(() => {
        const uniqueSources = Array.from(new Set(news.map(item => item.sourceName).filter(Boolean)));
        return uniqueSources as string[];
    }, [news]);

    const filteredNews = useMemo(() => {
        return news.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesSource = sourceFilter === 'all' || item.sourceName === sourceFilter;

            return matchesSearch && matchesSource;
        });
    }, [news, searchTerm, sourceFilter]);

    if (loading) {
        return <LoadingScreen />;
    }

    const isFiltering = searchTerm !== '' || sourceFilter !== 'all';
    const featuredNews = !isFiltering && filteredNews.length > 0 ? filteredNews[0] : null;
    const regularNews = !isFiltering ? filteredNews.slice(1) : filteredNews;

    return (
        <Layout>
            <SEO
                title={t('news.title', 'Anime & Manga News')}
                description={t('news.description', 'Get the latest anime and manga news, trailers, and release dates.')}
            />

            <div className="container" style={{ paddingTop: '2rem', minHeight: '100vh', paddingBottom: '6rem' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '4px solid var(--color-border-heavy)', paddingBottom: '1rem' }}>
                    <div style={{ background: 'var(--color-primary)', padding: '12px', color: '#fff', boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}>
                        <Newspaper size={32} />
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        color: 'var(--color-text)',
                        fontFamily: 'var(--font-heading)',
                        margin: 0
                    }}>
                        {t('news.heading', 'Actualités')}
                    </h1>
                </div>

                {/* Filters Section */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                    marginBottom: '3rem',
                    background: 'var(--color-surface)',
                    padding: '1.5rem',
                    border: '3px solid var(--color-border-heavy)',
                    boxShadow: '8px 8px 0 var(--color-shadow-solid)'
                }}>
                    <div style={{ flex: '1 1 300px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }}>
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder={t('news.search_placeholder', 'Rechercher un article ou un tag...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 42px',
                                background: 'var(--color-surface-hover)',
                                border: '3px solid var(--color-border-heavy)',
                                color: 'var(--color-text)',
                                fontSize: '1rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-body)',
                                outline: 'none'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    <div style={{ flex: '0 1 200px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)', pointerEvents: 'none' }}>
                            <Filter size={20} />
                        </div>
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 42px',
                                background: 'var(--color-surface-hover)',
                                border: '3px solid var(--color-border-heavy)',
                                color: 'var(--color-text)',
                                fontSize: '1rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-body)',
                                outline: 'none',
                                appearance: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">{t('news.filter_all_sources', 'Toutes les sources')}</option>
                            {sources.map(source => (
                                <option key={source} value={source}>{source}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {isFiltering && (
                    <div style={{ marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                        {filteredNews.length} {t('news.results_found', 'résultats trouvés')}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!isFiltering && featuredNews && (
                        <motion.div
                            key="featured"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ marginBottom: '4rem' }}
                        >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ef4444', color: '#fff', padding: '0.5rem 1rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '-1px', position: 'relative', zIndex: 1, boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}>
                                <Flame size={18} fill="#fff" /> {t('news.featured', 'À LA UNE')}
                            </div>
                            <div className="featured-news-wrapper">
                                <NewsCard
                                    title={featuredNews.title}
                                    slug={featuredNews.slug}
                                    imageUrl={featuredNews.imageUrl}
                                    sourceName={featuredNews.sourceName}
                                    publishedAt={featuredNews.publishedAt}
                                    tags={featuredNews.tags}
                                    featured={true}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    layout
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '2rem'
                    }}
                >
                    {filteredNews.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'var(--color-surface)', border: '2px dashed var(--color-border)', fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                            {t('news.empty', 'Aucune actualité disponible pour le moment.')}
                        </div>
                    ) : (
                        regularNews.map((item, index) => (
                            <motion.div
                                key={item.slug}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: isFiltering ? 0 : index * 0.05 }}
                                style={{ height: '100%' }}
                            >
                                <NewsCard
                                    title={item.title}
                                    slug={item.slug}
                                    imageUrl={item.imageUrl}
                                    sourceName={item.sourceName}
                                    publishedAt={item.publishedAt}
                                    tags={item.tags}
                                />
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </div>

            <style>
                {`
                .featured-news-wrapper {
                    height: 400px;
                }
                
                @media (max-width: 768px) {
                    .featured-news-wrapper {
                        height: auto;
                    }
                }
                `}
            </style>
        </Layout>
    );
}
