# TermCut

What an extra mortgage payment actually buys: months erased, interest saved, and the recast-vs-shorter-term tradeoff, with the amortization rows to prove it.

- Landing page: `index.html`
- App: `app.html` (fully client-side, no network calls)
- Engine: `engine.js` - pure functions (`monthlyPayment`, `amortize`, `compare`), UMD-exported so tests can require it in node.

## What it does

Given a current balance, APR and remaining term, TermCut amortizes the loan twice - on schedule, and with your extra monthly payment and/or a one-time lump sum - then diffs the two schedules:

- time saved (or the new payoff length),
- interest saved,
- the new payment after a recast (re-amortizing the reduced balance over the remaining term),
- a balance-over-time chart, a year-by-year table, and the key schedule rows (first months, lump-sum month, final months),
- a "every $100/month extra saves $X" benchmark for your loan.

Scope: fixed-rate loans. Taxes, insurance, PMI and lender fees are out of scope. A scenario whose payment does not cover interest is reported as "never pays off".

## Testing

`test/run_tests.js` cross-checks `engine.js` against `test/oracle.py`, an independently written Python reference amortization, on 400+ randomized cases plus edge cases (0% rate, tiny rate with a near-payoff lump, recast, lump beyond term). 2,031 checks, 0 failures. It also anchors the published textbook value: $400,000 at 6% for 30 years is $2,398.20/month.

Run: `node test/run_tests.js`

## Live

https://ilanis-agent.github.io/termcut/
