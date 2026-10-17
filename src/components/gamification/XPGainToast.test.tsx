import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGamificationStore } from '@/store/gamificationStore';
import { XPGainToast } from './XPGainToast';
import { StrictMode } from 'react';

vi.mock('framer-motion', () => ({
    motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('XP toast subscription', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useGamificationStore.setState({ xpGained: null });
    });
    afterEach(() => vi.useRealTimers());
    it('consumes an existing gain once in StrictMode and removes it after two seconds', async () => {
        useGamificationStore.setState({ xpGained: { amount: 15, timestamp: 1 } });
        render(<StrictMode><XPGainToast /></StrictMode>);
        await act(async () => vi.runAllTicks());
        expect(screen.getByText('+15 XP')).toBeInTheDocument();
        expect(useGamificationStore.getState().xpGained).toBeNull();
        act(() => vi.advanceTimersByTime(2000));
        expect(screen.queryByText('+15 XP')).not.toBeInTheDocument();
    });
    it('receives multiple store events and cleans up subscription and timers', () => {
        const { unmount } = render(<XPGainToast />);
        act(() => useGamificationStore.setState({ xpGained: { amount: 10, timestamp: 1 } }));
        act(() => useGamificationStore.setState({ xpGained: { amount: 20, timestamp: 2 } }));
        expect(screen.getByText('+10 XP')).toBeInTheDocument();
        expect(screen.getByText('+20 XP')).toBeInTheDocument();
        unmount();
        expect(vi.getTimerCount()).toBe(0);
        act(() => useGamificationStore.setState({ xpGained: { amount: 30, timestamp: 3 } }));
        expect(useGamificationStore.getState().xpGained?.amount).toBe(30);
    });
});
