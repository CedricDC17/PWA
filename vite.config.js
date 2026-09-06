// vite.config.js
/* eslint-env node */
/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // active le SW uniquement en dev
      devOptions: {
        enabled: isDev
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Liste Courses',
        short_name: 'Liste Courses',
        description: 'Liste de courses familiale, planning de repas et recettes.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0D2B1F',
        theme_color: '#0D2B1F',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],

  // Ne sert que pour le dev local, Vercel l'ignorera
  ...(isDev && {
    server: {
      host: true,
      port: 5173,
      allowedHosts: 'all'
    }
  })
})
