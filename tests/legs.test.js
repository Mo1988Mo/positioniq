// PositionIQ — Position Legs Tests
// Run via GitHub Actions. Plain assertions.

import { blendLegs } from "../src/logic/legs.js";

let passed = 0;
let failed = 0;

function expect(label, actual, expected, tol = 1e-6) {
  let ok;
  if (typeof expected === "boolean" || typeof expected === "string") ok = actual === expected;
  else ok = Math.abs(actual - expected) < tol;
  if (ok) { passed++; console.log(`✓ ${label}`); }
  else { failed++; console.error(`✗ ${label} — expected ${expected}, got ${actual}`); }
}

// ── Blended adds (equal size) ────────────────────────────
// 1@60000 + 1@70000 → avg 65000, qty 2
let r = blendLegs([
  { type: "add", price: 60000, qty: 1 },
  { type: "add", price: 70000, qty: 1 },
], "long");
expect("equal adds avg", r.avgEntry, 65000);
expect("equal adds qty", r.netQty, 2);
expect("equal adds side", r.side, "long");

// ── Blended adds (unequal size) ──────────────────────────
// 3@60000 + 1@70000 → avg 62500, qty 4
r = blendLegs([
  { type: "add", price: 60000, qty: 3 },
  { type: "add", price: 70000, qty: 1 },
], "long");
expect("unequal adds avg", r.avgEntry, 62500);
expect("unequal adds qty", r.netQty, 4);

// ── Partial reduce keeps avg entry ───────────────────────
// 4@62500 then reduce 1 → qty 3, avg unchanged 62500
r = blendLegs([
  { type: "add", price: 60000, qty: 3 },
  { type: "add", price: 70000, qty: 1 },
  { type: "reduce", price: 80000, qty: 1 },
], "long");
expect("partial reduce qty", r.netQty, 3);
expect("partial reduce avg unchanged", r.avgEntry, 62500);
expect("partial reduce not closed", r.closed, false);

// ── Exact close ──────────────────────────────────────────
r = blendLegs([
  { type: "add", price: 60000, qty: 2 },
  { type: "reduce", price: 65000, qty: 2 },
], "long");
expect("exact close qty", r.netQty, 0);
expect("exact close flagged", r.closed, true);

// ── Reduce-only over-reduction clamps at zero ────────────
// long 1, reduce 3 reduceOnly → closes, no flip
r = blendLegs([
  { type: "add", price: 60000, qty: 1 },
  { type: "reduce", price: 65000, qty: 3, reduceOnly: true },
], "long");
expect("reduceOnly clamps qty", r.netQty, 0);
expect("reduceOnly closed", r.closed, true);
expect("reduceOnly no flip", r.flipped, false);
expect("reduceOnly side stays", r.side, "long");

// ── Regular over-reduction flips side ────────────────────
// long 1, reduce 3 (not reduceOnly) @ 65000 → short 2 @ 65000
r = blendLegs([
  { type: "add", price: 60000, qty: 1 },
  { type: "reduce", price: 65000, qty: 3 },
], "long");
expect("flip side", r.side, "short");
expect("flip net qty (excess)", r.netQty, 2);
expect("flip avg = reduce price", r.avgEntry, 65000);
expect("flip flagged", r.flipped, true);
expect("flip not closed", r.closed, false);

// ── Re-blend after a flip ────────────────────────────────
// long 1 @60000, reduce 3 @65000 → short 2 @65000, then add 2 @75000
// short side add: avg = (65000*2 + 75000*2)/4 = 70000, qty 4
r = blendLegs([
  { type: "add", price: 60000, qty: 1 },
  { type: "reduce", price: 65000, qty: 3 },
  { type: "add", price: 75000, qty: 2 },
], "long");
expect("post-flip side", r.side, "short");
expect("post-flip blended avg", r.avgEntry, 70000);
expect("post-flip qty", r.netQty, 4);

// ── Short start: blended adds ────────────────────────────
r = blendLegs([
  { type: "add", price: 50000, qty: 2 },
  { type: "add", price: 40000, qty: 2 },
], "short");
expect("short start avg", r.avgEntry, 45000);
expect("short start side", r.side, "short");

// ── Guards: invalid legs skipped ─────────────────────────
r = blendLegs([
  { type: "add", price: 60000, qty: 1 },
  { type: "add", price: 0, qty: 5 },       // invalid price
  { type: "add", price: 70000, qty: -2 },  // invalid qty
], "long");
expect("invalid legs skipped qty", r.netQty, 1);
expect("invalid legs skipped avg", r.avgEntry, 60000);

// ── Empty / non-array ────────────────────────────────────
r = blendLegs([], "long");
expect("empty qty", r.netQty, 0);
expect("empty not closed", r.closed, false);
r = blendLegs(null, "short");
expect("null side fallback", r.side, "short");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
