import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Changed from autoUpdate to allow user control
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        // Clean old caches
        cleanupOutdatedCaches: true,
        // Skip waiting for user action
        skipWaiting: false, // Let user control when to update
        // Client claim control
        clientsClaim: false,
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/12c77xnz00\.execute-api\.us-east-1\.amazonaws\.com\/v1\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Rewind',
        short_name: 'Rewind',
        description: 'Rediscover older podcast episodes',
        theme_color: '#eb4034',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.0'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/setupTests.ts', '**/*.stories.{ts,tsx}', '**/*.test.{ts,tsx}'],
    },
  },
})
