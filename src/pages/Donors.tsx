/**
 * Donors page
 */
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { ArrowLeft, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Donors() {
    const { t } = useTranslation();

    return (
        <Layout>
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
                <Link to="/">
                    <Button variant="ghost" icon={<ArrowLeft size={20} />} style={{ marginBottom: '2rem' }}>
                        {t('legal.back')}
                    </Button>
                </Link>

                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '3.5rem',
                        marginBottom: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, #fff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 20px var(--color-primary-glow))'

                    }}>
                        {t('donors.title')}
                    </h1>
                    <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
                        {t('donors.subtitle')}
                    </p>
                </div>

                {/* TOP DONOR SHOWCASE */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '5rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, rgba(255,215,0,0.1) 0%, rgba(0,0,0,0) 100%)',
                        border: '2px solid #FFD700',
                        padding: '3rem',
                        textAlign: 'center',
                        position: 'relative',
                        maxWidth: '500px',
                        width: '100%',
                        clipPath: 'polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0% 100%, 0% 10%)',
                        boxShadow: '6px 6px 0 var(--color-shadow-solid)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-1.5rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#FFD700',
                            color: '#000',
                            fontWeight: 900,
                            padding: '0.5rem 1.5rem',
                            fontSize: '0.9rem',
                            fontFamily: 'var(--font-heading)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                            width: 'max-content', // Fix truncation
                            whiteSpace: 'nowrap'
                        }}>
                            <Crown size={16} fill="#000" />
                            {t('donors.top_donor')}
                        </div>

                        <div style={{
                            width: '120px',
                            height: '120px',
                            background: '#FFD700',
                            borderRadius: '50%',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '3rem',
                            fontWeight: 900,
                            color: '#000',
                            border: '4px solid #fff',
                            boxShadow: '6px 6px 0 var(--color-shadow-solid)'
                        }}>
                            1
                        </div>

                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 900,
                            color: '#FFD700',
                            marginBottom: '0.5rem',
                            fontFamily: 'var(--font-heading)',
                            textTransform: 'uppercase'
                        }}>
                            Hugo Remtoula
                        </h2>

                        <div style={{
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            opacity: 0.8,
                            marginBottom: '0.5rem'
                        }}>
                            {t('donors.rank_1')}
                        </div>

                        <a
                            href="https://inazuma-db.web.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                color: 'var(--color-primary)',
                                textDecoration: 'none',
                                marginBottom: '1.5rem',
                                fontWeight: 700,
                                opacity: 0.9,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
                        >
                            {t('donors.creator_desc')}
                        </a>


                    </div>
                </div>

                {/* OTHER DONORS LIST (Empty for now but ready) */}
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto 5rem',
                    textAlign: 'center'
                }}>
                    {/* Add map here later */}
                </div>

                {/* THANK YOU SECTION */}
                <div className="manga-panel" style={{
                    textAlign: 'center',
                    padding: '3rem',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>{t('donors.thank_you_title')}</h3>
                    <p style={{ opacity: 0.8, marginBottom: '2rem', lineHeight: '1.6' }}>
                        {t('donors.thank_you_desc')}
                    </p>
                    <a
                        href="https://ko-fi.com/moussandou"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'var(--color-primary)',
                            color: '#fff', // Force white text for contrast on primary
                            padding: '1rem 2rem',
                            fontWeight: 900,
                            textDecoration: 'none',
                            borderRadius: '0',
                            fontFamily: 'var(--font-heading)',
                            textTransform: 'uppercase',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 5px 15px var(--color-primary-glow)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {t('donors.become_donor')}
                    </a>
                </div>

            </div>
        </Layout>
    );
}
