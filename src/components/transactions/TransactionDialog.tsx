import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, RotateCcw, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { merchantKey, resolveCategory } from '@/categorization/customCategories'
import { useCategories, type CategoriesState } from '@/hooks/useCategories'
import { cn } from '@/lib/utils'
import { saveTransactionCategory } from '@/storage/saveTransaction'
import {
  deleteManualTransaction,
  getTransaction,
  resetTransactionEdits,
} from '@/storage/transactions'
import type { StandardTransaction } from '@/types/transaction'
import { categoryMergeKey, displayCategoryLabel } from '@/utils/category'
import { formatUtcDate } from '@/utils/dates'
import { formatMoney } from '@/utils/format'

const NEW_CATEGORY = 'new'
const ORIGINAL = 'original'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction whose category is being changed. */
  transactionId: string | null
}

/**
 * Changing the category a transaction counts under. Its amount, cashback,
 * date and status come from the ether.fi export and can't be changed here,
 * so the totals and the cashback figures always match what ether.fi
 * recorded. The form only renders once the stored transaction and the
 * person's categories have loaded, keyed on the transaction, so it always
 * starts from what's actually saved.
 */
function TransactionDialog({ open, onOpenChange, transactionId }: TransactionDialogProps) {
  const categories = useCategories()
  // Tagged with the id it was loaded for: right after switching to another
  // transaction, a live query still returns the previous one's result
  // until the new read finishes, and the form mustn't start from that.
  const loaded = useLiveQuery(
    async () => ({
      id: transactionId,
      transaction: transactionId ? ((await getTransaction(transactionId)) ?? null) : null,
    }),
    [transactionId],
  )
  const stored = transactionId && loaded?.id === transactionId ? loaded.transaction : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change category</DialogTitle>
          <DialogDescription>
            Pick what this purchase counts under. The amount, cashback and date come from your
            ether.fi export and stay as they are, so your totals always match it.
          </DialogDescription>
        </DialogHeader>
        {categories && stored && (
          <CategoryForm
            key={stored.id}
            stored={stored}
            categories={categories}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function customValue(categoryId: string): string {
  return `custom:${categoryId}`
}

/** Where the category picker starts: the category this transaction counts
 * under right now. */
function initialCategoryValue(stored: StandardTransaction, categories: CategoriesState) {
  const resolved = resolveCategory(stored, categories.lookup)
  return resolved.categoryId ? customValue(resolved.categoryId) : ORIGINAL
}

function CategoryForm({
  stored,
  categories,
  onDone,
}: {
  stored: StandardTransaction
  categories: CategoriesState
  onDone: () => void
}) {
  const isManual = stored.source === 'manual'
  const [categoryValue, setCategoryValue] = useState(() => initialCategoryValue(stored, categories))
  const [newCategoryName, setNewCategoryName] = useState('')

  // The rules that already point at the category the form starts on, so
  // their boxes start ticked and unticking one removes it.
  const startingCategoryId = categoryValue.startsWith('custom:')
    ? categoryValue.slice('custom:'.length)
    : null
  const [initialRules] = useState(() => {
    if (!startingCategoryId) {
      return { merchant: false, etherfi: false }
    }
    const merchantRule = categories.lookup.merchantRules.get(merchantKey(stored.description))
    const etherfiRule = categories.lookup.categoryRules.get(categoryMergeKey(stored.categoryRaw))
    return {
      merchant: merchantRule?.categoryId === startingCategoryId,
      etherfi: etherfiRule?.categoryId === startingCategoryId,
    }
  })
  const [alwaysForMerchant, setAlwaysForMerchant] = useState(initialRules.merchant)
  const [alwaysForEtherfi, setAlwaysForEtherfi] = useState(initialRules.etherfi)

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const picksCustom = categoryValue === NEW_CATEGORY || categoryValue.startsWith('custom:')
  const etherfiLabel = displayCategoryLabel(stored.categoryRaw)

  async function run(action: () => Promise<void>) {
    setError(null)
    setSaving(true)
    try {
      await action()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving that.')
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (categoryValue === NEW_CATEGORY && newCategoryName.trim() === '') {
      setError('Give the new category a name.')
      return
    }

    void run(() =>
      saveTransactionCategory(stored.id, {
        selection:
          categoryValue === NEW_CATEGORY
            ? { kind: 'new', name: newCategoryName }
            : categoryValue.startsWith('custom:')
              ? { kind: 'custom', categoryId: categoryValue.slice('custom:'.length) }
              : { kind: 'original' },
        alwaysForMerchant: picksCustom && alwaysForMerchant,
        alwaysForEtherfiCategory: picksCustom && !isManual && alwaysForEtherfi,
        hadMerchantRule: initialRules.merchant,
        hadEtherfiCategoryRule: initialRules.etherfi,
        previousDescription: stored.description,
      }),
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{stored.description}</p>
          <p className="text-xs text-text-faint">{formatUtcDate(stored.timestampUtc)}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {formatMoney(stored.amountMinor, stored.currency)}
        </p>
      </div>

      <Field label="Category">
        {(id) => (
          <NativeSelect id={id} value={categoryValue} onChange={setCategoryValue}>
            <option value={ORIGINAL}>
              {etherfiLabel} {isManual ? '(as entered)' : '(from ether.fi)'}
            </option>
            {categories.categories.length > 0 && (
              <optgroup label="Your categories">
                {categories.categories.map((category) => (
                  <option key={category.id} value={customValue(category.id)}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}
            <option value={NEW_CATEGORY}>New category…</option>
          </NativeSelect>
        )}
      </Field>

      {categoryValue === NEW_CATEGORY && (
        <Field label="New category name">
          {(id) => (
            <Input
              id={id}
              value={newCategoryName}
              placeholder="e.g. Gaming"
              onChange={(event) => setNewCategoryName(event.target.value)}
              autoFocus
            />
          )}
        </Field>
      )}

      {picksCustom && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-3">
          <Checkbox checked={alwaysForMerchant} onChange={setAlwaysForMerchant}>
            Always use this for{' '}
            <span className="font-medium text-foreground">{stored.description}</span>, including
            future imports
          </Checkbox>
          {!isManual && (
            <Checkbox checked={alwaysForEtherfi} onChange={setAlwaysForEtherfi}>
              Use this for everything ether.fi files under{' '}
              <span className="font-medium text-foreground">{etherfiLabel}</span>
            </Checkbox>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="mt-1">
        {/* Purchases can't be added by hand or have their amounts changed
            any more, but one added or edited before can still be removed
            or put back to what the export says. */}
        {isManual &&
          (confirmingDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => void run(() => deleteManualTransaction(stored.id))}
              className="sm:mr-auto"
            >
              <Trash2 className="size-3.5" />
              Yes, delete it
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
              className="text-destructive sm:mr-auto"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          ))}
        {stored.editedFields && (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => void run(() => resetTransactionEdits(stored.id))}
            className="sm:mr-auto"
            title="Put back what your ether.fi export says for this purchase"
          >
            <RotateCcw className="size-3.5" />
            Undo my edits
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-dim">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

function NativeSelect({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  // The browser's own arrow sits hard against the edge and can't be moved,
  // so it's hidden and replaced with the same chevron the other dropdowns
  // in the app use.
  return (
    <div className="relative min-w-0">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-8 w-full min-w-0 appearance-none truncate rounded-lg border border-input bg-transparent py-0 pr-8 pl-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
          '[color-scheme:dark] [&_option]:bg-popover [&_option]:text-popover-foreground [&_optgroup]:bg-popover [&_optgroup]:text-text-dim',
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-snug text-text-dim">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>{children}</span>
    </label>
  )
}

export default TransactionDialog
