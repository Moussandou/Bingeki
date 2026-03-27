import { Link } from '@/components/routing/LocalizedLink';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import styles from './Opening.module.css';
import { Card } from '@/components/ui/Card';
import { HunterLicenseCard } from '@/components/profile/HunterLicenseCard';
import { Search, Check, Users, MessageCircle, Heart, TrendingUp, ChevronUp, History as HistoryIcon, Trophy, Star, ArrowRight, Home, User } from 'lucide-react';
import { InstallPWA } from '@/components/pwa/InstallPWA';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '@/components/ui/OptimizedImage';


// Counter Component for Animated Numbers
function Counter({ from, to }: { from: number; to: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const [count, setCount] = useState(from);

    useEffect(() => {
        if (isInView) {
            const duration = 2000;
            const start = performance.now();

            const animate = (time: number) => {
                const elapsed = time - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out quart
                const ease = 1 - Math.pow(1 - progress, 4);

                setCount(Math.floor(from + (to - from) * ease));

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            requestAnimationFrame(animate);
        }
    }, [isInView, from, to]);

    return <span ref={ref}>{count}</span>;
}

interface SearchResult {
    id?: number;
    title: string;
    type: string;
    score: number;
    image: string;
}

import { getTopWorks } from '@/services/animeApi';
import type { UserProfile } from '@/firebase/firestore';

export default function Opening() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [placeholderText, setPlaceholderText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const [resultsByGenre, setResultsByGenre] = useState<Record<string, SearchResult[]>>({});
    const [qgMangaList, setQgMangaList] = useState<SearchResult[]>([]);

    // Refs for scroll trigger animations
    // Refs for scroll trigger animations
    const progressionRef = useRef<HTMLDivElement>(null);
    // const isProgressionInView = useInView(progressionRef, { once: true, amount: 0.3 }); // Removed to fix layout shift

    const commentsRef = useRef<HTMLDivElement>(null);
    const areCommentsInView = useInView(commentsRef, { once: true, amount: 0.3 });

    interface Comment {
        user: string;
        text: string;
        time: string;
    }

    const [visibleComments, setVisibleComments] = useState<Comment[]>([]);

    const mockComments = useMemo(() => [
        { user: "Levi", text: "landing.features.community.comments.levi", time: "2m" },
        { user: "Armin", text: "landing.features.community.comments.armin", time: "5m" },
        { user: "Mikasa", text: "landing.features.community.comments.mikasa", time: "12m" }
    ], []);

    useEffect(() => {
        if (areCommentsInView && visibleComments.length < mockComments.length) {
            // Instant start for first comment
            const interval = setInterval(() => {
                setVisibleComments(prev => {
                    if (prev.length < mockComments.length) {
                        return [...prev, mockComments[prev.length]];
                    }
                    clearInterval(interval);
                    return prev;
                });
            }, 800); // Slightly faster
            return () => clearInterval(interval);
        }
    }, [areCommentsInView, visibleComments, mockComments]);

    // Typewriter effect data
    const placeholders = ['landing.features.exploration.genres.seinen', 'landing.features.exploration.genres.shonen', 'landing.features.exploration.genres.romance', 'landing.features.exploration.genres.horror', 'landing.features.exploration.genres.isekai'];

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [placeholders.length]);

    // Fetch data from API
    // Fetch data from API
    const dataFetched = useRef(false);

    useEffect(() => {
        // Skip if already fetched and has data
        if (dataFetched.current && qgMangaList.length > 0) return;

        const fetchDisplayData = async () => {
            // Fetch Q.G. Section Data (Top Manga)
            try {
                const topManga = await getTopWorks('manga', 'bypopularity', 6);
                if (topManga.length > 0) {
                    setQgMangaList(topManga.map((m: any) => ({
                        id: m.mal_id,
                        title: m.title,
                        type: 'Manga',
                        score: m.score || 0,
                        image: m.images.jpg.large_image_url || m.images.jpg.image_url
                    })));
                    dataFetched.current = true;
                }
            } catch (e) {
                console.error("Failed to fetch top manga", e);
            }

            // Static "Top" results to ensure reliable display
            const staticResults: Record<string, SearchResult[]> = {
                'Seinen': [
                    { title: "Berserk", type: "Manga", score: 9.47, image: "https://cdn.myanimelist.net/images/manga/1/157897l.jpg" },
                    { title: "Vinland Saga", type: "Manga", score: 9.05, image: "https://cdn.myanimelist.net/images/manga/2/188925.jpg" },
                    { title: "Vagabond", type: "Manga", score: 9.24, image: "https://cdn.myanimelist.net/images/manga/1/259070.jpg" }
                ],
                'Shonen': [
                    { title: "One Piece", type: "Manga", score: 9.22, image: "https://cdn.myanimelist.net/images/manga/2/253146l.jpg" },
                    { title: "Shingeki no Kyojin", type: "Manga", score: 8.55, image: "https://cdn.myanimelist.net/images/manga/2/37846l.jpg" },
                    { title: "Chainsaw Man", type: "Manga", score: 8.69, image: "https://cdn.myanimelist.net/images/manga/3/216464l.jpg" }
                ],
                'Romance': [
                    { title: "Kaguya-sama", type: "Manga", score: 8.89, image: "https://cdn.myanimelist.net/images/manga/3/188896l.jpg" },
                    { title: "Horimiya", type: "Manga", score: 8.41, image: "https://cdn.myanimelist.net/images/manga/2/245008l.jpg" },
                    { title: "Nisekoi", type: "Manga", score: 7.71, image: "https://cdn.myanimelist.net/images/manga/1/181212l.jpg" }
                ],
                'Horreur': [
                    { title: "Berserk", type: "Manga", score: 9.47, image: "https://cdn.myanimelist.net/images/manga/1/157897l.jpg" },
                    { title: "Tokyo Ghoul", type: "Manga", score: 8.54, image: "https://cdn.myanimelist.net/images/manga/3/114037l.jpg" },
                    { title: "Gantz", type: "Manga", score: 8.56, image: "https://cdn.myanimelist.net/images/manga/1/278020l.jpg" }
                ],
                'Isekai': [
                    { title: "Mushoku Tensei", type: "Manga", score: 8.09, image: "https://cdn.myanimelist.net/images/manga/2/181049l.jpg" },
                    { title: "Re:Zero", type: "Manga", score: 8.36, image: "https://cdn.myanimelist.net/images/manga/1/129447l.jpg" },
                    { title: "Tensura (Slime)", type: "Manga", score: 8.36, image: "https://cdn.myanimelist.net/images/manga/3/167639l.jpg" }
                ]
            };
            setResultsByGenre(staticResults);
        };

        fetchDisplayData();
    }, [qgMangaList.length]);

    // Typewriter Logic
    const currentKey = placeholders[placeholderIndex];
    const fullTextToType = t(currentKey); // Translate first!

    useEffect(() => {
        const typeSpeed = isDeleting ? 50 : 150;

        const timer = setTimeout(() => {
            if (!isDeleting && placeholderText === fullTextToType) {
                setTimeout(() => setIsDeleting(true), 3500);
            } else if (isDeleting && placeholderText === '') {
                setIsDeleting(false);
                setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
            } else {
                // Determine next text based on fullTextToType
                const nextText = isDeleting
                    ? fullTextToType.substring(0, placeholderText.length - 1)
                    : fullTextToType.substring(0, placeholderText.length + 1);
                setPlaceholderText(nextText);
            }
        }, typeSpeed);

        return () => clearTimeout(timer);
    }, [placeholderText, isDeleting, placeholderIndex, fullTextToType, placeholders.length]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Mock Data
    const mockUser = {
        uid: 'demo',
        email: 'hero@bingeki.com',
        displayName: 'Eren Jaeger',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eren',
        createdAt: 0,
        lastLogin: 0,
        settings: { theme: 'light', notifications: true }
    };

    // Data source for display
    const currentGenre = placeholders[placeholderIndex];
    // We stick to the key for looking up results, even if we display translated text
    const displayResults = resultsByGenre[t(currentKey)] || resultsByGenre[currentKey] || [];
    // Fallback: try to find results by the translated key (e.g. "Shonen") or the raw key.
    // resultsByGenre keys are 'Seinen', 'Shonen' etc. 
    // We need to map the translation key back to the data key.
    // Or just use the hardcoded genre names in resultsByGenre matching the translations.
    // Check resultsByGenre keys
    // The translation keys are '...genres.seinen' -> likely returns "Seinen".

    // Determine if typing is finished
    const isTypingFinished = !isDeleting && placeholderText === fullTextToType;



    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.halftoneBg} />
                <div className={styles.speedLines} />

                {/* HERO */}
                <header className={styles.heroSection}>
                    <motion.h1
                        className={styles.heroTitle}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 100 }}
                    >
                        <span dangerouslySetInnerHTML={{ __html: t('landing.hero.title') }} />
                    </motion.h1>
                    <motion.div
                        className={styles.heroSubtitle}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {t('landing.hero.subtitle')}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        style={{ marginTop: '2rem' }}
                    >
                        <Link to={user ? "/dashboard" : "/auth"}>
                            <button className={styles.ctaButton}>
                                {user ? t('landing.hero.cta_logged_in') : t('landing.hero.cta')}
                            </button>
                        </Link>
                    </motion.div>
                </header>

                {/* SECTION 1: TRACKING (LE Q.G.) */}
                <section className={styles.featureSection}>
                    <div className={styles.textContent}>
                        <div className={styles.sfx} style={{ top: -50, left: -20, fontSize: '8rem', color: '#808080', opacity: 0.1, transform: 'rotate(-10deg)' }}>SUIVI !!</div>
                        <h2 className={styles.sectionTitle}>{t('landing.features.qg.title')}</h2>
                        <div className={styles.sectionDescription}>
                            <p>{t('landing.features.qg.description_1')}</p>
                            <p style={{ marginTop: '1rem' }}>{t('landing.features.qg.description_2')}</p>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', fontWeight: 900, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={20} /> {t('landing.features.qg.check_chapters')}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={20} /> {t('landing.features.qg.check_episodes')}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={20} /> {t('landing.features.qg.check_volumes')}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.visualContent}>
                        <div className={styles.mockupContainer} style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {qgMangaList.map((manga, i) => (
                                <motion.div
                                    key={manga.id || i}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    whileHover={{ scale: 1.1, zIndex: 10 }}
                                    style={{ transform: i % 2 === 0 ? 'translateY(20px)' : 'translateY(-20px)' }}
                                >
                                    <Card variant="manga" hoverable style={{ padding: 0, boxShadow: '6px 6px 0 var(--color-shadow-solid)' }}>
                                        <div style={{ aspectRatio: '2/3', background: '#333', position: 'relative' }}>
                                            <OptimizedImage src={manga.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 2: PROGRESSION (ZIGZAG REVERSE) */}
                <section className={`${styles.featureSection} ${styles.featureSectionReverse}`} ref={progressionRef}>
                    <div className={styles.textContent}>
                        <div className={styles.sfx} style={{ top: -40, right: 0, fontSize: '6rem', color: '#808080', opacity: 0.1, transform: 'rotate(5deg)' }}>LEVEL UP</div>
                        <h2 className={styles.sectionTitle}>{t('landing.features.progression.title')}</h2>
                        <div className={styles.sectionDescription}>
                            <p>{t('landing.features.progression.description_1')}</p>
                            <p style={{ marginTop: '1rem' }} dangerouslySetInnerHTML={{ __html: t('landing.features.progression.description_2') }} />
                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <TrendingUp size={32} />
                                <div>
                                    <div style={{ fontWeight: 900 }}>{t('landing.features.progression.stats_title')}</div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                                        Niveau <Counter from={0} to={42} /> • XP <Counter from={0} to={2800} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.visualContent} ${styles.progressionVisual}`}>
                        <div className={`${styles.mockupContainer} ${styles.mockupWrapper}`}>
                            <HunterLicenseCard
                                user={mockUser as UserProfile}
                                stats={{
                                    level: 42,
                                    xp: 2800,
                                    xpToNextLevel: 3000,
                                    streak: 15,
                                    badgeCount: 8,
                                    totalWorksCompleted: 124
                                }}
                                top3FavoritesData={[
                                    { id: '1', title: 'Berserk', image: 'https://cdn.myanimelist.net/images/manga/1/157897l.jpg' },
                                    { id: '2', title: 'One Piece', image: 'https://cdn.myanimelist.net/images/manga/2/253146l.jpg' },
                                    { id: '3', title: 'Vagabond', image: 'https://cdn.myanimelist.net/images/manga/1/259070.jpg' }
                                ]}
                            />
                        </div>
                    </div>
                </section>

                {/* SECTION 3: EXPLORATION */}
                <section className={styles.featureSection}>
                    <div className={styles.textContent}>
                        <div className={styles.sfx} style={{ bottom: -30, left: 20, fontSize: '5rem', color: '#808080', opacity: 0.1 }}>WAKU WAKU</div>
                        <h2 className={styles.sectionTitle}>{t('landing.features.exploration.title')}</h2>
                        <div className={styles.sectionDescription}>
                            <p>{t('landing.features.exploration.description_1')}</p>
                            <p style={{ marginTop: '1rem' }}>{t('landing.features.exploration.description_2')}</p>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {placeholders.map((genre, i) => (
                                <span key={genre}
                                    onClick={() => { setPlaceholderIndex(i); setPlaceholderText(''); setIsDeleting(false); }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: i === placeholderIndex ? 'var(--color-primary)' : 'var(--color-surface)',
                                        color: i === placeholderIndex ? '#000' : 'var(--color-text)',
                                        border: '2px solid var(--color-border)',
                                        fontWeight: 700,
                                        borderRadius: '0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    className="hover:scale-105"
                                >
                                    {t(genre)}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className={styles.visualContent}>
                        <div className={styles.mockupContainer} style={{ width: '90%', minHeight: '440px' }}>
                            <Card variant="manga" hoverable style={{ padding: '0.5rem', background: 'var(--color-surface)', marginBottom: '1.5rem', border: '2px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <Search style={{ marginRight: '1rem', marginLeft: '0.5rem' }} />
                                    <div
                                        style={{
                                            border: 'none',
                                            outline: 'none',
                                            width: '100%',
                                            fontSize: '1.2rem',
                                            fontFamily: 'var(--font-heading)',
                                            background: 'transparent',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <span style={{ opacity: 0.5 }}>{placeholderText || t('landing.features.exploration.search_placeholder')}</span>
                                        <motion.span
                                            animate={{ opacity: [1, 0] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            style={{ marginLeft: '1px', fontSize: '1.2rem', fontWeight: 300 }}
                                        >
                                            |
                                        </motion.span>
                                    </div>
                                </div>
                            </Card>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {isTypingFinished && displayResults.map((res, index) => (
                                    <motion.div
                                        key={`${currentGenre}-${res.title}`} // Unique key to force re-render on genre change
                                        initial={{ x: 50, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 * index, type: "spring", stiffness: 100 }}
                                    >
                                        <Card variant="manga" hoverable style={{ display: 'flex', padding: 0, overflow: 'hidden', alignItems: 'center' }}>
                                            <div style={{ width: '80px', height: '80px', position: 'relative' }}>
                                                <OptimizedImage src={res.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                                            </div>
                                            <div style={{ padding: '0 1rem', flex: 1 }}>
                                                <div style={{ fontWeight: 900 }}>{res.title}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{res.type} • ★ {res.score}</div>
                                            </div>
                                            <div style={{ padding: '0 1.5rem' }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--color-border)' }} />
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 4: SOCIAL (NEW) */}
                <section className={`${styles.featureSection} ${styles.featureSectionReverse}`} ref={progressionRef}>
                    <div className={styles.textContent}>
                        <h2 className={styles.sectionTitle}>{t('landing.features.community.title')}</h2>
                        <div className={styles.sectionDescription}>
                            <p>{t('landing.features.community.description_1')}</p>
                            <p style={{ marginTop: '1rem' }}>{t('landing.features.community.description_2')}</p>
                        </div>
                        <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Users size={32} style={{ marginBottom: '0.5rem' }} />
                                <span style={{ fontWeight: 800 }}>{t('landing.features.community.friends')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <MessageCircle size={32} style={{ marginBottom: '0.5rem' }} />
                                <span style={{ fontWeight: 800 }}>{t('landing.features.community.debates')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Heart size={32} style={{ marginBottom: '0.5rem' }} />
                                <span style={{ fontWeight: 800 }}>{t('landing.features.community.share')}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.visualContent} ref={commentsRef}>
                        <div className={styles.mockupContainer} style={{ width: '80%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
                                <AnimatePresence>
                                    {visibleComments.map((comment) => (
                                        <motion.div
                                            key={comment.text}
                                            initial={{ opacity: 0, x: -50, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            transition={{ type: "spring", stiffness: 120, damping: 15 }}
                                        >
                                            <Card hoverable variant="manga" style={{ padding: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)', borderLeft: '4px solid var(--color-primary)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 900 }}>@{comment.user}</span>
                                                    <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>{comment.time}</span>
                                                </div>
                                                <p style={{ fontSize: '0.9rem' }}>{t(comment.text)}</p>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {visibleComments.length === mockComments.length && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{ textAlign: 'center', marginTop: '1rem' }}
                                    >
                                        <button style={{ background: 'var(--color-text)', color: 'var(--color-surface)', border: 'none', padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer' }}>{t('landing.features.community.see_discussion')}</button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 4.5: DETAILS SHOWCASE (NEW) */}
                <section className={styles.featureSection}>
                    <div className={styles.textContent}>
                        <div className={styles.sfx} style={{ bottom: -40, left: 10, fontSize: '6rem', color: '#808080', opacity: 0.1, transform: 'rotate(-5deg)' }}>FOCUS</div>
                        <h2 className={styles.sectionTitle}>{t('landing.features.details.title')}</h2>
                        <div className={styles.sectionDescription}>
                            <p>{t('landing.features.details.description_1')}</p>
                            <p style={{ marginTop: '1rem' }}>{t('landing.features.details.description_2')}</p>
                        </div>
                    </div>

                    <div className={styles.visualContent}>
                        <div className={styles.mockupContainer} style={{ width: '90%' }}>
                            <Link to="/work/113138?type=manga" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                                    <div style={{
                                        background: 'var(--color-surface)',
                                        border: '4px solid var(--color-border)',
                                        boxShadow: '8px 8px 0 var(--color-shadow-solid)',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        {/* Fake WorkDetails Header/Cover */}
                                        <div style={{ height: '160px', position: 'relative', overflow: 'hidden', background: '#333' }}>
                                            <OptimizedImage
                                                src="https://cdn.myanimelist.net/images/manga/3/210341l.jpg"
                                                alt="JJK Banner"
                                                style={{ opacity: 0.8, objectPosition: 'center 25%' }}
                                            />
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />

                                            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                                                {/* Mini Poster */}
                                                <div style={{ width: '80px', height: '120px', border: '3px solid var(--color-surface)', boxShadow: '0 4px 6px var(--color-shadow-solid)', marginBottom: '-3rem', zIndex: 10, background: '#000', position: 'relative' }}>
                                                    <OptimizedImage src="https://cdn.myanimelist.net/images/manga/3/210341l.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                                                </div>

                                                <div style={{ paddingBottom: '0.5rem' }}>
                                                    <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1, textShadow: '2px 2px 0 #000' }}>
                                                        JUJUTSU KAISEN
                                                    </h3>
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'var(--color-surface)', color: 'var(--color-text)', padding: '2px 6px' }}>{t('landing.features.details.mock_card.manga')}</span>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'var(--color-primary)', color: '#000', padding: '2px 6px', border: '1px solid #000' }}>{t('landing.features.details.mock_card.ongoing')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fake Tabs & Content */}
                                        <div style={{ padding: '1rem 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {/* Tabs Mockup */}
                                            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', paddingLeft: '90px' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 900, borderBottom: '3px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '-0.6rem' }}>{t('landing.features.details.mock_card.general')}</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.4 }}>{t('landing.features.details.mock_card.chapters')}</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.4 }}>{t('landing.features.details.mock_card.stats')}</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.4 }}>{t('landing.features.details.mock_card.reviews')}</span>
                                            </div>

                                            {/* Content Area */}
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                    <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-dim)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {t('landing.features.details.mock_card.synopsis')}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '80px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 800 }}>
                                                            <Trophy size={16} /> #4
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 800 }}>
                                                            <Star size={16} fill="currentColor" /> 8.64
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ background: 'var(--color-primary)', color: '#000', textAlign: 'center', padding: '0.8rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                    {t('landing.features.details.mock_card.view_full')} <ArrowRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: CHANGELOG / BUILDING IN PUBLIC */}
                <section className={`${styles.featureSection} ${styles.featureSectionReverse}`}>
                    <div className={styles.textContent}>
                        <div className={styles.sfx} style={{ top: -30, right: 20, fontSize: '4rem', color: '#808080', opacity: 0.1, transform: 'rotate(-5deg)' }}>BETA</div>
                        <h2 className={styles.sectionTitle}>{t('landing.features.wip.title')}</h2>
                        <div className={styles.sectionDescription}>
                            <p>{t('landing.features.wip.description_1')}</p>
                            <p style={{ marginTop: '1rem' }}>{t('landing.features.wip.description_2')}</p>
                        </div>
                        <div style={{ marginTop: '2rem' }}>
                            <Link to="/changelog">
                                <button style={{
                                    background: 'var(--color-primary)',
                                    color: '#000',
                                    border: 'none',
                                    padding: '1rem 2rem',
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                    className="hover:scale-105 transition-transform"
                                >
                                    <HistoryIcon size={20} />
                                    {t('landing.features.wip.roadmap_btn')}
                                </button>
                            </Link>
                        </div>
                    </div>

                    <div className={styles.visualContent}>
                        <div className={styles.mockupContainer} style={{ width: '90%', height: 'auto', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                            <div style={{
                                borderLeft: '4px dashed var(--color-border)',
                                paddingLeft: '2rem',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2rem'
                            }}>
                                {/* Timeline Item 1 */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', left: '-2.6rem', top: 0, width: '20px', height: '20px', background: 'var(--color-primary)', borderRadius: '50%', border: '4px solid var(--color-border)'
                                    }} />
                                    <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '4px', border: '3px solid var(--color-border)', boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>{t('landing.features.wip.timeline.feedback_title')}</span>
                                            <span style={{ fontSize: '0.8rem', background: 'var(--color-primary)', color: '#000', padding: '0.1rem 0.5rem', fontWeight: 800, border: '1px solid var(--color-border)' }}>V1.2.0</span>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('landing.features.wip.timeline.feedback_desc')}</p>
                                    </div>
                                </div>

                                {/* Timeline Item 2 */}
                                <div style={{ position: 'relative', opacity: 0.7 }}>
                                    <div style={{
                                        position: 'absolute', left: '-2.6rem', top: 0, width: '20px', height: '20px', background: 'var(--color-surface-hover)', borderRadius: '50%', border: '4px solid var(--color-border)'
                                    }} />
                                    <div style={{ background: 'var(--color-surface-hover)', padding: '1.5rem', borderRadius: '4px', border: '3px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>{t('landing.features.wip.timeline.guilds_title')}</span>
                                            <span style={{ fontSize: '0.8rem', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '0.1rem 0.5rem', fontWeight: 800 }}>{t('landing.features.wip.timeline.soon')}</span>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('landing.features.wip.timeline.guilds_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>



                {/* SECTION 5.5: MOBILE APP PROMO (NEW) */}
                <section className={`${styles.featureSection} ${styles.featureSectionReverse}`}>
                    <div className={styles.textContent}>
                        <div className={styles.sfx} style={{ top: -50, right: 0, fontSize: '6rem', color: '#808080', opacity: 0.1, transform: 'rotate(10deg)' }}>POCKET</div>
                        <h2 className={styles.sectionTitle}>{t('landing.features.mobile.title') || "BINGEKI DANS VOTRE POCHE"}</h2>
                        <div className={styles.sectionDescription}>
                            <p>{t('landing.features.mobile.description_1') || "Emportez votre collection partout. Une expérience fluide, rapide et conçue pour le mobile."}</p>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: 800 }}>
                                    <div style={{ padding: '0.3rem', background: 'var(--color-primary)', borderRadius: '4px', border: '2px solid #000' }}><Check size={16} color="#000" strokeWidth={4} /></div>
                                    <span>{t('landing.features.mobile.feature_1') || "Installable (PWA)"}</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: 800 }}>
                                    <div style={{ padding: '0.3rem', background: 'var(--color-primary)', borderRadius: '4px', border: '2px solid #000' }}><Check size={16} color="#000" strokeWidth={4} /></div>
                                    <span>{t('landing.features.mobile.feature_2') || "Mode Hors-ligne"}</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: 800 }}>
                                    <div style={{ padding: '0.3rem', background: 'var(--color-primary)', borderRadius: '4px', border: '2px solid #000' }}><Check size={16} color="#000" strokeWidth={4} /></div>
                                    <span>{t('landing.features.mobile.feature_3') || "Notifications Push (Bientôt)"}</span>
                                </li>
                            </ul>
                            <div className={styles.appPromoActions}>
                                <InstallPWA variant="landing" />
                                <div className={styles.qrContainer}>
                                    <OptimizedImage
                                        src={"https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://bingeki.web.app/?install=1&color=000000&bgcolor=ffffff"}
                                        alt="QR Code"
                                        width="100"
                                        height="100"
                                    />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: '0.5rem', textAlign: 'center' }}>
                                        {t('landing.features.mobile.scan_qr') || "Scannez pour installer"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.visualContent}>
                        <div className={styles.mockupContainer} style={{ width: '80%', display: 'flex', justifyContent: 'center' }}>
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ type: "spring", bounce: 0.4 }}
                                style={{
                                    width: '280px',
                                    height: '560px',
                                    background: '#000',
                                    borderRadius: '30px',
                                    border: '8px solid #333',
                                    boxShadow: '20px 20px 0 var(--color-shadow-strong)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Phone Notch */}
                                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '25px', background: '#333', borderBottomLeftRadius: '15px', borderBottomRightRadius: '15px', zIndex: 20 }}></div>

                                {/* Screen Content */}
                                <div style={{ width: '100%', height: '100%', background: 'var(--color-surface)', overflow: 'hidden', padding: '3rem 1rem 1rem 1rem', display: 'flex', flexDirection: 'column' }}>
                                    {/* App Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <span style={{ fontWeight: 900, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>BINGEKI</span>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#eee' }}></div>
                                    </div>

                                    {/* App Cards */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ height: '140px', background: 'var(--color-surface)', border: '2px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1, fontSize: '3rem', fontWeight: 900 }}>MANGAS</div>
                                            <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', fontWeight: 900, background: 'var(--color-primary)', padding: '0.2rem 0.5rem' }}>CONTINUE</div>
                                        </div>
                                        <div style={{ height: '80px', background: 'var(--color-surface-hover)', border: '2px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
                                            <div style={{ width: '60%', height: '10px', background: 'var(--color-border)', marginBottom: '0.5rem' }}></div>
                                            <div style={{ width: '40%', height: '10px', background: 'var(--color-border)' }}></div>
                                        </div>
                                    </div>

                                    {/* Bottom Nav Mockup */}
                                    <div style={{ marginTop: 'auto', borderTop: '2px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-around', opacity: 0.5 }}>
                                        <Home size={24} />
                                        <Search size={24} />
                                        <User size={24} />
                                    </div>
                                </div>

                                {/* Glare */}
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 45%, transparent 50%)', pointerEvents: 'none' }}></div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* SECTION 6: TIPS FOR DEVS */}
                <section className={`${styles.featureSection} ${styles.supportSection}`}>
                    <div className={styles.sfx} style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 'min(15rem, 25vw)',
                        color: '#000',
                        opacity: 0.05
                    }}>
                        {t('landing.features.support.sfx')}
                    </div>

                    <div className={styles.supportContent}>
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className={styles.supportTag}>
                                {t('landing.features.support.tag')}
                            </div>

                            <h2 className={styles.supportTitle}>
                                {t('landing.features.support.title')}
                            </h2>

                            <p className={styles.supportDescPrimary}>
                                {t('landing.features.support.description_1')}
                            </p>

                            <p className={styles.supportDescSecondary}>
                                {t('landing.features.support.description_2')}
                            </p>

                            <motion.a
                                href="https://ko-fi.com/moussandou"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.kofiButton}
                                whileTap={{ scale: 0.98 }}
                            >
                                <OptimizedImage
                                    src="/Ko-fi logo.gif"
                                    alt="Support me on Ko-fi"
                                    objectFit="contain"
                                    showSkeleton={false}
                                    style={{
                                        height: '40px',
                                        width: '120px',
                                        margin: '0 auto'
                                    }}
                                />
                            </motion.a>

                            <div className={styles.supportFeatures}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                    <Check size={18} /> {t('landing.features.support.features')}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                    <Check size={18} /> {t('landing.features.support.servers')}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                    <Check size={18} /> {t('landing.features.support.premium')}
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className={styles.ctaSection}>
                    <motion.div
                        initial={{ scale: 0.9 }}
                        whileInView={{ scale: 1 }}
                        transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
                    >
                        <h2 style={{ fontSize: 'min(3rem, 10vw)', marginBottom: '2rem', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                            {user ? t('landing.features.final_cta.title_logged_in') : t('landing.features.final_cta.title')}
                        </h2>
                        <Link to={user ? "/dashboard" : "/auth"}>
                            <button className={styles.ctaButton}>
                                {user ? t('landing.features.final_cta.button_logged_in') : t('landing.features.final_cta.button')}
                            </button>
                        </Link>
                    </motion.div>
                </section>

                {/* SCROLL TOP BUTTON */}
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={scrollToTop}
                        style={{
                            position: 'fixed',
                            bottom: '2rem',
                            right: '2rem',
                            width: '50px',
                            height: '50px',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            border: '2px solid var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 100,
                            boxShadow: '4px 4px 0 var(--color-primary)'
                        }}
                    >
                        <ChevronUp size={24} />
                    </motion.button>
                )}

            </div>
        </Layout>
    );
}
