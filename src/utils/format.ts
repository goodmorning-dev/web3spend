/** Converts integer minor units (cents) back to a localized currency string, e.g. "€28.40". */
export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountMinor / 100)
}

/** null ("unavailable") renders as a plain word rather than a misleading 0%. */
export function formatPercent(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return 'Unavailable'
  }
  return `${value.toFixed(fractionDigits)}%`
}
