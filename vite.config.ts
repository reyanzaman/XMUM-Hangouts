import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
        manifest: {
          id: '/',
          name: 'XMUM Hangouts',
          short_name: 'Hangouts',
          description: 'Discover and coordinate student-run hangouts at Xiamen University Malaysia.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#fff8f1',
          theme_color: '#d9485f',
          orientation: 'portrait-primary',
          categories: ['social', 'education', 'lifestyle'],
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          importScripts: ['/push-sw.js'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'xmum-images-v1',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify--file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/.runtime-data/**',
          '**/local_*.json',
        ],
      },
      // Proxy API requests to Express backend
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
