# Web3Spend

**Your crypto card spending, finally clear.**

Web3Spend is a private spending and cashback dashboard for ether.fi cardholders. Import the
transaction export from your ether.fi account and see where your money goes, how much cashback
you've earned, and which subscriptions keep charging you. Your file is read and stored on your
own device: nothing is uploaded, there's no account to create, and no server ever sees your
transactions.

## What you get

- **The totals:** how much you've spent, how much cashback you've earned, and your effective
  cashback rate.
- **Monthly trends:** this month's spending against last month and your monthly average, or a
  bar for every month when you look at all time.
- **Categories:** where your money goes, by merchant category. Click one to see its
  transactions.
- **Activity:** a year-long heatmap of your spending or number of purchases, with your active
  days, longest streak, biggest day and top weekday.
- **Transactions:** every purchase with its card, category, amount, cashback and status, and
  whether it was paid directly or in Borrow Mode. Search by merchant and filter by status,
  category or spending mode.
- **Subscriptions:** recurring charges spotted in your history, including ones that have
  stopped.

Everything can be narrowed down by card, currency and month. Amounts in different currencies
are never added together.

Don't have an export to hand? **Try the demo**: it loads made-up transactions into a separate
space in your browser, so your own data is never touched.

## How it works

1. **Export from ether.fi.** Open Transaction History in your ether.fi account (or the mobile
   app), choose the dates you want and download the file. ether.fi's
   [guide](https://help.ether.fi/en/articles/685844-how-to-download-your-card-transaction-history)
   walks through it.
2. **Import it.** Drop the XLSX file into Web3Spend. It's read and parsed in your browser.
3. **See your spending.** The dashboard fills in straight away. Importing a newer export later
   adds what's new and updates what changed, without duplicating anything.

Only XLSX exports are supported for now. Rows Web3Spend doesn't understand are listed after the
import rather than quietly skipped. Account activity that isn't card spending, such as top-ups,
swaps and deposits, is left out of the import.

## Privacy

- Your export is opened and processed by code running in your browser, and it never leaves your
  device.
- Your data is kept in your browser's own storage (IndexedDB). You can delete all of it at any
  time in Settings.
- There's no account, no wallet connection and no analytics.
- The only network activity is loading the app itself. Once it has loaded, it keeps working
  offline.

Don't take our word for it: the code is all here, and you can watch your browser's Network tab
while you import a file.

## Install it as an app

Web3Spend is a progressive web app, so it can be installed on your computer or phone with its own
icon and window:

- **Desktop:** in Chrome or Edge, click the install button at the right of the address bar.
- **iPhone and iPad:** in Safari, tap Share, then Add to Home Screen.
- **Android:** in Chrome, open the menu and tap Install app.

## Status

Web3Spend is in early development, working toward its first release. The product scope is in
[docs/MVP-PLAN.md](docs/MVP-PLAN.md) and the technical approach in
[docs/TECHNICAL-PLAN.md](docs/TECHNICAL-PLAN.md).

## Development

You'll need Node.js 24 and npm.

```bash
npm install
npm run dev
```

| Command              | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Starts the development server.                    |
| `npm test`           | Runs the test suite (Vitest).                     |
| `npm run build`      | Type-checks and builds the app into `dist/`.      |
| `npm run preview`    | Serves the production build locally.              |
| `npm run lint`       | Lints the code with ESLint.                       |
| `npm run typecheck`  | Type-checks without building.                     |
| `npm run format`     | Formats the code with Prettier.                   |

It's built with React, TypeScript and Vite, styled with Tailwind CSS, and uses SheetJS to read
the export, Dexie for IndexedDB, and Recharts for the charts. Everything it needs, fonts
included, is bundled with the app, so nothing is fetched from elsewhere while you use it.

## Want your card supported?

Web3Spend supports ether.fi for now. Tell us which Web3 card you'd like to see next:
[@goodmorningdevs](https://x.com/goodmorningdevs) on X.

## License

Licensed under [PolyForm Noncommercial 1.0.0](LICENSE): the source is available, and it can be
used for noncommercial purposes only.

---

Made by [goodmorning.dev](https://goodmorning.dev). Web3Spend is an independent project and isn't
affiliated with or endorsed by ether.fi.
