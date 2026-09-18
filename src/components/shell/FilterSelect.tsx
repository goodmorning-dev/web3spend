import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
}

function FilterSelect({ ariaLabel, icon, value, options, onChange }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className="bg-secondary text-secondary-foreground">
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
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
