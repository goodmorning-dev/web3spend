# Web3Spend

A local-first spending and cashback dashboard for ether.fi cardholders.

Import your ether.fi transaction export and see your spending, categories, and recorded
cashback by currency. Everything is read, parsed, and stored on your own device — nothing is
uploaded, no account is required, and no server ever sees your transaction data.

## Status

Early development, pre-MVP. See [docs/MVP-PLAN.md](docs/MVP-PLAN.md) for product scope and
[docs/TECHNICAL-PLAN.md](docs/TECHNICAL-PLAN.md) for the technical approach.

## Privacy

- All parsing, storage, and analysis happen in your browser, backed by IndexedDB.
- No account, no wallet connection, no server upload of transaction data.
- The only network activity is loading the app itself.

## License

Licensed under [PolyForm Noncommercial 1.0.0](LICENSE) — source-available, noncommercial use
only.

## Want a different card provider supported?

Web3Spend starts with ether.fi. If you'd use this with another provider, tell us which one:
[@goodmorningdevs](https://x.com/goodmorningdevs) on X.
