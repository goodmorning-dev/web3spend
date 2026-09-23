# Web3Spend: Technical Plan

Companion to MVP-PLAN.md: that document defines product scope and rules; this one defines
how we build it. Status: Draft for discussion.

## 1. Confirmed decisions

- Stack: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts.
- License: PolyForm Noncommercial 1.0.0 (source-available, no commercial use).
- Repo: github.com/goodmorning-dev/web3spend (new repo; MVP scaffolds directly into it).
- Domain: web3spend.app — confirmed as the working domain after naming/keyword research
  (available on `.app`, no conflicting US trademarks).
- Refund handling: RESOLVED. No refund support in the MVP; refund-like rows are flagged and
  excluded from totals the same way pending/cancelled rows are (MVP-PLAN §6).
- Borrow mode: OPEN pending Milestone 0. Sample Borrow-mode information is available to check
  whether Borrow rows fit the same normalized transaction shape as Direct Pay. If they do,
  basic Borrow transaction import may land in the MVP; full Borrow analytics (balances,
  interest, collateral, liquidation) stays v2 regardless (MVP-PLAN §2).
- Category taxonomy: RESOLVED. The MVP does not map categories at all: ether.fi's own
  category text is normalized for whitespace/mojibake only and used as-is everywhere (display,
  grouping, filtering). A curated app-level taxonomy and per-transaction overrides are both
  deferred to v2 (section 7, MVP-PLAN §13).

## 2. What we borrow from the reference implementation, and what we do differently

Borrow:
- Adapter pattern: isolate provider-specific parsing behind a `ProviderAdapter` interface
  producing a normalized `StandardTransaction[]`. Only an `etherfi` adapter ships in the MVP,
  but the seam is free and matches the plan's "provider-neutral model + provider adapter"
  requirement (MVP-PLAN §8) if a second provider is ever added in v2.
- Parse-once / cheap-re-derive split: parsing a file into normalized rows is the expensive
  step; filtering and chart aggregation must re-run cheaply off already-stored data without
  re-parsing.
- Static, documented category taxonomy — as a v2 idea to borrow, not MVP scope. The MVP shows
  ether.fi's raw category text as-is; building a curated taxonomy and making it user-overridable
  (surfaced separately from provider-supplied categories so re-imports never clobber a
  correction) are both deferred to v2, per MVP-PLAN §5/§13.
- Visible in-UI privacy messaging (not just a docs claim): a persistent banner stating data
  never leaves the browser.

