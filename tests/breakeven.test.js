// PositionIQ — Break-even Tests
// Run via GitHub Actions. Plain assertions.

import { calcBreakEven } from "../src/logic/breakeven.js";

let passed = 0;
let failed = 0;

function expect(label, actual, expected, tol = 1e-6) {
  let ok;
  if (expected === null) ok = actual === null || actual === undefined;
  else if (typeof expected === "boolean") ok = actual === expected;
  else if (actual == null) ok = false;
  else ok = Math.abs(actual - expected) < tol;
  if (ok) { passed++; console.log(`✓ ${label}`); }
  else { failed++; console.error(`✗ ${label} — expected ${expected}, got ${actual}`); }
}

// Setup: entry 100, notional 1000, qty = 10
// entryFee 3, closeFee 5 → totalCost 8 → priceMove 0.8

// ── LONG break-even (price must rise to cover fees) ──────
const lbe = calcBreakEven({ side: "long", entry: 100, notional: 1000, entryFee: 3, closeFee: 5 });
expect("long totalCost", lbe.totalCost, 8);
expect("long priceMove", lbe.priceMove, 0.8);
expect("long BE price", lbe.breakEvenPrice, 100.8);
expect("long flagged approximate", lbe.approximate, true);

// ── SHORT break-even (price must fall to cover fees) ─────
const sbe = calcBreakEven({ side: "short", entry: 100, notional: 1000, entryFee: 3, closeFee: 5 });
expect("short BE price", sbe.breakEvenPrice, 99.2);

// ── Paid funding raises break-even (long) ────────────────
// fees 8 + funding +2 = 10 → priceMove 1 → BE 101
const lbf = calcBreakEven({ side: "long", entry: 100, notional: 1000, entryFee: 3, closeFee: 5, funding: 2 });
expect("long BE with paid funding", lbf.breakEvenPrice, 101);

// ── Received funding lowers break-even (long) ────────────
// fees 8 + funding -8 = 0 → priceMove 0 → BE 100 (no move needed)
const lrf = calcBreakEven({ side: "long", entry: 100, notional: 1000, entryFee: 3, closeFee: 5, funding: -8 });
expect("long BE with received funding cancels fees", lrf.breakEvenPrice, 100);

// ── Large received funding → BE on favourable side (long) ──
// fees 8 + funding -18 = -10 → priceMove -1 → BE 99 (starts ahead)
const lrf2 = calcBreakEven({ side: "long", entry: 100, notional: 1000, entryFee: 3, closeFee: 5, funding: -18 });
expect("long BE favourable with big funding", lrf2.breakEvenPrice, 99);

// ── Zero fees → break-even is entry itself ───────────────
const zf = calcBreakEven({ side: "long", entry: 100, notional: 1000, entryFee: 0, closeFee: 0 });
expect("zero fees → BE at entry", zf.breakEvenPrice, 100);

// ── Guards ───────────────────────────────────────────────
expect("guard: zero entry → null",
  calcBreakEven({ side: "long", entry: 0, notional: 1000, entryFee: 3, closeFee: 5 }), null);
expect("guard: zero notional → null",
  calcBreakEven({ side: "long", entry: 100, notional: 0, entryFee: 3, closeFee: 5 }), null);
expect("guard: bad side → null",
  calcBreakEven({ side: "flat", entry: 100, notional: 1000, entryFee: 3, closeFee: 5 }), null);
expect("guard: missing input → null", calcBreakEven(null), null);

// ── Negative fees treated as zero (defensive) ────────────
const negf = calcBreakEven({ side: "long", entry: 100, notional: 1000, entryFee: -3, closeFee: -5 });
expect("negative fees → treated as zero → BE at entry", negf.breakEvenPrice, 100);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
