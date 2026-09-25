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
    title: 'Make it yours',
    status: 'Next',
    description:
      'Your own categories, backup and moving your data between your devices, and more themes.',
  },
  {
    title: 'Level Up',
    status: 'Later',
    description:
      'Top-ups, swaps and Borrow Mode insights, so you see everything your account does, not just the card purchases.',
  },
  {
    title: 'More card providers',
    status: 'Exploring',
    description: 'Other cards if enough people ask for them.',
  },
]

// The line across to the next stage starts in this stage's color and
// fades out: the second accent from what's live, gold from what's next.
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
 * Where the app is headed: a centered heading over the numbered stages,
 * side by side on wide screens with a line running through the numbers
 * (two by two on tablets, stacked on phones), each with a status tag. Live
 * gets the second accent, what's next gets gold, and the line between them
 * blends one into the other.
 */
function RoadmapSection() {
  return (
    <section aria-labelledby="roadmap" className="flex flex-col items-center gap-10">
      <div className="flex max-w-2xl flex-col items-center gap-2 text-center">
        <span className="text-xs font-semibold tracking-wide text-text-dim uppercase">Roadmap</span>
        <h2 id="roadmap" className="font-heading text-2xl font-semibold sm:text-3xl">
          Where we&apos;re <span className="text-primary">headed</span>.
        </h2>
        <p className="text-base text-text-dim">
          Live today, with more on the way. Here&apos;s the plan.
        </p>
      </div>

      <ol className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map(({ title, status, description }, index) => {
          const isLast = index === STAGES.length - 1
          const number = String(index + 1).padStart(2, '0')
          return (
            <li key={title} className="relative flex flex-col lg:gap-4">
              {/* Runs from this number to the next one, across the gap
                  between columns; only on wide screens, where they sit in
                  one row. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-5 -right-5 left-12 hidden h-px bg-gradient-to-r to-white/10 lg:block',
                    LINE_STYLE[status],
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative hidden size-10 items-center justify-center rounded-full border font-heading text-sm font-semibold lg:flex',
                  NUMBER_STYLE[status],
                )}
              >
                {number}
              </span>
              <div className="flex flex-1 flex-col items-start gap-2 rounded-2xl border border-[#161a24] bg-[#0d1016] p-5">
                <div className="flex items-center gap-2.5">
                  {/* Below wide screens the stages don't sit in one row, so
                      the number moves into the card, next to the status. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full border font-heading text-xs font-semibold lg:hidden',
                      NUMBER_STYLE[status],
                    )}
                  >
                    {number}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
                      STATUS_STYLE[status],
                    )}
                  >
                    {status}
                  </span>
                </div>
                <h3 className="font-heading text-base font-semibold">{title}</h3>
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
