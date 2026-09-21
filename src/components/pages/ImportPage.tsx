import {
  ArrowRight,
  BookOpen,
  Eye,
  FileSpreadsheet,
  Files,
  Lightbulb,
  Lock,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  User,
} from 'lucide-react'
import type { ComponentType } from 'react'
import importHeroImage from '@/assets/import-hero.webp'
import ImportDropzone from '@/components/ImportDropzone'
import { Button } from '@/components/ui/button'
import { useDemoData } from '@/hooks/useDemoData'

const GUIDE_URL =
  'https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history'

const BADGES: { icon: ComponentType<{ className?: string }>; label: string }[] = [
  { icon: ShieldCheck, label: 'Local-only' },
  { icon: Lock, label: 'Secure' },
  { icon: FileSpreadsheet, label: 'XLSX only' },
  { icon: User, label: 'No account required' },
]

const NOTES: {
  key: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}[] = [
  {
    key: 'sheet',
    icon: Files,
    title: 'All Transactions only',
    description: 'We read the All Transactions sheet only, not the per-currency sheets.',
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
      <section className="overflow-hidden rounded-2xl border border-[#161a24] bg-[#0d1016] p-6 sm:p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1fr]">
          <img
            src={importHeroImage}
            alt=""
            aria-hidden="true"
            className="mx-auto w-full max-w-[440px] lg:mx-0"
          />

          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                Import your <span className="text-primary">Etherfi export</span>
              </h2>
              <p className="mt-1.5 max-w-[46ch] text-sm text-text-dim">
                Everything below is parsed and stored on this device. Nothing is uploaded anywhere.
              </p>
            </div>

            <ul className="flex flex-wrap gap-2">
              {BADGES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-text-dim"
                >
                  <Icon className="size-3.5 text-primary" />
                  {label}
                </li>
              ))}
            </ul>

            <ImportDropzone />

            <div className="flex flex-wrap items-center gap-3 text-sm">
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
              <span aria-hidden="true" className="text-border">
                |
              </span>
              <a
                href={GUIDE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <BookOpen className="size-3.5" />
                How to export from Etherfi
                <ArrowRight className="size-3.5" />
              </a>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Good to know</h2>
          <p className="text-sm text-text-faint">
            A few things to keep in mind when importing your Etherfi export.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NOTES.map(({ key, icon: Icon, title, description }) => (
            <div
              key={key}
              className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-[18px]" />
              </div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs leading-relaxed text-text-faint">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Lightbulb className="size-[18px]" />
          </div>
          <div>
            <p className="text-sm font-semibold">Need help getting your export?</p>
            <p className="max-w-md text-sm text-text-faint">
              We&apos;ve put together a short guide with screenshots to show you exactly how to
              export your transaction history from Etherfi.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href={GUIDE_URL} target="_blank" rel="noreferrer">
            View export guide
            <ArrowRight className="size-3.5" />
          </a>
        </Button>
      </section>
    </div>
  )
}

export default ImportPage
