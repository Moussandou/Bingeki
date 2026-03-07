import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/layout/SEO';
import { Link } from '@/components/routing/LocalizedLink';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ExternalLink, Calendar, Link as LinkIcon, List, BookOpen, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface NewsItem {
    slug: string;
    title: string;
    content: string;
    contentSnippet?: string;
    sourceUrl: string;
    sourceName: string;
    publishedAt: string;
    tags?: string[];
    imageUrl?: string;
}

interface Heading {
    id: string;
    text: string;
    level: number;
}

export default function NewsArticle() {
    const { slug } = useParams<{ slug: string }>();
    const { i18n, t } = useTranslation();
    const [article, setArticle] = useState<NewsItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        async function fetchArticle() {
            if (!slug) return;
            try {
                const docRef = doc(db, 'news', slug);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as NewsItem;

                    // Parse content to inject IDs for TOC
                    const parser = new DOMParser();
                    const htmlDoc = parser.parseFromString(data.content, 'text/html');
                    const headingTags = htmlDoc.querySelectorAll('h2, h3');
                    const extractedHeadings: Heading[] = [];

                    headingTags.forEach((el, i) => {
                        const id = `section-${i}`;
                        el.id = id;
                        extractedHeadings.push({
                            id,
                            text: el.textContent || '',
                            level: parseInt(el.tagName.substring(1))
                        });
                    });

                    setHeadings(extractedHeadings);
                    setArticle({
                        ...data,
                        content: htmlDoc.body.innerHTML
                    });
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error('Error fetching article:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        fetchArticle();
        window.scrollTo(0, 0);
    }, [slug]);

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) return <LoadingScreen />;

    if (error || !article) {
        return (
            <Layout>
                <div className="container" style={{ paddingTop: '4rem', textAlign: 'center', minHeight: '60vh' }}>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '2rem' }}>{t('news.not_found', 'Article introuvable')}</h2>
                    <Link to="/news">
                        <Button variant="manga" icon={<ArrowLeft size={18} />}>{t('news.back', 'Retour aux actus')}</Button>
                    </Link>
                </div>
            </Layout>
        );
    }

    const dateLocale = i18n.language === 'fr' ? fr : enUS;
    let formattedDate = article.publishedAt;
    try {
        formattedDate = format(new Date(article.publishedAt), 'PPP', { locale: dateLocale });
    } catch (e) { }

    return (
        <Layout>
            <SEO
                title={`${article.title} - Bingeki News`}
                description={article.contentSnippet ? article.contentSnippet.substring(0, 150) + '...' : article.title}
                image={article.imageUrl}
            />

            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
                <Link to="/news">
                    <Button variant="ghost" icon={<ArrowLeft size={20} />} style={{ marginBottom: '2rem', padding: '0.5rem 0' }}>
                        {t('news.back', 'Retour')}
                    </Button>
                </Link>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', position: 'relative' }} className="news-article-grid">
                    {/* Main Content */}
                    <article style={{
                        background: 'var(--color-surface)',
                        border: '3px solid var(--color-border-heavy)',
                        boxShadow: '12px 12px 0 var(--color-shadow-solid)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {/* Header Image */}
                        {article.imageUrl && (
                            <div style={{ width: '100%', height: '450px', borderBottom: '3px solid var(--color-border-heavy)', position: 'relative' }}>
                                <img
                                    src={article.imageUrl}
                                    alt={article.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />

                                <div style={{ position: 'absolute', bottom: '1.5rem', left: '2rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {article.tags?.map(tag => (
                                        <span key={tag} style={{
                                            background: 'var(--color-primary)',
                                            color: '#fff',
                                            padding: '4px 12px',
                                            fontSize: '0.85rem',
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            boxShadow: '3px 3px 0 #000'
                                        }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)' }}>
                            <h1 style={{
                                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                                fontWeight: 900,
                                fontFamily: 'var(--font-heading)',
                                lineHeight: 1.1,
                                marginBottom: '2rem',
                                color: 'var(--color-text)',
                                letterSpacing: '-0.02em'
                            }}>
                                {article.title}
                            </h1>

                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '24px',
                                color: 'var(--color-text-dim)',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                marginBottom: '3rem',
                                paddingBottom: '1.5rem',
                                borderBottom: '3px solid var(--color-border)',
                                textTransform: 'uppercase'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                                    <LinkIcon size={18} /> {article.sourceName}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={18} /> {formattedDate}
                                </span>
                            </div>

                            {/* Summary Box / Info Box */}
                            <div style={{
                                background: '#FF9500', // Orange typical du design
                                color: '#000',
                                padding: '2rem',
                                border: '3px solid #000',
                                boxShadow: '8px 8px 0 #000',
                                marginBottom: '3rem',
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-15px',
                                    left: '20px',
                                    background: '#000',
                                    color: '#fff',
                                    padding: '4px 12px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <BookOpen size={14} /> {t('news.summary_box_title', 'EN UN CLIN D\'ŒIL')}
                                </div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.6 }}>
                                    {article.contentSnippet || article.title}
                                </p>
                            </div>

                            {/* Sidebar for Mobile TOC Toggle or just desktop sidebar below */}

                            <div style={{ display: 'flex', gap: '4rem' }}>
                                {/* Article Content Body */}
                                <div
                                    className="article-content"
                                    style={{
                                        lineHeight: 1.8,
                                        fontSize: '1.2rem',
                                        color: 'var(--color-text)',
                                        flex: 1
                                    }}
                                    dangerouslySetInnerHTML={{ __html: article.content }}
                                />

                                {/* Sidebar Sticky TOC */}
                                {headings.length > 0 && (
                                    <aside className="article-sidebar" style={{
                                        width: '280px',
                                        flexShrink: 0,
                                        position: 'sticky',
                                        top: '6rem',
                                        height: 'fit-content'
                                    }}>
                                        <div style={{
                                            background: 'var(--color-surface)',
                                            border: '3px solid var(--color-border-heavy)',
                                            boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                                            padding: '1.5rem'
                                        }}>
                                            <h4 style={{
                                                fontFamily: 'var(--font-heading)',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                marginBottom: '1.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                borderBottom: '2px solid var(--color-border)',
                                                paddingBottom: '0.5rem'
                                            }}>
                                                <List size={20} /> {t('news.toc', 'Sommaire')}
                                            </h4>
                                            <nav>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {headings.map((h) => (
                                                        <li key={h.id} style={{ paddingLeft: h.level === 3 ? '1rem' : '0' }}>
                                                            <a
                                                                href={`#${h.id}`}
                                                                style={{
                                                                    textDecoration: 'none',
                                                                    color: 'var(--color-text)',
                                                                    fontWeight: h.level === 2 ? 800 : 600,
                                                                    fontSize: '0.95rem',
                                                                    display: 'block',
                                                                    transition: 'color 0.2s'
                                                                }}
                                                            >
                                                                {h.text}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </nav>
                                        </div>
                                    </aside>
                                )}
                            </div>

                            {/* CTA Source */}
                            <div style={{
                                marginTop: '5rem',
                                padding: '3rem',
                                background: 'var(--color-surface-hover)',
                                border: '4px solid var(--color-border-heavy)',
                                textAlign: 'center',
                                position: 'relative',
                                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-primary)', color: '#fff', padding: '6px 20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '4px 4px 0 #000' }}>
                                    {t('news.source_badge', 'Source Officielle')}
                                </div>
                                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                                    {t('news.read_full', 'Plus d\'infos sur cet article')}
                                </h3>
                                <p style={{ marginBottom: '2.5rem', color: 'var(--color-text-muted)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
                                    {t('news.disclaimer', 'Cet extrait est proposé par Bingeki pour vous tenir informé rapidement. Pour approfondir le sujet, consultez le reportage complet sur')} <strong>{article.sourceName}</strong>.
                                </p>
                                <a
                                    href={article.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="source-button"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '18px 40px',
                                        background: 'var(--color-text)',
                                        color: 'var(--color-surface)',
                                        fontWeight: 900,
                                        fontFamily: 'var(--font-heading)',
                                        textTransform: 'uppercase',
                                        fontSize: '1.2rem',
                                        textDecoration: 'none',
                                        boxShadow: '8px 8px 0 var(--color-primary)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {t('news.go_to_source', 'Accéder à la Source')} <ExternalLink size={24} />
                                </a>
                            </div>
                        </div>
                    </article>
                </div>
            </div>

            {/* Back to Top Button */}
            <button
                onClick={scrollToTop}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '60px',
                    height: '60px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0 #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 100,
                    opacity: showBackToTop ? 1 : 0,
                    transform: showBackToTop ? 'translateY(0)' : 'translateY(20px)',
                    pointerEvents: showBackToTop ? 'all' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                className="back-to-top"
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-2px, -2px)';
                    e.currentTarget.style.boxShadow = '6px 6px 0 #000';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = '4px 4px 0 #000';
                }}
            >
                <ArrowUp size={30} strokeWidth={3} />
            </button>

            <style>
                {`
                @media (max-width: 1100px) {
                    .article-sidebar {
                        display: none;
                    }
                }
                
                .article-content {
                    counter-reset: h2-counter;
                }

                .article-content h2 {
                    font-family: var(--font-heading);
                    font-weight: 900;
                    margin-top: 5rem;
                    margin-bottom: 2rem;
                    font-size: 2.22rem;
                    padding-top: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 3px solid var(--color-border);
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .article-content h2::before {
                    counter-increment: h2-counter;
                    content: counter(h2-counter, decimal-leading-zero);
                    background: #FF9500;
                    color: black;
                    padding: 4px 12px;
                    font-size: 1.2rem;
                    border: 2px solid #000;
                    box-shadow: 4px 4px 0 #000;
                    transform: rotate(-3deg);
                }

                .article-content h3 {
                    font-family: var(--font-heading);
                    font-weight: 900;
                    margin-top: 3.5rem;
                    margin-bottom: 1.5rem;
                    font-size: 1.6rem;
                    color: var(--color-primary);
                }

                .article-content p {
                    margin-bottom: 2rem;
                }

                .article-content ul, .article-content ol {
                    margin-bottom: 2rem;
                    padding-left: 2rem;
                }

                .article-content li {
                    margin-bottom: 0.8rem;
                }

                .article-content img {
                    max-width: 100%;
                    height: auto;
                    border: 4px solid var(--color-border-heavy);
                    box-shadow: 10px 10px 0 var(--color-shadow-solid);
                    margin: 3rem 0;
                }

                .article-content a {
                    color: var(--color-primary);
                    font-weight: 800;
                    text-decoration: underline;
                    text-underline-offset: 4px;
                }

                .article-content blockquote {
                    border-left: 8px solid var(--color-primary);
                    background: var(--color-surface-hover);
                    padding: 2.5rem;
                    margin: 3rem 0;
                    font-size: 1.35rem;
                    font-style: italic;
                    color: var(--color-text-dim);
                    font-family: var(--font-heading);
                    box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
                }

                .source-button:hover {
                    transform: translate(3px, 3px);
                    box-shadow: 5px 5px 0 var(--color-primary) !important;
                }
                `}
            </style>
        </Layout>
    );
}
