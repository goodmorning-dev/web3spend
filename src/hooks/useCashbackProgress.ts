import { useLiveQuery } from 'dexie-react-hooks'
import { EUR_USD_REFERENCE } from '@/cashback/eurUsdReference'
import { MEMBERSHIP_LEVELS, type MembershipLevel } from '@/cashback/ladders'
import {
  computeCashbackProgress,
  detectLevel,
  estimateMonthlyCashback,
  type CashbackProgress,
  type LevelDetection,
} from '@/cashback/progress'
import { db } from '@/storage/db'
import { useDataSource } from './useDataSource'
import { useMembershipLevel } from './useMembershipLevel'

export interface CashbackStepsState {
  year: number
  month: number
  /** Whether that's the month going on now, rather than one that's over. */
  isCurrentMonth: boolean
  /** The level picked in Settings or on the dashboard, if any. */
  saved: MembershipLevel | null
  /** Which level the month's recorded cashback fits. */
  detection: LevelDetection
  /** The level shown: the one picked, else the one the cashback fits,
   * else the lowest it could be. */
  level: MembershipLevel
  progress: CashbackProgress
  /** Roughly what each level would pay on the month's purchases, for
   * comparing them (see estimateMonthlyCashback). */
  estimates: Record<MembershipLevel, number>
}

/**
 * Where the person stands on ether.fi's cashback steps in a month (the
 * current one when `period` is null), on the ladder for `currency`, across
 * every card, since that's how ether.fi counts. Undefined while loading.
 */
export function useCashbackProgress(
  currency: string,
  period: { year: number; month: number } | null,
): CashbackStepsState | undefined {
  const source = useDataSource()
  const saved = useMembershipLevel()
  const transactions = useLiveQuery(() => db.transactions.toArray(), [source])

  if (saved === undefined || transactions === undefined) {
    return undefined
  }

  const now = new Date()
  const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
  const { year, month } = period ?? current
  const eurUsdRate = EUR_USD_REFERENCE.rate
  const monthOptions = { eurUsdRate, year, month }

  const detection = detectLevel(transactions, monthOptions)
  const level = saved ?? detection.detected ?? detection.possible[0] ?? 'core'
  const estimates = Object.fromEntries(
    MEMBERSHIP_LEVELS.map(({ value }) => [
      value,
      estimateMonthlyCashback(transactions, { ...monthOptions, currency, level: value }),
    ]),
  ) as Record<MembershipLevel, number>

  return {
    year,
    month,
    isCurrentMonth: year === current.year && month === current.month,
    saved,
    detection,
    level,
    // Matching the count to the recorded cashback would only push it
    // somewhere odd on a level the cashback doesn't fit.
    progress: computeCashbackProgress(transactions, {
      ...monthOptions,
      currency,
      level,
      matchCashback: detection.possible.includes(level),
    }),
    estimates,
  }
}
