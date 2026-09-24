import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDataSource, setDataSource, subscribeToDataSource } from './dataSource'
import { db, demoDb, realDb } from './db'
import { deleteAllData } from './deleteAllData'
import { openDemo } from './demoData'
import { resetDatabase } from './test-helpers'

afterEach(resetDatabase)

describe('data source', () => {
  it("starts on the person's own data", () => {
    expect(getDataSource()).toBe('real')
    expect(db).toBe(realDb)
  })

  it('switches the active database, remembers it for the session, and tells subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToDataSource(listener)

    setDataSource('demo')
    expect(db).toBe(demoDb)
    expect(sessionStorage.getItem('web3spend:data-source')).toBe('demo')
    expect(listener).toHaveBeenCalledTimes(1)

    setDataSource('real')
    expect(db).toBe(realDb)
    expect(sessionStorage.getItem('web3spend:data-source')).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
  })

  it("doesn't notify anyone when nothing changes", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToDataSource(listener)

    setDataSource('real')

    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })
})

describe('deleteAllData', () => {
  it("empties both databases and goes back to the person's own data", async () => {
    await openDemo()

    await deleteAllData()

    expect(getDataSource()).toBe('real')
    expect(await realDb.transactions.count()).toBe(0)
    expect(await demoDb.transactions.count()).toBe(0)
    expect(await demoDb.imports.count()).toBe(0)
  })
})
