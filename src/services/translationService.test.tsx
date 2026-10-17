import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTranslationData } from './translationService';

const mocks = vi.hoisted(() => ({
    callback: null as null | ((snapshot: { exists: () => boolean; data: () => object }) => void),
    unsubscribe: vi.fn(),
}));
vi.mock('@/firebase/config', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(),
    onSnapshot: vi.fn((_ref, callback) => {
        mocks.callback = callback;
        return mocks.unsubscribe;
    }),
}));

describe('translation subscription state', () => {
    beforeEach(() => vi.clearAllMocks());
    it('never exposes a previous source or language translation', async () => {
        const { result, rerender } = renderHook(
            ({ text, lang }) => useTranslationData(text, 1, 'work', 'synopsis', lang),
            { initialProps: { text: 'Source A', lang: 'fr' } }
        );
        await act(async () => { mocks.callback?.({
            exists: () => true,
            data: () => ({ input: 'Source A', translated: { fr: 'French A' } }),
        }); });
        expect(result.current).toEqual({ translatedText: 'French A', loading: false });
        rerender({ text: 'Source B', lang: 'fr' });
        expect(result.current).toEqual({ translatedText: null, loading: true });
        rerender({ text: 'Source B', lang: 'en' });
        expect(result.current).toEqual({ translatedText: null, loading: false });
    });
    it('ignores late callbacks after a subscription was replaced', async () => {
        const { result, rerender } = renderHook(
            ({ text }) => useTranslationData(text, 1, 'work', 'synopsis', 'fr'),
            { initialProps: { text: 'Source A' } }
        );
        const oldCallback = mocks.callback;
        rerender({ text: 'Source B' });
        expect(mocks.unsubscribe).toHaveBeenCalledOnce();
        await act(async () => { oldCallback?.({
            exists: () => true,
            data: () => ({ input: 'Source A', translated: { fr: 'Stale A' } }),
        }); });
        expect(result.current.translatedText).toBeNull();
    });
});
