# Web3Spend MVP plan

Status: Draft for discussion; implementation has not started.
Updated: 17 September 2026.
Purpose: Validate a useful community tool for Etherfi cardholders. The MVP starts with Etherfi only; additional providers are considered later if there is real interest (see the "want a new provider?" prompt in §5).

## 1. Product promise

Import an Etherfi transaction export to understand spending and recorded cashback. Financial data stays in the browser. After the application is downloaded and cached, its core features work offline.

The MVP succeeds when a small group of cardholders can use it without help, trust its totals, discover useful information, and voluntarily return with another export. Revenue and large traffic numbers are not initial success criteria.

## 2. Agreed direction and proposed defaults

Agreed direction:
- Start with Etherfi and Direct Pay only.
- Process and store financial data locally.
- Show spending, categories, and cashback by currency.
- Merge later imports with existing history.
- Support multiple cards per user, both within one export and across imports.
- Accept original XLSX exports only in the MVP; CSV support is deferred.
- Build a responsive PWA for desktop and phone use, installable where the browser supports it.
- License: PolyForm Noncommercial 1.0.0 — source-available, non-commercial restrictions rather
  than standard open source (see TECHNICAL-PLAN §1).
- Aim for a community project under the goodmorning-dev GitHub organization.
- Validate during Milestone 0 whether Etherfi Borrow-mode transactions fit the same normalized
  structure as Direct Pay; sample Borrow-mode information is available to check against. If
  they fit without special-casing, include basic Borrow transaction import in the MVP. Full
  Borrow analytics (balances, interest, repayments, collateral, liquidation) stays deferred to
  v2 regardless of that outcome (see §13).
- Defer currency conversion and additional card providers beyond Etherfi.

Proposed defaults, awaiting discussion:
- Use a static TypeScript web application with IndexedDB and offline asset caching.
- Default analytics to cleared purchases; show pending separately and exclude cancelled payments.
- Include a transaction table in the MVP. Category correction and backup/restore are deferred
  to v2 (see §5, §13) now that Etherfi's export already covers the full transaction history
  each time, making a full versioned-backup story much less urgent for a first release.
- Use web3spend.app as the confirmed domain (naming/trademark research done).

## 3. What the sample actually tells us

Inspected source: a sample Etherfi transaction history export.

- Multiple sheets: an "All Transactions" sheet plus per-currency sheets that duplicate the
  corresponding rows from the main table.
- Headers are not on row 1 in either sheet; header detection must match by column name, not a
  fixed row index.
- All sample rows are card_spend and Direct Pay.
- Multiple transaction statuses appear in the sample, including cleared, pending, and cancelled.
- The sample is predominantly one currency, with a small number of rows in a second currency.
- Cashback currency matches spending currency on every sample row.
- Amount and original amount/currency match throughout this sample.
- Category values mix labels with and without numeric MCC prefixes and include inconsistent whitespace.
- No stable transaction ID column is present.
- All timestamps are unique in this sample, but uniqueness is not guaranteed in other exports.
- No refund examples or cross-currency settlement examples are present.
- Summary export period differs from the span of actual transaction timestamps. Treat export coverage and observed transaction dates as separate concepts.

Observed columns:
 timestamp, type, description, status, amount, currency, card,
 card holder name, original amount, original currency,
 cashback earned, cashback currency, category, spending mode.

## 4. MVP user flow

1. Open the app at `/home` and see a short privacy explanation, an import action, an optional
   fictional demo, and a light-touch "want a new provider?" prompt (DM us on X), regardless of
   whether local data already exists.
2. Move into the app at `/app`: select an Etherfi XLSX file. The browser reads it locally.
3. Detect the transaction table and validate its fields.
4. Parse and commit the import directly; no separate preview/confirmation step (see §7).
   Unsupported rows are reported plainly rather than silently dropped.
5. Land on the dashboard with period, currency, and card selectors (All cards by default).
6. Open a month or category to inspect the underlying transactions.
7. On a later visit, `/home` still opens on the marketing/intro screen; the stored data and latest import date load once the user moves into `/app`.
8. On another import, the full re-exported history is parsed and safely reconciled with local data (see §7).
9. Offer a delete-all-data control in settings. Export/restore backup is deferred to v2; see §5.

