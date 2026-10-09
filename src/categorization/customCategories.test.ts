import { describe, expect, it } from 'vitest'
import type { CategoryRule, CustomCategory } from '@/types/category'
import { ORIGINAL_CATEGORY_ID, type StandardTransaction } from '@/types/transaction'
import {
  applyCustomCategories,
  buildCategoryLookup,
  merchantKey,
  resolveCategory,
} from './customCategories'

const gaming: CustomCategory = { id: 'cat-gaming', name: 'Gaming', createdAt: '2026-01-01' }
const treats: CustomCategory = { id: 'cat-treats', name: 'Treats', createdAt: '2026-01-01' }

function rule(overrides: Partial<CategoryRule>): CategoryRule {
  return {
    id: 'rule-1',
    kind: 'merchant',
    matchKey: 'steam purchase',
    label: 'Steam Purchase',
    categoryId: gaming.id,
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'txn-1',
    cardId: 'card-1',
    timestampUtc: '2026-03-01T00:00:00.000Z',
    type: 'card_spend',
    description: 'Steam Purchase',
    status: 'CLEARED',
    amountMinor: 1000,
    currency: 'EUR',
    originalAmountMinor: 1000,
    originalCurrency: 'EUR',
    cashbackMinor: 30,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Digital Goods: Games',
    spendingMode: 'Direct Pay',
    identityKey: 'key-1',
    importId: 'import-1',
    ...overrides,
  }
}

describe('merchantKey', () => {
  it('ignores case and stray whitespace', () => {
    expect(merchantKey('  Steam   Purchase ')).toBe('steam purchase')
  })
})

describe('resolveCategory', () => {
  const lookup = buildCategoryLookup(
    [gaming, treats],
    [
      rule({}),
      rule({
        id: 'rule-2',
        kind: 'category',
        matchKey: 'digital goods: games',
        categoryId: treats.id,
      }),
    ],
  )

  it("falls back to ether.fi's own category when nothing else applies", () => {
    const resolved = resolveCategory(
      makeTransaction({ description: 'Kaufland', categoryRaw: 'Groceries' }),
      lookup,
    )
    expect(resolved).toEqual({ label: 'Groceries', source: 'original' })
  })

  it('prefers a merchant rule over a rule for the ether.fi category', () => {
    expect(resolveCategory(makeTransaction(), lookup)).toMatchObject({
      label: 'Gaming',
      source: 'merchant-rule',
    })
  })

  it('applies a rule for the ether.fi category, MCC code or not', () => {
    const resolved = resolveCategory(
      makeTransaction({ description: 'skin.club', categoryRaw: '5816 - Digital Goods: Games' }),
      lookup,
    )
    expect(resolved).toMatchObject({ label: 'Treats', source: 'category-rule' })
  })

  it('lets a category picked for one transaction beat every rule', () => {
    expect(resolveCategory(makeTransaction({ categoryId: treats.id }), lookup)).toMatchObject({
      label: 'Treats',
      source: 'transaction',
    })
  })

  it("keeps ether.fi's category when the transaction is pinned to it, rules or not", () => {
    expect(resolveCategory(makeTransaction({ categoryId: ORIGINAL_CATEGORY_ID }), lookup)).toEqual({
      label: 'Digital Goods: Games',
      source: 'original',
    })
  })

  it('ignores a category id or rule that points at a deleted category', () => {
    const stale = buildCategoryLookup([], [rule({})])
    expect(resolveCategory(makeTransaction({ categoryId: 'gone' }), stale).source).toBe('original')
  })
})

describe('applyCustomCategories', () => {
  it('shows the resolved category in categoryRaw and leaves everything else alone', () => {
    const original = makeTransaction()
    const [applied] = applyCustomCategories([original], [gaming], [rule({})])
    expect(applied).toEqual({ ...original, categoryRaw: 'Gaming' })
    expect(original.categoryRaw).toBe('Digital Goods: Games')
  })

  it('returns the same list untouched when there are no custom categories', () => {
    const transactions = [makeTransaction()]
    expect(applyCustomCategories(transactions, [], [])).toBe(transactions)
  })
})
