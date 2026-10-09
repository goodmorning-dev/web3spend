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
import { applyCategoryChoice, createCategory } from '@/storage/categories'
import {
  addManualTransaction,
  deleteManualTransaction,
  getTransaction,
  resetTransactionEdits,
  updateTransaction,
  type TransactionChanges,
} from '@/storage/transactions'
import type { Card } from '@/types/card'
import type { SpendingMode, StandardTransaction, TransactionStatus } from '@/types/transaction'
import { categoryMergeKey, displayCategoryLabel } from '@/utils/category'
import {
  formatMoneyInput,
  joinUtcTimestamp,
  parseMoneyInput,
  splitUtcTimestamp,
} from '@/utils/transactionForm'

/** What a manual transaction is filed under until the person picks
 * something: never a guessed category. */
const UNCATEGORIZED = 'Uncategorized'
const NEW_CATEGORY = 'new'
const ORIGINAL = 'original'

const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'CLEARED', label: 'Settled' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const MODE_OPTIONS: { value: SpendingMode; label: string }[] = [
  { value: 'Direct Pay', label: 'Direct Pay' },
  { value: 'Borrow Mode', label: 'Borrow Mode' },
]

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction to edit, or null to add a new one. */
  transactionId: string | null
  cards: Card[]
  currencies: string[]
  /** Preselected for a new transaction: what's being looked at right now. */
  defaultCurrency: string
  defaultCardId?: string
}

/**
 * Adding a transaction by hand, or editing one. The form itself only
 * renders once the stored transaction and the person's categories have
 * loaded, keyed on the transaction, so its fields always start from what's
 * actually saved.
 */