No account, wallet connection, remote transaction upload, or financial-data backend is required.

### Routing: `/home` vs `/app`
- `/home` is the marketing/intro route and always renders the same explanation and
  import/demo entry points, independent of local state. It never auto-redirects to the
  dashboard just because data already exists: a user who deliberately navigates to `/home`
  (e.g. to re-read the privacy promise or re-share the link with a coworker) should see it.
- `/app` is the actual application: it shows the Dashboard when local data exists, or the
  import/demo prompt when it doesn't. This is where "returning visitor sees stored data
  immediately" (step 7) applies; that behavior belongs to `/app`, not `/home`.
- No automatic redirect exists between the two routes in either direction: visiting `/home`
  never bounces a returning user to `/app`, and visiting `/app` never bounces a first-time
  user to `/home`. Both URLs are always directly reachable and bookmarkable; moving between
  them is an explicit link/button click, not a redirect.

## 5. Screens and minimum features

### Home (`/home`)
- Always renders the same intro screen, whether or not local data already exists: a
  one-line statement of what the tool does, the local-only privacy promise stated up front,
  and a short "how it works" in three steps (export from Etherfi, import here, see your
  spending) so a coworker arriving from a shared link with no prior context understands the
  flow before doing anything.
- Does not check for or branch on local data; it is a static landing page. The stored-data
  shortcut (per §4 step 7) lives in `/app`, not here.
- Two clear actions from Home: go to the app to import an Etherfi export, or open the
  synthetic demo.
- Alongside those two actions, a separate "Want a new provider?" card with a CTA asking
  visitors to DM [@goodmorningdevs](https://x.com/goodmorningdevs) on X. This adds no
  functionality; it is a low-effort way to gauge interest in supporting other card providers
  before investing in a second adapter, and it lives on Home (not buried in the import screen)
  so it's visible to everyone who opens the app, imported or not.

### Import (`/app`, no data yet)
- Clear local-data explanation and XLSX-only file selection; explain that CSV is not supported in this version.
- Support selecting XLSX files from phone file storage as well as desktop.
- Optional demo uses completely synthetic transactions in a separate, disposable dataset.
- Friendly errors for malformed files, missing columns, and unsupported exports.
- Detect headers by names, not a fixed row number.
- Read All Transactions only; do not concatenate the currency-specific sheets.
- If the expected sheet is absent or multiple candidate tables exist, explain the ambiguity rather than silently guessing.
- No add/update/ambiguous preview screen (see §7): report unsupported rows plainly, then
  commit and go straight to the Dashboard on success.
- Show export coverage only when explicitly available; otherwise report observed transaction dates without implying continuous coverage.

### Dashboard
- Global period, currency, and card controls apply consistently to every summary, chart, and transaction list.
- Default to All cards, combining spending across cards within the selected currency; allow filtering to one card.
- Summary: cleared purchase spend, recorded cashback on those purchases, and effective cashback percentage when valid.
- Separate pending amount and count; cancelled rows remain inspectable but excluded from spending.
- Spending bars: daily totals within a selected month; monthly totals within a selected year.
- Categories: sorted horizontal bars with amounts and shares; a pie/donut is optional.
- Cashback: period totals; defer a cumulative toggle unless it proves useful.
- A GitHub-contribution-style activity calendar: a year grid of small day-cells, one per
  calendar day, shaded by that day's spend: the more spent, the more vibrant/saturated the
  cell. Gives an at-a-glance sense of spending rhythm the way GitHub's graph does for commits.
  Scoped by the same currency/card filters as everything else; clicking a cell filters the
  transaction table to that day.
- Label the selected currency on every monetary view. Never total EUR and USD directly.
- Clicking a chart item filters the transaction table.
- Show latest import date and limitations of the imported coverage.
- Previous-period comparisons are optional and must flag partial or uncertain coverage.

### Transactions
- Search merchant description and filter by status, category, currency, card, and period.
- Show date, merchant, card label/last four digits, amount/currency, category, status, and recorded cashback.
- Show original amount/currency in details when different.
- User category override per transaction is a real feature, deferred to v2, not dropped:
  the MVP shows Etherfi's raw category text as-is (no mapping to an app-level taxonomy — see
  §6), editable in a later version.
