/// <reference types="vitest/config" />
import { copyFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// The app is served from GitHub Pages under /dashboard/. Preview builds are
// published to /dashboard/next/ by CI, which sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/dashboard/'
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    rolldownOptions: {
      output: {
        // React in its own long-lived chunk: it changes rarely, so returning
        // visitors keep it cached across app updates.
        advancedChunks: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 2 }],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    // GitHub Pages serves 404.html for unknown paths: the same page, so deep
    // links such as /dashboard/student?room=12345 (old QR codes) still load.
    {
      name: 'spa-404',
      apply: 'build',
      closeBundle: () => copyFileSync('dist/index.html', 'dist/404.html'),
    },
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'ALT Dashboard',
        short_name: 'ALT Dashboard',
        description: 'Classroom board, lesson planner and games for ALTs.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f8fafc',
        theme_color: '#4f46e5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell and code are precached; large media (game images,
        // wallpapers) is cached on first use by the runtime rule below.
        globPatterns: ['**/*.{js,css,html,svg}', '**/inter-latin-wght-*.woff2', 'icons/*.png'],
        navigateFallback: `${base}index.html`,
        // The live site also hosts the old dashboard, the old planner and the
        // preview under /dashboard/: never answer those with this app.
        navigateFallbackDenylist: base === '/dashboard/' ? [/^\/dashboard\/(legacy|next|planner)(\/|$)/] : [],
        runtimeCaching: [
          {
            // Japanese font for PDF reports, fetched only when needed.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/google\/fonts@main\/ofl\/mplus1p\//,
            handler: 'CacheFirst',
            options: { cacheName: 'report-fonts', expiration: { maxEntries: 4 } },
          },
          {
            // Game word sets and JHS books: fetched when opened, then available offline.
            urlPattern: /\/games\/(sets|jhs)\/[^/]+\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'game-data', expiration: { maxEntries: 200 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
