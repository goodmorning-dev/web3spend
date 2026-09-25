import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  CircleHelp,
  Code2,
  FileDown,
  ShieldCheck,
  Upload,
  WifiOff,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import logoImage from '@/assets/logo.webp'
import step1Image from '@/assets/step01.webp'
import step2Image from '@/assets/step02.webp'
import step3Image from '@/assets/step03.webp'
import xLeftImage from '@/assets/x-left.webp'
import xRightImage from '@/assets/x-right.webp'
import { Button } from '@/components/ui/button'
import { XLogoIcon } from '@/components/home/BrandIcons'
import FaqSection from '@/components/home/FaqSection'
import HeroCard from '@/components/home/HeroCard'
import RoadmapSection from '@/components/home/RoadmapSection'
import UseAnywhereSection from '@/components/home/UseAnywhereSection'
import SiteFooter from '@/components/SiteFooter'
import { useDemoData } from '@/hooks/useDemoData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { CARD_REQUEST_URL, ETHERFI_EXPORT_GUIDE_URL } from '@/lib/links'

// Gold and the second accent (accent-2) run through the whole page. The
// promises under the hero's buttons use the second accent, so the gold
// buttons stand out on their own.
const PROMISES = [
  {
    icon: ShieldCheck,
    title: '100% private',
    description: 'Stays on your device',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    // Not "after install": that read as if something had to be installed.
    // Once the page has loaded, it keeps working offline, installed or not.
    description: 'Once loaded',
  },
  {
    icon: Code2,
    title: 'Open source',
    description: 'Community driven',
  },
]

const STEPS: {
  icon: ComponentType<{ className?: string }>
  image: string
  tag: string
  title: string
  description: string
}[] = [
  {
    icon: FileDown,
    image: step1Image,
    tag: 'Step 01',
    title: 'Export from ether.fi',
    description: 'Download your transaction history as an XLSX file from the ether.fi app.',
  },
  {
    icon: Upload,
    image: step2Image,
    tag: 'Step 02',
    title: 'Drop it in',
    description: "Import the file. It's read and parsed locally; nothing is uploaded anywhere.",
  },
  {
    icon: BarChart3,
    image: step3Image,
    tag: 'Step 03',
    title: 'See your spending',
    description: 'Get a clear view of spending, categories, and cashback by currency.',
  },
]

