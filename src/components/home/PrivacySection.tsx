import {
  CloudOff,
  Database,
  FileSpreadsheet,
  Fingerprint,
  Funnel,
  Laptop,
  UserX,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { GithubLogoIcon } from '@/components/home/BrandIcons'
import { REPO_URL } from '@/lib/links'
import { cn } from '@/lib/utils'

const POINTS = [
  {
    icon: Laptop,
    iconClassName: 'text-positive',
    title: 'Read in your browser',
    description:
      'Your XLSX export is opened by code running on your own device. It never gets uploaded anywhere.',
  },
  {
    icon: Database,
    iconClassName: 'text-primary',
    title: 'Saved on this device',
    description:
      "Your data lives in your browser's own database (IndexedDB). Delete it any time in Settings.",
  },
  {
    icon: Fingerprint,
    iconClassName: 'text-positive',
    title: 'Safe to import again',
    description:
      "Each transaction is recognized by its own details (time, card, merchant and amount), so a newer export updates what's there instead of doubling it.",
  },
  {
    icon: UserX,
    iconClassName: 'text-primary',
    title: 'No account, no tracking',
    description:
      'No sign-up, no wallet connection and no analytics. There is nothing to log in to.',
  },
]

const EXPORT_ROWS = ['w-full', 'w-4/5', 'w-11/12', 'w-3/5', 'w-5/6']

// Gold is the data going in and coming out, green is the browser doing
// the work in between.
const CONNECTOR_STYLE = {
  in: {
    line: 'from-primary/50 to-positive/50',
    dot: { '--dot-from': 'var(--color-primary)', '--dot-to': 'var(--color-positive)' },
  },
  out: {
    line: 'from-positive/50 to-primary/50',
    dot: { '--dot-from': 'var(--color-positive)', '--dot-to': 'var(--color-primary)' },
  },
}

/**
 * A line between two steps of the illustration, with a dot running along
 * it from one to the next, changing color on the way: down on phones,
 * where the steps stack, and across from `sm` up. It stays still, parked
 * halfway, for anyone who has asked their system for reduced motion.
 */
function FlowConnector({ direction, delay }: { direction: 'in' | 'out'; delay: string }) {
  const style = CONNECTOR_STYLE[direction]
  return (
    <span
      className={cn(
        'relative h-8 w-px shrink-0 bg-gradient-to-b sm:h-px sm:w-6 sm:bg-gradient-to-r lg:w-8',
        style.line,
      )}
    >
      <span
        className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-[var(--dot-to)] shadow-[0_0_8px_var(--dot-to)] motion-safe:animate-[flow-down_1.8s_linear_infinite] sm:motion-safe:animate-[flow-across_1.8s_linear_infinite]"
        style={{ ...style.dot, animationDelay: delay } as CSSProperties}
      />
    </span>
  )
}

/**
 * The export going in, "your browser" doing the work, and the results
 * coming out, all inside the device, with nothing uploaded. Built from
 * markup rather than an image so it animates and stays sharp.
 */
function PrivacyFlow() {
  return (
    <div
      role="img"
      aria-label="Your export goes into your browser, on this device, and comes out as spending by category, totals and effective cashback. Nothing is uploaded."
      className="relative flex flex-col items-center rounded-2xl border border-[#161a24] bg-[#090c11] px-5 pt-14 pb-6 sm:flex-row sm:justify-center sm:px-5"
    >
      <span className="absolute top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-[#0d1016] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-text-dim">
        <CloudOff className="size-3.5 text-positive" />
        Nothing uploaded
      </span>

      <div className="flex w-full max-w-[240px] flex-col gap-2 rounded-xl border border-white/10 bg-[#0d1016] p-3 sm:w-32">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
          <FileSpreadsheet className="size-3.5 shrink-0 text-primary" />
          export.xlsx
        </span>
        {EXPORT_ROWS.map((width, index) => (
          <span
            key={width}
            className={`h-1.5 rounded-full bg-white/15 motion-safe:animate-[flow-row_2.4s_ease-in-out_infinite] ${width}`}
            style={{ animationDelay: `${index * 0.3}s` }}
          />
        ))}
      </div>

      <FlowConnector direction="in" delay="0s" />

      <div className="shrink-0 rounded-2xl bg-gradient-to-br from-primary/70 to-positive/70 p-px shadow-[0_0_28px_-8px] shadow-positive/50">
        <div className="flex flex-col items-center gap-1 rounded-[15px] bg-[#0c1411] px-4 py-3 text-center">
          <Funnel className="size-6 text-positive" />
          <span className="text-xs font-semibold">Your browser</span>
          <span className="text-[10.5px] text-text-faint">on this device</span>
        </div>
      </div>

      <FlowConnector direction="out" delay="0.9s" />

      <ul className="flex w-full max-w-[240px] flex-col gap-2 sm:w-36 lg:w-40">
        <li
          className="rounded-xl border border-white/10 bg-[#0d1016] p-2.5 motion-safe:animate-[flow-result_3.6s_ease-in-out_infinite]"
          style={{ animationDelay: '0s' }}
        >
          <span className="block text-[11px] text-text-faint">By category</span>
          <span className="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            <span className="w-[38%] bg-primary" />
            <span className="w-[24%] bg-positive" />
            <span className="w-[18%] bg-text-dim" />
            <span className="flex-1 bg-white/15" />
          </span>
        </li>
        <li
          className="flex items-baseline justify-between gap-2 rounded-xl border border-white/10 bg-[#0d1016] p-2.5 motion-safe:animate-[flow-result_3.6s_ease-in-out_infinite]"
          style={{ animationDelay: '0.4s' }}
        >
          <span className="text-[11px] text-text-faint">Total spent</span>
          <span className="text-xs font-semibold">€452.64</span>
        </li>
        <li
          className="flex items-baseline justify-between gap-2 rounded-xl border border-white/10 bg-[#0d1016] p-2.5 motion-safe:animate-[flow-result_3.6s_ease-in-out_infinite]"
          style={{ animationDelay: '0.8s' }}
        >
          <span className="text-[11px] text-text-faint">Eff. cashback</span>
          <span className="text-xs font-semibold text-positive">2.99%</span>
        </li>
      </ul>
    </div>
  )
}

/**
 * What "100% private" actually means, point by point (#43). Leans green,
 * the page's privacy color, but mixed with gold like every other section.
 */
function PrivacySection() {
  return (
    <section
      aria-labelledby="privacy"
      className="rounded-3xl bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-positive)_35%,transparent),transparent_40%,transparent_60%,color-mix(in_oklab,var(--color-primary)_35%,transparent))] p-px"
    >
      <div className="relative isolate overflow-hidden rounded-[calc(1.5rem-1px)] bg-background bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-positive)_8%,transparent),transparent_50%,color-mix(in_oklab,var(--color-primary)_6%,transparent))] p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-positive/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-16 -z-10 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col items-start gap-3">
            <span className="text-xs font-semibold tracking-wide text-positive uppercase">
              Privacy
            </span>
            <h2 id="privacy" className="font-heading text-2xl font-semibold sm:text-3xl">
              Private by design, <span className="text-brand-gradient">not by promise</span>.
            </h2>
            <p className="max-w-md text-base text-text-dim">
              &quot;100% private&quot; isn&apos;t a setting you have to trust. It&apos;s how
              Web3Spend is built: there&apos;s no server that ever receives your transactions.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-text-dim hover:text-positive"
            >
              <GithubLogoIcon className="size-4" />
              Don&apos;t take our word for it, read the code
            </a>
          </div>
          <PrivacyFlow />
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ icon: Icon, iconClassName, title, description }) => (
            <li
              key={title}
              className="flex flex-col gap-2.5 rounded-2xl border border-white/5 bg-[#0d1016]/80 p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-positive/15 to-primary/10">
                <Icon className={cn('size-5', iconClassName)} />
              </span>
              <h3 className="font-heading text-base font-semibold">{title}</h3>
              <p className="text-sm text-text-dim">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default PrivacySection
