import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const STEPS = [
  {
    title: 'Export from Etherfi',
    description: 'Download your transaction history as an XLSX file from the Etherfi app.',
  },
  {
    title: 'Import it here',
    description: 'Pick the file. It is read and processed entirely in your browser.',
  },
  {
    title: 'See your spending',
    description: 'Browse spending, categories, and recorded cashback by currency.',
  },
]

function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold">Web3Spend</h1>
          <p className="text-lg text-foreground">
            Understand your Etherfi card spending and cashback, without sending your data anywhere.
          </p>
          <p className="text-sm text-muted-foreground">
            Your transaction data is processed and stored only in this browser. Nothing is uploaded
            to a server, and no account is required.
          </p>
        </header>

        <section aria-labelledby="how-it-works" className="flex flex-col gap-4">
          <h2
            id="how-it-works"
            className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
          >
            How it works
          </h2>
          <ol className="flex flex-col gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/app">Import your export</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/app">Try the demo</Link>
          </Button>
        </div>

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
