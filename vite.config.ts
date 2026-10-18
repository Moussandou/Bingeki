import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Bingeki - Anime Tracker',
        short_name: 'Bingeki',
        description: 'Track your anime and manga progress with style.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Disable navigateFallback — let the server serve prerendered HTML
        // instead of the SW returning a cached empty app shell
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/],
        globIgnores: [
          '**/sitemap.xml',
          '**/robots.txt',
          '**/assets/Dashboard-*.js',
          '**/assets/SystemLogs-*.js',
          '**/assets/Health-*.js',
          '**/assets/vendor-charts-*.js',
        ],
        runtimeCaching: [
          {
            // MAL cover URLs are immutable: serve from cache instantly
            // maxEntries réduit : les réponses opaques comptent ~7 Mo de quota chacune sous Chromium
            urlPattern: /^https:\/\/cdn\.myanimelist\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mal-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dicebear-avatars',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'firebase-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 7 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      preserveEntrySignatures: 'allow-extension',
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules\/(?:react|react-dom|scheduler)\//, priority: 100 },
            { name: 'vendor-ui', test: /node_modules\/(?:framer-motion|lucide-react)\//, priority: 80 },
            { name: 'vendor-firebase', test: /node_modules\/(?:@firebase|firebase)\//, priority: 60 },
            { name: 'vendor-i18n', test: /node_modules\/(?:i18next|react-i18next)\//, priority: 40 },
            { name: 'vendor-state', test: /node_modules\/zustand\//, priority: 30 },
            // Chart helpers must not capture shared utilities used by public UI.
            { name: 'vendor-charts', test: /node_modules\/recharts\//, priority: 10, includeDependenciesRecursively: false },
            { name: 'app-shell', test: /\/src\//, tags: ['$initial'], priority: 0 },
          ],
        },
      },
    },
  },
})
