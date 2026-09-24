import type { ParsedTransactionRow } from '@/matching/commitImport'
import type { SpendingMode } from '@/types/transaction'

/**
 * MVP-PLAN §5: "Optional demo uses completely synthetic transactions in a
 * separate, disposable dataset." The demo is committed into a database of
 * its own (see src/storage/demoData.ts's `openDemo`), rebuilt from these
 * rows every time it's opened. The fixed fileHash and card holder key also
 * let `removeLegacyDemoData` find demo rows that older versions of the app
 * left in the person's own database.
 */
export const DEMO_FILE_HASH = 'demo-dataset-v1'
export const DEMO_PARSER_VERSION = 'demo-1'
export const DEMO_CARD_HOLDER_KEY = 'demo'

interface DemoSeedRow {
  daysAgo: number
  last4: string
  cardHolderKey: string
  description: string
  categoryRaw: string
  amountMinor: number
  status: ParsedTransactionRow['status']
  /** Defaults to Direct Pay. The bigger purchases (travel, electronics,
   * furniture, clothing, sports gear) use Borrow Mode, as people tend to,
   * spread so each month of the demo has plenty of both. */
  spendingMode?: SpendingMode
}

// Two cards, a handful of merchants per category, spread over the last
// ~10 weeks so the dashboard's current-month view, the previous-month
// comparison, and the activity heatmap all have something to show
// regardless of which real-world date this runs on. Cashback isn't seeded:
// applyDemoCashback works it out from ether.fi's monthly tiers. Recurring
// merchants live in
// SUBSCRIPTION_SEEDS instead: a stray one-off charge from the same merchant
// and amount would make its month look like a double charge, which
// detectSubscriptions deliberately ignores.
const SEEDS: DemoSeedRow[] = [
  {
    daysAgo: 1,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Amazon',
    categoryRaw: 'Miscellaneous and Specialty Retail Stores',
    amountMinor: 8999,
    status: 'CLEARED',
  },
  {
    daysAgo: 2,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 2450,
    status: 'PENDING',
  },
  {
    daysAgo: 3,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Starbucks',
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 1240,
    status: 'CLEARED',
  },
  {
    daysAgo: 4,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'MediaMarkt',
    categoryRaw: '5732 - Electronics Stores',
    amountMinor: 24900,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 5,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 6420,
    status: 'CLEARED',
  },
  {
    daysAgo: 7,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Apple Store',
    categoryRaw: '5732 - Electronics Stores',
    amountMinor: 12900,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 8,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Shell',
    categoryRaw: 'Service Stations',
    amountMinor: 5210,
    status: 'CLEARED',
  },
  {
    daysAgo: 9,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Zara',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 5600,
    status: 'CLEARED',
  },
  {
    daysAgo: 10,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Bolt',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 980,
    status: 'CANCELLED',
  },
  {
    daysAgo: 11,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'IKEA',
    categoryRaw: '5712 - Furniture, Home Furnishings, and Equipment Stores',
    amountMinor: 18950,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 12,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Lidl',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 4115,
    status: 'CLEARED',
  },
  {
    daysAgo: 13,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Steam',
    categoryRaw: 'Digital Goods: Games',
    amountMinor: 1999,
    status: 'CLEARED',
  },
  {
    daysAgo: 14,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: "McDonald's",
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 870,
    status: 'CLEARED',
  },
  {
    daysAgo: 17,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'H&M',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 3240,
    status: 'CLEARED',
  },
  {
    daysAgo: 17,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Airbnb',
    categoryRaw: '7011 - Hotels, Motels, and Resorts',
    amountMinor: 17640,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 18,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber Eats',
    categoryRaw: '5812 - Eating Places and Restaurants',
    amountMinor: 2870,
    status: 'CLEARED',
  },
  {
    daysAgo: 20,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 7230,
    status: 'CLEARED',
  },
  {
    daysAgo: 21,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Booking.com',
    categoryRaw: '4722 - Travel Agencies',
    amountMinor: 18500,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 23,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Amazon',
    categoryRaw: 'Miscellaneous and Specialty Retail Stores',
    amountMinor: -8999,
    status: 'CLEARED',
  },
  {
    daysAgo: 24,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Shell',
    categoryRaw: 'Service Stations',
    amountMinor: 4890,
    status: 'CLEARED',
  },
  {
    daysAgo: 26,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Starbucks',
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 1350,
    status: 'CLEARED',
  },
  {
    daysAgo: 27,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Zara',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 4780,
    status: 'CLEARED',
  },
  {
    daysAgo: 29,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Ryanair',
    categoryRaw: '4511 - Airlines, Air Carriers',
    amountMinor: 16480,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 31,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Lidl',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 3860,
    status: 'CLEARED',
  },
  {
    daysAgo: 33,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Bolt',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 1620,
    status: 'CLEARED',
  },
  {
    daysAgo: 36,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Zalando',
    categoryRaw: "5691 - Men's and Women's Clothing Stores",
    amountMinor: 8995,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 37,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber Eats',
    categoryRaw: '5812 - Eating Places and Restaurants',
    amountMinor: 3320,
    status: 'CLEARED',
  },
  {
    daysAgo: 39,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 5940,
    status: 'CLEARED',
  },
  {
    daysAgo: 41,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'H&M',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 2860,
    status: 'CLEARED',
  },
  {
    daysAgo: 45,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Shell',
    categoryRaw: 'Service Stations',
    amountMinor: 4460,
    status: 'CLEARED',
  },
  {
    daysAgo: 47,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Steam',
    categoryRaw: 'Digital Goods: Games',
    amountMinor: 2999,
    status: 'CLEARED',
  },
  {
    daysAgo: 49,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: "McDonald's",
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 960,
    status: 'CLEARED',
  },
  {
    daysAgo: 51,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Booking.com',
    categoryRaw: '4722 - Travel Agencies',
    amountMinor: 24300,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 52,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Lufthansa',
    categoryRaw: '4511 - Airlines, Air Carriers',
    amountMinor: 15830,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 53,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Zara',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 3990,
    status: 'CLEARED',
  },
  {
    daysAgo: 55,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Lidl',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 4520,
    status: 'CLEARED',
  },
  {
    daysAgo: 57,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Bolt',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 1180,
    status: 'CLEARED',
  },
  {
    daysAgo: 59,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Decathlon',
    categoryRaw: '5941 - Sporting Goods Stores',
    amountMinor: 11990,
    status: 'CLEARED',
    spendingMode: 'Borrow Mode',
  },
  {
    daysAgo: 61,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 6780,
    status: 'CLEARED',
  },
  {
    daysAgo: 63,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber Eats',
    categoryRaw: '5812 - Eating Places and Restaurants',
    amountMinor: 2450,
    status: 'CLEARED',
  },
  {
    daysAgo: 65,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Starbucks',
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 1180,
    status: 'CLEARED',
  },
  {
    daysAgo: 67,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'H&M',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 3410,
    status: 'CLEARED',
  },
]

