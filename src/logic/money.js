// PositionIQ — Money Management (Target Close Price)
// Pure functions. No UI.
//
// Goal: given a target ROI% (on margin), find the GROSS close price
// needed to hit it (price move only — fees excluded, since exit
// maker/taker role is unknown in advance).
//
// Linear (USDT-margined):
//   targetPnl   = margin * targetRoi/100
//   qty         = notional / entry
//   priceMove   = targetPnl / qty
//   close(long) = entry + priceMove ;  close(short) = entry - priceMove
//
// NOTE: linear for v2. Inverse target-price added later.

function known(v) { return v != null && isFinite(v); }

/**
 * Gross target close price for a desired ROI% on margin.
 * @param {object} input
 * @param {"long"|"short"} input.side
 * @param {number} input.entry      - entry price, > 0
 * @param {number} input.notional   - position notional (USDT), > 0
 * @param {number} input.margin     - margin used (USDT), > 0
 * @param {number} input.targetRoi  - desired ROI % on margin (negative = loss target)
 * @returns {{ targetPnl:number, priceMove:number, closePrice:number } | null}
 */
export function calcTargetClose(input) {
  if (!input) return null;
  const { side } = input;
  const entry = input.entry;
  const notional = input.notional;
  const margin = input.margin;
  const targetRoi = input.targetRoi;

  if (side !== "long" && side !== "short") return null;
  if (!known(entry) || entry <= 0) return null;
  if (!known(notional) || notional <= 0) return null;
  if (!known(margin) || margin <= 0) return null;
  if (!known(targetRoi)) return null;

  const targetPnl = margin * (targetRoi / 100);
  const qty = notional / entry;
  const priceMove = targetPnl / qty;

  const closePrice = side === "long" ? entry + priceMove : entry - priceMove;
  if (closePrice <= 0) return null; // can't be zero/negative in reality

  return { targetPnl, priceMove, closePrice };
}

/**
 * Convenience: target close for a profit (positive ROI).
 */
export function targetForProfit(side, entry, notional, margin, profitRoi) {
  if (!known(profitRoi) || profitRoi <= 0) return null;
  return calcTargetClose({ side, entry, notional, margin, targetRoi: profitRoi });
}

/**
 * Convenience: target close for a max loss (pass a positive lossRoi).
 */
export function targetForLoss(side, entry, notional, margin, lossRoi) {
  if (!known(lossRoi) || lossRoi <= 0) return null;
  return calcTargetClose({ side, entry, notional, margin, targetRoi: -lossRoi });
}
