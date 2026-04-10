/**
 * Streak Counter component (gamification)
 */
import { Flame } from 'lucide-react';

interface StreakCounterProps {
    count: number;
}

export function StreakCounter({ count }: StreakCounterProps) {
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                border: '2px solid var(--color-border-heavy)',
                background: 'var(--color-surface)',
                boxShadow: '3px 3px 0 var(--color-shadow-solid)',
            }}
        >
            <div style={{ position: 'relative' }}>
                <Flame size={22} color="var(--color-primary)" fill="var(--color-primary)" />
            </div>
            <span style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: 'var(--color-text-contrast)',
                fontFamily: 'var(--font-heading)'
            }}>
                {count}
            </span>
        </div>
    );
}
