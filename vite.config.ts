/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

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

// MVP-PLAN §9: "a restrictive content security policy". The app never
// sends data anywhere, and this has the browser enforce that: scripts,
// fonts, images, workers and every network request are limited to the
// site's own address, so even code that got in some other way couldn't
// load from or send to anywhere else. GitHub Pages can't set response
// headers, so it goes in a meta tag, which must come before anything it
// covers. Build only: the dev server injects inline scripts of its own
// and talks to the page over a websocket.
//
// The one inline script (index.html's GitHub Pages redirect decoder) is
// allowed by its hash, worked out here so editing it can't silently break
// the page. The structured data block isn't executed, so it needs nothing.
// Inline styles are allowed because the chart colors and the dialogs'
// scroll lock inject <style> tags; styles can't run code, and with every
// other destination locked to the site itself they can't send anything
// out either.
function contentSecurityPolicyPlugin(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inlineScripts = html.matchAll(
          /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g,
        )
        const scriptHashes = [...inlineScripts].map(
          ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
          "style-src 'self' 'unsafe-inline'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
        ].join('; ')

        const charset = /<meta charset="[^"]*"\s*\/?>/i
        if (!charset.test(html)) {
          throw new Error('content-security-policy: index.html has no <meta charset> to follow')
        }
        return html.replace(
          charset,
          (tag) => `${tag}
    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  build: {
    // Vite inlines small files as data: URLs, which the content security
    // policy's font rule doesn't allow. One font subset is small enough, so
    // fonts always stay separate files.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [
    siteUrlPlugin(siteUrl),
    contentSecurityPolicyPlugin(),
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
