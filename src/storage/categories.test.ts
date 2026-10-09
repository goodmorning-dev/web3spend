import { afterEach, describe, expect, it } from 'vitest'
import type { StandardTransaction } from '@/types/transaction'
import {
  createCategory,
  deleteCategory,
  listCategories,
  listCategoryRules,
  renameCategory,
  setCategoryColor,
  setEtherfiCategoryRule,
  setMerchantRule,
} from './categories'
import { db } from './db'
import { resetDatabase } from './test-helpers'
import { loadTransactions } from './transactions'

afterEach(resetDatabase)

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

describe('categories repository', () => {
  it('creates a category once, however its name is typed', async () => {
    const first = await createCategory('  Gaming ')
    const again = await createCategory('gaming')

    expect(first.name).toBe('Gaming')
    expect(again.id).toBe(first.id)
    expect(await listCategories()).toHaveLength(1)
  })

  it('refuses an empty name', async () => {
    await expect(createCategory('   ')).rejects.toThrow(/needs a name/)
  })

  it('renames a category, but not onto the name of another one', async () => {
    const gaming = await createCategory('Gaming')
    await createCategory('Treats')

    await renameCategory(gaming.id, 'Games')
    expect((await listCategories()).map((category) => category.name)).toEqual(['Games', 'Treats'])
    await expect(renameCategory(gaming.id, 'treats')).rejects.toThrow(/already have/)
  })

  it('keeps one rule per merchant, replacing it when set again and removing it with null', async () => {
    const gaming = await createCategory('Gaming')
    const treats = await createCategory('Treats')

    await setMerchantRule('Steam Purchase', gaming.id)
    await setMerchantRule('STEAM purchase', treats.id)
    expect(await listCategoryRules()).toMatchObject([
      { kind: 'merchant', matchKey: 'steam purchase', categoryId: treats.id },
    ])

    await setMerchantRule('Steam Purchase', null)
    expect(await listCategoryRules()).toEqual([])
  })

  it('files transactions by rule when they are loaded', async () => {
    const gaming = await createCategory('Gaming')
    await db.transactions.bulkPut([
      makeTransaction(),
      makeTransaction({
        id: 'txn-2',
        identityKey: 'key-2',
        description: 'Kaufland',
        categoryRaw: 'Groceries',
      }),
    ])

    await setEtherfiCategoryRule('5816 - Digital Goods: Games', gaming.id)

    const loaded = await loadTransactions()
    expect(loaded.map((transaction) => transaction.categoryRaw).sort()).toEqual([
      'Gaming',
      'Groceries',
    ])
    // the stored row itself keeps ether.fi's category
    expect((await db.transactions.get('txn-1'))?.categoryRaw).toBe('Digital Goods: Games')
  })

  it('deleting a category removes its rules and unfiles its transactions', async () => {
    const gaming = await createCategory('Gaming')
    await setMerchantRule('Steam Purchase', gaming.id)
    await db.transactions.put(makeTransaction({ categoryId: gaming.id }))

    await deleteCategory(gaming.id)

    expect(await listCategories()).toEqual([])
    expect(await listCategoryRules()).toEqual([])
    const stored = await db.transactions.get('txn-1')
    expect(stored).toBeDefined()
    expect(stored?.categoryId).toBeUndefined()
  })

  it('stores a picked color, refuses an unsafe one, and can go back to automatic', async () => {
    const gaming = await createCategory('Gaming')

    await setCategoryColor(gaming.id, '#a3e635')
    expect((await listCategories())[0].color).toBe('#a3e635')

    await expect(setCategoryColor(gaming.id, 'red; display: none')).rejects.toThrow(/color/)
    expect((await listCategories())[0].color).toBe('#a3e635')

    await setCategoryColor(gaming.id, null)
    expect((await listCategories())[0].color).toBeUndefined()
  })
})
