import { Check, ChevronRight, Pencil, Plus, Store, Tag, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
  deleteAllCategories,
  deleteCategory,
  deleteCategoryRule,
  renameCategory,
} from '@/storage/categories'
import type { CategoryRule, CustomCategory } from '@/types/category'
import { categoryMergeKey } from '@/utils/category'
import CategoryColorPicker from './CategoryColorPicker'

type Attempt = (action: () => Promise<unknown>) => Promise<boolean>

/**
 * The person's own categories and the rules that fill them. Categories can
 * also be made straight from a transaction's edit form; this is where
 * they're renamed, removed, and where a rule can be taken off again.
 */
function CategoriesSection() {
  const state = useCategories()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const attempt: Attempt = async (action) => {
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
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-sm font-semibold">Your categories</h2>
          <p className="max-w-prose text-[13px] text-text-faint">
            Group purchases your way. File them one at a time from a transaction&apos;s edit button,
            or with a rule for a whole merchant or ether.fi category. Rules apply to future imports
            too.
          </p>
        </div>
        <form onSubmit={handleAdd} className="flex shrink-0 gap-2 sm:w-72">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New category, e.g. Gaming"
            aria-label="New category name"
          />
          <Button type="submit" size="sm" className="h-8" disabled={name.trim() === ''}>
            <Plus className="size-3.5" />
            Add
          </Button>
        </form>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {state &&
        (state.categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-text-faint">
            No categories yet. Add one above, or pick &ldquo;New category&rdquo; when editing a
            transaction.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {state.categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                count={state.usage.get(category.id) ?? 0}
                rules={state.rules.filter((rule) => rule.categoryId === category.id)}
                attempt={attempt}
              />
            ))}
          </ul>
        ))}

      {state && state.categories.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="self-start text-text-faint hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Delete all categories
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all your categories?</AlertDialogTitle>
              <AlertDialogDescription>
                All {state.categories.length}{' '}
                {state.categories.length === 1 ? 'category' : 'categories'} and their rules go, and
                every purchase goes back to ether.fi&apos;s own category. Your transactions
                themselves aren&apos;t touched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void attempt(() => deleteAllCategories())}
              >
                Delete all categories
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  )
}

function CategoryCard({
  category,
  count,
  rules,
  attempt,
}: {
  category: CustomCategory
  count: number
  rules: CategoryRule[]
  attempt: Attempt
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
    <li className="flex flex-col rounded-xl border border-border bg-background/40">
      <div className="flex items-center gap-2 px-2.5 pt-3 pb-2.5">
        <CategoryColorPicker category={category} attempt={attempt} />
        {renaming ? (
          <form onSubmit={handleRename} className="flex min-w-0 flex-1 items-center gap-1">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label={`New name for ${category.name}`}
              className="h-7"
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
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{category.name}</span>
              {count > 0 ? (
                <Link
                  to={`/app/transactions?category=${encodeURIComponent(categoryMergeKey(category.name))}`}
                  className="inline-flex w-fit items-center gap-0.5 text-[11.5px] text-text-faint hover:text-primary"
                >
                  {count} {count === 1 ? 'purchase' : 'purchases'}
                  <ChevronRight className="size-3" />
                </Link>
              ) : (
                <span className="text-[11.5px] text-text-faint">No purchases yet</span>
              )}
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-text-faint hover:text-foreground"
              aria-label={`Rename ${category.name}`}
              onClick={() => setRenaming(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-text-faint hover:text-destructive"
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &ldquo;{category.name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Its rules go too, and the purchases filed under it go back to ether.fi&apos;s
                    own category. The purchases themselves aren&apos;t touched.
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
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-border/60 px-3.5 py-2.5">
        <span className="text-[10px] font-semibold tracking-[0.06em] text-text-faint uppercase">
          Rules
        </span>
        {rules.length === 0 ? (
          <p className="text-xs text-text-faint">
            None. Purchases only land here when you pick it for them.
          </p>
        ) : (
          <ul className="flex flex-col">
            {rules.map((rule) => {
              const Icon = rule.kind === 'merchant' ? Store : Tag
              return (
                <li key={rule.id} className="group/rule flex items-center gap-2 py-0.5 text-xs">
                  <Icon className="size-3.5 shrink-0 text-text-faint" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-text-faint">
                      {rule.kind === 'merchant' ? 'Merchant' : 'ether.fi category'}
                    </span>{' '}
                    <span className="font-medium text-text-dim">{rule.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void attempt(() => deleteCategoryRule(rule.id))}
                    aria-label={`Stop filing ${rule.label} under ${category.name}`}
                    title="Remove this rule"
                    className="flex size-5 shrink-0 items-center justify-center rounded text-text-faint transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </li>
  )
}

export default CategoriesSection
