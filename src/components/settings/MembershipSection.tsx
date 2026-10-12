import { Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ladderFor, MEMBERSHIP_LEVELS, type MembershipLevel } from '@/cashback/ladders'
import { Button } from '@/components/ui/button'
import { useMembershipLevel } from '@/hooks/useMembershipLevel'
import { ETHERFI_MEMBERSHIP_URL } from '@/lib/links'
import { cn } from '@/lib/utils'
import { setMembershipLevel } from '@/storage/settings'

function wholeDollars(usdMinor: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(usdMinor / 100)
}

/** "3% on the first $2,000 a month ($800 on euro purchases)". */
function levelSummary(level: MembershipLevel): string {
  const usd = ladderFor(level, 'USD')[0].toUsdMinor ?? 0
  const eur = ladderFor(level, 'EUR')[0].toUsdMinor ?? 0
  return `3% on the first ${wholeDollars(usd)} a month (${wholeDollars(eur)} on euro purchases)`
}

/**
 * The person's ether.fi membership level, which the export doesn't
 * include, for the cashback steps on the dashboard. The dashboard links
 * here with #membership, so it scrolls into view when opened that way.
 */
function MembershipSection() {
  const level = useMembershipLevel()
  const [error, setError] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (window.location.hash === '#membership') {
      sectionRef.current?.scrollIntoView({ block: 'start' })
    }
  }, [])

  async function choose(value: MembershipLevel | null) {
    setError(null)
    try {
      await setMembershipLevel(value)
    } catch {
      setError("We couldn't save your level. Try again.")
    }
  }

  return (
    <section
      id="membership"
      ref={sectionRef}
      aria-labelledby="membership-heading"
      className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="membership-heading" className="font-heading text-sm font-semibold">
          Your ether.fi level
        </h2>
        <p className="max-w-prose text-[13px] text-text-faint">
          The export doesn&apos;t say which membership level you&apos;re on, so pick it here. The
          dashboard then shows how much is left at 3% this month. ether.fi&apos;s app shows your
          level.{' '}
          <a
            href={ETHERFI_MEMBERSHIP_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            How levels work
          </a>
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {MEMBERSHIP_LEVELS.map(({ value, label }) => {
          const selected = level === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => void choose(value)}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                selected
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-background/40 hover:border-white/20',
              )}
            >
              <span className={cn('text-sm font-semibold', selected && 'text-primary')}>
                {label}
              </span>
              <span className="text-xs text-text-dim">{levelSummary(value)}</span>
            </button>
          )
        })}
      </div>

      {level && (
        <Button
          variant="destructive"
          size="sm"
          className="self-start"
          onClick={() => void choose(null)}
        >
          <Trash2 className="size-3.5" />
          Clear my level
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}

export default MembershipSection
