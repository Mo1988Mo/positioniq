// PositionIQ — Money Management Tests
// Run via GitHub Actions. Plain assertions.

import { calcTargetClose, targetForProfit, targetForLoss } from "../src/logic/money.js";

let passed = 0;
let failed = 0;

function expect(label, actual, expected, tol = 1e-6) {
  let ok;
  if (expected === null) ok = actual === null || actual === undefined;
  else if (actual == null) ok = false;
  else ok = Math.abs(actual - expected) < tol;
  if (ok) { passed++; console.log(`✓ ${label}`); }
  else { failed++; console.error(`✗ ${label} — expected ${expected}, got ${actual}`); }
}

// Setup: entry 100, notional 1000, margin 100 (→ leverage 10), qty = 10
// targetPnl = margin * roi/100 ; priceMove = targetPnl / qty

// ── LONG profit ──────────────────────────────────────────
// +50% → targetPnl 50, priceMove 5 → close 105
const lp = calcTargetClose({ side: "long", entry: 100, notional: 1000, margin: 100, targetRoi: 50 });
expect("long +50% targetPnl", lp.targetPnl, 50);
expect("long +50% priceMove", lp.priceMove, 5);
expect("long +50% close", lp.closePrice, 105);

// ── SHORT profit ─────────────────────────────────────────
// +50% short → close below entry → 95
const sp = calcTargetClose({ side: "short", entry: 100, notional: 1000, margin: 100, targetRoi: 50 });
expect("short +50% close", sp.closePrice, 95);

// ── LONG loss target (negative ROI) ──────────────────────
// -30% → targetPnl -30, priceMove -3 → close 97
const ll = calcTargetClose({ side: "long", entry: 100, notional: 1000, margin: 100, targetRoi: -30 });
expect("long -30% close", ll.closePrice, 97);

// ── SHORT loss target ────────────────────────────────────
// -30% short → close above entry → 103
const sl = calcTargetClose({ side: "short", entry: 100, notional: 1000, margin: 100, targetRoi: -30 });
expect("short -30% close", sl.closePrice, 103);

// ── 100% ROI long → close 110 ; 100% short → close 90 ──
expect("long +100% close",
  calcTargetClose({ side: "long", entry: 100, notional: 1000, margin: 100, targetRoi: 100 }).closePrice, 110);
expect("short +100% close",
  calcTargetClose({ side: "short", entry: 100, notional: 1000, margin: 100, targetRoi: 100 }).closePrice, 90);

// ── targetForProfit / targetForLoss convenience ──────────
expect("targetForProfit +20% long",
  targetForProfit("long", 100, 1000, 100, 20).closePrice, 102);
// loss helper takes POSITIVE lossRoi, treats as negative → long -20% → close 98
expect("targetForLoss 20% long",
  targetForLoss("long", 100, 1000, 100, 20).closePrice, 98);
expect("targetForLoss 20% short",
  targetForLoss("short", 100, 1000, 100, 20).closePrice, 102);

// ── Guards ───────────────────────────────────────────────
expect("guard: zero entry → null",
  calcTargetClose({ side: "long", entry: 0, notional: 1000, margin: 100, targetRoi: 50 }), null);
expect("guard: zero notional → null",
  calcTargetClose({ side: "long", entry: 100, notional: 0, margin: 100, targetRoi: 50 }), null);
expect("guard: zero margin → null",
  calcTargetClose({ side: "long", entry: 100, notional: 1000, margin: 0, targetRoi: 50 }), null);
expect("guard: bad side → null",
  calcTargetClose({ side: "up", entry: 100, notional: 1000, margin: 100, targetRoi: 50 }), null);
expect("guard: NaN roi → null",
  calcTargetClose({ side: "long", entry: 100, notional: 1000, margin: 100, targetRoi: NaN }), null);

// ── Guard: loss so large it pushes close ≤ 0 → null ──────
// long, margin 100, notional 100 (qty 1), -100000% → priceMove huge negative → close ≤ 0
expect("guard: close price ≤ 0 → null",
  calcTargetClose({ side: "long", entry: 100, notional: 100, margin: 100, targetRoi: -100000 }), null);

// ── profit helper rejects non-positive ───────────────────
expect("targetForProfit rejects 0", targetForProfit("long", 100, 1000, 100, 0), null);
expect("targetForLoss rejects 0", targetForLoss("long", 100, 1000, 100, 0), null);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
