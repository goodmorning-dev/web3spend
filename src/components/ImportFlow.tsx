import { CircleAlert, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ETHERFI_PARSER_VERSION, etherfiAdapter, type UnsupportedRow } from '@/adapters'
import { cn } from '@/lib/utils'
import { commitImport } from '@/matching/commitImport'
import { clearDemoData } from '@/storage/demoData'
import { sha256Hex } from '@/utils/hash'

interface ImportResult {
  added: number
  updated: number
  unsupported: UnsupportedRow[]
  alreadyImported: boolean
}

interface ImportFlowProps {
  /** Called right after a file finishes processing, successfully or not,
   * so a parent can react to "an import just happened" without needing to
   * duplicate this component's own result state. */
  onImported?: (result: ImportResult) => void
}

/**
 * MVP-PLAN §5/§7: no preview/confirmation step. A selected file is parsed and
 * committed directly; unsupported rows are reported plainly afterward, not
 * hidden or silently dropped.
 */
function ImportFlow({ onImported }: ImportFlowProps = {}) {
  const [status, setStatus] = useState<'idle' | 'processing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
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
      // The demo dataset is meant to be disposable (MVP-PLAN §5): a real
      // import replaces it outright rather than merging alongside it.
      await clearDemoData()
      const { rowCounts, alreadyImported } = await commitImport(rows, {
        fileHash,
        parserVersion: ETHERFI_PARSER_VERSION,
        unsupportedCount: unsupported.length,
      })
      const importResult: ImportResult = {
        added: rowCounts.added,
        updated: rowCounts.updated,
        unsupported,
        alreadyImported,
      }
      setResult(importResult)
      onImported?.(importResult)
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

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      void processFile(file)
    }
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFilePicker()
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void processFile(file)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4.5 rounded-2xl border border-border bg-card px-6 py-6 text-center">
      <div>
        <h3 className="font-heading text-xl font-semibold tracking-tight">
          Import your Etherfi export
        </h3>
        <p className="mt-1 max-w-[40ch] text-[13.5px] font-medium text-text-dim">
          Everything below is parsed and stored on this device. Nothing is uploaded anywhere.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={handleDropzoneKeyDown}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Drop an XLSX file here, or browse for one"
        className={cn(
          'flex w-full max-w-[440px] cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-border bg-secondary px-6 py-9 transition-colors hover:border-text-faint focus-visible:outline-none',
          isDragOver && 'border-primary bg-primary/10',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          aria-label="Choose an XLSX file"
          onChange={handleFileChange}
          disabled={status === 'processing'}
          className="hidden"
          tabIndex={-1}
        />
        <div className="mb-0.5 flex size-[46px] items-center justify-center rounded-[13px] bg-primary/15 text-primary">
          <Upload className="size-[21px]" strokeWidth={1.8} />
        </div>
        <p className="text-[14.5px] font-semibold">Drag &amp; drop your XLSX export here</p>
        <p className="text-[11px] font-semibold tracking-[0.06em] text-text-faint uppercase">or</p>
        <Button
          type="button"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            openFilePicker()
          }}
        >
          <Upload className="size-3.5" />
          Browse files
        </Button>
        <p className="mt-1 text-[11.5px] font-medium text-text-faint">
          XLSX only · CSV exports aren't supported yet
        </p>
      </div>

      {status === 'processing' && (
        <div className="flex w-full max-w-[440px] items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary px-4 py-3.5 text-[13px] font-medium text-text-dim">
          <span className="size-[15px] shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />
          Reading your file…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex w-full max-w-[440px] items-start gap-3 rounded-xl border border-destructive bg-destructive/15 p-4 text-left"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[13px] font-semibold">We couldn't read that file</p>
            <p className="text-[12.5px] leading-normal text-text-dim">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-2.5 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-text-faint hover:bg-secondary"
            >
              Try another file
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="flex w-full max-w-[440px] flex-col gap-2 rounded-xl border border-border bg-secondary p-4 text-left text-sm">
          <div className="flex items-center gap-2">
            <span className="size-[7px] shrink-0 rounded-full bg-positive" aria-hidden="true" />
            {result.alreadyImported ? (
              <p className="font-medium">
                This file has already been imported. No changes were made.
              </p>
            ) : (
              <p className="font-medium">
                {result.added} added, {result.updated} updated.
              </p>
            )}
          </div>
          {!result.alreadyImported && result.unsupported.length > 0 && (
            <details>
              <summary className="cursor-pointer text-text-faint select-none">
                {result.unsupported.length} row{result.unsupported.length === 1 ? '' : 's'} could
                not be imported
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-text-faint">
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
