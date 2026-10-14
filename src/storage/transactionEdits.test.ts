import { afterEach, describe, expect, it } from 'vitest'
import { commitImport, type ParsedTransactionRow } from '@/matching/commitImport'
import type { StandardTransaction } from '@/types/transaction'
import { db } from './db'
import { resetDatabase } from './test-helpers'
import {
  deleteManualTransaction,
  getTransaction,
  listTransactions,
  resetTransactionEdits,
  setTransactionCategory,
} from './transactions'

// Amounts, dates and statuses can't be edited and purchases can't be
// added by hand any more, but rows from when they could still exist in
// people's browsers. These tests set such rows up directly and check
// they're still handled: kept through imports, undone, and deleted.

afterEach(resetDatabase)

function makeRow(overrides: Partial<ParsedTransactionRow> = {}): ParsedTransactionRow {
  return {
    last4: '4242',
    cardHolderKey: 'jane doe',
    timestampUtc: '2026-01-15T10:00:00.000Z',
    type: 'card_spend',
    description: 'Coffee Shop',
    status: 'PENDING',
    amountMinor: 450,
    currency: 'EUR',
    originalAmountMinor: 450,
    originalCurrency: 'EUR',
    cashbackMinor: 9,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Eating Places and Restaurants',
    spendingMode: 'Direct Pay',
    ...overrides,
  }
}

async function importRows(rows: ParsedTransactionRow[], fileHash: string): Promise<void> {
  await commitImport(rows, { fileHash, parserVersion: '1', unsupportedCount: 0 })
}

async function onlyTransaction(): Promise<StandardTransaction> {
  const all = await listTransactions()
  expect(all).toHaveLength(1)
  return all[0]
}

/** Imports one purchase, then edits it the way the old edit form did:
 * the new values in place, the import's own ones kept beside them. */
async function importEdited(
  imported: Partial<ParsedTransactionRow>,
  edits: Partial<StandardTransaction>,
): Promise<string> {
  await importRows([makeRow(imported)], 'hash-1')
  const stored = await onlyTransaction()
  const fields = Object.keys(edits) as (keyof StandardTransaction)[]
  await db.transactions.put({
    ...stored,
    ...edits,
    editedFields: fields as StandardTransaction['editedFields'],
    importedValues: Object.fromEntries(fields.map((field) => [field, stored[field]])),
  })
  return stored.id
}

function manualTransaction(overrides: Partial<StandardTransaction> = {}): StandardTransaction {
  return {
    id: 'manual-1',
    cardId: 'card-1',
    timestampUtc: '2026-02-01T12:00:00.000Z',
    type: 'card_spend',
    description: 'Farmers market',
    status: 'CLEARED',
    amountMinor: 1250,
    currency: 'EUR',
    originalAmountMinor: 1250,
    originalCurrency: 'EUR',
    cashbackMinor: 0,
    cashbackCurrency: 'EUR',
    categoryRaw: 'Groceries',
    spendingMode: 'Direct Pay',
    identityKey: 'manual:manual-1',
    importId: 'manual',
    source: 'manual',
    ...overrides,
  }
}

describe('a purchase added by hand before that was removed', () => {
  it('can still be deleted, unlike an imported one', async () => {
    await db.transactions.put(manualTransaction())
    await deleteManualTransaction('manual-1')
    expect(await getTransaction('manual-1')).toBeUndefined()

    await importRows([makeRow()], 'hash-1')
    const imported = await onlyTransaction()
    await expect(deleteManualTransaction(imported.id)).rejects.toThrow(/added yourself/)
  })

  it('is never touched by an import, even one with an identical purchase', async () => {
    await db.transactions.put(
      manualTransaction({
        description: 'Coffee Shop',
        amountMinor: 450,
        timestampUtc: '2026-01-15T10:00:00.000Z',
      }),
    )
    await importRows([makeRow()], 'hash-1')

    expect(await listTransactions()).toHaveLength(2)
    expect((await getTransaction('manual-1'))?.source).toBe('manual')
  })
})

describe('an imported purchase edited before', () => {
  it('keeps the edit through a later import, while still taking in what that import reports', async () => {
    const id = await importEdited(
      { status: 'PENDING', cashbackMinor: 9 },
      { description: 'Coffee with Sam', cashbackMinor: 20 },
    )

    await importRows([makeRow({ status: 'CLEARED', cashbackMinor: 13 })], 'hash-2')

    expect(await getTransaction(id)).toMatchObject({
      description: 'Coffee with Sam',
      cashbackMinor: 20,
      status: 'CLEARED',
      importedValues: { description: 'Coffee Shop', cashbackMinor: 13 },
    })
  })

  it("judges a later import's status against the imported status, not an edited one", async () => {
    const id = await importEdited({ status: 'PENDING' }, { status: 'CANCELLED' })

    await importRows([makeRow({ status: 'CLEARED', cashbackMinor: 14 })], 'hash-2')

    const stored = await getTransaction(id)
    expect(stored?.status).toBe('CANCELLED')
    expect(stored?.importedValues).toMatchObject({ status: 'CLEARED' })
    // the CLEARED report was accepted, so its cashback applies as usual
    expect(stored?.cashbackMinor).toBe(14)
  })

  it('keeps an edited cashback with its currency when a later import reports another one', async () => {
    const id = await importEdited({ cashbackMinor: 30 }, { cashbackMinor: 500 })

    await importRows([makeRow({ cashbackMinor: 35, cashbackCurrency: 'USD' })], 'hash-2')

    const stored = await getTransaction(id)
    expect(stored).toMatchObject({ cashbackMinor: 500, cashbackCurrency: 'EUR' })
    expect(stored?.importedValues).toEqual({ cashbackMinor: 35, cashbackCurrency: 'USD' })
  })

  it('puts the imported values back on undo, including ones a newer import reported', async () => {
    const id = await importEdited(
      { cashbackMinor: 9 },
      { cashbackMinor: 50, description: 'Renamed' },
    )
    await importRows([makeRow({ cashbackMinor: 11 })], 'hash-2')

    await resetTransactionEdits(id)

    const stored = await getTransaction(id)
    expect(stored).toMatchObject({ cashbackMinor: 11, description: 'Coffee Shop' })
    expect(stored?.editedFields).toBeUndefined()
    expect(stored?.importedValues).toBeUndefined()
  })
})

describe("a purchase's own category", () => {
  it('stays through a later import, and can be taken off again', async () => {
    await importRows([makeRow()], 'hash-1')
    const { id } = await onlyTransaction()

    await setTransactionCategory(id, 'cat-1')
    await importRows([makeRow({ status: 'CLEARED' })], 'hash-2')
    expect((await onlyTransaction()).categoryId).toBe('cat-1')

    await setTransactionCategory(id, undefined)
    expect((await onlyTransaction()).categoryId).toBeUndefined()
  })
})