interface DemoSubscriptionSeed {
  last4: string
  description: string
  categoryRaw: string
  amountMinor: number
  /** Kept at 28 or below so every month, February included, has this day. */
  dayOfMonth: number
  /** How many months before the current one the first charge landed in. */
  firstMonthsAgo: number
  /** 0 while it's still charging; anything higher reads as cancelled that
   * many months ago. */
  lastMonthsAgo: number
}

// Monthly charges pinned to a calendar day rather than "N days ago", since a
// fixed day of the month is exactly the pattern detectSubscriptions looks
// for. A mix of long-running, newly started and cancelled ones so the
// Subscriptions page has each of those states to show. This month's charge
// is skipped while its day hasn't come yet.
const SUBSCRIPTION_SEEDS: DemoSubscriptionSeed[] = [
  {
    last4: '4821',
    description: 'Spotify',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    amountMinor: 1099,
    dayOfMonth: 19,
    firstMonthsAgo: 11,
    lastMonthsAgo: 0,
  },
  {
    last4: '4821',
    description: 'Netflix',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    amountMinor: 1399,
    dayOfMonth: 17,
    firstMonthsAgo: 7,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'Adobe',
    categoryRaw: 'Digital Goods: Software',
    amountMinor: 2299,
    dayOfMonth: 8,
    firstMonthsAgo: 5,
    lastMonthsAgo: 0,
  },
  {
    last4: '4821',
    description: 'iCloud+',
    categoryRaw: 'Digital Goods: Applications (Excludes Games)',
    amountMinor: 299,
    dayOfMonth: 3,
    firstMonthsAgo: 9,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'YouTube Premium',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    amountMinor: 1299,
    dayOfMonth: 11,
    firstMonthsAgo: 4,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'PureGym',
    categoryRaw: '7997 - Membership Clubs (Sports, Recreation, Athletic)',
    amountMinor: 3900,
    dayOfMonth: 1,
    firstMonthsAgo: 6,
    lastMonthsAgo: 0,
  },
  {
    last4: '4821',
    description: 'Duolingo',
    categoryRaw: 'Digital Goods: Applications (Excludes Games)',
    amountMinor: 699,
    dayOfMonth: 24,
    firstMonthsAgo: 2,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'Disney+',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    amountMinor: 899,
    dayOfMonth: 14,
    firstMonthsAgo: 8,
    lastMonthsAgo: 3,
  },
]

