/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { ECB_DAILY_RATES_URL, parseEcbEurUsd } from './src/cashback/ecb.ts'

// GitHub Pages serves this repo at /web3spend/, not the domain root a future
// production host would use, so the subpath base only applies when the
// staging workflow sets GITHUB_PAGES.
const base = process.env.GITHUB_PAGES ? '/web3spend/' : '/'

// The absolute address the site is served from. Link previews (Open Graph
// and Twitter cards) and the canonical link only accept absolute URLs, so
// index.html's __SITE_URL__ placeholders get this at build time. Staging on
// GitHub Pages fills it in automatically; a production host must set
// SITE_URL. A plain local build points at `vite preview`'s own address.
// Always ends in a slash, since index.html appends file names straight
// onto it ("__SITE_URL__og-image.jpg"), and SITE_URL=https://example.com
// would otherwise produce https://example.comog-image.jpg.
const siteUrl = withTrailingSlash(
  process.env.SITE_URL ??
    (process.env.GITHUB_PAGES
      ? 'https://goodmorning-dev.github.io/web3spend/'
      : 'http://localhost:4173/'),
)

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

function siteUrlPlugin(url: string): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('__SITE_URL__', url),
    },
  }
}

// The euro/dollar rate the dashboard's cashback steps convert euro
// spending with. A build fetches the ECB's latest reference rate and puts
// it in place of src/cashback/eurUsdReference.ts, so every deploy ships a
// current one, while the app itself never fetches anything. Without a
// connection the build keeps the committed rate and says so. Dev and tests
// always use the committed file.
const EUR_USD_REFERENCE_FILE = path.resolve(import.meta.dirname, 'src/cashback/eurUsdReference.ts')

function eurUsdReferencePlugin(): Plugin {
  let latest: { rate: number; date: string } | null = null
  return {
    name: 'eur-usd-reference',
    apply: 'build',
    async buildStart() {
      try {
        const response = await fetch(ECB_DAILY_RATES_URL, { signal: AbortSignal.timeout(10_000) })
        latest = response.ok ? parseEcbEurUsd(await response.text()) : null
        if (!latest) {
          throw new Error(`unexpected response (HTTP ${response.status})`)
        }
      } catch (err) {
        this.warn(
          `Couldn't get the ECB's euro/dollar rate, so the committed one is used: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    },
    load(id) {
      if (latest && path.resolve(id.split('?')[0]) === EUR_USD_REFERENCE_FILE) {
        return `export const EUR_USD_REFERENCE = ${JSON.stringify(latest)}
`
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [
    siteUrlPlugin(siteUrl),
    eurUsdReferencePlugin(),
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
        description: 'Local-first spending and cashback dashboard for ether.fi cardholders.',
        display: 'standalone',
        theme_color: '#0a0d13',
        background_color: '#0a0d13',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
