/**
 * Tutorial Overlay component (tutorial)
 */
import { useTutorialStore } from '@/store/tutorialStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Zap, User, Compass, Book, Languages, Search, TrendingUp, Upload, ArrowUp, Flame, Trophy } from 'lucide-react'; // Added icons
import { NenChart } from '@/components/profile/NenChart'; // Import NenChart

// --- MOCK COMPONENTS FOR VISUALS ---

const MockProfileVisual = () => {
    // Fake stats for a balanced, cool looking chart
    const mockStats = {
        level: 25,
        xp: 6500,
        streak: 85,
        totalChaptersRead: 450,
        totalWorksAdded: 150,
        totalWorksCompleted: 12
    };

    return (
        <div style={{ width: '220px', height: '180px', pointerEvents: 'none' }}>
            <NenChart stats={mockStats} themeColor="var(--color-primary)" />
        </div>
    );
};

const MockDiscoverVisual = () => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
        width: '200px',
        opacity: 0.9
    }}>
        <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
        }}>
            <Search size={24} color="var(--color-secondary)" />
            <div style={{ height: '4px', width: '60%', background: 'var(--color-text)', opacity: 0.2, borderRadius: '2px' }} />
        </div>
        <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
        }}>
            <TrendingUp size={24} color="var(--color-accent)" />
            <div style={{ height: '4px', width: '60%', background: 'var(--color-text)', opacity: 0.2, borderRadius: '2px' }} />
        </div>
        <div style={{
            gridColumn: 'span 2', background: 'linear-gradient(90deg, var(--color-secondary) 0%, transparent 100%)',
            height: '40px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 10px',
            border: '1px solid var(--color-border)'
        }}>
            <div style={{ height: '8px', width: '40px', background: '#fff', borderRadius: '4px', opacity: 0.8 }} />
        </div>
    </div>
);

const MockLibraryVisual = () => (
    <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        height: '120px',
        paddingBottom: '10px'
    }}>
        {[1, 2, 3].map((i) => (
            <div key={i} style={{
                width: '40px',
                height: `${80 + i * 10}px`,
                background: `var(--color-surface)`,
                border: '2px solid var(--color-border)',
                borderRadius: '4px',
                position: 'relative',
                transform: `rotate(${i % 2 === 0 ? 3 : -3}deg)`,
                boxShadow: '2px 2px 0 var(--color-shadow)'
            }}>
                <div style={{
                    position: 'absolute', top: '5px', left: '5px', right: '5px', bottom: '5px',
                    background: i === 2 ? 'var(--color-primary)' : 'var(--color-border)',
                    opacity: 0.3
                }} />
            </div>
        ))}
        <div style={{
            marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center'
        }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }} />
                <span>One Piece</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }} />
                <span>Berserk</span>
            </div>
        </div>
    </div>
);

