import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { ArrowLeft, Rocket, Target, BookOpen, Quote, Sparkles, Users, Gamepad2, Smartphone, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function About() {
    const { t } = useTranslation();

    return (
        <Layout>
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
                <Link to="/">
                    <Button variant="ghost" icon={<ArrowLeft size={20} />} style={{ marginBottom: '2rem' }}>
                        {t('common.back')}
                    </Button>
                </Link>

                <div className="manga-panel" style={{ 
                    padding: '0', 
                    position: 'relative', 
                    overflow: 'hidden', 
                    background: 'var(--color-surface)', 
                    border: '4px solid var(--color-border-heavy)',
                    boxShadow: '12px 12px 0 var(--color-border-heavy)'
                }}>
                    <div className="manga-halftone" style={{ opacity: 0.1, pointerEvents: 'none' }}></div>
                    
                    {/* Header Section - Robust Flex Alignment */}
                    <div style={{ 
                        padding: '6rem 2rem', 
                        background: 'var(--color-surface)', 
                        position: 'relative', 
                        borderBottom: '8px solid var(--color-border-heavy)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                    }}>
                        <div className="manga-speedlines" style={{ opacity: 0.05 }}></div>
                        <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                            <h1 className="manga-title" style={{ 
                                fontSize: 'clamp(2.2rem, 8vw, 4.5rem)', 
                                marginBottom: '2rem', 
                                color: 'var(--color-primary)',
                                textShadow: '4px 4px 0 var(--color-border-heavy)',
                                width: '100%'
                            }}>
                                {t('about.title')}
                            </h1>
                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                <div style={{ 
                                    padding: '0.6rem 2.5rem', 
                                    background: 'var(--color-text)', 
                                    color: 'var(--color-surface)',
                                    transform: 'skewX(-10deg)',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    fontSize: '1rem',
                                    letterSpacing: '1px'
                                }}>
                                    {t('about.vision_title')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: 'clamp(1.5rem, 5vw, 4rem)', position: 'relative', zIndex: 2 }}>
                        {/* Introduction / Vision - Solid Background */}
                        <section className="manga-panel" style={{ 
                            marginBottom: '4rem', 
                            padding: 'clamp(1.5rem, 4vw, 3rem)', 
                            background: 'var(--color-surface)', 
                            border: '3px solid var(--color-border-heavy)',
                            boxShadow: '8px 8px 0 var(--color-border-heavy)' 
                        }}>
                            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ flex: '2 1 500px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <Sparkles size={24} color="var(--color-primary)" />
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase' }}>Vision</h2>
                                    </div>
                                    <p style={{ fontSize: '1.15rem', lineHeight: '1.9', marginBottom: '2rem', color: 'var(--color-text)' }}>
                                        {t('about.vision_p1')}
                                    </p>
                                    <div style={{ 
                                        padding: '1.5rem', 
                                        border: '2px dashed var(--color-primary)', 
                                        background: 'var(--color-background-soft)',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-primary)', margin: 0 }}>
                                            {t('about.vision_p2')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Problem & Evolution - All with Solid Surface Background */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                            <section className="manga-panel" style={{ 
                                padding: '2.5rem', 
                                borderLeft: '12px solid var(--color-primary)', 
                                background: 'var(--color-surface)', 
                                borderTop: '3px solid var(--color-border-heavy)', 
                                borderRight: '3px solid var(--color-border-heavy)', 
                                borderBottom: '3px solid var(--color-border-heavy)' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <Zap size={24} color="var(--color-primary)" />
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>
                                        Le Constat
                                    </h2>
                                </div>
                                <p style={{ lineHeight: '1.8', marginBottom: '1.5rem', color: 'var(--color-text)' }}>{t('about.problem_p1')}</p>
                                <div style={{ padding: '1.2rem', background: 'var(--color-background-soft)', border: '1px solid var(--color-border)', fontWeight: 800 }}>
                                    {t('about.problem_p2')}
                                </div>
                            </section>

                            <section className="manga-panel" style={{ 
                                padding: '2.5rem', 
                                background: 'var(--color-surface)', 
                                border: '3px solid var(--color-border-heavy)' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <Rocket size={24} color="var(--color-primary)" />
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>
                                        L'Evolution
                                    </h2>
                                </div>
                                <p style={{ lineHeight: '1.8', color: 'var(--color-text)' }}>{t('about.evolution_p1')}</p>
                            </section>
                        </div>

                        {/* Core Statement */}
                        <div style={{ 
                            background: 'var(--color-text)', 
                            color: 'var(--color-surface)', 
                            padding: '4rem 2rem', 
                            textAlign: 'center', 
                            marginBottom: '4rem',
                            transform: 'rotate(-0.5deg)',
                            margin: '0 -2rem 4rem -2rem',
                            border: '6px solid var(--color-border-heavy)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}>
                            <Quote size={64} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, textTransform: 'uppercase', maxWidth: '1000px', margin: '0 auto', color: 'var(--color-surface)', lineHeight: '1.4' }}>
                                {t('about.core_p1')}
                            </h2>
                        </div>

                        {/* Features & Social & Progression - Unified Surface background */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                            <section className="manga-panel" style={{ padding: '2.5rem', background: 'var(--color-surface)', border: '3px solid var(--color-border-heavy)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <BookOpen size={24} color="var(--color-primary)" />
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>Fonctionnalités</h3>
                                </div>
                                <p style={{ lineHeight: '1.8', color: 'var(--color-text)', marginBottom: '1.5rem' }}>{t('about.features_p1')}</p>
                                <div style={{ padding: '0.8rem', borderTop: '2px solid var(--color-primary)', fontWeight: 700, color: 'var(--color-primary)' }}>
                                    {t('about.features_p2')}
                                </div>
                            </section>

                            <section className="manga-panel" style={{ padding: '2.5rem', background: 'var(--color-surface)', border: '3px solid var(--color-border-heavy)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <Users size={24} color="var(--color-primary)" />
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>Social</h3>
                                </div>
                                <p style={{ lineHeight: '1.8', color: 'var(--color-text)' }}>{t('about.social_p1')}</p>
                            </section>

                            <section className="manga-panel" style={{ padding: '2.5rem', background: 'var(--color-surface)', border: '3px solid var(--color-border-heavy)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <Gamepad2 size={24} color="var(--color-primary)" />
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>Progression</h3>
                                </div>
                                <p style={{ lineHeight: '1.8', color: 'var(--color-text)' }}>{t('about.gamification_p1')}</p>
                            </section>
                        </div>

                        {/* Design & Audience - Forced Surface Background for readability */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                            <div className="manga-panel" style={{ padding: '2.5rem', background: 'var(--color-surface)', border: '3px solid var(--color-border-heavy)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                                    <Smartphone size={20} color="var(--color-primary)" />
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>Accessibilité</h4>
                                </div>
                                <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--color-text)' }}>{t('about.design_p1')}</p>
                            </div>
                            <div className="manga-panel" style={{ padding: '2.5rem', background: 'var(--color-surface)', border: '3px solid var(--color-border-heavy)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                                    <Target size={20} color="var(--color-primary)" />
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text)' }}>Public</h4>
                                </div>
                                <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--color-text)' }}>{t('about.audience_p1')}</p>
                            </div>
                        </div>

                        {/* Future & Ecosystem */}
                        <section className="manga-panel" style={{ marginBottom: '4rem', padding: '3rem', border: '4px solid var(--color-border-heavy)', background: 'var(--color-surface)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
                                <div>
                                    <h3 style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.2rem', color: 'var(--color-primary)' }}>L'Avenir</h3>
                                    <p style={{ lineHeight: '1.8', color: 'var(--color-text)' }}>{t('about.future_p1')}</p>
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.2rem', color: 'var(--color-primary)' }}>L'Ecosystème</h3>
                                    <p style={{ lineHeight: '1.8', color: 'var(--color-text)' }}>{t('about.ecosystem_p1')}</p>
                                </div>
                            </div>
                        </section>

                        {/* Closing - Final High Visibility Panel */}
                        <div className="manga-panel" style={{ 
                            textAlign: 'center', 
                            padding: '4rem 2rem', 
                            background: 'var(--color-surface)', 
                            border: '6px solid var(--color-border-heavy)',
                            position: 'relative',
                            boxShadow: '8px 8px 0 var(--color-primary)'
                        }}>
                            <Rocket size={40} color="var(--color-primary)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
                            <p style={{ fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-primary)', lineHeight: '1.3', maxWidth: '850px', margin: '0 auto' }}>
                                {t('about.closing_p1')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
