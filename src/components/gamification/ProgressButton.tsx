/**
 * Progress Button component (gamification)
 */
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Sword, Check } from 'lucide-react';
import { useState } from 'react';

interface ProgressButtonProps {
    current: number;
    total: number;
    onUpdate: (newVal: number) => void;
    label: string;
}

export function ProgressButton({ current, total, onUpdate, label }: ProgressButtonProps) {
    const { t } = useTranslation();
    const [animating, setAnimating] = useState(false);

    const handleClick = () => {
        setAnimating(true);
        setTimeout(() => {
            onUpdate(current + 1);
            setAnimating(false);
        }, 600);
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Impact Effect */}
            {animating && (
                <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100px',
                        height: '100px',
                        background: 'radial-gradient(circle, #fff 0%, transparent 70%)',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}
                />
            )}

            <Button
                size="lg"
                variant="primary"
                onClick={handleClick}
                disabled={current >= total || animating}
                style={{ width: '100%', position: 'relative', overflow: 'hidden' }}
            >
                <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {current >= total ? (
                        <>
                            <Check size={20} /> {t('components.progress_button.completed')}
                        </>
                    ) : (
                        <>
                            <Sword size={20} className={animating ? 'animate-spin' : ''} />
                            {label} {current + 1}
                        </>
                    )}
                </span>

                {/* Slash animation overlay */}
                {animating && (
                    <motion.div
                        initial={{ x: '-100%', skewX: -20 }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 0.4 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '50%',
                            height: '100%',
                            background: 'rgba(255,255,255,0.5)',
                            zIndex: 1
                        }}
                    />
                )}
            </Button>
        </div>
    );
}
