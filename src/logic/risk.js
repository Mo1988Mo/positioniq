// PositionIQ — Risk Management Solver
// Pure functions. No UI.
//
// Fill ANY subset of fields; the solver computes the rest where
// mathematically determined. Two coupled relationships:
//
//   Risk geometry:  Risk% = 100 * Leverage * SL_distance / Entry
//   Capital:        Notional = Margin * Leverage
//
// Leverage is shared between the two, so knowns in one group can
// unlock the other. (Linear / USDT-margined for v2.)
//
// Loss at SL = qty * SL_distance = (Notional/Entry) * SL_distance
//            = Margin * Risk%/100   ✓ (margin cancels in geometry)

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}

const known = (v) => v != null && isFinite(v) && v > 0;

/**
 * Solve a risk-management scenario.
 * @param {object} input
 * @param {"long"|"short"} input.side
 * @param {number} input.entry            - required, > 0
 * @param {number} [input.sl]             - stop loss price
 * @param {number} [input.slDistance]     - |entry - sl| (alt to sl)
 * @param {number} [input.riskPct]        - % of margin willing to risk
 * @param {number} [input.leverage]
 * @param {number} [input.notional]
 * @param {number} [input.margin]
 * @returns {object|null} resolved fields, or null if entry/side invalid
 *   or SL is on the wrong side of entry.
 */
export function solveRisk(input) {
  if (!input) return null;
  const { side } = input;
  const entry = num(input.entry);
  if (!known(entry)) return null;
  if (side !== "long" && side !== "short") return null;

  let sl = num(input.sl);
  let slDistance = num(input.slDistance);
  let riskPct = num(input.riskPct);
  let leverage = num(input.leverage);
  let notional = num(input.notional);
  let margin = num(input.margin);

  // Derive SL distance from SL price (must be on correct side)
  if (!known(slDistance) && sl != null && isFinite(sl) && sl > 0) {
    const d = side === "long" ? entry - sl : sl - entry;
    if (d <= 0) return null; // wrong-side SL → invalid
    slDistance = d;
  }

  // Iterate so a leverage solved in one group unlocks the other
  for (let pass = 0; pass < 3; pass++) {
    // Risk geometry: Risk% = 100 * L * D / E
    if (!known(riskPct) && known(leverage) && known(slDistance))
      riskPct = (100 * leverage * slDistance) / entry;
    if (!known(leverage) && known(riskPct) && known(slDistance))
      leverage = (riskPct * entry) / (100 * slDistance);
    if (!known(slDistance) && known(riskPct) && known(leverage))
      slDistance = (riskPct * entry) / (100 * leverage);

    // Capital: Notional = Margin * Leverage
    if (!known(notional) && known(margin) && known(leverage))
      notional = margin * leverage;
    if (!known(margin) && known(notional) && known(leverage))
      margin = notional / leverage;
    if (!known(leverage) && known(notional) && known(margin))
      leverage = notional / margin;
  }

  const out = { side, entry };
  if (known(slDistance)) {
    out.slDistance = slDistance;
    out.sl = side === "long" ? entry - slDistance : entry + slDistance;
  }
  if (known(riskPct)) out.riskPct = riskPct;
  if (known(leverage)) out.leverage = leverage;
  if (known(notional)) {
    out.notional = notional;
    out.qty = notional / entry;
  }
  if (known(margin)) out.margin = margin;
  if (known(margin) && known(riskPct)) out.riskAmount = margin * (riskPct / 100);
  return out;
}
