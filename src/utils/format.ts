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

/** `amount` is already in major currency units (e.g. euros, not cents), for
 * chart axis labels where full precision (`formatMoney`) would be too wide,
 * e.g. "€2.8K" instead of "€2,840.00". */
export function formatCompactMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

/** Spend always reads as an outflow ("-€12.40"), matching the design
 * reference, regardless of the sign the amount happens to be stored with
 * (a refund-like row is already genuinely negative and keeps its own
 * sign rather than getting a second one prepended). */
export function formatSignedSpend(amountMinor: number, currency: string): string {
  return amountMinor < 0
    ? formatMoney(amountMinor, currency)
    : `-${formatMoney(amountMinor, currency)}`
}

/** Cashback reads as an inflow ("+€0.31"). A refund can take cashback back,
 * so a negative amount keeps its own minus sign ("-€2.70") rather than
 * getting a plus in front of it too. */
export function formatSignedCashback(cashbackMinor: number, currency: string): string {
  return cashbackMinor < 0
    ? formatMoney(cashbackMinor, currency)
    : `+${formatMoney(cashbackMinor, currency)}`
}
