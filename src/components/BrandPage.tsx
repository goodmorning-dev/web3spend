import { ArrowLeft, Check, Download, ExternalLink, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import logoImage from '@/assets/logo.webp'
import { GithubLogoIcon } from '@/components/home/BrandIcons'
import SiteFooter from '@/components/SiteFooter'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'
import { GOODMORNING_URL, REPO_URL } from '@/lib/links'
import {
  CHART_COLORS,
  COLOR_GROUPS,
  LOGO_DO,
  LOGO_DONT,
  TYPE_SCALE,
  VOICE_EXAMPLES,
  VOICE_RULES,
} from './brand/brandData'
import CopySwatch from './brand/CopySwatch'

const PUBLIC_BASE = import.meta.env.BASE_URL

interface LogoFile {
  name: string
  file: string
  href: string
  description: string
  preview: ReactNode
}

const LOGO_FILES: LogoFile[] = [
  {
    name: 'Mark',
    file: 'web3spend-mark.webp',
    href: logoImage,
    description: 'The W and card, transparent background.',
    preview: <img src={logoImage} alt="" className="size-20 object-contain" />,
  },
  {
    name: 'App icon',
    file: 'pwa-512x512.png',
    href: `${PUBLIC_BASE}pwa-512x512.png`,
    description: '512 px, on the ground color.',
    preview: (
      <img
        src={`${PUBLIC_BASE}pwa-512x512.png`}
        alt=""
        className="size-20 rounded-[22%] border border-border"
      />
    ),
  },
  {
    name: 'Maskable icon',
    file: 'pwa-maskable-512x512.png',
    href: `${PUBLIC_BASE}pwa-maskable-512x512.png`,
    description: 'Extra padding, for Android icon shapes.',
    preview: (
      <img
        src={`${PUBLIC_BASE}pwa-maskable-512x512.png`}
        alt=""
        className="size-20 rounded-full border border-border"
      />
    ),
  },
  {
    name: 'Social preview',
    file: 'og-image.jpg',
    href: `${PUBLIC_BASE}og-image.jpg`,
    description: '1200 by 630, for link previews.',
    preview: (
      <img
        src={`${PUBLIC_BASE}og-image.jpg`}
        alt=""
        className="h-20 w-auto rounded-md border border-border"
      />
    ),
  },
]

function SectionHeading({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 id={id} className="font-heading text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      {children && <p className="max-w-2xl text-sm text-text-dim sm:text-base">{children}</p>}
    </div>
  )
}

const CARD = 'rounded-2xl border border-[#161a24] bg-[#0d1016]'

/**
 * The brand page, at /brand: what Web3Spend looks and sounds like, with the
 * files and values someone writing about it or building on it would need.
 * It shows the product's own tokens as they render (the real fonts, the real
 * colors), so it's a description of the product rather than a second thing
 * to keep in sync; the colors are checked against index.css by a test.
 */
function BrandPage() {
  usePageTitle('Brand')

  // A page to share by link, not one to find: nothing in the app links to it,
  // and this asks search engines to leave it out too. It's removed again on
  // leaving, so the other pages aren't affected.
  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [])

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute top-[100px] left-0 -z-10 hidden size-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl sm:block sm:size-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[900px] right-0 -z-10 hidden size-96 translate-x-1/2 rounded-full bg-accent-2/20 blur-3xl sm:block sm:size-[28rem]"
      />

      <div className="mx-auto flex max-w-4xl flex-col gap-16 px-6 py-8 sm:gap-20 sm:py-10">
        <header className="flex items-center justify-between">
          <Link
            to="/home"
            aria-label="Web3Spend home"
            className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <img src={logoImage} alt="" className="size-8 shrink-0" />
            <span className="font-heading text-base font-semibold">Web3Spend</span>
          </Link>
          <Button asChild variant="secondary" size="sm">
            <Link to="/home">
              <ArrowLeft />
              Back to home
            </Link>
          </Button>
        </header>

        <section aria-labelledby="brand-title" className="flex flex-col gap-5">
          <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">Brand</span>
          <h1
            id="brand-title"
            className="font-heading text-4xl leading-[1.1] font-semibold sm:text-5xl"
          >
            Your crypto card spending,
            <br />
            <span className="text-primary">finally clear.</span>
          </h1>
          <p className="max-w-2xl text-base text-text-dim">
            Web3Spend is dark and quiet, with gold where it matters. A near-black ground, soft cards
            with thin borders, a warm glow at the edges, and one gold accent doing most of the work.
            Indigo shows up now and then. Everything here is the product&apos;s own styling, so what
            you see is what the app uses.
          </p>
          <nav aria-label="On this page" className="flex flex-wrap gap-2 pt-1">
            {[
              ['logo', 'Logo'],
              ['colors', 'Colors'],
              ['typography', 'Typography'],
              ['voice', 'Voice'],
              ['resources', 'Resources'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-text-dim transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {label}
              </a>
            ))}
          </nav>
        </section>

        <section aria-labelledby="logo" className="flex scroll-mt-8 flex-col gap-8">
          <SectionHeading id="logo" title="Logo">
            A W made from a ribbon, with a card chip at its corner. Next to it, the name is set in
            Bricolage Grotesque, semibold.
          </SectionHeading>

          <div className={`${CARD} flex flex-col items-center gap-6 p-8 sm:p-12`}>
            <div className="flex items-center gap-4">
              <img src={logoImage} alt="Web3Spend mark" className="size-20 sm:size-24" />
              <span className="font-heading text-4xl font-semibold sm:text-5xl">Web3Spend</span>
            </div>
            <p className="text-center text-xs text-text-faint">
              Primary lockup: the mark, then the wordmark, on the ground color.
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LOGO_FILES.map((item) => (
              <li key={item.file} className={`${CARD} flex items-center gap-4 p-4`}>
                <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-xl bg-background">
                  {item.preview}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-text-faint">{item.description}</p>
                  <Button asChild variant="outline" size="xs" className="mt-1 self-start">
                    <a href={item.href} download={item.file}>
                      <Download />
                      {item.file}
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`${CARD} flex flex-col gap-3 p-5`}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-positive">
                <Check className="size-4" />
                Do
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-text-dim">
                {LOGO_DO.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <div className={`${CARD} flex flex-col gap-3 p-5`}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <X className="size-4" />
                Don&apos;t
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-text-dim">
                {LOGO_DONT.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="colors" className="flex scroll-mt-8 flex-col gap-8">
          <SectionHeading id="colors" title="Colors">
            Click any color to copy its hex code. These are the product&apos;s own theme values.
          </SectionHeading>

          {COLOR_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <div>
                <h3 className="font-heading text-base font-semibold">{group.title}</h3>
                <p className="text-sm text-text-faint">{group.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.colors.map((color) => (
                  <CopySwatch key={color.cssVar} color={color} />
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3">
            <div>
              <h3 className="font-heading text-base font-semibold">Charts</h3>
              <p className="text-sm text-text-faint">
                Charts and category dots take these in order, so the same category keeps its color
                everywhere.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CHART_COLORS.map((color) => (
                <CopySwatch key={color.cssVar} color={color} compact />
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="typography" className="flex scroll-mt-8 flex-col gap-8">
          <SectionHeading id="typography" title="Typography">
            Two typefaces, both bundled with the app so it looks the same offline.
          </SectionHeading>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`${CARD} flex flex-col gap-3 p-6`}>
              <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">
                Headings
              </span>
              <p className="font-heading text-6xl font-semibold">Aa</p>
              <p className="font-heading text-lg font-semibold">Bricolage Grotesque</p>
              <p className="font-heading text-sm text-text-dim">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
                <br />
                abcdefghijklmnopqrstuvwxyz 0123456789
              </p>
            </div>
            <div className={`${CARD} flex flex-col gap-3 p-6`}>
              <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">
                Everything else
              </span>
              <p className="text-6xl font-semibold">Aa</p>
              <p className="text-lg font-semibold">Hanken Grotesk</p>
              <p className="text-sm text-text-dim">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
                <br />
                abcdefghijklmnopqrstuvwxyz 0123456789
              </p>
            </div>
          </div>

          <div className={`${CARD} flex flex-col divide-y divide-[#161a24]`}>
            {TYPE_SCALE.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-2 p-5 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <div className="flex shrink-0 flex-col sm:w-40">
                  <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">
                    {row.label}
                  </span>
                  <span className="text-[11px] text-text-faint">{row.spec}</span>
                </div>
                <p className={`${row.className} min-w-0`}>{row.sample}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-faint">
            Money and counts use tabular figures, so columns of numbers line up.
          </p>
        </section>

        <section aria-labelledby="voice" className="flex scroll-mt-8 flex-col gap-8">
          <SectionHeading id="voice" title="Voice">
            Web3Spend talks like a careful friend who knows their way around the numbers.
          </SectionHeading>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {VOICE_RULES.map((rule) => (
              <div key={rule.title} className={`${CARD} flex flex-col gap-1.5 p-5`}>
                <h3 className="font-heading text-base font-semibold">{rule.title}</h3>
                <p className="text-sm text-text-dim">{rule.body}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-base font-semibold">In practice</h3>
            <ul className="flex flex-col gap-3">
              {VOICE_EXAMPLES.map((example) => (
                <li key={example.say} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={`${CARD} flex items-start gap-3 p-4`}>
                    <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                    <p className="text-sm">{example.say}</p>
                  </div>
                  <div className={`${CARD} flex items-start gap-3 p-4`}>
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p className="text-sm text-text-faint">{example.notThis}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="resources" className="flex scroll-mt-8 flex-col gap-6">
          <SectionHeading id="resources" title="Resources">
            Web3Spend is an independent, open source project and isn&apos;t affiliated with
            ether.fi. If you&apos;re building on it or writing about it, these are the places to
            start.
          </SectionHeading>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: 'Design tokens',
                detail: 'The theme values in src/index.css',
                href: `${REPO_URL}/blob/main/src/index.css`,
              },
              {
                label: 'Source code',
                detail: 'Everything, on GitHub',
                href: REPO_URL,
              },
              {
                label: 'goodmorning.dev',
                detail: 'The team behind it',
                href: GOODMORNING_URL,
              },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`${CARD} group flex h-full items-center justify-between gap-3 p-4 transition-colors hover:border-text-faint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {item.href === REPO_URL && <GithubLogoIcon className="size-4" />}
                      {item.label}
                    </span>
                    <span className="text-xs text-text-faint">{item.detail}</span>
                  </span>
                  <ExternalLink className="size-4 shrink-0 text-text-faint group-hover:text-primary" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <SiteFooter className="mx-auto max-w-4xl px-6 py-6" />
    </main>
  )
}

export default BrandPage
