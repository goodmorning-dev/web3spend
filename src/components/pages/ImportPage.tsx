import { ArrowRight, BookOpen, Eye, FileText, RefreshCw, TriangleAlert } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import importHeroImage from '@/assets/import-hero.webp'
import ImportDropzone from '@/components/ImportDropzone'
import { Button } from '@/components/ui/button'
import { useDemoData } from '@/hooks/useDemoData'

const GUIDE_URL =
  'https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history'

const NOTES: {
  key: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: ReactNode
}[] = [
  {
    key: 'sheet',
    icon: FileText,
    title: 'All Transactions only',
    description: (
      <>
        We read the <strong className="font-semibold text-foreground">All Transactions</strong>{' '}
        sheet only, not the per-currency sheets.
      </>
    ),
  },
  {
    key: 'preview',
    icon: Eye,
    title: 'No preview step',
    description: "Once a file is accepted, it's parsed and committed straight to your dashboard.",
  },
  {
    key: 'merge',
    icon: RefreshCw,
    title: 'Safe re-imports',
    description:
      "Re-importing a newer export merges safely with what's already stored. Nothing already saved is ever deleted.",
  },
  {
    key: 'unsupported',
    icon: TriangleAlert,
    title: 'Unsupported rows are reported',
    description: "Rows we can't understand are reported plainly instead of being silently skipped.",
  },
]

function ImportPage() {
  const { loadDemo, isLoading, error } = useDemoData()

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="relative isolate order-last flex items-center justify-center lg:order-none">
            <div
              aria-hidden="true"
              className="absolute inset-[10%] -z-10 rounded-full bg-[radial-gradient(circle,var(--color-primary)_0%,transparent_70%)] opacity-35 blur-3xl"
            />
            <img src={importHeroImage} alt="" aria-hidden="true" className="w-full max-w-[640px]" />
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                Import your <span className="text-primary">ether.fi export</span>
              </h2>
              <p className="mt-1.5 max-w-[46ch] text-sm text-text-dim">
                Everything below is parsed and stored on this device. Nothing is uploaded anywhere.
              </p>
            </div>

            <ImportDropzone />

            <div className="flex flex-col items-center gap-2 text-center text-sm">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span className="text-text-dim">Don&apos;t have a file handy?</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={loadDemo}
                  disabled={isLoading}
                  className="h-auto gap-1 p-0"
                >
                  {isLoading ? 'Loading demo…' : 'Try a demo instead'}
                  {!isLoading && <ArrowRight className="size-3.5" />}
                </Button>
              </div>
              <a
                href={GUIDE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <BookOpen className="size-3.5" />
                How to export from ether.fi
                <ArrowRight className="size-3.5" />
              </a>
            </div>
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Good to know</h2>
          <p className="mt-0.5 text-[13px] text-text-dim">
            A few things to keep in mind when importing your ether.fi export.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NOTES.map(({ key, icon: Icon, title, description }) => (
            <div
              key={key}
              className="flex items-start gap-3.5 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-primary/55 bg-gradient-to-b from-primary/20 to-primary/5 text-primary shadow-[0_0_18px_-8px_var(--color-primary)]">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-dim">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ImportPage
