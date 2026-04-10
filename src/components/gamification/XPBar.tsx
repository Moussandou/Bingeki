/**
 * X P Bar component (gamification)
 */
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface XPBarProps {
    current: number;
    max: number;
    level: number;
}

export function XPBar({ current, max, level }: XPBarProps) {
    const { t } = useTranslation();
    const percent = Math.min((current / max) * 100, 100);

    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-heading)',
                    textTransform: 'uppercase'
                }}>
                    {t('components.xp_bar.level')} {level}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 700 }}>{current} / {max} XP</span>
            </div>

            <div style={{
                height: '10px',
                background: 'var(--color-surface-dim)',
                border: '2px solid var(--color-border-heavy)',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: "circOut" }}
                    style={{
                        height: '100%',
                        background: 'var(--color-primary)',
                        position: 'relative',
                        zIndex: 2,
                        overflow: 'hidden'
                    }}
                >
                    {/* Shimmer effect inside the bar */}
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1 }}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, bottom: 0, width: '40%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                            zIndex: 3
                        }}
                    />
                </motion.div>
            </div>
        </div>
    );
}