const MockImportVisual = () => (
    <div style={{
        position: 'relative', width: '140px', height: '100px',
        background: 'var(--color-surface)',
        border: '2px dashed var(--color-primary)',
        borderRadius: '12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
        <div style={{
            width: '40px', height: '40px', background: 'var(--color-primary)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(var(--color-primary-rgb), 0.4)'
        }}>
            <ArrowUp size={24} color="#fff" strokeWidth={3} />
        </div>
        <div style={{
            fontSize: '0.8rem', fontWeight: '800', opacity: 0.8,
            fontFamily: 'var(--font-heading)', letterSpacing: '0.5px'
        }}>
            MAL / JSON
        </div>

        {/* Floating elements */}
        <div style={{
            position: 'absolute', top: -10, right: -10,
            background: '#2E51A2', color: 'white', padding: '4px 8px', borderRadius: '4px',
            fontSize: '0.6rem', fontWeight: 'bold'
        }}>
            MAL
        </div>
    </div>
);

const MockGamificationVisual = () => (
    <div style={{
        display: 'flex', flexDirection: 'column', gap: '15px', width: '220px'
    }}>
        <div style={{
            background: 'var(--color-surface)', padding: '10px', borderRadius: '8px', 
            border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
            <div style={{
                width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(var(--color-primary-rgb), 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Flame size={24} color="var(--color-primary)" />
            </div>
            <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}>LVL 12</div>
                <div style={{ height: '6px', width: '100px', background: 'var(--color-border)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '60%', background: 'var(--color-primary)' }} />
                </div>
            </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{
                flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
                <Flame size={20} color="var(--color-accent)" />
                <span style={{ fontWeight: 'bold' }}>15 🔥</span>
            </div>
            <div style={{
                flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
                <Trophy size={20} color="#f59e0b" />
                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>8 ⭐</span>
            </div>
        </div>
    </div>
);

// Steps definition with keys instead of hardcoded text
const STEPS = [
    {
        titleKey: "tutorial.welcome_title",
        descKey: "tutorial.welcome_desc",
        target: null, // Centered
        icon: <Zap size={64} className="text-secondary" />,
        component: null // Default icon usage
    },
    {
        titleKey: "tutorial.profile_title",
        descKey: "tutorial.profile_desc",
        target: "profile-section",
        icon: <User size={64} style={{ color: 'var(--color-primary)' }} />,
        component: <MockProfileVisual />
    },
    {
        titleKey: "tutorial.discover_title",
        descKey: "tutorial.discover_desc",
        target: "discover-nav",
        icon: <Compass size={64} style={{ color: 'var(--color-secondary)' }} />,
        component: <MockDiscoverVisual />
    },
    {
        titleKey: "tutorial.library_title",
        descKey: "tutorial.library_desc",
        target: "library-nav",
        icon: <Book size={64} style={{ color: 'var(--color-accent)' }} />,
        component: <MockLibraryVisual />
    },
    {
        titleKey: "tutorial.gamification_title",
        descKey: "tutorial.gamification_desc",
        target: null,
        icon: <Flame size={64} style={{ color: 'var(--color-primary)' }} />,
        component: <MockGamificationVisual />
    },
    {
        titleKey: "tutorial.import_title",
        descKey: "tutorial.import_desc",
        target: "import-btn",
        icon: <Upload size={64} style={{ color: 'var(--color-success)' }} />,
        component: <MockImportVisual />
    }
];

export function TutorialOverlay() {
    const { isActive, currentStep, nextStep, prevStep, endTutorial } = useTutorialStore();
    const { t, i18n } = useTranslation();

    // Prevent body scroll when active
    useEffect(() => {
        if (isActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isActive]);

    if (!isActive) return null;

    const step = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;

    const toggleLanguage = () => {
        const newLang = i18n.language === 'fr' ? 'en' : 'fr';
        i18n.changeLanguage(newLang);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 9999,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto'
                }}
            >
                <div style={{
                    maxWidth: '480px',
                    width: '90%',
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    borderRadius: '16px',
                    padding: '2.5rem',
                    boxShadow: '0 0 30px rgba(var(--color-primary-rgb), 0.3)',
                    position: 'relative',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    {/* Language Switcher */}
                    <button
                        onClick={toggleLanguage}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            borderRadius: '20px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: 'var(--color-text)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 'bold',
                            opacity: 0.7,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                        <Languages size={14} />
                        {i18n.language === 'fr' ? 'EN' : 'FR'}
                    </button>

                    {/* Visual Area - Dynamic Content */}
                    <div style={{
                        marginBottom: '1.5rem',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '180px' // Fixed height for visuals
                    }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >
                                {step.component || (
                                    <div style={{
                                        padding: '2rem',
                                        background: 'rgba(var(--color-primary-rgb), 0.05)',
                                        borderRadius: '50%',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        {step.icon}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <h2 style={{
                        fontSize: '1.8rem',
                        fontFamily: 'var(--font-heading)',
                        marginBottom: '1rem',
                        textTransform: 'uppercase',
                        lineHeight: 1.1
                    }}>
                        {t(step.titleKey)}
                    </h2>
                    <p style={{ marginBottom: '2.5rem', lineHeight: 1.6, opacity: 0.8, fontSize: '1rem' }}>
                        {t(step.descKey)}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Button variant="ghost" onClick={endTutorial} style={{ opacity: 0.6 }}>
                            {t('common.skip') || 'Skip'}
                        </Button>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {currentStep > 0 && (
                                <Button variant="outline" onClick={prevStep}>
                                    {t('common.prev') || 'Previous'}
                                </Button>
                            )}
                            <Button variant="manga" onClick={isLast ? endTutorial : nextStep} style={{ minWidth: '100px' }}>
                                {isLast ? (t('common.finish') || 'Finish') : (t('common.next') || 'Next')}
                            </Button>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: i === currentStep ? 24 : 8,
                                    height: 8,
                                    borderRadius: '4px',
                                    background: i === currentStep ? 'var(--color-primary)' : 'var(--color-border)',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
