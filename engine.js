/* TermCut engine: mortgage amortization with extra payments.
   Pure functions, no DOM. Used by app.html and by test/engine.test.js (node). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TermCut = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_MONTHS = 1200; // 100 years safety cap

  // Standard fixed-rate monthly payment for principal P, nominal annual rate
  // aprPct (percent), over n monthly payments.
  function monthlyPayment(P, aprPct, n) {
    if (!(P > 0) || !(n > 0)) return 0;
    var r = aprPct / 1200;
    if (r === 0) return P / n;
    var f = Math.pow(1 + r, -n);
    return (P * r) / (1 - f);
  }

  // Amortize one loan scenario.
  // opts: principal, aprPct, termMonths, extraMonthly, lumpSum, lumpMonth (1-based),
  //       recast (bool): at lumpMonth, re-amortize remaining balance over remaining term.
  // Internal math is unrounded; callers round for display.
  function amortize(opts) {
    var P = opts.principal;
    var aprPct = opts.aprPct;
    var n = Math.round(opts.termMonths);
    var extra = opts.extraMonthly || 0;
    var lump = opts.lumpSum || 0;
    var lumpMonth = opts.lumpMonth || 0;
    var recast = !!opts.recast;

    var r = aprPct / 1200;
    var basePay = monthlyPayment(P, aprPct, n);
    var pay = basePay + extra;
    var bal = P;
    var month = 0;
    var totalInterest = 0;
    var totalPaid = 0;
    var recastPay = null;
    var yearly = []; // balance at each year end (month 12, 24, ...)
    var schedule = []; // full monthly rows (capped below)

    while (bal > 0.005 && month < MAX_MONTHS) {
      month++;
      var interest = bal * r;
      var principalPay = pay - interest;
      if (principalPay <= 0) {
        // Payment does not cover interest: never pays off.
        return {
          paysOff: false,
          months: null,
          totalInterest: null,
          totalPaid: null,
          basePayment: basePay,
          payment: pay,
          recastPayment: null,
          yearly: yearly,
          schedule: schedule
        };
      }
      var paymentThisMonth = pay;
      if (principalPay >= bal) {
        // Final month: pay exactly the remaining balance plus interest.
        principalPay = bal;
        paymentThisMonth = bal + interest;
      }
      bal -= principalPay;
      totalInterest += interest;
      totalPaid += paymentThisMonth;
      if (schedule.length < MAX_MONTHS) {
        schedule.push({
          month: month,
          payment: paymentThisMonth,
          interest: interest,
          principal: principalPay,
          balance: bal
        });
      }
      // Lump sum lands right after this month's regular payment.
      if (lump > 0 && month === lumpMonth && bal > 0) {
        var applied = Math.min(lump, bal);
        bal -= applied;
        totalPaid += applied;
        schedule[schedule.length - 1].payment += applied;
        schedule[schedule.length - 1].principal += applied;
        if (recast && bal > 0.005) {
          var remaining = n - month;
          if (remaining > 0) {
            pay = monthlyPayment(bal, aprPct, remaining) + extra;
            recastPay = pay;
          }
        }
      }
      if (month % 12 === 0) yearly.push({ year: month / 12, balance: bal });
    }
    if (month % 12 !== 0) yearly.push({ year: month / 12, balance: bal });

    return {
      paysOff: bal <= 0.005,
      months: month,
      totalInterest: totalInterest,
      totalPaid: totalPaid,
      basePayment: basePay,
      payment: pay,
      recastPayment: recastPay,
      yearly: yearly,
      schedule: schedule
    };
  }

  // Compare a baseline (no extras, no lump, no recast) with a scenario.
  function compare(opts) {
    var base = amortize({
      principal: opts.principal,
      aprPct: opts.aprPct,
      termMonths: opts.termMonths
    });
    var scen = amortize(opts);
    var res = { baseline: base, scenario: scen };
    if (base.paysOff && scen.paysOff) {
      res.monthsSaved = base.months - scen.months;
      res.interestSaved = base.totalInterest - scen.totalInterest;
    } else {
      res.monthsSaved = null;
      res.interestSaved = null;
    }
    return res;
  }

  function fmtMonths(m) {
    if (m == null) return 'never';
    var y = Math.floor(m / 12);
    var mo = m % 12;
    if (y === 0) return mo + (mo === 1 ? ' month' : ' months');
    if (mo === 0) return y + (y === 1 ? ' year' : ' years');
    return y + (y === 1 ? ' year' : ' years') + ', ' + mo + (mo === 1 ? ' month' : ' months');
  }

  return {
    monthlyPayment: monthlyPayment,
    amortize: amortize,
    compare: compare,
    fmtMonths: fmtMonths
  };
});
