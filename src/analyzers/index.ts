export { computeYearActivity } from './activity'
export type { DayActivity } from './activity'
export { aggregateByCategory } from './categories'
export type { CategoryBucket } from './categories'
export {
  hasCompatibleCashbackCurrency,
  isEligiblePurchase,
  transactionCashbackPct,
} from './eligibility'
export { filterTransactions } from './filters'
export type { DashboardFilters } from './filters'
export { bucketByDay, bucketByMonth } from './periodBuckets'
export type { PeriodBucket } from './periodBuckets'
export { computeSpendTrend } from './spendTrend'
export type { SpendTrendPoint } from './spendTrend'
export { summarizeTransactions } from './summary'
export type { PeriodSummary } from './summary'
