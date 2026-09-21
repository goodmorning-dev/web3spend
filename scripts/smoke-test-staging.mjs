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

async function expectTransactionsPage(page, label) {
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
  const response = await page.goto(target, { waitUntil: 'networkidle' })
  if (!response || !response.ok()) {
    throw new Error(`Direct visit failed: HTTP ${response?.status() ?? 'no response'}`)
  }
  await expectTransactionsPage(page, 'Direct visit')
  console.log('Direct visit OK.')

  console.log('Refreshing the same URL...')
  const reloadResponse = await page.reload({ waitUntil: 'networkidle' })
  if (!reloadResponse || !reloadResponse.ok()) {
    throw new Error(`Refresh failed: HTTP ${reloadResponse?.status() ?? 'no response'}`)
  }
  await expectTransactionsPage(page, 'Refresh')
  console.log('Refresh OK.')

  await context.close()
} finally {
  await browser.close()
}

console.log(`Smoke test passed: ${target} resolves correctly on direct visit and refresh.`)
