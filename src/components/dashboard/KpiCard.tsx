import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: ReactNode
  label: string
  value: string
  hint: string
  tone?: 'default' | 'positive'
}

/**
 * The hint (e.g. "across 12 cleared purchases") is the traceability MVP-PLAN's
 * Milestone 2 "every displayed total can be traced to included rows" done-when
 * calls for; shown on hover/focus rather than always visible, to keep the card
 * itself uncluttered.
 */
function KpiCard({ icon, label, value, hint, tone = 'default' }: KpiCardProps) {
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
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
      <div className="pointer-events-none absolute top-full left-4 z-10 mt-2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11.5px] font-medium whitespace-nowrap text-text-dim opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {hint}
      </div>
    </div>
  )
}

export default KpiCard
