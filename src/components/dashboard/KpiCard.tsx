import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: ReactNode
  label: string
  value: string
  hint: string
  /** An optional always-visible line under the value, for context that's
   * too important to leave to the hover hint. */
  detail?: string
  tone?: 'default' | 'positive'
}

/**
 * The hint (e.g. "across 12 cleared purchases") is the traceability MVP-PLAN's
 * Milestone 2 "every displayed total can be traced to included rows" done-when
 * calls for; shown on hover/focus rather than always visible, to keep the card
 * itself uncluttered.
 */
function KpiCard({ icon, label, value, hint, detail, tone = 'default' }: KpiCardProps) {
  return (
    <div
      tabIndex={0}
      className="group relative flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4"
    >
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          tone === 'positive' ? 'bg-positive/15 text-positive' : 'bg-primary/15 text-primary',
        )}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-text-dim">{label}</span>
        <div className="truncate text-xl font-semibold tabular-nums">{value}</div>
        {detail && <span className="truncate text-xs text-text-faint">{detail}</span>}
      </div>
      {/* max-w wraps a long hint within the card instead of letting an
          unbroken line run past the viewport edge on the rightmost card. */}
      <div className="pointer-events-none absolute top-full left-4 z-10 mt-2 max-w-[calc(100%-2rem)] rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11.5px] font-medium text-text-dim opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {hint}
      </div>
    </div>
  )
}

export default KpiCard
