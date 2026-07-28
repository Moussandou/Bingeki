/**
 * App entry point
 * Handles hydration for prerendered pages, otherwise mounts fresh
 */
import { logger } from '@/utils/logger';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

const rootElement = (
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);

// Rendu client, jamais hydratation.
//
// Les pages prérendues sont des instantanés produits par puppeteer (scripts/prerender.ts),
// pas du SSR React : elles ne portent pas les marqueurs de frontière Suspense. Or les 43
// routes passent par React.lazy, et lazy suspend systématiquement à sa première
// initialisation — même chunk déjà préchargé — car son statut passe par Pending avant
// d'être résolu dans un microtask. La première passe d'hydratation rendait donc le
// fallback `null` face à un HTML complet : mismatch garanti (React #418), après quoi
// React jetait l'arbre et re-rendait tout côté client.
//
// createRoot fait ce même rendu client directement, sans la passe d'hydratation perdue.
// Le HTML prérendu garde son rôle : référencement et premier affichage immédiat.
createRoot(container).render(rootElement);
