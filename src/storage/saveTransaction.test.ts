import { afterEach, describe, expect, it, vi } from 'vitest'
import { commitImport, type ParsedTransactionRow } from '@/matching/commitImport'
import { ORIGINAL_CATEGORY_ID, type StandardTransaction } from '@/types/transaction'
import { createCategory, listCategories, listCategoryRules, setMerchantRule } from './categories'
import { db } from './db'
import { saveTransaction, type SaveCategoryChoice } from './saveTransaction'
import { resetDatabase } from './test-helpers'
import {
  getTransaction,
  listTransactions,
  loadTransactions,
  resetTransactionEdits,
} from './transactions'

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
    previousDescription: '',
  }
}

const manualInput = {
  cardId: 'card-1',
  timestampUtc: '2026-02-01T12:00:00.000Z',
  description: 'Farmers market',
  amountMinor: 1250,
  currency: 'EUR',
  cashbackMinor: 0,
  status: 'CLEARED' as const,
  spendingMode: 'Direct Pay' as const,
  categoryRaw: 'Uncategorized',
}

describe('saveTransaction', () => {
  it('adds a purchase together with a new category and its rule', async () => {
    const id = await saveTransaction(
      { kind: 'add', input: manualInput },
      {
        ...noRules({ kind: 'new', name: 'Market' }),
        alwaysForMerchant: true,
        previousDescription: 'Farmers market',
      },
    )

    expect(await listCategories()).toMatchObject([{ name: 'Market' }])
    expect(await listCategoryRules()).toMatchObject([{ kind: 'merchant', label: 'Farmers market' }])
    const [loaded] = await loadTransactions()
    expect(loaded).toMatchObject({ id, categoryRaw: 'Market' })
  })

  it('keeps nothing when the category part fails, so a retry cannot add the purchase twice', async () => {
    vi.spyOn(db.categoryRules, 'put').mockRejectedValueOnce(new Error('disk full'))

    await expect(
      saveTransaction(
        { kind: 'add', input: manualInput },
        {
          ...noRules({ kind: 'new', name: 'Market' }),
          alwaysForMerchant: true,
          previousDescription: 'Farmers market',
        },
      ),
    ).rejects.toThrow('disk full')

    expect(await db.transactions.count()).toBe(0)
    expect(await listCategories()).toEqual([])
    expect(await listCategoryRules()).toEqual([])
  })

  it('rolls an edit back too when the category part fails', async () => {
    await importRows([makeRow()], 'hash-1')
    const [{ id }] = await listTransactions()
    const gaming = await createCategory('Gaming')
    vi.spyOn(db.categoryRules, 'put').mockRejectedValueOnce(new Error('disk full'))

    await expect(
      saveTransaction(
        { kind: 'edit', id, changes: { description: 'Steam' } },
        {
          ...noRules({ kind: 'custom', categoryId: gaming.id }),
          alwaysForMerchant: true,
          previousDescription: 'Steam Purchase',
        },
      ),
    ).rejects.toThrow('disk full')

    const stored = await getTransaction(id)
    expect(stored?.description).toBe('Steam Purchase')
    expect(stored?.editedFields).toBeUndefined()
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
    await saveTransaction(
      { kind: 'edit', id: first.id, changes: {} },
      {
        ...noRules({ kind: 'original' }),
        alwaysForMerchant: true,
        hadMerchantRule: true,
        previousDescription: 'Steam Purchase',
      },
    )

    expect(await listCategoryRules()).toHaveLength(1)
    expect((await getTransaction(first.id))?.categoryId).toBe(ORIGINAL_CATEGORY_ID)
    const categories = (await loadTransactions())
      .sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc))
      .map((transaction) => transaction.categoryRaw)
    expect(categories).toEqual(['Digital Goods: Games', 'Gaming'])
  })

  it('still removes the rule when its box is unticked with one of your categories picked', async () => {
    const { first, gamingId } = await setUp()

    await saveTransaction(
      { kind: 'edit', id: first.id, changes: {} },
      {
        ...noRules({ kind: 'custom', categoryId: gamingId }),
        hadMerchantRule: true,
        previousDescription: 'Steam Purchase',
      },
    )

    expect(await listCategoryRules()).toEqual([])
    expect((await getTransaction(first.id))?.categoryId).toBe(gamingId)
  })
})

describe('an edited cashback amount and its currency', () => {
  it('stay together when a later import reports a different cashback currency', async () => {
    await importRows([makeRow({ cashbackMinor: 30, cashbackCurrency: 'EUR' })], 'hash-1')
    const [{ id }] = await listTransactions()
    await saveTransaction(
      { kind: 'edit', id, changes: { cashbackMinor: 500 } },
      noRules({ kind: 'original' }),
    )

    await importRows([makeRow({ cashbackMinor: 35, cashbackCurrency: 'USD' })], 'hash-2')

    const stored = await getTransaction(id)
    expect(stored).toMatchObject({ cashbackMinor: 500, cashbackCurrency: 'EUR' })
    expect(stored?.importedValues).toEqual({ cashbackMinor: 35, cashbackCurrency: 'USD' })

    await resetTransactionEdits(id)
    expect(await getTransaction(id)).toMatchObject({ cashbackMinor: 35, cashbackCurrency: 'USD' })
  })

  it('takes the imported currency back when the amount is changed back to the imported one', async () => {
    await importRows([makeRow({ cashbackMinor: 30, cashbackCurrency: 'EUR' })], 'hash-1')
    const [{ id }] = await listTransactions()
    await saveTransaction(
      { kind: 'edit', id, changes: { cashbackMinor: 500 } },
      noRules({ kind: 'original' }),
    )
    await importRows([makeRow({ cashbackMinor: 35, cashbackCurrency: 'USD' })], 'hash-2')

    await saveTransaction(
      { kind: 'edit', id, changes: { cashbackMinor: 35 } },
      noRules({ kind: 'original' }),
    )

    const stored = await getTransaction(id)
    expect(stored).toMatchObject({ cashbackMinor: 35, cashbackCurrency: 'USD' })
    expect(stored?.editedFields).toBeUndefined()
    expect(stored?.importedValues).toBeUndefined()
  })
})
