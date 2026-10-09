import { categoryMergeKey, displayCategoryLabel } from '@/utils/category'
import {
  buildCategoryLookup,
  merchantKey,
  resolveCategory,
} from '@/categorization/customCategories'
import type { CategoryRule, CustomCategory } from '@/types/category'
import { ORIGINAL_CATEGORY_ID } from '@/types/transaction'
import { isCategoryColor } from '@/utils/categoryColors'
import { db } from './db'

export function listCategories(): Promise<CustomCategory[]> {
  return db.categories.orderBy('name').toArray()
}

export function listCategoryRules(): Promise<CategoryRule[]> {
  return db.categoryRules.toArray()
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

/**
 * Adds a category, or returns the one that already has this name (compared
 * case-insensitively), so typing "Gaming" twice never leaves two of them.
 */
export async function createCategory(name: string): Promise<CustomCategory> {
  const cleaned = normalizeName(name)
  if (cleaned === '') {
    throw new Error('A category needs a name.')
  }
  return db.transaction('rw', db.categories, async () => {
    const existing = (await db.categories.toArray()).find(
      (category) => category.name.toLowerCase() === cleaned.toLowerCase(),
    )
    if (existing) {
      return existing
    }
    const category: CustomCategory = {
      id: crypto.randomUUID(),
      name: cleaned,
      createdAt: new Date().toISOString(),
    }
    await db.categories.put(category)
    return category
  })
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const cleaned = normalizeName(name)
  if (cleaned === '') {
    throw new Error('A category needs a name.')
  }
  await db.transaction('rw', db.categories, async () => {
    const clash = (await db.categories.toArray()).find(
      (category) => category.id !== id && category.name.toLowerCase() === cleaned.toLowerCase(),
    )
    if (clash) {
      throw new Error(`You already have a category called "${clash.name}".`)
    }
    await db.categories.update(id, { name: cleaned })
  })
}

/** Gives a category its own color, or with null, goes back to the
 * automatic one. */
export async function setCategoryColor(id: string, color: string | null): Promise<void> {
  if (color !== null && !isCategoryColor(color)) {
    throw new Error("That isn't a color that can be used.")
  }
  await db.categories
    .where('id')
    .equals(id)
    .modify((category) => {
      if (color === null) {
        delete category.color
      } else {
        category.color = color
      }
    })
}

/**
 * Removes a category along with its rules. Transactions that were filed
 * under it go back to whatever they'd otherwise resolve to; nothing else
 * about them changes.
 */
export async function deleteCategory(id: string): Promise<void> {
  await db.transaction('rw', db.categories, db.categoryRules, db.transactions, async () => {
    await db.categoryRules.where('categoryId').equals(id).delete()
    await db.transactions
      .filter((transaction) => transaction.categoryId === id)
      .modify((transaction) => {
        delete transaction.categoryId
      })
    await db.categories.delete(id)
  })
}

/**
 * Removes every one of the person's categories and rules at once.
 * Transactions go back to ether.fi's own categories; nothing else about
 * them changes.
 */
export async function deleteAllCategories(): Promise<void> {
  await db.transaction('rw', db.categories, db.categoryRules, db.transactions, async () => {
    await db.categories.clear()
    await db.categoryRules.clear()
    await db.transactions
      .filter((transaction) => transaction.categoryId !== undefined)
      .modify((transaction) => {
        delete transaction.categoryId
      })
  })
}

/**
 * Files every purchase from this merchant under a category, or with
 * categoryId null, stops doing so. There's at most one rule per merchant.
 */
export function setMerchantRule(description: string, categoryId: string | null): Promise<void> {
  return setRule('merchant', merchantKey(description), description.trim(), categoryId)
}

/** The same, for everything ether.fi files under one of its categories. */
export function setEtherfiCategoryRule(
  categoryRaw: string,
  categoryId: string | null,
): Promise<void> {
  return setRule(
    'category',
    categoryMergeKey(categoryRaw),
    displayCategoryLabel(categoryRaw),
    categoryId,
  )
}

async function setRule(
  kind: CategoryRule['kind'],
  matchKey: string,
  label: string,
  categoryId: string | null,
): Promise<void> {
  await db.transaction('rw', db.categoryRules, async () => {
    const existing = await db.categoryRules
      .where('[kind+matchKey]')
      .equals([kind, matchKey])
      .first()
    if (categoryId === null) {
      if (existing) {
        await db.categoryRules.delete(existing.id)
      }
      return
    }
    await db.categoryRules.put({
      id: existing?.id ?? crypto.randomUUID(),
      kind,
      matchKey,
      label,
      categoryId,
    })
  })
}

export function deleteCategoryRule(id: string): Promise<void> {
  return db.categoryRules.delete(id)
}

export type CategorySelection = { kind: 'original' } | { kind: 'custom'; categoryId: string }

export interface CategoryChoice {
  selection: CategorySelection
  /** "Always use this for <merchant>": set a merchant rule for the
   * selected custom category. */
  alwaysForMerchant: boolean
  /** "Use this for everything ether.fi files under <category>". */
  alwaysForEtherfiCategory: boolean
  /** The rules that applied when the form opened, so unticking a box
   * removes that rule rather than silently leaving it in place. */
  hadMerchantRule: boolean
  hadEtherfiCategoryRule: boolean
  /** The merchant as it was when the form opened; a merchant rule is
   * keyed on it, and the description may have been edited since. */
  previousDescription: string
}

/**
 * Saves the category part of the edit form, after the transaction's own
 * fields are saved: sets or removes the two kinds of rule, then records a
 * category on the transaction itself only if the rules don't already
 * give it the one that was picked. That keeps a transaction following its
 * rules (so changing a rule later moves it too) unless it was deliberately
 * filed somewhere else.
 */
export async function applyCategoryChoice(
  transactionId: string,
  choice: CategoryChoice,
): Promise<void> {
  await db.transaction('rw', [db.categories, db.categoryRules, db.transactions], async () => {
    const transaction = await db.transactions.get(transactionId)
    if (!transaction) {
      throw new Error('That transaction no longer exists.')
    }
    const customId = choice.selection.kind === 'custom' ? choice.selection.categoryId : null

    if (customId && choice.alwaysForMerchant) {
      await setMerchantRule(transaction.description, customId)
    } else if (choice.hadMerchantRule) {
      await setMerchantRule(choice.previousDescription, null)
    }
    if (customId && choice.alwaysForEtherfiCategory) {
      await setEtherfiCategoryRule(transaction.categoryRaw, customId)
    } else if (choice.hadEtherfiCategoryRule) {
      await setEtherfiCategoryRule(transaction.categoryRaw, null)
    }

    const lookup = buildCategoryLookup(
      await db.categories.toArray(),
      await db.categoryRules.toArray(),
    )
    const byRules = resolveCategory({ ...transaction, categoryId: undefined }, lookup)
    const rulesAgree = customId ? byRules.categoryId === customId : byRules.source === 'original'
    const categoryId = rulesAgree ? undefined : (customId ?? ORIGINAL_CATEGORY_ID)

    if (categoryId === transaction.categoryId) {
      return
    }
    const next = { ...transaction }
    if (categoryId === undefined) {
      delete next.categoryId
    } else {
      next.categoryId = categoryId
    }
    await db.transactions.put(next)
  })
}
