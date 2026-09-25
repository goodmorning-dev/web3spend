// Renders public/og-image.jpg, the 1200x630 picture link previews show when
// someone shares the site. It's drawn from the app's own fonts, colors and
// hero artwork, so after a design change it can be regenerated with:
//
//   node scripts/generate-og-image.mjs
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function dataUrl(relativePath, type) {
  const bytes = readFileSync(path.join(root, relativePath))
  return `data:${type};base64,${bytes.toString('base64')}`
}

const headingFont = dataUrl(
  'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  'font/woff2',
)
const bodyFont = dataUrl(
  'node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2',
  'font/woff2',
)
const logo = dataUrl('src/assets/logo.webp', 'image/webp')
const heroCard = dataUrl('src/assets/hero-card.webp', 'image/webp')

// The same tokens as the dark theme in src/index.css.
const html = `<!doctype html>
<html>
  <head>
    <style>
      @font-face { font-family: Heading; src: url(${headingFont}) format('woff2'); font-weight: 200 800; }
      @font-face { font-family: Body; src: url(${bodyFont}) format('woff2'); font-weight: 100 900; }
      * { box-sizing: border-box; }
      body {
        margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative;
        background: #0a0d13; color: #eef1f6; font-family: Body, sans-serif;
      }
      .glow { position: absolute; border-radius: 50%; }
      .glow.left {
        left: -300px; top: -340px; width: 940px; height: 940px;
        background: radial-gradient(circle, rgba(240, 180, 41, 0.3) 0%, transparent 65%);
      }
      .glow.right {
        right: -120px; top: 60px; width: 720px; height: 720px;
        background: radial-gradient(circle, rgba(240, 180, 41, 0.22) 0%, transparent 62%);
      }
      .content {
        position: absolute; left: 72px; top: 0; bottom: 0; width: 520px;
        display: flex; flex-direction: column; justify-content: center; gap: 30px;
      }
      .brand {
        display: flex; align-items: center; gap: 14px;
        font-family: Heading; font-weight: 600; font-size: 30px;
      }
      .brand img { width: 50px; height: 50px; }
      h1 {
        margin: 0; font-family: Heading; font-weight: 700; font-size: 62px;
        line-height: 1.04; letter-spacing: -0.02em;
      }
      .gold { color: #f0b429; }
      p { margin: 0; font-size: 24px; line-height: 1.45; color: #96a0b3; max-width: 500px; }
      .hero {
        position: absolute; right: 28px; top: 50%; width: 590px;
        transform: translateY(-50%);
      }
    </style>
  </head>
  <body>
    <div class="glow left"></div>
    <div class="glow right"></div>
    <img class="hero" src="${heroCard}" alt="" />
    <div class="content">
      <div class="brand"><img src="${logo}" alt="" />Web3Spend</div>
      <h1>Your crypto card spending, <span class="gold">finally clear.</span></h1>
      <p>Private spending and cashback insights for your ether.fi card. Everything stays on your device.</p>
    </div>
  </body>
</html>`

// Playwright's own Chromium when it's been downloaded, otherwise an
// installed Chrome or Edge, so this doesn't require a separate browser
// download just to make one picture.
async function launchBrowser() {
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try {
      return await chromium.launch(channel ? { channel } : {})
    } catch {
      // try the next one
    }
  }
  throw new Error('No Chromium-based browser found. Run `npx playwright install chromium`.')
}

const browser = await launchBrowser()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  // JPEG rather than PNG: a fraction of the size, and every link-preview
  // crawler reads it.
  await page.screenshot({ path: path.join(root, 'public/og-image.jpg'), type: 'jpeg', quality: 88 })
  console.log('Wrote public/og-image.jpg')
} finally {
  await browser.close()
}
