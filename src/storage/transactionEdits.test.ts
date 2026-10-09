import { afterEach, describe, expect, it } from 'vitest'
import { commitImport, type ParsedTransactionRow } from '@/matching/commitImport'
import type { StandardTransaction } from '@/types/transaction'
import { resetDatabase } from './test-helpers'
import {
  addManualTransaction,
  deleteManualTransaction,
  getTransaction,
  listTransactions,
  resetTransactionEdits,
  setTransactionCategory,
  updateTransaction,
} from './transactions'

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

describe('manual transactions', () => {
  const input = {
    cardId: 'card-1',
    timestampUtc: '2026-02-01T12:00:00.000Z',
    description: '  Farmers   market ',
    amountMinor: 1250,
    currency: 'EUR',
    cashbackMinor: 0,
    status: 'CLEARED' as const,
    spendingMode: 'Direct Pay' as const,
    categoryRaw: 'Groceries',
  }

  it('adds one with a key no import can ever match, and tidies the description', async () => {
    const id = await addManualTransaction(input)

    expect(await getTransaction(id)).toMatchObject({
      source: 'manual',
      description: 'Farmers market',
      originalAmountMinor: 1250,
      originalCurrency: 'EUR',
      cashbackCurrency: 'EUR',
      identityKey: `manual:${id}`,
    })
  })

  it('edits one in place, keeping the original amount and currencies in step', async () => {
    const id = await addManualTransaction(input)
    await updateTransaction(id, { amountMinor: 990, currency: 'USD' })

    const stored = await getTransaction(id)
    expect(stored).toMatchObject({
      amountMinor: 990,
      originalAmountMinor: 990,
      currency: 'USD',
      originalCurrency: 'USD',
      cashbackCurrency: 'USD',
    })
    expect(stored?.editedFields).toBeUndefined()
  })

  it('deletes one, but never an imported transaction', async () => {
    const id = await addManualTransaction(input)
    await deleteManualTransaction(id)
    expect(await getTransaction(id)).toBeUndefined()

    await importRows([makeRow()], 'hash-1')
    const imported = await onlyTransaction()
    await expect(deleteManualTransaction(imported.id)).rejects.toThrow(/added yourself/)
  })

  it('is never touched by an import, even one with an identical purchase', async () => {
    const id = await addManualTransaction({
      ...input,
      description: 'Coffee Shop',
      amountMinor: 450,
    })
    await importRows([makeRow({ timestampUtc: input.timestampUtc })], 'hash-1')

    expect(await listTransactions()).toHaveLength(2)
    expect((await getTransaction(id))?.source).toBe('manual')
  })
})

describe('editing an imported transaction', () => {
  it('remembers what the import said, and forgets once a field is changed back', async () => {
    await importRows([makeRow()], 'hash-1')
    const { id } = await onlyTransaction()

    await updateTransaction(id, { description: 'Coffee with Sam', amountMinor: 500 })
    let stored = await onlyTransaction()
    expect(stored).toMatchObject({
      description: 'Coffee with Sam',
      amountMinor: 500,
      originalAmountMinor: 500,
      editedFields: ['description', 'amountMinor', 'originalAmountMinor'],
      importedValues: { description: 'Coffee Shop', amountMinor: 450, originalAmountMinor: 450 },
    })

    await updateTransaction(id, { description: 'Coffee Shop' })
    stored = await onlyTransaction()
    expect(stored.editedFields).toEqual(['amountMinor', 'originalAmountMinor'])
    expect(stored.importedValues).toEqual({ amountMinor: 450, originalAmountMinor: 450 })
  })

  it('leaves a foreign original amount alone when the amount is edited', async () => {
    await importRows([makeRow({ originalAmountMinor: 500, originalCurrency: 'USD' })], 'hash-1')
    const { id } = await onlyTransaction()

    await updateTransaction(id, { amountMinor: 470 })
    expect(await onlyTransaction()).toMatchObject({ amountMinor: 470, originalAmountMinor: 500 })
  })

  it('ignores card, currency and category changes', async () => {
    await importRows([makeRow()], 'hash-1')
    const before = await onlyTransaction()

    await updateTransaction(before.id, { cardId: 'other', currency: 'USD', categoryRaw: 'Other' })
    expect(await onlyTransaction()).toEqual(before)
  })

  it('keeps the edit through a later import, while still taking in what that import reports', async () => {
    await importRows([makeRow({ status: 'PENDING', cashbackMinor: 9 })], 'hash-1')
    const { id } = await onlyTransaction()
    await updateTransaction(id, { description: 'Coffee with Sam', cashbackMinor: 20 })

    await importRows([makeRow({ status: 'CLEARED', cashbackMinor: 13 })], 'hash-2')

    expect(await onlyTransaction()).toMatchObject({
      description: 'Coffee with Sam',
      cashbackMinor: 20,
      status: 'CLEARED',
      importedValues: { description: 'Coffee Shop', cashbackMinor: 13 },
    })
  })

  it("judges a later import's status against the imported status, not an edited one", async () => {
    await importRows([makeRow({ status: 'PENDING' })], 'hash-1')
    const { id } = await onlyTransaction()
    await updateTransaction(id, { status: 'CANCELLED' })

    await importRows([makeRow({ status: 'CLEARED', cashbackMinor: 14 })], 'hash-2')

    const stored = await onlyTransaction()
    expect(stored.status).toBe('CANCELLED')
    expect(stored.importedValues).toEqual({ status: 'CLEARED' })
    // the CLEARED report was accepted, so its cashback applies as usual
    expect(stored.cashbackMinor).toBe(14)
  })

  it('puts the imported values back on reset, including ones a newer import reported', async () => {
    await importRows([makeRow({ cashbackMinor: 9 })], 'hash-1')
    const { id } = await onlyTransaction()
    await updateTransaction(id, { cashbackMinor: 50, description: 'Renamed' })
    await importRows([makeRow({ cashbackMinor: 11 })], 'hash-2')

    await resetTransactionEdits(id)

    const stored = await onlyTransaction()
    expect(stored).toMatchObject({ cashbackMinor: 11, description: 'Coffee Shop' })
    expect(stored.editedFields).toBeUndefined()
    expect(stored.importedValues).toBeUndefined()
  })

  it('keeps its own category through a later import', async () => {
    await importRows([makeRow()], 'hash-1')
    const { id } = await onlyTransaction()

    await setTransactionCategory(id, 'cat-1')
    await importRows([makeRow({ status: 'CLEARED' })], 'hash-2')
    expect((await onlyTransaction()).categoryId).toBe('cat-1')

    await setTransactionCategory(id, undefined)
    expect((await onlyTransaction()).categoryId).toBeUndefined()
  })
})
