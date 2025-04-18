// vite.config.js
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
      manifest: {
        name: 'Ma PWA Test',
        short_name: 'TestPWA',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#007AFF',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
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