- Also deferred (v2), and independent of overrides: bulk merchant rules (one action that
  recategorizes every past and future transaction from a given merchant at once, instead of
  editing rows one by one) and transaction splitting (dividing a single transaction's amount
  across more than one category, e.g. a supermarket run that was part groceries, part
  household goods).

### Local data settings
- Delete all local financial data after confirmation. This is the only data-management
  control in the MVP.
- Explain browser/device scope and the effect of clearing browser data. Installing on a phone
  does not automatically synchronize desktop data.
- Request persistent storage when appropriate; handle refusal and storage errors.
- Versioned backup/export and restore are deferred to v2 (see §13): Etherfi's export already
  covers the full transaction history each time, so re-importing the original file rebuilds
  local data if it's ever cleared. Backup becomes clearly worth building once category
  overrides (also v2) exist and are worth protecting across a cleared browser or a new device.

## 6. Accounting and categorization rules

- Use decimal-safe arithmetic, with precision appropriate to the currency; avoid floating-point summation for money.
- Preserve source timestamps and their explicit UTC timezone. Default monthly grouping to UTC for reproducibility in version 1, labeled in the interface.
- Use CLEARED card_spend rows for the default purchase total.
- PENDING and CANCELLED are excluded from cleared spending and its cashback calculation.
- Unknown types, statuses, or payment modes must be reported. Never silently count them as ordinary spending or assume Direct Pay.
- Normalize category whitespace and mojibake only; retain the original category text as-is (MCC prefix included where present) and use it directly everywhere a category is shown, grouped, or filtered.
- No mapping to a small, curated set of app-level categories in the MVP. That taxonomy, and the "Uncategorized" fallback it implies, are deferred to v2 (see §13).
- Describe cashback as recorded cashback on the selected purchases. The export does not establish when it was claimed or received.
- Effective cashback = sum of recorded cashback / sum of included purchase spend, multiplied by 100, only when currencies and included populations match and data is complete.
- Display unavailable rather than 0% when the denominator is zero or required cashback information is missing/incompatible.
- Compute yearly cashback rates from yearly sums, never by averaging monthly percentages.
- Do not hard-code advertised reward tiers or predict reward entitlement.
- Refunds are out of scope for the MVP (resolved, see §14). Refund-like rows (e.g. a negative
  card_spend amount) are detected and flagged the same way PENDING/CANCELLED rows are (visible
  in the transaction list with a clear label, excluded from cleared-spend and cashback totals),
  rather than silently distorting them or being misread as ordinary spending. Totals are
  labeled as cleared purchases, not complete net expenditure. Full refund/net-spend semantics
  are a v2 decision once a real example is available.

## 7. Import identity and re-import handling (simplified for MVP)

No transaction ID exists in the source, but two things simplify this a lot for v1: Etherfi's
export covers the full transaction history each time (not incremental deltas), and category
overrides (the main reason a merge needed to be careful about not clobbering local edits) are
deferred to v2. The elaborate dual-fingerprint/ambiguous-match design originally scoped here is
no longer needed for the MVP; keep it in mind as a v2 option if real usage proves this
insufficient.

- Composite identity per row: `cardId + timestampUtc + normalizedDescription + amount + currency`.
  This is a reasonable stand-in for a transaction ID given what the sample data shows (all
  timestamps unique per row; see §3), without building a second full-row fingerprint.
- On import: parse the full file, then upsert by that composite identity: an existing match
  gets its mutable fields (status, cashback) refreshed in place; anything without a match is
  added as new. Nothing already stored is ever deleted by an import, so a narrower or older
  export can't erase history, and a later export can't silently downgrade a CLEARED row back
  to PENDING (the upsert only refreshes fields the new row actually reports).
- No preview/confirmation screen (see §4, §5): parse, validate, commit, and land on the
  Dashboard. Unsupported rows are still reported, just not as a full add/update/ambiguous
  breakdown.
- Assign each local transaction its own internal ID and link it to a local card ID; keep
  transactions from different cards distinct, including purchases with otherwise identical
  details.
- Cards are identified by `(last4, normalizedCardHolderName)`. A new combination not seen
  before creates a new card automatically; there's no ambiguous-match UI for the rare last-four
  collision case in the MVP. Card assignments and user labels persist across imports.
- Compute a file-content hash to recognize an exact repeated upload, mainly as a cheap
  short-circuit, not as the thing overlap-safety depends on.
