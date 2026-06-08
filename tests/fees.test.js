// PositionIQ — Fee & Funding Tests
// Run with: node tests/fees.test.js
// Plain assertions, no framework needed.

import { calcFee, calcTradingFees, calcFunding } from "../src/logic/fees.js";

let passed = 0;
let failed = 0;

function expect(label, actual, expected) {
  const ok = Math.abs(actual - expected) < 1e-9;
  if (ok) {
    passed++;
    console.log(`✓ ${label}`);
  } else {
    failed++;
    console.error(`✗ ${label} — expected ${expected}, got ${actual}`);
  }
}

// ── calcFee ──────────────────────────────────────────────
expect("fee: 15000 @ 0.05%", calcFee(15000, 0.05), 7.5);
expect("fee: 15000 @ 0.02% maker", calcFee(15000, 0.02), 3);
expect("fee: zero notional", calcFee(0, 0.05), 0);
expect("fee: negative notional blocked", calcFee(-100, 0.05), 0);
expect("fee: negative rate blocked", calcFee(15000, -0.05), 0);
expect("fee: NaN notional", calcFee(NaN, 0.05), 0);
expect("fee: zero rate", calcFee(15000, 0), 0);

// ── calcTradingFees ──────────────────────────────────────
const rt = calcTradingFees(15000, 0.02, 0.05);
expect("roundtrip entry (maker)", rt.entryFee, 3);
expect("roundtrip exit (taker)", rt.exitFee, 7.5);
expect("roundtrip total", rt.total, 10.5);

// ── calcFunding ──────────────────────────────────────────
expect("funding: 15000 @ 0.01% x3", calcFunding(15000, 0.01, 3), 4.5);
expect("funding: received (negative rate)", calcFunding(15000, -0.01, 3), -4.5);
expect("funding: zero periods", calcFunding(15000, 0.01, 0), 0);
expect("funding: negative periods blocked", calcFunding(15000, 0.01, -2), 0);
expect("funding: NaN rate", calcFunding(15000, NaN, 3), 0);

// ── summary ──────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
