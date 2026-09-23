import type { ParsedTransactionRow } from '@/matching/commitImport'
import type { SpendingMode } from '@/types/transaction'

/**
 * MVP-PLAN §5: "Optional demo uses completely synthetic transactions in a
 * separate, disposable dataset." The fixed fileHash and card holder key
 * below are what make the demo separate and disposable in practice:
 * `useDemoData` refuses to load this dataset once any real import exists,
 * and `ImportFlow` clears it automatically the moment a real import
 * commits, via `src/storage/demoData.ts`'s `hasRealData`/`clearDemoData`.
 * Reusing commitImport's fixed-fileHash short-circuit: loading the demo
 * twice is a no-op the second time, same as re-uploading an unchanged
 * export, and deleting all local data (Settings) clears the demo's import
 * record along with everything else, so a later "Try a demo" click is a
 * normal fresh import again.
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
  cashbackMinor: number
  status: ParsedTransactionRow['status']
  /** Defaults to Direct Pay. A few purchases use Borrow Mode, so the demo
   * shows both. */
  spendingMode?: SpendingMode
}

// Two cards, a handful of merchants per category, spread over the last
// ~10 weeks so the dashboard's current-month view, the previous-month
// comparison, and the activity heatmap all have something to show
// regardless of which real-world date this runs on. Cashback is roughly
// 2.5% of spend, matching the effective-cashback figures used elsewhere in
// this app's own design reference. Recurring merchants live in
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
    cashbackMinor: 225,
    status: 'CLEARED',
  },
  {
    daysAgo: 2,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 2450,
    cashbackMinor: 62,
    status: 'PENDING',
  },
  {
    daysAgo: 3,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Starbucks',
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 1240,
    cashbackMinor: 31,
    status: 'CLEARED',
  },
  {
    daysAgo: 5,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 6420,
    cashbackMinor: 161,
    status: 'CLEARED',
  },
  {
    daysAgo: 8,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Shell',
    categoryRaw: 'Service Stations',
    amountMinor: 5210,
    cashbackMinor: 130,
    status: 'CLEARED',
  },
  {
    daysAgo: 9,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Zara',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 5600,
    cashbackMinor: 140,
    status: 'CLEARED',
  },
  {
    daysAgo: 10,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Bolt',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 980,
    cashbackMinor: 24,
    status: 'CANCELLED',
  },
  {
    daysAgo: 12,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Lidl',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 4115,
    cashbackMinor: 103,
    status: 'CLEARED',
  },
  {
    daysAgo: 13,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Steam',
    categoryRaw: 'Digital Goods: Games',
    amountMinor: 1999,
    cashbackMinor: 50,
    status: 'CLEARED',
  },
  {
    daysAgo: 14,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: "McDonald's",
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 870,
    cashbackMinor: 22,
    status: 'CLEARED',
  },
  {
    daysAgo: 17,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'H&M',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 3240,
    cashbackMinor: 81,
    status: 'CLEARED',
  },
  {
    daysAgo: 18,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber Eats',
    categoryRaw: '5812 - Eating Places and Restaurants',
    amountMinor: 2870,
    cashbackMinor: 72,
    status: 'CLEARED',
  },
  {
    daysAgo: 20,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 7230,
    cashbackMinor: 181,
    status: 'CLEARED',
  },
  {
    daysAgo: 21,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Booking.com',
    categoryRaw: '4722 - Travel Agencies',
    amountMinor: 18500,
    cashbackMinor: 462,
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
    cashbackMinor: 0,
    status: 'CLEARED',
  },
  {
    daysAgo: 24,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Shell',
    categoryRaw: 'Service Stations',
    amountMinor: 4890,
    cashbackMinor: 122,
    status: 'CLEARED',
  },
  {
    daysAgo: 26,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Starbucks',
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 1350,
    cashbackMinor: 34,
    status: 'CLEARED',
  },
  {
    daysAgo: 27,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Zara',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 4780,
    cashbackMinor: 120,
    status: 'CLEARED',
  },
  {
    daysAgo: 31,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Lidl',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 3860,
    cashbackMinor: 97,
    status: 'CLEARED',
  },
  {
    daysAgo: 33,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Bolt',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 1620,
    cashbackMinor: 41,
    status: 'CLEARED',
  },
  {
    daysAgo: 37,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber Eats',
    categoryRaw: '5812 - Eating Places and Restaurants',
    amountMinor: 3320,
    cashbackMinor: 83,
    status: 'CLEARED',
  },
  {
    daysAgo: 39,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 5940,
    cashbackMinor: 149,
    status: 'CLEARED',
  },
  {
    daysAgo: 41,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'H&M',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 2860,
    cashbackMinor: 72,
    status: 'CLEARED',
  },
  {
    daysAgo: 45,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Shell',
    categoryRaw: 'Service Stations',
    amountMinor: 4460,
    cashbackMinor: 112,
    status: 'CLEARED',
  },
  {
    daysAgo: 47,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Steam',
    categoryRaw: 'Digital Goods: Games',
    amountMinor: 2999,
    cashbackMinor: 75,
    status: 'CLEARED',
  },
  {
    daysAgo: 49,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: "McDonald's",
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 960,
    cashbackMinor: 24,
    status: 'CLEARED',
  },
  {
    daysAgo: 51,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Booking.com',
    categoryRaw: '4722 - Travel Agencies',
    amountMinor: 24300,
    cashbackMinor: 608,
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
    cashbackMinor: 100,
    status: 'CLEARED',
  },
  {
    daysAgo: 55,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Lidl',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 4520,
    cashbackMinor: 113,
    status: 'CLEARED',
  },
  {
    daysAgo: 57,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Bolt',
    categoryRaw: '4121 - Taxicabs and Limousines',
    amountMinor: 1180,
    cashbackMinor: 30,
    status: 'CLEARED',
  },
  {
    daysAgo: 61,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Carrefour',
    categoryRaw: '5411 - Grocery Stores and Supermarkets',
    amountMinor: 6780,
    cashbackMinor: 170,
    status: 'CLEARED',
  },
  {
    daysAgo: 63,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Uber Eats',
    categoryRaw: '5812 - Eating Places and Restaurants',
    amountMinor: 2450,
    cashbackMinor: 61,
    status: 'CLEARED',
  },
  {
    daysAgo: 65,
    last4: '4821',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'Starbucks',
    categoryRaw: '5814 - Fast Food Restaurants',
    amountMinor: 1180,
    cashbackMinor: 30,
    status: 'CLEARED',
  },
  {
    daysAgo: 67,
    last4: '1090',
    cardHolderKey: DEMO_CARD_HOLDER_KEY,
    description: 'H&M',
    categoryRaw: '5651 - Family Clothing Stores',
    amountMinor: 3410,
    cashbackMinor: 85,
    status: 'CLEARED',
  },
]

