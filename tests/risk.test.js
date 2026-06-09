// PositionIQ — Risk Management Solver Tests
// Run via GitHub Actions. Plain assertions.

import { solveRisk } from "../src/logic/risk.js";

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

// Base relationship check:
// Risk% = 100 * Leverage * SL_distance / Entry
// entry 100, SL 95 (dist 5), leverage 10 → Risk% = 100*10*5/100 = 50%

// ── Direction A: size from risk (Entry, SL, Margin, Risk% → notional) ──
// entry 100, SL 95 (dist 5), risk 1.5%, margin 1000
// leverage = riskPct*entry/(100*dist) = 1.5*100/(100*5) = 0.3
// notional = margin*leverage = 1000*0.3 = 300
const A = solveRisk({ side: "long", entry: 100, sl: 95, riskPct: 1.5, margin: 1000 });
expect("A: leverage", A.leverage, 0.3);
expect("A: notional", A.notional, 300);
expect("A: qty", A.qty, 3);
expect("A: riskAmount", A.riskAmount, 15);
expect("A: slDistance", A.slDistance, 5);

// ── Direction B: suggest SL (Entry, Notional, Leverage, Margin, Risk% → SL) ──
// entry 100, leverage 10, risk 2% → dist = riskPct*entry/(100*lev) = 2*100/(100*10)=0.2
// SL long = entry - dist = 99.8
const B = solveRisk({ side: "long", entry: 100, leverage: 10, riskPct: 2, margin: 500 });
expect("B: slDistance", B.slDistance, 0.2);
expect("B: SL price (long)", B.sl, 99.8);
// short version → SL above entry
const Bs = solveRisk({ side: "short", entry: 100, leverage: 10, riskPct: 2, margin: 500 });
expect("B: SL price (short)", Bs.sl, 100.2);

// ── Direction C: suggest leverage (Entry, SL, Risk% → leverage) ──
// entry 100, SL 90 (dist 10), risk 5% → lev = 5*100/(100*10) = 0.5
const C = solveRisk({ side: "long", entry: 100, sl: 90, riskPct: 5 });
expect("C: leverage", C.leverage, 0.5);

// ── Capital group: notional/margin/leverage interlink ──
// notional 3000, margin 1000 → leverage 3
const cap = solveRisk({ side: "long", entry: 100, sl: 95, notional: 3000, margin: 1000 });
expect("cap: leverage from notional/margin", cap.leverage, 3);
// then risk% should solve: 100*3*5/100 = 15%
expect("cap: risk% solved through shared leverage", cap.riskPct, 15);

// ── Cross-group unlock: leverage from capital unlocks risk geometry ──
// margin 200, notional 2000 → lev 10; entry 100 SL 99 (dist 1) → risk = 100*10*1/100 = 10%
const cross = solveRisk({ side: "long", entry: 100, sl: 99, margin: 200, notional: 2000 });
expect("cross: leverage", cross.leverage, 10);
expect("cross: risk% via shared leverage", cross.riskPct, 10);

// ── Wrong-side SL guards ─────────────────────────────────
expect("guard: long SL above entry → null",
  solveRisk({ side: "long", entry: 100, sl: 110, riskPct: 2, margin: 1000 }), null);
expect("guard: short SL below entry → null",
  solveRisk({ side: "short", entry: 100, sl: 90, riskPct: 2, margin: 1000 }), null);

// ── Invalid inputs ───────────────────────────────────────
expect("guard: zero entry → null",
  solveRisk({ side: "long", entry: 0, sl: 95, riskPct: 2, margin: 1000 }), null);
expect("guard: bad side → null",
  solveRisk({ side: "sideways", entry: 100, sl: 95, riskPct: 2, margin: 1000 }), null);
expect("guard: missing entry → null",
  solveRisk({ side: "long", sl: 95, riskPct: 2, margin: 1000 }), null);

// ── Underspecified: only entry+SL, nothing to solve capital ──
const under = solveRisk({ side: "long", entry: 100, sl: 95 });
expect("underspecified: slDistance still resolves", under.slDistance, 5);
expect("underspecified: leverage stays unknown", under.leverage, null);
expect("underspecified: notional stays unknown", under.notional, null);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
