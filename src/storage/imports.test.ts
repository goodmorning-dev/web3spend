import { afterEach, describe, expect, it } from 'vitest'
import { findImportByFileHash, listImports, putImport } from './imports'
import { resetDatabase } from './test-helpers'
import type { ImportRecord } from '@/types/import'

afterEach(resetDatabase)

function makeImport(overrides: Partial<ImportRecord> = {}): ImportRecord {
  return {
    id: 'import-1',
    fileHash: 'hash-1',
    importedAt: '2026-01-15T10:00:00.000Z',
    parserVersion: '1',
    rowCounts: { added: 1, updated: 0, unsupported: 0 },
    ...overrides,
  }
}

describe('imports repository', () => {
  it('round-trips an import record by id', async () => {
    const record = makeImport()
    await putImport(record)

    expect(await listImports()).toEqual([record])
  })

  it('finds an import by fileHash', async () => {
    const record = makeImport()
    await putImport(record)

    expect(await findImportByFileHash('hash-1')).toEqual(record)
    expect(await findImportByFileHash('does-not-exist')).toBeUndefined()
  })
})
