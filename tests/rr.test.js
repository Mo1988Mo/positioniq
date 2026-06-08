// PositionIQ — Risk:Reward Tests
// Run via GitHub Actions. Plain assertions.

import { calcRR, deriveTpFromSl, deriveSlFromTp } from "../src/logic/rr.js";

let passed = 0;
let failed = 0;

function expect(label, actual, expected, tol = 1e-6) {
  let ok;
  if (expected === null) ok = actual === null;
  else if (actual === null) ok = false;
  else ok = Math.abs(actual - expected) < tol;
  if (ok) { passed++; console.log(`✓ ${label}`); }
  else { failed++; console.error(`✗ ${label} — expected ${expected}, got ${actual}`); }
}

// ── Mode 1: calcRR (auto) ────────────────────────────────
// LONG entry 100, SL 90 (risk 10), TP 120 (reward 20) → R:R 2
expect("RR long 2:1", calcRR("long", 100, 90, 120), 2);
// SHORT entry 100, SL 110 (risk 10), TP 80 (reward 20) → R:R 2
expect("RR short 2:1", calcRR("short", 100, 110, 80), 2);
// LONG even 1:1
expect("RR long 1:1", calcRR("long", 100, 90, 110), 1);
// Real case: SHORT entry 73238, SL 74566, TP 70574
expect("RR short real case", calcRR("short", 73238, 74566, 70574),
  (73238 - 70574) / (74566 - 73238));

// ── Mode 1: wrong-side inputs must return null (not garbage) ──
expect("RR long, SL above entry → null", calcRR("long", 100, 110, 120), null);
expect("RR long, TP below entry → null", calcRR("long", 100, 90, 95) === null ? null : 999, null);
expect("RR short, SL below entry → null", calcRR("short", 100, 90, 80), null);
expect("RR zero entry → null", calcRR("long", 0, 90, 120), null);
expect("RR NaN tp → null", calcRR("long", 100, 90, NaN), null);

// ── Mode 2a: deriveTpFromSl ──────────────────────────────
// LONG entry 100, SL 90 (risk 10), RR 2 → TP 120
expect("TP from SL: long 2:1", deriveTpFromSl("long", 100, 90, 2), 120);
// SHORT entry 100, SL 110 (risk 10), RR 3 → TP 70
expect("TP from SL: short 3:1", deriveTpFromSl("short", 100, 110, 3), 70);
// wrong side: LONG SL above entry → null
expect("TP from SL: long bad SL → null", deriveTpFromSl("long", 100, 110, 2), null);
expect("TP from SL: zero multiplier → null", deriveTpFromSl("long", 100, 90, 0), null);

// ── Mode 2b: deriveSlFromTp ──────────────────────────────
// LONG entry 100, TP 120 (reward 20), RR 2 → risk 10 → SL 90
expect("SL from TP: long 2:1", deriveSlFromTp("long", 100, 120, 2), 90);
// SHORT entry 100, TP 70 (reward 30), RR 3 → risk 10 → SL 110
expect("SL from TP: short 3:1", deriveSlFromTp("short", 100, 70, 3), 110);
// wrong side: LONG TP below entry → null
expect("SL from TP: long bad TP → null", deriveSlFromTp("long", 100, 90, 2), null);
expect("SL from TP: NaN multiplier → null", deriveSlFromTp("long", 100, 120, NaN), null);

// ── round-trip consistency ───────────────────────────────
// derive TP from SL, then RR should equal the multiplier
const tp = deriveTpFromSl("long", 100, 90, 2.5);
expect("round-trip: derived TP gives same RR", calcRR("long", 100, 90, tp), 2.5);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
