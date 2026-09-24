import { useLiveQuery } from 'dexie-react-hooks'
import { getUtcMonth, getUtcYear } from '@/utils/dates'
import { db } from '@/storage/db'
import { useDataSource } from './useDataSource'
import type { Card } from '@/types/card'

export interface AvailablePeriod {
  year: number
  month: number
}

export interface DashboardFilterOptions {
  cards: Card[]
  currencies: string[]
  /** Every (year, month) combination actually present in the data, most recent first. */
  periods: AvailablePeriod[]
}

/**
 * Live so newly imported data (a new currency, card, or month) shows up in
 * the filter dropdowns immediately, without a manual refetch.
 */
export function useDashboardFilterOptions(): DashboardFilterOptions | undefined {
  const source = useDataSource()
  return useLiveQuery(async () => {
    const [cards, transactions] = await Promise.all([db.cards.toArray(), db.transactions.toArray()])

    const currencies = [...new Set(transactions.map((transaction) => transaction.currency))].sort()

    const periodKeys = new Set<string>()
    for (const transaction of transactions) {
      const year = getUtcYear(transaction.timestampUtc)
      const month = getUtcMonth(transaction.timestampUtc)
      periodKeys.add(`${year}-${month}`)
    }
    const periods = [...periodKeys]
      .map((key) => {
        const [year, month] = key.split('-').map(Number)
        return { year, month }
      })
      .sort((a, b) => b.year - a.year || b.month - a.month)

    return { cards, currencies, periods }
  }, [source])
}