function Home() {
  const { loadDemo, isLoading, error } = useDemoData()
  usePageTitle()

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background glows at the page's edges, alternating down the page:
          gold on the left and the second accent on the right, the first two
          high enough to show on a 1080px tall screen without scrolling. */}
      <div
        aria-hidden="true"
        className="absolute top-[140px] left-0 -z-10 hidden size-96 -translate-x-1/2 rounded-full bg-primary/35 blur-3xl sm:block sm:size-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[400px] right-0 -z-10 hidden size-96 translate-x-1/2 rounded-full bg-accent-2/20 blur-3xl sm:block sm:size-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[1050px] left-0 -z-10 hidden size-96 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl sm:block sm:size-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[1550px] right-0 -z-10 hidden size-96 translate-x-1/2 rounded-full bg-accent-2/20 blur-3xl sm:block sm:size-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[2050px] left-0 -z-10 hidden size-96 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl sm:block sm:size-[28rem]"
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-8 sm:gap-20 sm:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoImage} alt="" className="size-8 shrink-0" />
            <span className="font-heading text-base font-semibold">Web3Spend</span>
          </div>
          <Button asChild size="lg">
            <Link to="/app">
              Open App
              <ArrowRight />
            </Link>
          </Button>
        </header>

        <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[520px_1fr] lg:gap-8">
          <div className="flex flex-col items-start gap-5">
            <h1 className="font-heading text-4xl leading-[1.1] font-semibold sm:text-5xl">
              Your crypto card spending, <span className="text-primary">finally clear.</span>
            </h1>
            <p className="max-w-md text-base text-text-dim">
              Import your ether.fi transaction export and get clear insights into your spending and
              cashback, all in your browser.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <Button asChild size="xl">
                <Link to="/app">
                  <Upload />
                  Import your ether.fi export
                </Link>
              </Button>
              <Button size="xl" variant="secondary" onClick={loadDemo} disabled={isLoading}>
                {isLoading ? 'Loading demo…' : 'Try a demo'}
                {!isLoading && <ChevronRight />}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <ul className="mt-3 flex flex-wrap items-start gap-6">
              {PROMISES.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-center gap-2.5">
                  <Icon className="size-7 shrink-0 text-accent-2" />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{title}</span>
                    <span className="text-xs text-text-faint">{description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <HeroCard />
        </section>

        <section aria-labelledby="how-it-works" className="flex flex-col gap-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">
              How it works
            </span>
            <h2 id="how-it-works" className="font-heading text-2xl font-semibold sm:text-3xl">
              From export to insights in <span className="text-primary">3 simple steps</span>.
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, image, tag, title, description }) => (
              <li
                key={title}
                className="relative flex min-h-[210px] flex-col gap-2.5 overflow-hidden rounded-2xl border border-[#161a24] bg-[#0d1016] p-5"
              >
                <img
                  src={image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-y-0 right-0 h-full w-3/4 object-cover object-left opacity-90"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#0d1016] from-45% via-[#0d1016]/95 to-transparent"
                />
                <div className="relative z-10 flex flex-col gap-2.5">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-secondary bg-gradient-to-br from-primary/20 to-primary/5">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide text-foreground/80 uppercase [text-shadow:0_1px_4px_rgb(0_0_0/0.7)]">
                    {tag}
                  </span>
                  <p className="font-heading text-base font-semibold [text-shadow:0_1px_4px_rgb(0_0_0/0.7)]">
                    {title}
                  </p>
                  <p className="max-w-[75%] text-sm text-foreground/80 [text-shadow:0_1px_4px_rgb(0_0_0/0.7)]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm text-text-dim">
            <CircleHelp className="size-4 shrink-0 text-accent-2" />
            <span className="font-semibold text-foreground">How do I export?</span>
            On ether.fi, open Transaction history, choose the dates, and click the download button.
            <a
              href={ETHERFI_EXPORT_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent-2 hover:underline"
            >
              ether.fi&apos;s guide
            </a>
          </p>
        </section>

        <section className="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-2xl border border-[#161a24] bg-[#0d1016] p-6 sm:flex-row sm:justify-between sm:gap-8 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-0 -z-10 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 right-0 -z-10 size-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-2/20 blur-2xl"
          />

          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="relative flex size-20 shrink-0 items-center sm:size-24">
              <img
                src={xLeftImage}
                alt=""
                aria-hidden="true"
                className="absolute left-1/2 w-40 max-w-none -translate-x-1/2 object-contain sm:left-auto sm:right-0 sm:translate-x-2 sm:w-56"
              />
            </div>
            <div className="sm:ml-2">
              <h3 className="font-heading text-lg font-semibold">Want to see your card here?</h3>
              <p className="mt-1 max-w-sm text-sm text-text-dim">
                Web3Spend currently supports ether.fi. Tell us which Web3 card you&apos;d like us to
                support next.
              </p>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center">
            <img
              src={xRightImage}
              alt=""
              aria-hidden="true"
              className="absolute top-1/2 -right-4 hidden w-96 -translate-y-1/2 opacity-80 sm:block"
            />
            <Button
              asChild
              size="xl"
              className="relative z-10 border border-[#1c212c] bg-[#05070a]/80 text-foreground hover:bg-[#0d1016]/80"
            >
              <a href={CARD_REQUEST_URL} target="_blank" rel="noreferrer">
                <XLogoIcon className="size-4" />
                Request a card
              </a>
            </Button>
          </div>
        </section>

        <UseAnywhereSection />

        <RoadmapSection />

        <FaqSection />
      </div>

      <SiteFooter className="mx-auto max-w-6xl px-6 py-6" />
    </main>
  )
}

export default Home
