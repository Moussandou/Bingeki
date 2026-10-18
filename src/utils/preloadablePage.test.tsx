import { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { preloadablePage } from './preloadablePage';

describe('preloadablePage', () => {
    it('renders a prepared page on the first commit without a loading fallback', async () => {
        const load = vi.fn(async () => ({ default: () => <h1>Privacy</h1> }));
        const Page = preloadablePage(load);
        await Promise.all([Page.preload(), Page.preload()]);
        render(<Suspense fallback={<p>Loading</p>}><Page /></Suspense>);
        expect(screen.getByRole('heading')).toHaveTextContent('Privacy');
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('retains Suspense behavior for client-side navigation', async () => {
        let resolve!: (module: { default: () => React.JSX.Element }) => void;
        const Page = preloadablePage(() => new Promise(done => { resolve = done; }));
        render(<Suspense fallback={<p>Loading</p>}><Page /></Suspense>);
        expect(screen.getByText('Loading')).toBeInTheDocument();
        await act(async () => resolve({ default: () => <h1>Ready</h1> }));
        expect(screen.getByRole('heading')).toHaveTextContent('Ready');
    });

    it('propagates loading failures to the startup error handler', async () => {
        const Page = preloadablePage(() => Promise.reject(new Error('Chunk unavailable')));
        await expect(Page.preload()).rejects.toThrow('Chunk unavailable');
    });
});
