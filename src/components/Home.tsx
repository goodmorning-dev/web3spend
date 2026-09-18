import { ChevronRight, FileDown, PlayCircle, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PrivacyTicker from '@/components/home/PrivacyTicker'
import VaultAnimation from '@/components/home/VaultAnimation'

const STEPS = [
  {
    icon: FileDown,
    tag: 'Step 01',
    title: 'Export from Etherfi',
    description: 'Download your transaction history as an XLSX file from the Etherfi app.',
  },
  {
    icon: Upload,
    tag: 'Step 02',
    title: 'Import here',
    description: "Drop the file in. It's read and parsed locally; nothing is uploaded anywhere.",
  },
  {
    icon: PlayCircle,
    tag: 'Step 03',
    title: 'See your spending',
    description: 'Spending, categories, and recorded cashback by currency, ready in seconds.',
  },
]

function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-base font-bold text-primary-foreground">
              W
            </div>
            <span className="font-heading text-base font-semibold">Web3Spend</span>
          </div>
          <Link
            to="/app"
            className="flex items-center gap-1 text-sm font-medium text-text-dim hover:text-primary"
          >
            Go to dashboard
            <ChevronRight className="size-3.5" />
          </Link>
        </header>

        <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col items-start gap-3.5">
            <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">
              For Etherfi cardholders
            </span>
            <h1 className="font-heading text-3xl leading-tight font-semibold sm:text-4xl">
              Every purchase tells you something.
              <br />
              <span className="text-primary">Nothing tells anyone else.</span>
            </h1>
            <p className="max-w-lg text-base text-text-dim">
              Import your Etherfi export and see spending, categories, and cashback by currency.
              Everything is read, stored, and calculated on this device, the ledger only ever flows
              one way.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <Button asChild size="lg">
                <Link to="/app">
                  <Upload />
                  Import your export
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/app">
                  <PlayCircle />
                  Try the demo instead
                </Link>
              </Button>
            </div>
          </div>

          <VaultAnimation />
        </section>

        <PrivacyTicker />

        <section aria-labelledby="how-it-works" className="flex flex-col gap-4">
          <h2 className="sr-only" id="how-it-works">
            How it works
          </h2>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-dashed sm:divide-border">
            {STEPS.map(({ icon: Icon, tag, title, description }) => (
              <li key={title} className="flex flex-col gap-2 sm:px-5 sm:first:pl-0 sm:last:pr-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-4" />
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-text-faint uppercase">
                  {tag}
                </span>
                <p className="font-heading text-sm font-semibold">{title}</p>
                <p className="text-sm text-text-faint">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Want a new provider?</CardTitle>
            <CardDescription>
              Web3Spend currently only supports Etherfi. If you use a different web3 card and would
              find this useful, let us know.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" size="sm">
              <a href="https://x.com/goodmorningdevs" target="_blank" rel="noreferrer">
                DM @goodmorningdevs on X
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default Home
