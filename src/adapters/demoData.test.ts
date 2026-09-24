import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectSubscriptions } from '@/analyzers'
import { commitImport } from '@/matching/commitImport'
import { db } from '@/storage/db'
import { resetDatabase } from '@/storage/test-helpers'
import { buildDemoRows, DEMO_FILE_HASH, DEMO_PARSER_VERSION } from './demoData'

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
})
