import { afterEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { resetDatabase } from './test-helpers'

afterEach(resetDatabase)

describe('Web3SpendDB', () => {
  it('creates the v1 schema with the expected tables', async () => {
    await db.open()
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'cards',
      'imports',
      'settings',
      'transactions',
    ])
  })
})