interface DemoSubscriptionSeed {
  last4: string
  description: string
  categoryRaw: string
  amountMinor: number
  cashbackMinor: number
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
    cashbackMinor: 27,
    dayOfMonth: 19,
    firstMonthsAgo: 11,
    lastMonthsAgo: 0,
  },
  {
    last4: '4821',
    description: 'Netflix',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    amountMinor: 1399,
    cashbackMinor: 35,
    dayOfMonth: 17,
    firstMonthsAgo: 7,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'Adobe',
    categoryRaw: 'Digital Goods: Software',
    amountMinor: 2299,
    cashbackMinor: 57,
    dayOfMonth: 8,
    firstMonthsAgo: 5,
    lastMonthsAgo: 0,
  },
  {
    last4: '4821',
    description: 'iCloud+',
    categoryRaw: 'Digital Goods: Applications (Excludes Games)',
    amountMinor: 299,
    cashbackMinor: 7,
    dayOfMonth: 3,
    firstMonthsAgo: 9,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'YouTube Premium',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    amountMinor: 1299,
    cashbackMinor: 32,
    dayOfMonth: 11,
    firstMonthsAgo: 4,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'PureGym',
    categoryRaw: '7997 - Membership Clubs (Sports, Recreation, Athletic)',
    amountMinor: 3900,
    cashbackMinor: 98,
    dayOfMonth: 1,
    firstMonthsAgo: 6,
    lastMonthsAgo: 0,
  },
  {
    last4: '4821',
    description: 'Duolingo',
    categoryRaw: 'Digital Goods: Applications (Excludes Games)',
    amountMinor: 699,
    cashbackMinor: 17,
    dayOfMonth: 24,
    firstMonthsAgo: 2,
    lastMonthsAgo: 0,
  },
  {
    last4: '1090',
    description: 'Disney+',
    categoryRaw: 'Digital Goods: Media, Books, Music',
    amountMinor: 899,
    cashbackMinor: 22,
    dayOfMonth: 14,
    firstMonthsAgo: 8,
    lastMonthsAgo: 3,
  },
]

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
    cashbackMinor: seed.cashbackMinor,
    cashbackCurrency: currency,
    categoryRaw: seed.categoryRaw,
    spendingMode: seed.spendingMode ?? 'Direct Pay',
  }
}

/** Builds fresh rows each call so every one's `timestampUtc` stays relative
 * to "now" rather than baked in at module-load time. A second "Try a demo"
 * click never reaches these rows at all, though: commitImport's fileHash
 * short-circuit (DEMO_FILE_HASH is fixed) returns the original import
 * record immediately, before recomputing anything that a day's drift in
 * "now" could otherwise turn into duplicate rows. */
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

  return [...oneOffRows, ...subscriptionRows]
}
