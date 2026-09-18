import ImportFlow from '@/components/ImportFlow'

function ImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="font-heading text-xl font-semibold">Import your Etherfi export</h1>
        <p className="text-sm text-muted-foreground">
          Select the XLSX file Etherfi gives you when you export your transaction history. It is
          read entirely in this browser; nothing is uploaded anywhere. Re-importing a newer export
          merges safely with what's already stored.
        </p>
      </section>
      <ImportFlow />
    </div>
  )
}

export default ImportPage
