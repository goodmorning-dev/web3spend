/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this repo at /web3spend/, not the domain root a future
// production host would use, so the subpath base only applies when the
// staging workflow sets GITHUB_PAGES.
const base = process.env.GITHUB_PAGES ? '/web3spend/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // default globPatterns omit font files; bundled fonts must be precached
        // too so offline typography doesn't fall back to a system font. webp
        // is added for the home page's hero artwork, also bundled rather than
        // fetched remotely.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
      },
      manifest: {
        name: 'Web3Spend',
        short_name: 'Web3Spend',
        description: 'Local-first spending and cashback dashboard for Etherfi cardholders.',
        display: 'standalone',
        theme_color: '#0a0d13',
        background_color: '#0a0d13',
        icons: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
