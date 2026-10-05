"""Independent reference amortization for cross-checking engine.js.
Written from the standard formula, deliberately not ported from the JS."""
import json, sys

def monthly_payment(P, apr_pct, n):
    r = apr_pct / 1200.0
    if r == 0:
        return P / n
    return P * r / (1 - (1 + r) ** -n)

def amortize(P, apr_pct, n, extra=0.0, lump=0.0, lump_month=0, recast=False):
    r = apr_pct / 1200.0
    pay = monthly_payment(P, apr_pct, n) + extra
    bal = P
    month = 0
    total_int = 0.0
    while bal > 0.005 and month < 1200:
        month += 1
        interest = bal * r
        pp = pay - interest
        if pp <= 0:
            return None  # never pays off
        if pp >= bal:
            pp = bal
        bal -= pp
        total_int += interest
        if lump > 0 and month == lump_month and bal > 0:
            bal -= min(lump, bal)
            if recast and bal > 0.005 and n - month > 0:
                pay = monthly_payment(bal, apr_pct, n - month) + extra
    return (month, total_int) if bal <= 0.005 else None

cases = json.load(sys.stdin)
out = []
for c in cases:
    res = amortize(c["principal"], c["aprPct"], c["termMonths"],
                   c.get("extraMonthly", 0), c.get("lumpSum", 0),
                   c.get("lumpMonth", 0), c.get("recast", False))
    base = amortize(c["principal"], c["aprPct"], c["termMonths"])
    out.append({"scenario": res, "baseline": base})
print(json.dumps(out))
