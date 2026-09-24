import { ArrowRight, BookOpen, FileText, RefreshCw, TriangleAlert, Zap } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import importHeroImage from '@/assets/import-hero.webp'
import ImportDropzone from '@/components/ImportDropzone'
import { Button } from '@/components/ui/button'
import { useDemoData } from '@/hooks/useDemoData'

const GUIDE_URL =
  'https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history'
// Where the sheet is picked, for anyone who wants to check the claim below.
const SHEET_SOURCE_URL =
  'https://github.com/goodmorning-dev/web3spend/blob/main/src/adapters/etherfi.ts'

const NOTE_LINK_CLASS = 'font-medium text-primary hover:underline'

const NOTES: {
  key: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: ReactNode
}[] = [
  {
    key: 'sheet',
    icon: FileText,
    title: 'Nothing counted twice',
    description: (
      <>
        Your export lists every purchase again in its per-currency sheets, so we only read the{' '}
        <strong className="font-semibold text-foreground">All Transactions</strong> sheet.{' '}
        <a href={SHEET_SOURCE_URL} target="_blank" rel="noreferrer" className={NOTE_LINK_CLASS}>
          See the code
        </a>
      </>
    ),
  },
  {
    key: 'instant',
    icon: Zap,
    title: 'Straight to your dashboard',
    description:
      "Pick the file and your dashboard updates right away. There's nothing to confirm or map by hand.",
  },
  {
    key: 'merge',
    icon: RefreshCw,
    title: 'Safe re-imports',
    description: (
      <>
        Importing a newer export adds what's new and updates what changed, without duplicating
        anything. You can delete all of your data at any time in{' '}
        <Link to="/app/settings" className={NOTE_LINK_CLASS}>
          Settings
        </Link>
        .
      </>
    ),
  },
  {
    key: 'unsupported',
    icon: TriangleAlert,
    title: 'Unsupported rows are reported',
    description:
      "Only card purchases are shown for now, so top-ups, swaps and deposits are left out. Anything else we can't understand is reported plainly instead of being silently skipped.",
  },
]

function ImportPage() {
  const { loadDemo, isLoading, error } = useDemoData()

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        {/* The import area comes first: on the left on desktop, where
            people start reading, and above the illustration on phones. */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                Import your <span className="text-primary">ether.fi data</span>
              </h2>
              <p className="mt-1.5 max-w-[46ch] text-sm text-text-dim">
                Everything below is parsed and stored on this device. Nothing is uploaded anywhere.
              </p>
            </div>

            <ImportDropzone
              resultAction={
                <Button asChild size="sm" className="gap-1.5">
                  <Link to="/app">
                    View your dashboard
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              }
            />

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

          <div className="relative isolate flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-[10%] -z-10 rounded-full bg-[radial-gradient(circle,var(--color-primary)_0%,transparent_70%)] opacity-35 blur-3xl"
            />
            <img src={importHeroImage} alt="" aria-hidden="true" className="w-full max-w-[640px]" />
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