- Known limitation to document, not solve: if a user manually restricts the export's date range
  in Etherfi instead of exporting full history, the upsert still behaves correctly for the rows
  present, but the app has no way to detect or warn about a narrower-than-expected export.
- Keep enough local import provenance (which import last touched a row) to explain changes and
  support debugging, without sending records to the server.
- Deferred to v2 if this proves insufficient: the original identity/row-fingerprint dual-hash
  design, ambiguous-match resolution UI, and explicit surfacing of contradictory status changes
  across overlapping exports.

## 8. Technical shape

Proposed, not a locked dependency list:
- A static TypeScript SPA delivered as a responsive PWA; React and Vite are reasonable defaults if they fit the team's existing practice.
- IndexedDB as the source of local user data, accessed through a small storage layer.
- A maintained browser XLSX parser, selected after dependency/license review and a real-file parsing spike.
- A service worker and locally bundled assets for offline startup and operation.
- A web app manifest, installation icons, and standalone display configuration.
- Phone-friendly layouts and touch controls for imports, charts, transaction details, and local data management.
- Provide installation guidance for supported Android and iPhone browsers; retain full browser use where installation is unavailable.
- A locally bundled chart library; accessible labels and a transaction table accompany charts.
- Separate modules for import parsing, normalization/matching, persistence, calculations, and presentation.
- A small provider-neutral transaction model, with an Etherfi-specific adapter. No generalized plugin framework yet.

Suggested local stores:
- cards: local card ID, available provider/cardholder context, displayed last four digits, user label.
- transactions: local ID, local card ID, normalized provider fields, composite identity (§7), import provenance.
- imports: local import ID, file hash, import time, parser version, outcome counts.
- settings: currency, period and card-filter preferences, and schema version.
- categoryOverrides (v2): local transaction ID and chosen category; not part of the v1 schema.

Persist base records; derive chart summaries from them. Validate database migrations as the schema changes.

## 9. Privacy and maintenance

- All transaction parsing, storage, matching, and analytics stay in the browser.
- Bundle fonts, icons, parsers, and charts. Avoid remote merchant logos and third-party analytics scripts.
- Never put financial details in URLs, requests, remote error reports, or server logs.
- Test offline cold launch after initial caching, including import and delete-all.
- Treat imported strings as text, never executable HTML or formulas.
- Use a restrictive content security policy and review dependencies and updates.
- Agree app-update behavior so an update cannot interrupt an import or unexpectedly invalidate stored data.
- Explain that the server receives ordinary connection/request metadata when the site is fetched; transaction data stays local.
- No fingerprinting to infer returning users.
- Do not collect production financial files through public issues. Request synthetic examples or narrowly redacted structures for bug reports.

## 10. Validation with coworkers using Etherfi

Share the project with coworkers who already use Etherfi and invite them to try it over one or two monthly spending cycles. Start with the available coworker group rather than recruiting random users or requiring a fixed participant count.

Ask participants voluntarily:
- Could they complete the import without help?
- Did the totals match their expectations, and could they explain discrepancies?
- Which insight was useful?
- Did they independently return and import again?
- What prevented a second use?

Rely on this direct, voluntary feedback rather than server-side tracking to judge successful imports, offline use, or retention.

Continue when several users independently return and describe concrete value. If they do not return, investigate the import effort and usefulness before adding providers or more charts. These are qualitative pilot criteria, not a claimed statistical validation threshold.

## 11. Implementation milestones

### Milestone 0: Resolve data and scope risks
- Reviewed the reference implementation's author's project and synced with them directly on
  reusable practices and lessons learned; their input is reflected in the sections above.
- Obtain safe examples for overlapping exports, status changes, identical purchases, multiple cards, refunds, and differing original/settled currencies.
- Get a redacted/synthetic Borrow-mode export and check whether its rows fit the same
  normalized transaction shape as Direct Pay. If they do, scope basic Borrow transaction
  import into the MVP; if not, defer all of Borrow to v2 as originally planned (see §2).
- Scope stays XLSX-only; license (PolyForm Noncommercial 1.0.0) and core accounting
  definitions (dashboard, UTC grouping, cleared-purchase default) are confirmed.
