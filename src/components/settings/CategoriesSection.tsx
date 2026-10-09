import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategories } from '@/hooks/useCategories'
import {
  createCategory,
  deleteCategory,
  deleteCategoryRule,
  renameCategory,
} from '@/storage/categories'
import type { CategoryRule, CustomCategory } from '@/types/category'

/**
 * The person's own categories and the rules that fill them. Categories can
 * also be made straight from a transaction's edit form; this is where
 * they're renamed, removed, and where a rule can be taken off again.
 */
function CategoriesSection() {
  const state = useCategories()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function attempt(action: () => Promise<unknown>): Promise<boolean> {
    setError(null)
    try {
      await action()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving that.')
      return false
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (await attempt(() => createCategory(name))) {
      setName('')
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-heading text-sm font-semibold">Your categories</h2>
      <p className="max-w-prose text-sm text-text-faint">
        ether.fi files every purchase under its own merchant category. Make your own here (or from
        the edit button on any transaction), then file purchases under them one at a time or with a
        rule for a whole merchant or ether.fi category. Rules apply to future imports too.
      </p>

      <form onSubmit={handleAdd} className="flex max-w-sm gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New category, e.g. Gaming"
          aria-label="New category name"
          className="h-8"
        />
        <Button type="submit" size="sm" disabled={name.trim() === ''}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {state && state.categories.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60 rounded-xl border border-border">
          {state.categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              rules={state.rules.filter((rule) => rule.categoryId === category.id)}
              attempt={attempt}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function CategoryRow({
  category,
  rules,
  attempt,
}: {
  category: CustomCategory
  rules: CategoryRule[]
  attempt: (action: () => Promise<unknown>) => Promise<boolean>
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(category.name)

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    if (await attempt(() => renameCategory(category.id, draft))) {
      setRenaming(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 p-3">
      {renaming ? (
        <form onSubmit={handleRename} className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={`New name for ${category.name}`}
            className="h-8 max-w-xs"
            autoFocus
          />
          <Button type="submit" size="icon-sm" aria-label="Save name">
            <Check className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Cancel renaming"
            onClick={() => {
              setDraft(category.name)
              setRenaming(false)
            }}
          >
            <X className="size-3.5" />
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Rename ${category.name}`}
            onClick={() => setRenaming(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`Delete ${category.name}`}>
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{category.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Its rules go too, and the purchases filed under it go back to ether.fi's own
                  category. The purchases themselves aren't touched.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => void attempt(() => deleteCategory(category.id))}
                >
                  Delete category
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {rules.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pr-1 pl-2.5 text-xs text-text-dim"
            >
              <span>
                {rule.kind === 'merchant' ? 'Merchant: ' : 'ether.fi category: '}
                <span className="font-medium text-foreground">{rule.label}</span>
              </span>
              <button
                type="button"
                onClick={() => void attempt(() => deleteCategoryRule(rule.id))}
                aria-label={`Stop filing ${rule.label} under ${category.name}`}
                className="flex size-4 items-center justify-center rounded-full text-text-faint hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default CategoriesSection