/**
 * ether.fi's cashback as the demo models it: 3% on the first €1,000 of card
 * spending in a calendar month (UTC), across both cards, and 1% on
 * everything after that. A purchase that crosses the €1,000 mark earns 3%
 * on the part below it and 1% on the rest. A cancelled purchase earns
 * nothing and doesn't count toward the €1,000. A refund (a negative
 * amount) takes its cashback back at 3%, the rate an ordinary purchase
 * earns, and doesn't move the month's total either.
 */
export const DEMO_CASHBACK = {
  monthlyThresholdMinor: 100_000,
  rateUpToThreshold: 0.03,
  rateAfterThreshold: 0.01,
}

export function applyDemoCashback(rows: ParsedTransactionRow[]): ParsedTransactionRow[] {
  const spentByMonth = new Map<string, number>()
  const cashbackByRow = new Map<ParsedTransactionRow, number>()
  const inOrder = [...rows].sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc))

  for (const row of inOrder) {
    if (row.status === 'CANCELLED') {
      cashbackByRow.set(row, 0)
      continue
    }
    if (row.amountMinor < 0) {
      cashbackByRow.set(row, Math.round(row.amountMinor * DEMO_CASHBACK.rateUpToThreshold))
      continue
    }
    const month = row.timestampUtc.slice(0, 7)
    const spentBefore = spentByMonth.get(month) ?? 0
    const upToThreshold = Math.max(
      0,
      Math.min(row.amountMinor, DEMO_CASHBACK.monthlyThresholdMinor - spentBefore),
    )
    const afterThreshold = row.amountMinor - upToThreshold
    cashbackByRow.set(
      row,
      Math.round(
        upToThreshold * DEMO_CASHBACK.rateUpToThreshold +
          afterThreshold * DEMO_CASHBACK.rateAfterThreshold,
      ),
    )
    spentByMonth.set(month, spentBefore + row.amountMinor)
  }

  return rows.map((row) => ({ ...row, cashbackMinor: cashbackByRow.get(row) ?? 0 }))
}

function toRow(seed: Omit<DemoSeedRow, 'daysAgo'>, timestamp: Date): ParsedTransactionRow {
  const currency = 'EUR'
  return {
    last4: seed.last4,
    cardHolderKey: seed.cardHolderKey,
    timestampUtc: timestamp.toISOString(),
    type: 'card_spend',
    description: seed.description,
    status: seed.status,
    amountMinor: seed.amountMinor,
    currency,
    originalAmountMinor: seed.amountMinor,
    originalCurrency: currency,
    // filled in afterwards by applyDemoCashback, once every row's date is known
    cashbackMinor: 0,
    cashbackCurrency: currency,
    categoryRaw: seed.categoryRaw,
    spendingMode: seed.spendingMode ?? 'Direct Pay',
  }
}

/** Builds fresh rows each call so every one's `timestampUtc` stays relative
 * to "now" rather than baked in at module-load time. `openDemo` empties the
 * demo database before committing them, so opening the demo on a later day
 * moves the dates along instead of adding a second copy. */
export function buildDemoRows(): ParsedTransactionRow[] {
  const now = new Date()

  const oneOffRows = SEEDS.map((seed) => {
    const timestamp = new Date(now)
    timestamp.setUTCDate(timestamp.getUTCDate() - seed.daysAgo)
    timestamp.setUTCHours(12, 0, 0, 0)
    return toRow(seed, timestamp)
  })

  const subscriptionRows = SUBSCRIPTION_SEEDS.flatMap((seed) => {
    const rows: ParsedTransactionRow[] = []
    for (let monthsAgo = seed.firstMonthsAgo; monthsAgo >= seed.lastMonthsAgo; monthsAgo--) {
      const timestamp = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, seed.dayOfMonth, 12),
      )
      if (timestamp <= now) {
        rows.push(
          toRow({ ...seed, cardHolderKey: DEMO_CARD_HOLDER_KEY, status: 'CLEARED' }, timestamp),
        )
      }
    }
    return rows
  })

  return applyDemoCashback([...oneOffRows, ...subscriptionRows])
}