- Build entirely synthetic repository fixtures reflecting the observed workbook structure.
Done when: supported cases and explicit unsupported cases are documented, the Borrow-mode fit
question is answered, and the simplified import approach (§7) can be tested.

### Milestone 1: Working local import
- Build the Home screen for first-time (no-data) visitors: value proposition, privacy
  promise, import/demo actions, and the "want a new provider?" prompt.
- Parse XLSX, detect headers, normalize data, validate rows.
- Implement the composite-identity upsert and atomic persistence (§7); no preview screen.
- Reopen the app and restore saved data.
Done when: repeating/overlapping imports do not inflate totals, failures leave existing data
intact, and unsupported rows are reported clearly.

### Milestone 2: Trustworthy analytics
- Implement status/currency/period/card filters and decimal-safe aggregation.
- Add spending and category charts, the activity heatmap, recorded cashback, and the transaction table.
Done when: every displayed total can be traced to included rows.

### Milestone 3: PWA, phone support, offline use, and recovery
- Cache all core assets; implement the delete-all control.
- Validate database migrations, quota failures, and safe app updates.
- Add the PWA manifest, icons, and installation guidance.
- Verify desktop use plus Android and iPhone browser use; check installation where supported.
- Test phone file selection, readable charts, and transaction navigation.
- Test offline launch in installed mode as well as ordinary browser mode.
Done when: core flows work disconnected after caching and delete-all reliably clears local data.

### Milestone 4: Community pilot release
- Finalize license, contribution instructions, and privacy wording.
- Deploy to the chosen origin with synthetic demo data.
- Share the project with coworkers using Etherfi and collect their voluntary feedback.
Done when: users can complete the flow unaided and the team has a clear feedback channel.

## 12. Release checks

- Same-file and overlapping imports do not duplicate spending.
- Distinct identical purchases are retained.
- Multiple cards remain separate during matching; card filtering and All cards totals reconcile within each currency.
- Card labels and assignments survive re-import.
- Pending-to-cleared updates and stale exports follow documented rules.
- Narrow exports do not delete historical records.
- All Transactions is imported once; currency sheets are not added again.
- Cancellation, unknown statuses, unsupported modes, and refund-like records cannot silently distort totals.
- Money remains separated by currency and cashback rates use matching records and units.
- Midnight/month/year boundaries follow the documented UTC rule.
- Malformed workbooks and storage failures leave existing data intact.
- Import is transactional, including when another app tab is open.
- Core offline flows work and financial values do not appear in network traffic.
- PWA installation and offline launch work on supported target browsers; phone layouts and file flows are usable.
- Unsupported CSV imports show a clear XLSX-only message.
- Public fixtures and screenshots contain synthetic data only.

## 13. Deferred work

- CSV import support.
- A small, curated app-level category taxonomy and the mapping table from Etherfi's raw
  category text into it (see §6). The MVP shows raw category text as-is; the taxonomy is
  designed once more real exports are seen and ships together with overrides below.
- User category overrides per transaction, bulk merchant rules, and transaction splitting (see §5).
- Versioned backup/export and restore, and cross-device backup merging (see §5).
- Full Borrow-mode analytics: balances, interest, repayments, collateral, and liquidation.
  Basic Borrow transaction *import* may already land in the MVP if Milestone 0 finds it fits
  the existing structure (see §2); it's only the deeper analytics that's unconditionally v2.
- The original identity/row-fingerprint dual-hash matching design and ambiguous-match
  resolution UI (see §7): only if the simplified MVP approach proves insufficient.
- Historical FX conversion and token-price valuation.
- Additional card providers, automatic syncing, accounts, or wallet connections.
- Budgets, notifications, and recurring payment detection.
- Automatic membership-tier simulation and expected-versus-earned cashback auditing.
- Full refund/net-spend semantics (see §6).
- Complex category rules, custom chart builders, and production usage telemetry.
- Local data-at-rest protection (e.g. a PIN/passphrase-gated lock screen and/or encrypting the
  IndexedDB/localStorage contents themselves), for cases like a shared device or concern about
  raw browser-profile access. Not scoped for the MVP; approach, threat model, and default
  on/off state to be discussed when this is prioritized.

Immediate next step: start Milestone 0 and the import/matching prototype. No implementation,
repository publishing, domain purchase, or external messaging is authorized by this planning
document itself.
