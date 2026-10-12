/** The ECB's daily euro reference rates. Fetched only by `vite build`
 * (see vite.config.ts), never by the app itself. */
export const ECB_DAILY_RATES_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

/**
 * The dollar rate and its date from the ECB's daily reference rates XML,
 * or null when the file doesn't look as expected (so a build keeps the
 * committed rate rather than shipping a wrong one).
 */
export function parseEcbEurUsd(xml: string): { rate: number; date: string } | null {
  const date = /<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1]
  const rate = Number(/<Cube\s+currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/.exec(xml)?.[1])
  if (!date || !Number.isFinite(rate) || rate <= 0) {
    return null
  }
  return { rate, date }
}
