import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { BrandColor } from './brandData'

const COPIED_MS = 1600

/**
 * One color: a swatch, its name, usage and hex. The whole tile is a button
 * that copies the hex, since that's what someone reaching for a brand color
 * wants next. The copy can fail (no clipboard permission, an insecure
 * context), in which case it just doesn't flip to "Copied" and the hex stays
 * readable on screen.
 */
function CopySwatch({ color, compact = false }: { color: BrandColor; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copyHex() {
    try {
      await navigator.clipboard.writeText(color.hex)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <button
      type="button"
      onClick={copyHex}
      aria-label={`Copy ${compact ? 'chart color ' : ''}${color.name}, ${color.hex}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-text-faint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className={cn('block w-full border-b border-border', compact ? 'h-12' : 'h-20')}
        style={{ backgroundColor: color.hex }}
      />
      <span className="flex flex-col gap-0.5 p-3">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{color.name}</span>
          <span
            aria-live="polite"
            className="flex items-center gap-1 text-[11px] font-medium text-text-faint group-hover:text-primary"
          >
            {copied ? (
              <>
                <Check className="size-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3" />
                Copy
              </>
            )}
          </span>
        </span>
        <span className="font-mono text-xs text-text-dim uppercase">{color.hex}</span>
        {!compact && <span className="text-xs text-text-faint">{color.usage}</span>}
      </span>
    </button>
  )
}

export default CopySwatch
