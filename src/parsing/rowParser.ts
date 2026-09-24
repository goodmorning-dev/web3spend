import type { ParsedTransactionRow } from '@/matching/commitImport'
import type { SpendingMode, TransactionStatus } from '@/types/transaction'
import { normalizeText, parseTimestampUtc, toAmountMinorOrNull, toLast4OrNull } from './normalize'

const VALID_STATUSES: ReadonlySet<string> = new Set(['CLEARED', 'PENDING', 'CANCELLED'])
const VALID_SPENDING_MODES: ReadonlySet<string> = new Set<SpendingMode>([
  'Direct Pay',
  'Borrow Mode',
])
const CURRENCY_PATTERN = /^[A-Z]{3}$/

/**
 * Transaction types that move money around the ether.fi account rather than
 * spend it on the card: top-ups, swaps, Borrow Mode repayments, and moves
 * into or out of ether.fi's Liquid vaults, staking and Frax, whose types
 * share a prefix (liquid_deposit, liquid_execute_withdrawal, stake_deposit,
 * frax_withdraw, ...). They aren't purchases and aren't shown yet, so
 * they're left out without being reported as unsupported. Any other type
 * is still reported, so a new kind of card transaction (a refund, say) is
 * never dropped without anyone noticing.
 */
const ACCOUNT_ACTIVITY_TYPES: ReadonlySet<string> = new Set(['topup', 'swap', 'repay'])
const ACCOUNT_ACTIVITY_PREFIXES = ['liquid_', 'stake_', 'frax_']

export function isAccountActivityType(type: unknown): boolean {
  return (
    typeof type === 'string' &&
    (ACCOUNT_ACTIVITY_TYPES.has(type) ||
      ACCOUNT_ACTIVITY_PREFIXES.some((prefix) => type.startsWith(prefix)))
  )
}

export type RowParseResult =
  | { ok: true; row: ParsedTransactionRow }
  | { ok: false; reason: string }
  /** Account activity, not a card purchase: nothing to import, and nothing
   * wrong with the row either. */
  | { ok: false; skipped: 'account-activity' }

/**
 * Validates and normalizes one already header-mapped row object into a
 * ParsedTransactionRow, skips it as account activity, or rejects it with a
 * reason. TECHNICAL-PLAN §5 step 4: unknown type/status/spending mode
 * values are unsupported, never coerced into a known bucket.
 */
export function parseRow(raw: Record<string, unknown>): RowParseResult {
  if (isAccountActivityType(raw.type)) {
    return { ok: false, skipped: 'account-activity' }
  }
  if (raw.type !== 'card_spend') {
    return { ok: false, reason: `Unsupported transaction type: ${String(raw.type)}` }
  }

  const spendingMode = raw['spending mode']
  if (typeof spendingMode !== 'string' || !VALID_SPENDING_MODES.has(spendingMode)) {
    const shown = spendingMode === null || spendingMode === undefined || spendingMode === ''
    return {
      ok: false,
      reason: `Unsupported spending mode: ${shown ? '(empty)' : String(spendingMode)}`,
    }
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
    spendingMode: spendingMode as SpendingMode,
  }

  return { ok: true, row }
}

function validCurrencyOrNull(value: unknown): string | null {
  return typeof value === 'string' && CURRENCY_PATTERN.test(value) ? value : null
}
