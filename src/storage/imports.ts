import { db } from './db'
import type { ImportRecord } from '@/types/import'

export function listImports(): Promise<ImportRecord[]> {
  return db.imports.toArray()
}

export function findImportByFileHash(fileHash: string): Promise<ImportRecord | undefined> {
  return db.imports.where('fileHash').equals(fileHash).first()
}

export function putImport(record: ImportRecord): Promise<string> {
  return db.imports.put(record)
}
