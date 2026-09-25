import { cn } from '@/lib/utils'

type StageStatus = 'Live' | 'Next' | 'Later' | 'Exploring'

// Statuses only, no progress bars or dates: a percentage here would be a
// made-up number.
const STAGES: { title: string; status: StageStatus; description: string }[] = [
  {
    title: 'Foundation',
    status: 'Live',
    description:
      'Import your ether.fi export and see spending, categories, cashback and subscriptions. Nothing is uploaded, and it works offline as an installed app.',
  },
  {
    title: 'Borrow Mode insights',
    status: 'Next',
    description:
      'Your Borrow Mode purchases next to your repayments, so you can see what you still owe.',
  },
  {
    title: 'Top-ups and swaps',
    status: 'Later',
    description:
      "See your top-ups, swaps and deposits into ether.fi's Liquid vaults, staking and Frax next to your card spending.",
  },
  {
    title: 'More card providers',
    status: 'Exploring',
    description: 'Other cards than ether.fi, if enough people ask for them.',
  },
]

// The line down to the next stage starts in this stage's color and fades
// out: the second accent from what's live, gold from what's next.
const LINE_STYLE: Record<StageStatus, string> = {
  Live: 'from-accent-2/60',
  Next: 'from-primary/50',
  Later: 'from-white/15',
  Exploring: 'from-white/10',
}

const NUMBER_STYLE: Record<StageStatus, string> = {
  Live: 'border-accent-2/40 bg-accent-2/15 text-accent-2',
  Next: 'border-primary/40 bg-primary/10 text-primary',
  Later: 'border-white/10 bg-[#0d1016] text-primary',
  Exploring: 'border-white/10 bg-[#0d1016] text-primary',
}

const STATUS_STYLE: Record<StageStatus, string> = {
  Live: 'bg-accent-2/15 text-accent-2',
  Next: 'bg-primary/15 text-primary',
  Later: 'border border-white/15 text-text-dim',
  Exploring: 'border border-dashed border-white/20 text-text-faint',
}

/**
 * Where the app is headed: numbered stages on a timeline, each with a
 * status tag. Live gets the second accent, what's next gets gold, and the
 * line between them blends one into the other.
 */
function RoadmapSection() {
  return (
    <section
      aria-labelledby="roadmap"
      className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr] lg:gap-12"
    >
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">Roadmap</span>
        <h2 id="roadmap" className="font-heading text-2xl font-semibold sm:text-3xl">
          Where we&apos;re <span className="text-primary">headed</span>.
        </h2>
        <p className="max-w-sm text-base text-text-dim">
          Live today, with more on the way. Here&apos;s the plan.
        </p>
      </div>

      <ol className="flex flex-col">
        {STAGES.map(({ title, status, description }, index) => {
          const isLast = index === STAGES.length - 1
          return (
            <li key={title} className="relative grid grid-cols-[auto_1fr] gap-4 pb-4 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-10 bottom-0 left-5 w-px -translate-x-1/2 bg-gradient-to-b to-white/10',
                    LINE_STYLE[status],
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative flex size-10 items-center justify-center rounded-full border font-heading text-sm font-semibold',
                  NUMBER_STYLE[status],
                )}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-1.5 rounded-2xl border border-[#161a24] bg-[#0d1016] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-base font-semibold">{title}</h3>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
                      STATUS_STYLE[status],
                    )}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-sm text-text-dim">{description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default RoadmapSection
