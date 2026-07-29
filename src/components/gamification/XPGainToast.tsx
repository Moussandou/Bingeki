/**
 * X P Gain Toast component (gamification)
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamificationStore } from '@/store/gamificationStore';

export function XPGainToast() {
    const xpGained = useGamificationStore(s => s.xpGained);
    const [xpList, setXpList] = useState<{ id: string, amount: number }[]>([]);

    const clearXpGained = useGamificationStore(s => s.clearXpGained);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        if (!xpGained) return;

        const id = Math.random().toString(36).substring(2, 11);
        const amount = xpGained.amount;

        setXpList(prev => [...prev, { id, amount }]);
        // Clearing the store re-runs this effect, so the removal timer must NOT be
        // tied to this effect's cleanup — it would cancel itself immediately.
        clearXpGained();

        const removeTimer = setTimeout(() => {
            setXpList(prev => prev.filter(item => item.id !== id));
            timersRef.current = timersRef.current.filter(t => t !== removeTimer);
        }, 2000);
        timersRef.current.push(removeTimer);
    }, [xpGained, clearXpGained]);

    // Only cancel pending timers when the component actually unmounts
    useEffect(() => () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

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
