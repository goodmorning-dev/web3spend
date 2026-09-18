import { Search } from 'lucide-react'
import FilterSelect, { type FilterSelectOption } from '@/components/shell/FilterSelect'
import { Input } from '@/components/ui/input'

interface TransactionsToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  status: string
  statusOptions: FilterSelectOption[]
  onStatusChange: (status: string) => void
  category: string
  categoryOptions: FilterSelectOption[]
  onCategoryChange: (category: string) => void
}

/** Narrows the currently filtered (currency/card/period) transaction set
 * further, by merchant text, status, and Etherfi's raw category. */
function TransactionsToolbar({
  search,
  onSearchChange,
  status,
  statusOptions,
  onStatusChange,
  category,
  categoryOptions,
  onCategoryChange,
}: TransactionsToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-faint" />
        <Input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by merchant"
          aria-label="Search by merchant"
          className="h-9 pl-8"
        />
      </div>
      <FilterSelect
        ariaLabel="Status"
        value={status}
        options={statusOptions}
        onChange={onStatusChange}
      />
      <FilterSelect
        ariaLabel="Category"
        value={category}
        options={categoryOptions}
        onChange={onCategoryChange}
      />
    </div>
  )
}

export default TransactionsToolbar
