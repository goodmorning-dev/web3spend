import ImportFlow from '@/components/ImportFlow'

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
  return (
    <div className="flex flex-col gap-4">
      <ImportFlow />
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
