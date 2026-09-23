import { CircleAlert, Upload } from 'lucide-react'
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Button } from '@/components/ui/button'
import { ETHERFI_PARSER_VERSION, etherfiAdapter, type UnsupportedRow } from '@/adapters'
import { trackImport } from '@/hooks/importActivity'
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

interface ImportDropzoneProps {
  /** Called right after a file finishes processing, successfully or not,
   * so a parent can react to "an import just happened" without needing to
   * duplicate this component's own result state. */
  onImported?: (result: ImportResult) => void
  /** Shown under a finished import's result, such as a link on to the
   * dashboard. Left out where there's nowhere better to go, like the
   * Dashboard's own first-import prompt. */
  resultAction?: ReactNode
}

/**
 * The drag/drop-or-browse box, plus the processing/error/result states
 * beneath it: the reusable core `ImportFlow` (Dashboard's no-data prompt)
 * and the Import page's own richer hero both build on this, so the file
 * handling itself lives in exactly one place. MVP-PLAN §5/§7: no
 * preview/confirmation step - a selected file is parsed and committed
 * directly; unsupported rows are reported plainly afterward, not hidden or
 * silently dropped.
 */
function ImportDropzone({ onImported, resultAction }: ImportDropzoneProps = {}) {
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
        'Only XLSX files are supported. Export your ether.fi transaction history as XLSX, not CSV or another format.',
      )
      return
    }

    setStatus('processing')
    // Counted as an import in progress for the whole read-parse-commit, so
    // the app update prompt can't reload the page partway through.
    await trackImport(async () => {
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
    })
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
    <div className="flex w-full flex-col items-center gap-3">
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
          'flex w-full cursor-pointer flex-col items-center rounded-2xl border-[1.5px] border-dashed border-primary/55 bg-background/40 px-6 py-9 text-center transition-colors hover:border-primary/90 focus-visible:border-primary focus-visible:outline-none',
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
        <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/70 bg-gradient-to-b from-primary/25 to-primary/5 text-primary shadow-[0_0_28px_-6px_var(--color-primary)]">
          <Upload className="size-6" strokeWidth={2} />
        </div>
        <p className="mt-5 text-lg font-semibold text-foreground">
          Drag &amp; drop your XLSX export here
        </p>
        <p className="mt-2 text-[13px] text-text-faint">or</p>
        <Button
          type="button"
          size="xl"
          onClick={(event) => {
            event.stopPropagation()
            openFilePicker()
          }}
          className="mt-3 bg-gradient-to-b from-[#ffd54f] to-[#f2b01e] px-7 text-[15px] font-semibold text-primary-foreground shadow-[0_8px_24px_-10px_var(--color-primary)] hover:brightness-110"
        >
          <Upload strokeWidth={2.2} />
          Browse files
        </Button>
        <p className="mt-4 text-[13px] text-text-faint">
          XLSX only · CSV exports aren't supported yet
        </p>
      </div>

      {status === 'processing' && (
        <div className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary px-4 py-3.5 text-[13px] font-medium text-text-dim">
          <span className="size-[15px] shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />
          Reading your file…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex w-full items-start gap-3 rounded-xl border border-destructive bg-destructive/15 p-4 text-left"
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
        <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-secondary p-4 text-left text-sm">
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
          {resultAction && <div className="pt-1">{resultAction}</div>}
        </div>
      )}
    </div>
  )
}

export default ImportDropzone
export type { ImportResult }
