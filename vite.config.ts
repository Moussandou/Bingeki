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
        globIgnores: ['**/sitemap.xml', '**/robots.txt'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.myanimelist\.net\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mal-images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
              },
              cacheableResponse: { statuses: [200] },
              networkTimeoutSeconds: 3,
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) return 'vendor-react';
          if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/lucide-react/')) return 'vendor-ui';
          if (id.includes('node_modules/recharts/')) return 'vendor-charts';
          if (id.includes('node_modules/i18next/') || id.includes('node_modules/react-i18next/')) return 'vendor-i18n';
          if (id.includes('node_modules/zustand/')) return 'vendor-state';
        }
      }
    }
  },
})