function TransactionDialog({ open, onOpenChange, transactionId, ...rest }: TransactionDialogProps) {
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
  const isEditing = transactionId !== null
  // null while adding; undefined while the transaction is still loading
  const stored = !isEditing ? null : loaded?.id === transactionId ? loaded.transaction : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit transaction' : 'Add a transaction'}</DialogTitle>
          <DialogDescription>
            {!isEditing
              ? "For a purchase your ether.fi export doesn't have yet. Times are in UTC, like everywhere else in the app."
              : stored?.source === 'manual'
                ? 'You added this one yourself, so everything about it can be changed.'
                : "Your changes are kept when you import again. The card, currency and ether.fi's own category come from the import and stay as they are."}
          </DialogDescription>
        </DialogHeader>
        {categories && stored !== undefined && (
          <TransactionForm
            key={transactionId ?? 'new'}
            stored={stored ?? null}
            categories={categories}
            onDone={() => onOpenChange(false)}
            {...rest}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface TransactionFormProps extends Omit<
  TransactionDialogProps,
  'open' | 'onOpenChange' | 'transactionId'
> {
  stored: StandardTransaction | null
  categories: CategoriesState
  onDone: () => void
}

function customValue(categoryId: string): string {
  return `custom:${categoryId}`
}

function rawValue(label: string): string {
  return `raw:${label}`
}

/** Where the category picker starts: the category this transaction counts
 * under right now. */
function initialCategoryValue(stored: StandardTransaction | null, categories: CategoriesState) {
  if (!stored) {
    return rawValue(UNCATEGORIZED)
  }
  const resolved = resolveCategory(stored, categories.lookup)
  if (resolved.categoryId) {
    return customValue(resolved.categoryId)
  }
  return stored.source === 'manual' ? rawValue(displayCategoryLabel(stored.categoryRaw)) : ORIGINAL
}

function TransactionForm({
  stored,
  categories,
  cards,
  currencies,
  defaultCurrency,
  defaultCardId,
  onDone,
}: TransactionFormProps) {
  const isManual = !stored || stored.source === 'manual'
  const now = new Date().toISOString()
  const startedAt = splitUtcTimestamp(stored?.timestampUtc ?? now)

  const [description, setDescription] = useState(stored?.description ?? '')
  const [amount, setAmount] = useState(stored ? formatMoneyInput(stored.amountMinor) : '')
  const [cashback, setCashback] = useState(stored ? formatMoneyInput(stored.cashbackMinor) : '')
  const [date, setDate] = useState(startedAt.date)
  const [time, setTime] = useState(startedAt.time)
  const [status, setStatus] = useState<TransactionStatus>(stored?.status ?? 'CLEARED')
  const [mode, setMode] = useState<SpendingMode>(stored?.spendingMode ?? 'Direct Pay')
  const [cardId, setCardId] = useState(stored?.cardId ?? defaultCardId ?? cards[0]?.id ?? '')
  const [currency, setCurrency] = useState(stored?.currency ?? defaultCurrency)
  const [categoryValue, setCategoryValue] = useState(() => initialCategoryValue(stored, categories))
  const [newCategoryName, setNewCategoryName] = useState('')

  // The rules that already point at the category the form starts on, so
  // their boxes start ticked and unticking one removes it.
  const startingCategoryId = categoryValue.startsWith('custom:')
    ? categoryValue.slice('custom:'.length)
    : null
  const [initialRules] = useState(() => {
    if (!stored || !startingCategoryId) {
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
  const merchantLabel = description.trim() || 'this merchant'

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
    const amountMinor = parseMoneyInput(amount)
    const cashbackMinor = cashback.trim() === '' ? 0 : parseMoneyInput(cashback)
    const timestampUtc = joinUtcTimestamp(date, time)

    if (description.trim() === '') {
      setError("Add the merchant's name.")
      return
    }
    if (amountMinor === null) {
      setError('Enter the amount as a number with up to two decimals, like 12.50.')
      return
    }
    if (cashbackMinor === null) {
      setError('Enter the cashback as a number with up to two decimals, or leave it empty.')
      return
    }
    if (!timestampUtc) {
      setError('Pick a valid date and time.')
      return
    }
    if (isManual && !cardId) {
      setError('Pick the card this was paid with.')
      return
    }
    if (categoryValue === NEW_CATEGORY && newCategoryName.trim() === '') {
      setError('Give the new category a name.')
      return
    }

    void run(async () => {
      let customId: string | null = null
      if (categoryValue === NEW_CATEGORY) {
        customId = (await createCategory(newCategoryName)).id
      } else if (categoryValue.startsWith('custom:')) {
        customId = categoryValue.slice('custom:'.length)
      }
      const rawLabel = categoryValue.startsWith('raw:')
        ? categoryValue.slice('raw:'.length)
        : (stored?.categoryRaw ?? UNCATEGORIZED)

      let id: string
      if (!stored) {
        id = await addManualTransaction({
          cardId,
          timestampUtc,
          description,
          amountMinor,
          currency,
          cashbackMinor,
          status,
          spendingMode: mode,
          categoryRaw: rawLabel,
        })
      } else {
        id = stored.id
        const changes: TransactionChanges = {
          description,
          amountMinor,
          cashbackMinor,
          status,
          spendingMode: mode,
        }
        // Leave the time alone unless it was actually changed: the inputs
        // only show minutes, and the stored time has seconds too.
        const storedAt = splitUtcTimestamp(stored.timestampUtc)
        if (date !== storedAt.date || time !== storedAt.time) {
          changes.timestampUtc = timestampUtc
        }
        if (isManual) {
          Object.assign(changes, { cardId, currency, categoryRaw: rawLabel })
        }
        await updateTransaction(id, changes)
      }

      await applyCategoryChoice(id, {
        selection: customId ? { kind: 'custom', categoryId: customId } : { kind: 'original' },
        alwaysForMerchant: picksCustom && alwaysForMerchant,
        alwaysForEtherfiCategory: picksCustom && !isManual && alwaysForEtherfi,
        hadMerchantRule: initialRules.merchant,
        hadEtherfiCategoryRule: initialRules.etherfi,
        previousDescription: stored?.description ?? description,
      })
    })
  }

  const etherfiLabel = stored ? displayCategoryLabel(stored.categoryRaw) : ''
  const rawOptions = [
    UNCATEGORIZED,
    ...categories.etherfiCategories.filter((label) => label !== UNCATEGORIZED),
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <Field label="Merchant">
        {(id) => (
          <Input
            id={id}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            autoComplete="off"
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Amount${isManual ? '' : ` (${currency})`}`}>
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          )}
        </Field>
        <Field label="Cashback">
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              placeholder="0.00"
              value={cashback}
              onChange={(event) => setCashback(event.target.value)}
            />
          )}
        </Field>
      </div>

      {isManual && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Card">
            {(id) => (
              <NativeSelect id={id} value={cardId} onChange={setCardId}>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    •••• {card.last4}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Currency">
            {(id) => (
              <NativeSelect id={id} value={currency} onChange={setCurrency}>
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          )}
        </Field>
        <Field label="Time (UTC)">
          {(id) => (
            <Input
              id={id}
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          {(id) => (
            <NativeSelect
              id={id}
              value={status}
              onChange={(value) => setStatus(value as TransactionStatus)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {/* Any other status a transaction already has stays selectable,
                  so opening the form and saving never quietly changes it. */}
              {!STATUS_OPTIONS.some((option) => option.value === status) && (
                <option value={status}>{status}</option>
              )}
            </NativeSelect>
          )}
        </Field>
        <Field label="Paid with">
          {(id) => (
            <NativeSelect id={id} value={mode} onChange={(value) => setMode(value as SpendingMode)}>
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>

      <Field label="Category">
        {(id) => (
          <NativeSelect id={id} value={categoryValue} onChange={setCategoryValue}>
            {isManual ? (
              <optgroup label="ether.fi categories">
                {rawOptions.map((label) => (
                  <option key={label} value={rawValue(label)}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option value={ORIGINAL}>{etherfiLabel} (from ether.fi)</option>
            )}
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
            Always use this for <span className="font-medium text-foreground">{merchantLabel}</span>
            , including future imports
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
        {stored?.source === 'manual' &&
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
        {stored?.editedFields && (
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
          {stored ? 'Save changes' : 'Add transaction'}
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
