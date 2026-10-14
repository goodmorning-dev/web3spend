import { afterEach, describe, expect, it, vi } from 'vitest'
import { commitImport, type ParsedTransactionRow } from '@/matching/commitImport'
import { ORIGINAL_CATEGORY_ID, type StandardTransaction } from '@/types/transaction'
import { createCategory, listCategories, listCategoryRules, setMerchantRule } from './categories'
import { db } from './db'
import { saveTransactionCategory, type SaveCategoryChoice } from './saveTransaction'
import { resetDatabase } from './test-helpers'
import { getTransaction, listTransactions, loadTransactions } from './transactions'

afterEach(async () => {
  vi.restoreAllMocks()
  await resetDatabase()
})

function makeRow(overrides: Partial<ParsedTransactionRow> = {}): ParsedTransactionRow {
  return {
    last4: '4242',
    cardHolderKey: 'jane doe',
    timestampUtc: '2026-01-15T10:00:00.000Z',
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
    ...overrides,
  }
}

async function importRows(rows: ParsedTransactionRow[], fileHash: string): Promise<void> {
  await commitImport(rows, { fileHash, parserVersion: '1', unsupportedCount: 0 })
}

function noRules(selection: SaveCategoryChoice['selection']): SaveCategoryChoice {
  return {
    selection,
    alwaysForMerchant: false,
    alwaysForEtherfiCategory: false,
    hadMerchantRule: false,
    hadEtherfiCategoryRule: false,
    previousDescription: 'Steam Purchase',
  }
}

describe('saveTransactionCategory', () => {
  it('files a purchase under a new category, with a rule for its merchant', async () => {
    await importRows([makeRow()], 'hash-1')
    const [{ id }] = await listTransactions()

    await saveTransactionCategory(id, {
      ...noRules({ kind: 'new', name: 'Gaming' }),
      alwaysForMerchant: true,
    })

    expect(await listCategories()).toMatchObject([{ name: 'Gaming' }])
    expect(await listCategoryRules()).toMatchObject([{ kind: 'merchant', label: 'Steam Purchase' }])
    const [loaded] = await loadTransactions()
    expect(loaded.categoryRaw).toBe('Gaming')
  })

  it('keeps nothing when the rule fails to save, so a retry starts clean', async () => {
    await importRows([makeRow()], 'hash-1')
    const [{ id }] = await listTransactions()
    vi.spyOn(db.categoryRules, 'put').mockRejectedValueOnce(new Error('disk full'))

    await expect(
      saveTransactionCategory(id, {
        ...noRules({ kind: 'new', name: 'Gaming' }),
        alwaysForMerchant: true,
      }),
    ).rejects.toThrow('disk full')

    expect(await listCategories()).toEqual([])
    expect(await listCategoryRules()).toEqual([])
    expect((await getTransaction(id))?.categoryId).toBeUndefined()
  })

  it('never changes the amount, cashback, date or status', async () => {
    await importRows([makeRow()], 'hash-1')
    const [before] = await listTransactions()
    const gaming = await createCategory('Gaming')

    await saveTransactionCategory(before.id, noRules({ kind: 'custom', categoryId: gaming.id }))

    const after = await getTransaction(before.id)
    expect(after).toEqual({ ...before, categoryId: gaming.id })
  })
})

describe("picking ether.fi's category for one purchase", () => {
  async function setUp(): Promise<{ first: StandardTransaction; gamingId: string }> {
    await importRows([makeRow(), makeRow({ timestampUtc: '2026-01-16T10:00:00.000Z' })], 'hash-1')
    const gaming = await createCategory('Gaming')
    await setMerchantRule('Steam Purchase', gaming.id)
    const [first] = (await listTransactions()).sort((a, b) =>
      a.timestampUtc.localeCompare(b.timestampUtc),
    )
    return { first, gamingId: gaming.id }
  }

  it('pins only that purchase and leaves the merchant rule for every other one', async () => {
    const { first } = await setUp()

    // the form opened on Gaming with the merchant box ticked, then the
    // person switched this purchase to ether.fi's own category
    await saveTransactionCategory(first.id, {
      ...noRules({ kind: 'original' }),
      alwaysForMerchant: true,
      hadMerchantRule: true,
    })

    expect(await listCategoryRules()).toHaveLength(1)
    expect((await getTransaction(first.id))?.categoryId).toBe(ORIGINAL_CATEGORY_ID)
    const categories = (await loadTransactions())
      .sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc))
      .map((transaction) => transaction.categoryRaw)
    expect(categories).toEqual(['Digital Goods: Games', 'Gaming'])
  })

  it('still removes the rule when its box is unticked with one of your categories picked', async () => {
    const { first, gamingId } = await setUp()

    await saveTransactionCategory(first.id, {
      ...noRules({ kind: 'custom', categoryId: gamingId }),
      hadMerchantRule: true,
    })

    expect(await listCategoryRules()).toEqual([])
    expect((await getTransaction(first.id))?.categoryId).toBe(gamingId)
  })
})
