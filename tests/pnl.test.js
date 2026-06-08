// PositionIQ — PnL Tests
// Run via GitHub Actions. Plain assertions, no framework.

import {
  calcRawPnl,
  calcRoi,
  calcClosingPnl,
  calcPositionPnl,
} from "../src/logic/pnl.js";

let passed = 0;
let failed = 0;

function expect(label, actual, expected, tol = 1e-6) {
  const ok = Math.abs(actual - expected) < tol;
  if (ok) { passed++; console.log(`✓ ${label}`); }
  else { failed++; console.error(`✗ ${label} — expected ${expected}, got ${actual}`); }
}

// ── LINEAR (USDT-margined) raw PnL ───────────────────────
// notional 15000 @ entry 73238, qty = 0.204812...
// LONG to 75000: qty * (75000-73238)
expect("linear long profit", calcRawPnl("long", 73238, 75000, 15000), (15000/73238)*(75000-73238));
// SHORT to 70574 (real test case): qty * (73238-70574)
expect("linear short profit", calcRawPnl("short", 73238, 70574, 15000), (15000/73238)*(73238-70574));
// SHORT that loses (price up)
expect("linear short loss", calcRawPnl("short", 73238, 75000, 15000), (15000/73238)*(73238-75000));

// ── THE V1 BUG: empty/zero close must yield 0, not fake profit ──
expect("linear short, zero close → 0", calcRawPnl("short", 73238, 0, 15000), 0);
expect("linear long, zero entry → 0", calcRawPnl("long", 0, 75000, 15000), 0);
expect("linear, NaN close → 0", calcRawPnl("long", 73238, NaN, 15000), 0);
expect("linear, zero notional → 0", calcRawPnl("long", 73238, 75000, 0), 0);

// ── INVERSE (Coin-margined) raw PnL ──────────────────────
// LONG: notional * (1/entry - 1/close) in base coin
expect("inverse long profit", calcRawPnl("long", 50000, 55000, 10000, "inverse"), 10000*((1/50000)-(1/55000)));
expect("inverse short profit", calcRawPnl("short", 50000, 45000, 10000, "inverse"), 10000*((1/45000)-(1/50000)));
expect("inverse zero close → 0", calcRawPnl("long", 50000, 0, 10000, "inverse"), 0);

// ── ROI ──────────────────────────────────────────────────
expect("roi +10%", calcRoi(100, 1000), 10);
expect("roi -25%", calcRoi(-250, 1000), -25);
expect("roi zero margin → 0", calcRoi(100, 0), 0);

// ── CLOSING PnL (received funding credited, paid funding ignored here) ──
// rawPnl 500, fees 10, funding -3 (received) → 500 + 3 - 10 = 493
expect("closing: received funding credited", calcClosingPnl(500, 10, -3), 493);
// rawPnl 500, fees 10, funding +3 (paid) → not deducted here → 490
expect("closing: paid funding NOT here", calcClosingPnl(500, 10, 3), 490);
expect("closing: negative fees blocked", calcClosingPnl(500, -10, 0), 500);

// ── POSITION PnL (paid funding deducted, liquidation deducted) ──
// closing 490, funding +3 (paid), no liq → 490 - 3 = 487
expect("position: paid funding deducted", calcPositionPnl(490, 3, 0), 487);
// closing -200, liq margin 1000 → -200 - 1000 = -1200
expect("position: liquidation deducted", calcPositionPnl(-200, 0, 1000), -1200);
// received funding (negative) not deducted in position
expect("position: received funding ignored", calcPositionPnl(493, -3, 0), 493);
expect("position: negative liq blocked", calcPositionPnl(100, 0, -500), 100);

// ── summary ──────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
