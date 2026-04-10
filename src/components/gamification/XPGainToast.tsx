/**
 * X P Gain Toast component (gamification)
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamificationStore } from '@/store/gamificationStore';

export function XPGainToast() {
    const xpGained = useGamificationStore(s => s.xpGained);
    const [xpList, setXpList] = useState<{ id: string, amount: number }[]>([]);

    const clearXpGained = useGamificationStore(s => s.clearXpGained);

    useEffect(() => {
        if (!xpGained) return;

        const id = Math.random().toString(36).substring(2, 11);
        const amount = xpGained.amount;
        
        setXpList(prev => [...prev, { id, amount }]);

        // Clear the global state so other components don't re-process it
        clearXpGained();

        const timer = setTimeout(() => {
            setXpList(prev => prev.filter(item => item.id !== id));
        }, 3000);

        return () => clearTimeout(timer);
    }, [xpGained, clearXpGained]);

    return (
        <div style={{
            position: 'fixed',
            bottom: '20vh',
            right: '2rem',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            pointerEvents: 'none',
            alignItems: 'flex-end'
        }}>
            <AnimatePresence>
                {xpList.map(({ id, amount }) => (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                        layout
                        style={{
                            background: 'var(--color-primary)',
                            color: '#fff',
                            padding: '0.4rem 1rem',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.5rem',
                            boxShadow: '4px 4px 0 #000, 0 4px 10px rgba(0,0,0,0.5)',
                            border: '2px solid #000',
                            textShadow: '1px 1px 0 rgba(0,0,0,0.5)'
                        }}
                    >
                        +{amount} XP
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
