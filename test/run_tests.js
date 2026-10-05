// Cross-check engine.js against the Python oracle on random + edge cases.
const { execFileSync } = require('child_process');
const T = require('../engine.js');

function rand(a, b) { return a + Math.random() * (b - a); }
const cases = [];
cases.push({ principal: 400000, aprPct: 6, termMonths: 360 });
cases.push({ principal: 400000, aprPct: 6, termMonths: 360, extraMonthly: 200 });
cases.push({ principal: 250000, aprPct: 3.5, termMonths: 180, lumpSum: 20000, lumpMonth: 24, recast: true });
cases.push({ principal: 100000, aprPct: 0, termMonths: 120, extraMonthly: 500 });
cases.push({ principal: 75000, aprPct: 0.01, termMonths: 360, lumpSum: 70000, lumpMonth: 3 });
cases.push({ principal: 500000, aprPct: 7.25, termMonths: 360, extraMonthly: 1000, lumpSum: 50000, lumpMonth: 60, recast: false });
for (let i = 0; i < 400; i++) {
  cases.push({
    principal: Math.round(rand(20000, 900000)),
    aprPct: Math.round(rand(0, 12) * 100) / 100,
    termMonths: 12 * Math.round(rand(5, 30)),
    extraMonthly: Math.round(rand(0, 1500)),
    lumpSum: Math.random() < 0.5 ? Math.round(rand(1000, 80000)) : 0,
    lumpMonth: Math.round(rand(1, 100)),
    recast: Math.random() < 0.4
  });
}

const oracleOut = execFileSync('python3', ['test/oracle.py'], { input: JSON.stringify(cases), maxBuffer: 1 << 24 }).toString();
const oracle = JSON.parse(oracleOut);

let fails = 0, checked = 0, skipped = 0;
cases.forEach((c, i) => {
  const o = oracle[i];
  const s = T.amortize(c);
  const b = T.amortize({ principal: c.principal, aprPct: c.aprPct, termMonths: c.termMonths });
  function chk(name, js, py) {
    checked++;
    if (py === null || py === undefined) { skipped++; return; }
    const tol = name === 'months' ? 0 : 0.02;
    if (Math.abs(js - py) > tol) {
      fails++;
      if (fails <= 5) console.log('MISMATCH', name, 'case', i, JSON.stringify(c), 'js', js, 'py', py);
    }
  }
  chk('months', s.months, o.scenario && o.scenario[0]);
  chk('totalInterest', s.totalInterest, o.scenario && o.scenario[1]);
  chk('months', b.months, o.baseline && o.baseline[0]);
  chk('totalInterest', b.totalInterest, o.baseline && o.baseline[1]);
  checked++;
  if (s.paysOff !== (o.scenario !== null)) { fails++; console.log('PAYSOFF MISMATCH case', i); }
});
const anchor = T.monthlyPayment(400000, 6, 360);
checked++;
if (Math.abs(anchor - 2398.20) > 0.01) { fails++; console.log('ANCHOR FAIL', anchor); }
console.log(`checked=${checked} skipped(py-null)=${skipped} fails=${fails}`);
process.exit(fails ? 1 : 0);
