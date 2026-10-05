// Exports the hidden /brand page as a single HTML file that works offline:
// the stylesheet, fonts, images and download files are all inlined, so the
// file can be emailed or dropped in a chat and opened with a double-click, no
// server or internet needed.
//
//   npm run export:brand        ->  dist-brand/web3spend-brand.html
//
// It builds the app, opens /brand in a real browser, takes the rendered page,
// and inlines everything it points at. The result is a snapshot, not the live
// app: the page's scripts are left out, and a few lines of plain JavaScript
// are added so the color swatches still copy their hex codes.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright'
import { build, preview } from 'vite'

const root = resolve(import.meta.dirname, '..')
const outDir = join(root, 'dist-brand')
const siteDir = join(outDir, '.site')
const outFile = join(outDir, 'web3spend-brand.html')

const MIME = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
}

/** A site path like "/assets/logo-x.webp" as a data: URI, or null if it's
 * not one of the built files (an external link, an anchor, a route). */
function toDataUri(sitePath) {
  const clean = sitePath.split(/[?#]/)[0]
  const file = join(siteDir, clean)
  const mime = MIME[extname(clean).toLowerCase()]
  if (!clean.startsWith('/') || !mime || !existsSync(file)) {
    return null
  }
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}

/** The same scripts-free copy behavior CopySwatch has in the app. */
const COPY_SCRIPT = `
document.addEventListener('click', function (event) {
  var button = event.target.closest('button[aria-label^="Copy"]')
  if (!button) return
  var hex = (button.getAttribute('aria-label').match(/#[0-9a-f]{6}/i) || [])[0]
  var label = button.querySelector('[aria-live]')
  if (!hex || !navigator.clipboard) return
  navigator.clipboard.writeText(hex).then(function () {
    var before = label.innerHTML
    label.textContent = 'Copied'
    setTimeout(function () { label.innerHTML = before }, 1600)
  }, function () {})
})
`

console.log('Building the app...')
await build({ root, logLevel: 'warn', build: { outDir: siteDir, emptyOutDir: true } })

const server = await preview({
  root,
  logLevel: 'silent',
  build: { outDir: siteDir },
  preview: { port: 0, host: '127.0.0.1' },
})
const address = server.httpServer.address()
const origin = `http://127.0.0.1:${address.port}`

const browser = await chromium.launch()
let html
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  await page.goto(`${origin}/brand`, { waitUntil: 'networkidle' })
  await page.waitForSelector('h1')
  await page.evaluate(() => document.fonts.ready)

  html = await page.evaluate(
    ({ copyScript }) => {
      const doc = document.documentElement.cloneNode(true)
      // The app's scripts and everything tied to installing it have no place
      // in a snapshot.
      // Link previews and the canonical address describe the hosted site,
      // which this file isn't.
      doc
        .querySelectorAll(
          [
            'script',
            'link[rel="modulepreload"]',
            'link[rel="manifest"]',
            'link[rel="canonical"]',
            'link[rel~="icon"]',
            'link[rel="apple-touch-icon"]',
            'meta[property^="og:"]',
            'meta[name^="twitter:"]',
          ].join(', '),
        )
        .forEach((node) => node.remove())
      // Links back into the app can't work from a file on someone's disk.
      doc.querySelectorAll('a[href^="/"]:not([download])').forEach((link) => {
        const span = document.createElement('span')
        span.className = link.className
        span.append(...link.childNodes)
        link.replaceWith(span)
      })
      // "Back to home" has nowhere to go.
      doc.querySelectorAll('header span').forEach((span) => {
        if (span.textContent.trim() === 'Back to home') span.remove()
      })
      const script = document.createElement('script')
      script.textContent = copyScript
      doc.querySelector('body').append(script)
      return `<!doctype html>\n${doc.outerHTML}`
    },
    { copyScript: COPY_SCRIPT },
  )
} finally {
  await browser.close()
  await new Promise((done) => server.httpServer.close(done))
}

// Inline the stylesheet, with the fonts it references.
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  const css = readFileSync(join(siteDir, href.split(/[?#]/)[0]), 'utf8').replace(
    /url\(([^)]+)\)/g,
    (match, raw) => {
      const uri = toDataUri(raw.replace(/['"]/g, '').trim())
      return uri ? `url(${uri})` : match
    },
  )
  return `<style>${css}</style>`
})

// Images, and the files the download links point at.
html = html.replace(/\s(src|href)="(\/[^"]+)"/g, (match, attr, path) => {
  const uri = toDataUri(path)
  return uri ? ` ${attr}="${uri}"` : match
})

// A page icon, since the browser tab would otherwise show nothing.
const favicon = toDataUri('/pwa-192x192.png')
html = html.replace('</head>', `<link rel="icon" href="${favicon}"></head>`)

// Nothing may still point at the app or the network, or it won't be offline.
const leftovers = [...html.matchAll(/(?:src|href)="((?:https?:)?\/[^"#]*)"/g)]
  .map((m) => m[1])
  .filter(
    (url) => !url.startsWith('https://github.com') && !url.startsWith('https://goodmorning.dev'),
  )
if (leftovers.length > 0) {
  console.error('These still point outside the file:', [...new Set(leftovers)])
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, html)
console.log(`Wrote ${outFile} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`)
