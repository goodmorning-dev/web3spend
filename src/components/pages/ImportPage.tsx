import ImportFlow from '@/components/ImportFlow'
import { Button } from '@/components/ui/button'
import { useDemoData } from '@/hooks/useDemoData'

const NOTES: Array<{ key: string; content: React.ReactNode }> = [
  {
    key: 'sheet',
    content: (
      <>
        We read the <strong className="font-semibold text-foreground">All Transactions</strong>{' '}
        sheet only, not the per-currency sheets.
      </>
    ),
  },
  {
    key: 'preview',
    content:
      "There's no preview step: once a file is accepted, it's parsed and committed straight to your dashboard.",
  },
  {
    key: 'merge',
    content:
      "Re-importing a newer export merges safely with what's already stored. Nothing already saved is ever deleted.",
  },
  {
    key: 'unsupported',
    content: "Rows we can't understand are reported plainly instead of being silently skipped.",
  },
]

function ImportPage() {
  const { loadDemo, isLoading, error } = useDemoData()

  return (
    <div className="flex flex-col gap-4">
      <ImportFlow />
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 text-sm text-text-dim">
          <span>Don&apos;t have a file handy?</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={loadDemo}
            disabled={isLoading}
            className="h-auto p-0"
          >
            {isLoading ? 'Loading demo…' : 'Try a demo instead'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h4 className="mb-3 text-[13px] font-semibold">Good to know</h4>
        <ul className="flex flex-col gap-2">
          {NOTES.map((note) => (
            <li
              key={note.key}
              className="relative pl-4 text-[12.5px] leading-relaxed text-text-dim before:absolute before:top-[7px] before:left-0 before:size-[5px] before:rounded-full before:bg-primary before:content-['']"
            >
              {note.content}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default ImportPage
