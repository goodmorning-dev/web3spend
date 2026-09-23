import { ChevronDownIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCoarsePointer } from '@/hooks/useCoarsePointer'
import { cn } from '@/lib/utils'

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  ariaLabel: string
  icon?: ReactNode
  value: string
  options: FilterSelectOption[]
  onChange: (value: string) => void
  /** A fixed min-width (e.g. "min-w-[150px]"), sized to this select's own
   * longest option, so picking a shorter value never shrinks the trigger
   * and reflows whatever sits next to it in the topbar. */
  triggerClassName?: string
}

const TRIGGER_TONE =
  'border-white/15 text-secondary-foreground dark:bg-white/[0.07] dark:hover:bg-white/[0.1]'

/**
 * On a touch screen, a real `<select>` laid invisibly over a copy of the
 * dropdown trigger, so the filter looks the same closed but opens the
 * system's own picker: the wheel on iPhone, the pick list on Android. Those
 * are far easier to use with a finger than a small popup list.
 */
function NativeFilterSelect({
  ariaLabel,
  icon,
  value,
  options,
  onChange,
  triggerClassName,
}: FilterSelectProps) {
  const selected = options.find((option) => option.value === value)

  return (
    <div
      className={cn(
        'relative flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors dark:bg-input/30 dark:hover:bg-input/50 has-[select:focus-visible]:border-ring has-[select:focus-visible]:ring-3 has-[select:focus-visible]:ring-ring/50',
        TRIGGER_TONE,
        triggerClassName,
      )}
    >
      {icon}
      <span aria-hidden="true" className="min-w-0 truncate">
        {selected?.label}
      </span>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none size-4 shrink-0 text-muted-foreground"
      />
      {/* 16px text, even though it's invisible: iOS zooms the whole page
          in on any form control smaller than that when it's tapped. */}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none text-base opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function FilterSelect(props: FilterSelectProps) {
  const isTouch = useCoarsePointer()
  if (isTouch) {
    return <NativeFilterSelect {...props} />
  }

  const { ariaLabel, icon, value, options, onChange, triggerClassName } = props
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(TRIGGER_TONE, '*:data-[slot=select-value]:min-w-0', triggerClassName)}
      >
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default FilterSelect
