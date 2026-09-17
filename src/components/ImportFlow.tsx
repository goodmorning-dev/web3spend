import { useState, type ChangeEvent } from 'react'
import { ETHERFI_PARSER_VERSION, etherfiAdapter, type UnsupportedRow } from '@/adapters'
import { commitImport } from '@/matching/commitImport'
import { sha256Hex } from '@/utils/hash'

interface ImportResult {
  added: number
  updated: number
  unsupported: UnsupportedRow[]
}

/**
 * MVP-PLAN §5/§7: no preview/confirmation step. A selected file is parsed and
 * committed directly; unsupported rows are reported plainly afterward, not
 * hidden or silently dropped.
 */
function ImportFlow() {
  const [status, setStatus] = useState<'idle' | 'processing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setError(null)
    setResult(null)

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError(
        'Only XLSX files are supported. Export your Etherfi transaction history as XLSX, not CSV or another format.',
      )
      return
    }

    setStatus('processing')
    try {
      const buffer = await file.arrayBuffer()
      const fileHash = await sha256Hex(buffer)
      const { rows, unsupported } = etherfiAdapter.parse(buffer)
      const { rowCounts } = await commitImport(rows, {
        fileHash,
        parserVersion: ETHERFI_PARSER_VERSION,
        unsupportedCount: unsupported.length,
      })
      setResult({ added: rowCounts.added, updated: rowCounts.updated, unsupported })
    } catch (err) {
      setError(
        err instanceof Error
          ? `We couldn't import that file: ${err.message}`
          : 'Something went wrong reading that file.',
      )
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        Choose an XLSX file
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          disabled={status === 'processing'}
          className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
        />
      </label>

      {status === 'processing' && <p className="text-sm text-muted-foreground">Importing...</p>}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
          <p>
            {result.added} added, {result.updated} updated.
          </p>
          {result.unsupported.length > 0 && (
            <details>
              <summary className="cursor-pointer text-muted-foreground">
                {result.unsupported.length} row{result.unsupported.length === 1 ? '' : 's'} could
                not be imported
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                {result.unsupported.map((row) => (
                  <li key={row.rowNumber}>
                    Row {row.rowNumber}: {row.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

export default ImportFlow
