/**
 * PWA install prompt, chunk error recovery, and auto-install via URL param
 */
import { useEffect } from 'react';
import { usePWAStore } from '@/store/pwaStore';
import type { BeforeInstallPromptEvent } from '@/store/pwaStore';
import { logger } from '@/utils/logger';

export function usePWAHandler() {
    const { setDeferredPrompt, setIsInstalled, clearPrompt, triggerInstall } = usePWAStore();

    useEffect(() => {
        // Suppress ResizeObserver noise, reload on stale chunks
        const handleChunkError = (e: ErrorEvent) => {
            if (e.message === 'ResizeObserver loop limit exceeded' || e.message === 'ResizeObserver loop completed with undelivered notifications.') {
                e.stopImmediatePropagation();
                const viteOverlay = document.querySelector('vite-error-overlay');
                if (viteOverlay) viteOverlay.remove();
                return;
            }

            if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
                logger.warn('[PWAHandler] ChunkLoadError detected, reloading page...');
                window.location.reload();
            }
        };
        
        const handlePromiseError = (e: PromiseRejectionEvent) => {
            if (e.reason && (e.reason.message?.includes('ChunkLoadError') || e.reason.message?.includes('Loading chunk'))) {
                logger.warn('[PWAHandler] Promise ChunkLoadError detected, reloading page...');
                window.location.reload();
            }
        };

        window.addEventListener('error', handleChunkError);
        window.addEventListener('unhandledrejection', handlePromiseError);
        
        return () => {
            window.removeEventListener('error', handleChunkError);
            window.removeEventListener('unhandledrejection', handlePromiseError);
        };
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            clearPrompt();
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [setDeferredPrompt, setIsInstalled, clearPrompt]);

    // Auto-trigger install if ?install=1
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('install') === '1') {
            const timer = setTimeout(() => {
                triggerInstall();
                const newUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, '', newUrl);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [triggerInstall]);
}