Do differently (the reference implementation's biggest gaps for our use case):
- Persistence: the reference implementation keeps transactions in React state only; reload =
  data gone. We need real IndexedDB persistence from Milestone 1, per MVP-PLAN's core promise.
- Merge/dedup on re-import: the reference implementation has none (a new file fully replaces
  state). We upsert by a composite identity instead (section 6), simpler than a full matching
  engine but still something it doesn't do at all.
- Tests: the reference implementation has zero. Given financial-correctness stakes, the
  parsing/matching/aggregation modules get unit tests from the start (section 10).

## 3. Repo & tooling setup

- Scaffold: `npm create vite@latest web3spend -- --template react-ts`.
- Styling: Tailwind CSS 4 + shadcn/ui (`components.json`, copied primitives under
  `src/components/ui/`), same setup as the reference implementation.
- Charts: Recharts, wrapped through a local `ChartContainer`/`ChartTooltip` helper (copy the
  shadcn chart wrapper pattern the reference implementation uses) rather than raw Recharts
  imports everywhere.
- IndexedDB wrapper: **Dexie.js** (MIT). Reasons: schema versioning/migrations built in
  (MVP-PLAN §8 explicitly requires validating DB migrations), a real query API instead of
  raw `IDBObjectStore` cursors, small footprint, huge adoption.
- XLSX parsing: **SheetJS (`xlsx`)**, Apache-2.0. Reasons: handles the messy real-world shape
  we observed (summary rows before the real header, header row not on row 1, mixed types)
  via direct cell access; de facto standard for in-browser XLSX parsing.
- Lint/format: ESLint 9 flat config + `eslint-plugin-react-hooks` + `eslint-config-prettier`,
  Prettier, same setup as the reference implementation. TypeScript `strict: true`.
- Tests: Vitest + React Testing Library (the reference implementation has none of this; see
  section 10).
- PWA: `vite-plugin-pwa` (Workbox under the hood) for manifest + service worker + asset
  precaching.
- Package manager: npm (no strong reason to diverge from Vite's default).

### Folder structure

```
src/
  adapters/          ProviderAdapter interface + etherfi.ts (only provider for MVP)
  parsing/           XLSX sheet/header detection, row validation, normalization
  matching/          identity-key computation, upsert logic
  storage/           Dexie schema + typed repositories (cards, transactions, imports, settings)
  analyzers/         pure aggregation functions (by month/year/category/currency/card)
  components/        feature UI (Home, ImportFlow, Dashboard, TransactionsTable, Settings)
  components/ui/     shadcn primitives
  hooks/             thin React glue over storage + analyzers
  types/             StandardTransaction, Card, ImportRecord, Settings (CategoryOverride is v2)
  utils/             money (minor-units helpers), dates (UTC helpers), text normalization
```

A `categorization/` module (the app-category table and its lookup) is added in v2 once the
taxonomy ships; there's nothing for it to do in v1 (section 7).

## 4. Data model (Dexie schema v1)

```ts
interface Card {
  id: string                 // local uuid
  last4: string
  cardHolderKey: string      // normalized cardholder name, part of default card identity
  label: string              // user-editable, defaults to "Card ••••<last4>"
}

interface StandardTransaction {
  id: string                 // local uuid, stable across re-imports
  cardId: string
  timestampUtc: string       // ISO 8601, source is already UTC-labeled text
  type: 'card_spend'         // widen if other types appear in real data
  description: string        // raw, as imported
  status: 'CLEARED' | 'PENDING' | 'CANCELLED' | 'UNKNOWN'
  amountMinor: number        // integer minor units (cents), see section 8
  currency: string           // ISO 4217
  originalAmountMinor: number
  originalCurrency: string
  cashbackMinor: number
  cashbackCurrency: string
  categoryRaw: string        // as imported, whitespace/mojibake-normalized, MCC prefix
                             // retained; used directly as the category everywhere in the MVP
                             // (no taxonomy mapping — section 7)
  spendingMode: 'Direct Pay' // widen if Milestone 0 confirms Borrow-mode rows fit this shape
  identityKey: string        // cardId+timestampUtc+normalizedDescription+amountMinor+currency, used
                             // as the composite identity for upsert on re-import (section 6)
  importId: string           // provenance: which import last touched this row
}

// v2, not part of the v1 schema; see MVP-PLAN §5/§13.
interface CategoryOverride {
  transactionId: string      // PK
  category: string           // user-chosen app-level category
}

interface ImportRecord {
  id: string
  fileHash: string
  importedAt: string
  parserVersion: string
  rowCounts: { added: number; updated: number; unsupported: number }
}

interface Settings {
  key: string                // PK, e.g. "preferences"
  currency?: string
  periodFilter?: string
  cardFilter?: string
  schemaVersion: number
}
```

Dexie stores/indexes:
```ts
db.version(1).stores({
  cards: 'id, last4, cardHolderKey',
  transactions: 'id, cardId, identityKey, importId, [cardId+timestampUtc], [currency+timestampUtc]',
  imports: 'id, fileHash, importedAt',
  settings: 'key'
})
// categoryOverrides is added in a v2 migration once overrides ship; not in v1.
```

## 5. Import pipeline (step by step)

1. **Read file**: SheetJS reads the workbook client-side; nothing leaves the browser.
2. **Sheet selection**: read only the `All Transactions` sheet by exact name match (never
   concatenate the currency-specific sheets, per MVP-PLAN §5). If that sheet name isn't
   found, or multiple plausible transaction tables exist, stop and show an explicit error;
   never guess.
3. **Header detection**: scan the first N rows (e.g. first 15) for a row whose cells match
   the expected column name set (`timestamp, type, description, status, amount, currency,
   card, card holder name, original amount, original currency, cashback earned, cashback
   currency, category, spending mode`), matched by name, not a hardcoded row index; the
   sample has a summary block above the header row, which is exactly why this must not be a
   fixed row index.
4. **Row parsing & validation**: per row, parse/validate types (dates, numeric amounts,
   currency codes, enum fields); unknown `type`, `status`, or `spending mode` values are
   collected as "unsupported rows," never silently coerced into a known bucket.
5. **Normalization**: trim/collapse whitespace and strip non-breaking-space / mojibake
   artifacts from `category` (the MCC prefix, if present, is left in place — no mapping step
   consumes it in the MVP; see section 7); convert amounts to integer minor units; parse
   timestamp to ISO UTC.
6. **Identity + upsert**: compute `identityKey` (hash of `cardId + timestampUtc +
   normalizedDescription + amountMinor + currency`; see section 6) for each parsed row, then
   upsert directly against the DB; no separate preview/confirmation stage.
7. **Atomic commit**: apply all adds/updates in one Dexie transaction; on any failure, nothing
   is written (existing data stays intact, per the release checklist). The user lands on the
   Dashboard immediately after; unsupported rows are surfaced as a plain summary, not a full
   add/update/ambiguous breakdown.

## 6. Import identity (simplified for MVP)

No transaction ID exists in the source, but ether.fi's export covers the full transaction
history each time (not incremental deltas), and category overrides (the main reason a merge
needed to avoid clobbering local edits) are deferred to v2 (MVP-PLAN §5/§7). That removes most
of the reason for a full matching engine, so the MVP uses one composite key instead of a
two-hash system:

- **`identityKey`**: hash of `cardId + timestampUtc + normalizedDescription + amountMinor +
  currency`. Deliberately excludes `status` and `cashbackMinor` so that a PENDING → CLEARED
  transition on the same real-world purchase updates the existing row instead of creating a
  duplicate.
- **Why hash five fields, not fewer**: `identityKey` is a *hash*, so its stored/indexed size is
  fixed no matter how many fields feed into it: a 2-field hash and a 5-field hash cost exactly
  the same in IndexedDB storage and in a `where('identityKey').equals(...)` lookup. Field count
  only affects the one-time cost of computing the hash during import, and hashing a
  ~100-character string per row is on the order of microseconds, even across tens of thousands
  of rows, so there is no performance case for trimming it. There is a correctness case for
  keeping it: MVP-PLAN §3 already notes that timestamp uniqueness isn't guaranteed outside the
  sample data, so `cardId + timestampUtc` alone risks silently merging two genuinely different
  purchases that happen to post in the same second, exactly what the release checklist (§12)
  is meant to prevent. `amountMinor` and `normalizedDescription` narrow that collision window to
  "same card, same second, same amount, same merchant" before `currency` narrows it once more,
  at no extra storage or query cost.
- **Upsert**: a parsed row whose `identityKey` matches an existing transaction updates that
  row's mutable fields (`status`, `cashbackMinor`) in place. A row with no match is inserted.
  Nothing already stored is ever deleted by an import: a narrower or older export can't erase
  history, and can't downgrade a CLEARED row back to PENDING either, since the upsert only
  writes what the new row actually reports.
- **Card assignment**: a `Card` record's default identity is `(last4, normalizedCardHolderName)`.
  A row whose `(last4, holder)` doesn't match any existing `Card` creates a new one
  automatically; no ambiguous-match prompt in the MVP for the rare last-four-collision case.
  Card assignments and labels persist across future imports.
- **Known limitation** (documented, not solved): if a user manually restricts the ether.fi
  export's date range instead of exporting full history, the upsert still behaves correctly
  for the rows present, but nothing detects or warns about a narrower-than-expected export.
- **Deferred to v2 if this proves insufficient**: a second full-row fingerprint for
  exact-unchanged detection, multiplicity pairing for same-identity duplicate purchases,
  ambiguous-match resolution UI, and explicit surfacing of contradictory status changes across
  overlapping exports: the richer design originally scoped here.

## 7. Categories: raw in the MVP, taxonomy in v2

ether.fi already supplies a `category` string per row (often `"<MCC> - <description>"`, e.g.
`"5411 - Grocery Stores and Supermarkets"`, sometimes without the MCC prefix, e.g. `"Parking
Lots and Garages"`). The MVP does not map this to an app-defined taxonomy: `categoryRaw`
(whitespace/mojibake normalized only, MCC prefix retained) is used directly, as-is, for
display, grouping, and filtering everywhere in the app. There is no `Uncategorized` bucket in
the MVP either, since nothing is being classified — every row already carries whatever
category string ether.fi assigned it.

Rationale: the sample export (a single cardholder) isn't enough to seed a curated taxonomy
with confidence, and per-transaction override UI — the main reason to have a small, stable
taxonomy in the first place — is already deferred to v2. Shipping a mapping table now would
mean guessing at a design that gets redone once more real exports and the override feature
land together.

Deferred to v2 (MVP-PLAN §13): a small, curated app-level taxonomy (starter sketch:
`Groceries, Restaurants & Dining, Transport, Travel, Shopping, Entertainment & Leisure,
Utilities & Bills, Health & Wellness, Financial Fees & Services, Cash & ATM, Subscriptions &
Software, Education, Uncategorized`), a static mapping table (`categorization/mccCategoryMap.ts`)
from normalized category text to that taxonomy, and per-transaction manual overrides
(`CategoryOverride`, section 4) that take precedence over the table and survive re-imports.

## 8. Money & date handling

- Store all money as **integer minor units** (cents), converted at parse time. Reject (flag
  as unsupported) any amount string with more than 2 fractional digits rather than silently
  rounding: fiat amounts in the sample are always ≤2 decimals, so a 3rd decimal digit
  signals something we don't understand yet.
- All aggregation sums integers; convert to decimal only at display time via
  `Intl.NumberFormat` with the row's own currency; never sum across currencies.
- Timestamps are parsed as explicit UTC (source strings already carry a `UTC` suffix).
  Monthly/yearly grouping defaults to UTC boundaries, labeled as such in the UI (MVP-PLAN §6).

## 9. Visualizations

MVP-PLAN §5 already encodes the right defaults, and they match standard fintech-app practice
(Revolut/Monzo-style spend breakdowns favor ranked horizontal bars over pie charts once you
have more than ~6 categories, because pie slices become unreadable; the plan's "sorted
horizontal bars... pie/donut optional" already reflects this):

- Column chart: total spend per day (month view) / per month (year view).
- Sorted horizontal bar list: spend by category with amount + share, clickable to filter the
  transaction table (same click-to-filter pattern as the reference implementation's category
  chart). Categories are ether.fi's own raw text (section 7), so the list can be longer and
  less tidy than a curated taxonomy; sorting by amount keeps the top spend visible regardless.
- Column/line: accumulated cashback and effective cashback % (`cashback / cleared spend`) per
  period; "unavailable" (not 0%) when the denominator is zero or data is incomplete.
- Activity heatmap (MVP-PLAN §5): a GitHub-contribution-style year grid, one cell per day,
  shaded by that day's cleared spend. Recharts has no built-in calendar-heatmap chart, so this
  is a small custom component: a CSS grid of cells is enough; no need for a dedicated charting
  library just for this one view. Color intensity maps from a per-currency spend scale (e.g.
  quantile buckets over the visible period, not a fixed € threshold, so it stays meaningful
  regardless of a user's typical spend level). Clicking a cell filters the transaction table to
  that day, same pattern as the other charts.
- All charts grouped strictly by currency (no cross-currency totals) and scoped by the global
  period/currency/card filters.
- Built with Recharts wrapped in the shadcn `ChartContainer` pattern (except the heatmap, which
  is custom); every chart has an accessible-labeled companion in the transaction table, not
  chart-only data.

## 10. Testing strategy

The reference implementation ships no tests; given financial-correctness stakes here, unit-test the pure/critical
modules from day one with Vitest:
- `parsing/`: header detection, row validation, normalization edge cases (whitespace,
  mojibake, missing MCC prefix, malformed amounts).
- `matching/`: identity-key stability and upsert correctness, card-assignment heuristic, using
  synthetic fixtures modeling overlapping imports and status transitions (PENDING → CLEARED).
- `analyzers/`: aggregation correctness (decimal-safe sums, UTC period boundaries, effective
  cashback % edge cases).
React Testing Library for the import flow (added/unsupported counts render correctly after a
direct commit; no preview step to test) and the dashboard filters. All fixtures are synthetic;
the real anonymized xlsx is never committed to the repo (MVP-PLAN §9/§12).

## 11. Privacy & PWA

- Bundle everything (fonts, icons, parser, charts): no remote fetches for app assets, no
  third-party analytics script, no merchant logos from a remote CDN.
- **shadcn/ui and remote requests**: shadcn/ui is not a runtime package. `npx shadcn add
  <component>` copies component source (built on Radix UI primitives + Tailwind classes, both
  fully bundled with no runtime network calls) directly into the repo; from that point it's
  just our own code, with nothing left that could phone home from a user's browser. The CLI's
  own template fetch happens on a developer's machine at setup/add time, not in the shipped
  app, so it has no bearing on end-user privacy (the same category as `npm install` reaching
  the npm registry). The one thing worth a standing guardrail: some shadcn example "blocks"
  (not the base components) reference placeholder images or fonts from external URLs for demo
  purposes, so check any newly copied component or block for hardcoded remote URLs before
  merging, per the bundle-everything rule above.
- Persistent, visible in-UI privacy banner (borrowing the reference implementation's info-banner pattern): data never
  leaves the browser.
- Restrictive CSP; imported strings always treated as text, never executable HTML.
- PWA via `vite-plugin-pwa`: manifest, icons, offline-first service worker precaching the app
  shell; verify cold offline launch after first cache, including import and delete-all
  (versioned backup/restore is deferred to v2, MVP-PLAN §5/§13).

## 12. Open items (not settled by this document)

- **Borrow-mode fit**: needs a redacted Borrow-mode export checked against the normalized
  `StandardTransaction` shape during Milestone 0; decides whether basic Borrow import is
  in-scope for the MVP (MVP-PLAN §2).
- **Local data-at-rest protection** (MVP-PLAN §13): not scoped for the MVP. If prioritized
  later, needs a real design pass covering threat model (shared-device glance-access vs. raw
  browser-profile/storage access), lock-screen vs. Web Crypto-based encryption of the
  IndexedDB contents, key derivation and in-memory-only key handling, opt-in default, and the
  no-server-side-recovery trade-off if a user forgets their PIN/passphrase.

## 13. Milestone-to-engineering-task mapping

Ties MVP-PLAN.md's Milestones 0–4 to concrete deliverables from this document:
- **M0** (§ MVP-PLAN 11): resolve the Borrow-mode fit question above; build synthetic fixtures
  matching the observed workbook shape (section 10) for use in all later tests.
- **M1** (sections 3–6): repo scaffold, Dexie schema, parsing pipeline, composite-identity
  upsert, atomic commit; no preview UI.
- **M2** (sections 7–9): raw category display (no taxonomy mapping, no overrides — both v2),
  decimal-safe aggregation, dashboard charts including the activity heatmap, transaction table
  with filters.
- **M3** (section 11): PWA manifest/service worker, delete-all control, storage-quota handling,
  mobile layouts, offline verification. Backup/restore is v2.
- **M4**: license file + README (section 1, 11), deploy, pilot with ether.fi-using coworkers.
