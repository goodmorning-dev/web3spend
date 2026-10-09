import { Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { setCategoryColor } from '@/storage/categories'
import type { CustomCategory } from '@/types/category'
import { CATEGORY_COLOR_CHOICES, preferredCategoryColor } from '@/utils/categoryColors'

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

/**
 * The category's color square, which opens a small palette: the offered
 * colors, any other color through the system color picker, or back to the
 * automatic one.
 */
function CategoryColorPicker({
  category,
  attempt,
}: {
  category: CustomCategory
  attempt: (action: () => Promise<unknown>) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const current = category.color ?? preferredCategoryColor(category.name)
  const isCustomHex = category.color !== undefined && HEX_PATTERN.test(category.color)
  const [customColor, setCustomColor] = useState(isCustomHex ? category.color! : '#f0b429')

  async function choose(color: string | null) {
    if (await attempt(() => setCategoryColor(category.id, color))) {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change the color of ${category.name}`}
          title="Change color"
          className="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="size-3 rounded-[3px]" style={{ backgroundColor: current }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-60 flex-col gap-3 p-3">
        <p className="text-xs font-medium text-text-dim">Color for {category.name}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {CATEGORY_COLOR_CHOICES.map((choice) => {
            const selected = category.color === choice.value
            return (
              <button
                key={choice.value}
                type="button"
                aria-label={choice.label}
                aria-pressed={selected}
                title={choice.label}
                onClick={() => void choose(choice.value)}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md ring-offset-2 ring-offset-secondary transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  selected && 'ring-2 ring-foreground',
                )}
                style={{ backgroundColor: choice.value }}
              >
                {selected && <Check className="size-3.5 text-black/70" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-text-dim">
            <input
              type="color"
              value={customColor}
              onChange={(event) => setCustomColor(event.target.value)}
              aria-label="Custom color"
              className="size-7 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
            />
            Custom
          </label>
          <Button size="sm" variant="outline" onClick={() => void choose(customColor)}>
            Use it
          </Button>
        </div>
        {category.color !== undefined && (
          <Button
            size="sm"
            variant="ghost"
            className="justify-start text-text-faint"
            onClick={() => void choose(null)}
          >
            Back to automatic
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default CategoryColorPicker
