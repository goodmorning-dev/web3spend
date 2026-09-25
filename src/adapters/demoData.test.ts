import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectSubscriptions } from '@/analyzers'
import { commitImport } from '@/matching/commitImport'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import type { ParsedTransactionRow } from '@/matching/commitImport'
import { applyDemoCashback, buildDemoRows, DEMO_FILE_HASH, DEMO_PARSER_VERSION } from './demoData'

afterEach(async () => {
  vi.useRealTimers()
  await resetDatabase()
})

async function detectDemoSubscriptions(now: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  await commitImport(buildDemoRows(), {
    fileHash: DEMO_FILE_HASH,
    parserVersion: DEMO_PARSER_VERSION,
    unsupportedCount: 0,
  })
  return detectSubscriptions(await db.transactions.toArray())
}

describe('buildDemoRows', () => {
  // Early and late in a month, since this month's charge is only there once
  // its day has come.
  it.each(['2026-09-02T09:00:00.000Z', '2026-09-28T18:00:00.000Z'])(
    'gives the Subscriptions page every seeded subscription, once each (now: %s)',
    async (now) => {
      const groups = await detectDemoSubscriptions(now)

      expect(groups).toHaveLength(8)
      expect(new Set(groups.map((group) => group.description))).toEqual(
        new Set([
          'Spotify',
          'Netflix',
          'Adobe',
          'iCloud+',
          'YouTube Premium',
          'PureGym',
          'Duolingo',
          'Disney+',
        ]),
      )
    },
  )

  it('includes a subscription that stopped charging a few months ago', async () => {
    const groups = await detectDemoSubscriptions('2026-09-20T12:00:00.000Z')
    const disney = groups.find((group) => group.description === 'Disney+')

    expect(disney?.occurrences.at(-1)?.monthKey).toBe('2026-06')
  })

  it('has Borrow Mode purchases next to Direct Pay ones in each of the last three months', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))

    const modesByMonth = new Map<string, Set<string>>()
    for (const row of buildDemoRows()) {
      const month = row.timestampUtc.slice(0, 7)
      modesByMonth.set(month, (modesByMonth.get(month) ?? new Set()).add(row.spendingMode))
    }

    for (const month of ['2026-07', '2026-08', '2026-09']) {
      expect(modesByMonth.get(month)).toEqual(new Set(['Direct Pay', 'Borrow Mode']))
    }
  })

  it('works out cashback from the monthly tiers rather than a flat rate', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-28T12:00:00.000Z'))

    const rows = buildDemoRows().filter((row) => row.status !== 'CANCELLED')
    const spentByMonth = new Map<string, { spent: number; cashback: number }>()
    for (const row of rows) {
      const month = row.timestampUtc.slice(0, 7)
      const totals = spentByMonth.get(month) ?? { spent: 0, cashback: 0 }
      spentByMonth.set(month, {
        spent: totals.spent + row.amountMinor,
        cashback: totals.cashback + row.cashbackMinor,
      })
    }

    // September goes past €1,000, so it ends up between the two rates...
    const september = spentByMonth.get('2026-09')!
    expect(september.spent).toBeGreaterThan(100_000)
    const septemberRate = september.cashback / september.spent
    expect(septemberRate).toBeLessThan(0.03)
    expect(septemberRate).toBeGreaterThan(0.01)
    // ...while a month of only subscriptions stays under it, at 3%.
    const quietMonth = spentByMonth.get('2026-01')!
    expect(quietMonth.spent).toBeLessThan(100_000)
    expect(quietMonth.cashback / quietMonth.spent).toBeCloseTo(0.03, 2)
  })
})

describe('applyDemoCashback', () => {
  function row(
    timestampUtc: string,
    amountMinor: number,
    status: ParsedTransactionRow['status'] = 'CLEARED',
  ): ParsedTransactionRow {
    return {
      last4: '4821',
      cardHolderKey: 'demo',
      timestampUtc,
      type: 'card_spend',
      description: 'Merchant',
      status,
      amountMinor,
      currency: 'EUR',
      originalAmountMinor: amountMinor,
      originalCurrency: 'EUR',
      cashbackMinor: 0,
      cashbackCurrency: 'EUR',
      categoryRaw: 'Groceries',
      spendingMode: 'Direct Pay',
    }
  }

  it('gives 3% up to €1,000 a month and 1% after, splitting the purchase that crosses it', () => {
    const rows = applyDemoCashback([
      row('2026-09-02T12:00:00.000Z', 60_000),
      row('2026-09-10T12:00:00.000Z', 50_000),
      row('2026-09-20T12:00:00.000Z', 20_000),
      row('2026-10-01T12:00:00.000Z', 10_000),
    ])

    expect(rows.map((result) => result.cashbackMinor)).toEqual([
      1_800, // €600 at 3%
      1_300, // €400 at 3% and €100 at 1%
      200, // €200 at 1%
      300, // a new month starts at 3% again
    ])
  })

  it('counts purchases in date order, whatever order they come in', () => {
    const rows = applyDemoCashback([
      row('2026-09-20T12:00:00.000Z', 20_000),
      row('2026-09-02T12:00:00.000Z', 100_000),
    ])

    expect(rows.map((result) => result.cashbackMinor)).toEqual([200, 3_000])
  })

  it("gives a cancelled purchase nothing, and doesn't count it toward the €1,000", () => {
    const rows = applyDemoCashback([
      row('2026-09-02T12:00:00.000Z', 90_000, 'CANCELLED'),
      row('2026-09-03T12:00:00.000Z', 100_000),
    ])

    expect(rows.map((result) => result.cashbackMinor)).toEqual([0, 3_000])
  })

  it("takes a refund's cashback back at 3%, without moving the month's total", () => {
    const rows = applyDemoCashback([
      row('2026-09-02T12:00:00.000Z', 100_000),
      row('2026-09-03T12:00:00.000Z', -8_999),
      row('2026-09-04T12:00:00.000Z', 10_000),
    ])

    expect(rows.map((result) => result.cashbackMinor)).toEqual([3_000, -270, 100])
  })
})
