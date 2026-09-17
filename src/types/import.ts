export interface ImportRowCounts {
  added: number
  updated: number
  unsupported: number
}

export interface ImportRecord {
  id: string
  fileHash: string
  importedAt: string
  parserVersion: string
  rowCounts: ImportRowCounts
}
