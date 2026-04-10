/**
 * App entry point
 * Handles hydration for prerendered pages, otherwise mounts fresh
 */
import { logger } from '@/utils/logger';
import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './styles/global.css'
import './i18n'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Force reload on chunk mismatch after deploy
window.addEventListener('vite:preloadError', (event) => {
  logger.log('Vite preload error detected, reloading page...', event);
  window.location.reload();
});

const container = document.getElementById('root')!;
const isPrerendered = document.body.classList.contains('is-prerendered');

const rootElement = (
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);

if (isPrerendered) {
  hydrateRoot(container, rootElement);
} else {
  createRoot(container).render(rootElement);
}
