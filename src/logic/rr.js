// PositionIQ — Risk:Reward Calculations
// Pure functions. No UI.
//
// Direction conventions:
//   LONG  → TP above entry, SL below entry
//   SHORT → TP below entry, SL above entry
//
// Risk   = distance from entry to SL
// Reward = distance from entry to TP
// R:R    = Reward / Risk

/**
 * Mode 1 — Auto R:R when both SL and TP are set.
 * @param {"long"|"short"} side
 * @param {number} entry
 * @param {number} sl - stop loss price
 * @param {number} tp - take profit price
 * @returns {number|null} R:R ratio, or null if inputs invalid
 */
export function calcRR(side, entry, sl, tp) {
  if (!isFinite(entry) || !isFinite(sl) || !isFinite(tp)) return null;
  if (entry <= 0 || sl <= 0 || tp <= 0) return null;

  let risk, reward;
  if (side === "long") {
    risk = entry - sl;     // SL below entry
    reward = tp - entry;   // TP above entry
  } else {
    risk = sl - entry;     // SL above entry
    reward = entry - tp;   // TP below entry
  }

  // Risk and reward must be on the correct sides
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

/**
 * Mode 2a — Derive TP from a known SL and a target R:R multiplier.
 * @param {"long"|"short"} side
 * @param {number} entry
 * @param {number} sl
 * @param {number} rrMultiplier - desired reward:risk (e.g. 2 for 2:1)
 * @returns {number|null} the TP price, or null if invalid
 */
export function deriveTpFromSl(side, entry, sl, rrMultiplier) {
  if (!isFinite(entry) || !isFinite(sl) || !isFinite(rrMultiplier)) return null;
  if (entry <= 0 || sl <= 0 || rrMultiplier <= 0) return null;

  if (side === "long") {
    const risk = entry - sl;          // SL must be below entry
    if (risk <= 0) return null;
    return entry + risk * rrMultiplier;
  } else {
    const risk = sl - entry;          // SL must be above entry
    if (risk <= 0) return null;
    return entry - risk * rrMultiplier;
  }
}

/**
 * Mode 2b — Derive SL from a known TP and a target R:R multiplier.
 * @param {"long"|"short"} side
 * @param {number} entry
 * @param {number} tp
 * @param {number} rrMultiplier - desired reward:risk (e.g. 2 for 2:1)
 * @returns {number|null} the SL price, or null if invalid
 */
export function deriveSlFromTp(side, entry, tp, rrMultiplier) {
  if (!isFinite(entry) || !isFinite(tp) || !isFinite(rrMultiplier)) return null;
  if (entry <= 0 || tp <= 0 || rrMultiplier <= 0) return null;

  if (side === "long") {
    const reward = tp - entry;        // TP must be above entry
    if (reward <= 0) return null;
    const risk = reward / rrMultiplier;
    return entry - risk;
  } else {
    const reward = entry - tp;        // TP must be below entry
    if (reward <= 0) return null;
    const risk = reward / rrMultiplier;
    return entry + risk;
  }
}
