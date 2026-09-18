import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

function FilterSelect({
  ariaLabel,
  icon,
  value,
  options,
  onChange,
  triggerClassName,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn('bg-secondary text-secondary-foreground', triggerClassName)}
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
