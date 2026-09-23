import ImportDropzone, { type ImportResult } from '@/components/ImportDropzone'

interface ImportFlowProps {
  /** Called right after a file finishes processing, successfully or not,
   * so a parent can react to "an import just happened" without needing to
   * duplicate this component's own result state. */
  onImported?: (result: ImportResult) => void
}

/**
 * The self-contained "import your export" prompt: used as-is for
 * Dashboard's no-data fallback, where there's no other explanatory content
 * on screen yet. The Import page itself builds its own richer hero around
 * `ImportDropzone` directly instead, so this heading/link pairing is
 * deliberately the plain, minimal version of that same explanation.
 */
function ImportFlow({ onImported }: ImportFlowProps = {}) {
  return (
    <div className="flex flex-col items-center gap-4.5 rounded-2xl border border-border bg-card px-6 py-6 text-center">
      <div>
        <h3 className="font-heading text-xl font-semibold tracking-tight">
          Import your ether.fi data
        </h3>
        <p className="mt-1 max-w-[40ch] text-[13.5px] font-medium text-text-dim">
          Everything below is parsed and stored on this device. Nothing is uploaded anywhere.
        </p>
        <a
          href="https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history"
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-[13px] font-semibold text-primary hover:underline"
        >
          Don&apos;t have your export yet? See ether.fi&apos;s guide
        </a>
      </div>

      <div className="w-full max-w-[440px]">
        <ImportDropzone onImported={onImported} />
      </div>
    </div>
  )
}

export default ImportFlow
