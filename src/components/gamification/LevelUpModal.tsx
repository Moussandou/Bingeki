/**
 * Level Up Modal component (gamification)
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useGamificationStore } from '@/store/gamificationStore';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Trophy } from 'lucide-react';

export function LevelUpModal() {
    const levelUpData = useGamificationStore(s => s.levelUpData);
    const clearLevelUpData = useGamificationStore(s => s.clearLevelUpData);
    const { t } = useTranslation();

    if (!levelUpData) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div style={{ position: 'relative' }}>
                    {/* Glowing background */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '300px', height: '300px',
                        background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
                        opacity: 0.3,
                        pointerEvents: 'none'
                    }} />

                    <motion.div
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", damping: 15 }}
                        style={{
                            background: 'var(--color-surface)',
                            border: '3px solid var(--color-primary)',
                            borderRadius: '20px',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            maxWidth: '400px',
                            width: '90vw',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 0 10px rgba(var(--color-primary-rgb), 0.1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            style={{
                                position: 'absolute', top: '-150%', left: '-150%', width: '400%', height: '400%',
                                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(var(--color-primary-rgb), 0.1) 90deg, transparent 180deg, rgba(var(--color-primary-rgb), 0.1) 270deg, transparent 360deg)',
                                zIndex: 0, pointerEvents: 'none'
                            }}
                        />

                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px',
                                background: 'var(--color-primary)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '1.5rem',
                                boxShadow: '0 0 20px rgba(var(--color-primary-rgb), 0.5), inset 0px -5px 10px rgba(0,0,0,0.3)'
                            }}>
                                <Trophy size={40} color="#fff" />
                            </div>

                            <h2 style={{
                                fontSize: '2.5rem',
                                fontFamily: 'var(--font-heading)',
                                color: 'var(--color-text)',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                lineHeight: '1.1'
                            }}>
                                {t('gamification.level_up', 'Level Up!')}
                            </h2>
                            
                            <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
                                {t('gamification.reached_level', 'You have reached level')} <strong style={{color: 'var(--color-primary)', fontSize: '1.5rem', fontFamily: 'var(--font-heading)'}}>{levelUpData.newLevel}</strong>
                            </p>

                            <Button variant="manga" size="lg" onClick={clearLevelUpData} style={{ width: '100%' }}>
                                {t('common.continue', 'Continue')}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
