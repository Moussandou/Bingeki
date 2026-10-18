import { preloadablePage } from '@/utils/preloadablePage';

export const Opening = preloadablePage(() => import('@/pages/Opening'));
export const Privacy = preloadablePage(() => import('@/pages/Privacy'));

export function prepareInitialPage(pathname: string) {
    if (/^\/(?:fr|en)\/privacy\/?$/.test(pathname)) return Privacy.preload();
    if (/^\/(?:fr|en)\/?$/.test(pathname) || pathname === '/') return Opening.preload();
    return Promise.resolve();
}
