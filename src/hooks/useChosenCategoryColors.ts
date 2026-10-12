import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/storage/db'
import { categoryMergeKey } from '@/utils/category'
import { ownCategoryColors } from '@/utils/categoryColors'
import { useDataSource } from './useDataSource'

const NONE: ReadonlyMap<string, string> = new Map()

/**
 * The color of each of the person's own categories, picked or automatic
 * (see ownCategoryColors), keyed by the category's merge key (what
 * categoryColorMap identifies a category by). Live, so picking a color
 * recolors the dashboard and lists right away.
 */
export function useChosenCategoryColors(): ReadonlyMap<string, string> {
  const source = useDataSource()
  return (
    useLiveQuery(async () => {
      const categories = await db.categories.toArray()
      const colors = ownCategoryColors(categories)
      return new Map(
        categories.map((category) => [
          categoryMergeKey(category.name),
          colors.get(category.id) as string,
        ]),
      )
    }, [source]) ?? NONE
  )
}
