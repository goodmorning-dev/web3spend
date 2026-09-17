import type { ParsedTransactionRow } from '@/matching/commitImport'
import type { TransactionStatus } from '@/types/transaction'
import { normalizeText, parseTimestampUtc, toAmountMinorOrNull, toLast4OrNull } from './normalize'

const VALID_STATUSES: ReadonlySet<string> = new Set(['CLEARED', 'PENDING', 'CANCELLED'])
const CURRENCY_PATTERN = /^[A-Z]{3}$/

export type RowParseResult = { ok: true; row: ParsedTransactionRow } | { ok: false; reason: string }

/**
 * Validates and normalizes one already header-mapped row object into a
 * ParsedTransactionRow, or rejects it with a reason. TECHNICAL-PLAN §5 step 4:
 * unknown type/status/spending mode values are unsupported, never coerced
 * into a known bucket.
 */
export function parseRow(raw: Record<string, unknown>): RowParseResult {
  if (raw.type !== 'card_spend') {
    return { ok: false, reason: `Unsupported transaction type: ${String(raw.type)}` }
  }

  if (raw['spending mode'] !== 'Direct Pay') {
    return { ok: false, reason: `Unsupported spending mode: ${String(raw['spending mode'])}` }
  }

  const status = raw.status
  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    return { ok: false, reason: `Unsupported status: ${String(status)}` }
  }

  const timestampRaw = raw.timestamp
  const timestampUtc = typeof timestampRaw === 'string' ? parseTimestampUtc(timestampRaw) : null
  if (!timestampUtc) {
    return { ok: false, reason: `Unrecognized timestamp: ${String(timestampRaw)}` }
  }

  const last4 = toLast4OrNull(raw.card)
  if (!last4) {
    return { ok: false, reason: `Unrecognized card value: ${String(raw.card)}` }
  }

  const cardHolderName = raw['card holder name']
  if (typeof cardHolderName !== 'string' || normalizeText(cardHolderName) === '') {
    return { ok: false, reason: 'Missing card holder name' }
  }

  const description = raw.description
  if (typeof description !== 'string' || normalizeText(description) === '') {
    return { ok: false, reason: 'Missing description' }
  }

  const categoryRaw = raw.category
  if (typeof categoryRaw !== 'string' || normalizeText(categoryRaw) === '') {
    return { ok: false, reason: 'Missing category' }
  }

  const currency = validCurrencyOrNull(raw.currency)
  if (!currency) {
    return { ok: false, reason: `Unrecognized currency: ${String(raw.currency)}` }
  }

  const originalCurrency = validCurrencyOrNull(raw['original currency'])
  if (!originalCurrency) {
    return {
      ok: false,
      reason: `Unrecognized original currency: ${String(raw['original currency'])}`,
    }
  }

  const cashbackCurrency = validCurrencyOrNull(raw['cashback currency'])
  if (!cashbackCurrency) {
    return {
      ok: false,
      reason: `Unrecognized cashback currency: ${String(raw['cashback currency'])}`,
    }
  }

  const amountMinor = toAmountMinorOrNull(raw.amount)
  if (amountMinor === null) {
    return { ok: false, reason: `Unrecognized amount: ${String(raw.amount)}` }
  }

  const originalAmountMinor = toAmountMinorOrNull(raw['original amount'])
  if (originalAmountMinor === null) {
    return { ok: false, reason: `Unrecognized original amount: ${String(raw['original amount'])}` }
  }

  const cashbackMinor = toAmountMinorOrNull(raw['cashback earned'])
  if (cashbackMinor === null) {
    return { ok: false, reason: `Unrecognized cashback amount: ${String(raw['cashback earned'])}` }
  }

  const row: ParsedTransactionRow = {
    last4,
    cardHolderKey: normalizeText(cardHolderName).toLowerCase(),
    timestampUtc,
    type: 'card_spend',
    description: normalizeText(description),
    status: status as TransactionStatus,
    amountMinor,
    currency,
    originalAmountMinor,
    originalCurrency,
    cashbackMinor,
    cashbackCurrency,
    categoryRaw: normalizeText(categoryRaw),
    spendingMode: 'Direct Pay',
  }

  return { ok: true, row }
}

function validCurrencyOrNull(value: unknown): string | null {
  return typeof value === 'string' && CURRENCY_PATTERN.test(value) ? value : null
}
