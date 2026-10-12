/**
 * Dollars per euro, from the European Central Bank's daily reference
 * rates. `vite build` swaps this module for the ECB's latest rate (see
 * vite.config.ts), so every deploy ships a current one; this committed
 * value is what dev, tests and a build without a connection use.
 */
export const EUR_USD_REFERENCE = { rate: 1.1206, date: '2026-10-09' }
