import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/storage/db'
import { categoryMergeKey } from '@/utils/category'
import { useDataSource } from './useDataSource'

const NONE: ReadonlyMap<string, string> = new Map()

/**
 * The colors the person picked for their own categories, keyed by the
 * category's merge key (what categoryColorMap identifies a category by).
 * Live, so picking a color recolors the dashboard and lists right away.
 */
export function useChosenCategoryColors(): ReadonlyMap<string, string> {
  const source = useDataSource()
  return (
    useLiveQuery(async () => {
      const categories = await db.categories.toArray()
      return new Map(
        categories
          .filter((category) => category.color)
          .map((category) => [categoryMergeKey(category.name), category.color as string]),
      )
    }, [source]) ?? NONE
  )
}
