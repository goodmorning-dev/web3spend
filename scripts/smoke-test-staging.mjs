// Verifies that a deep link into the SPA resolves correctly on GitHub
// Pages, both on a direct visit and on a refresh of that same URL, before a
// service worker has had any chance to mask a server-routing problem (a
// broken 404.html redirect would still 404 a first-time visitor even after
// the app has been cached for a returning one). Run from CI against the
// just-deployed staging URL: STAGING_URL=https://... node scripts/smoke-test-staging.mjs
import { chromium } from 'playwright'

const baseUrl = process.env.STAGING_URL
if (!baseUrl) {
  console.error('STAGING_URL is not set.')
  process.exit(1)
}

const target = new URL(
  'app/transactions',
  baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
).toString()

// A direct hit on this path has no matching static file, so GitHub Pages'
// *first* response is legitimately a 404, with 404.html's redirect script
// as the body; that script's own client-side navigation is what should
// land the browser on the real, decoded URL. So the meaningful check isn't
// the status of that first response (a real 404 there is correct, not a
// failure) but where the browser actually ends up and what it renders.
async function expectTransactionsPage(page, label) {
  await page.waitForURL((url) => url.pathname.endsWith('/app/transactions') && !url.search, {
    timeout: 15_000,
  })
  await page.waitForSelector('h2', { timeout: 15_000 })
  const heading = await page.locator('h2').first().innerText()
  if (heading.trim() !== 'Transactions') {
    throw new Error(`${label}: expected the page heading to say "Transactions", got "${heading}"`)
  }
}

const browser = await chromium.launch()
try {
  // A fresh, isolated context with no cookies/storage/service worker from
  // any earlier run, standing in for a first-time visitor.
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()

  console.log(`Visiting ${target} directly...`)
  await page.goto(target, { waitUntil: 'networkidle' })
  await expectTransactionsPage(page, 'Direct visit')
  console.log('Direct visit OK.')

  console.log('Refreshing the same URL...')
  await page.reload({ waitUntil: 'networkidle' })
  await expectTransactionsPage(page, 'Refresh')
  console.log('Refresh OK.')

  await context.close()
} finally {
  await browser.close()
}

console.log(`Smoke test passed: ${target} resolves correctly on direct visit and refresh.`)
