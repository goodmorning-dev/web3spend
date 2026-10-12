import { useLiveQuery } from 'dexie-react-hooks'
import type { MembershipLevel } from '@/cashback/ladders'
import { EUR_USD_REFERENCE } from '@/cashback/eurUsdReference'
import { computeCashbackProgress, type CashbackProgress } from '@/cashback/progress'
import { db } from '@/storage/db'
import { useDataSource } from './useDataSource'
import { useMembershipLevel } from './useMembershipLevel'

export interface CashbackProgressState {
  level: MembershipLevel | null
  /** null until a level is picked. */
  progress: CashbackProgress | null
  year: number
  month: number
}

/**
 * Where the person stands on this calendar month's cashback steps (see
 * computeCashbackProgress), on the ladder for `currency`. It always looks
 * at the current month and every card, whatever the dashboard's filters
 * show, since that's how ether.fi counts. Undefined while loading.
 */
export function useCashbackProgress(currency: string): CashbackProgressState | undefined {
  const source = useDataSource()
  const level = useMembershipLevel()
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const transactions = useLiveQuery(() => db.transactions.toArray(), [source])

  if (level === undefined || transactions === undefined) {
    return undefined
  }
  return {
    level,
    progress:
      level === null
        ? null
        : computeCashbackProgress(transactions, {
            level,
            currency,
            eurUsdRate: EUR_USD_REFERENCE.rate,
            year,
            month,
          }),
    year,
    month,
  }
}
