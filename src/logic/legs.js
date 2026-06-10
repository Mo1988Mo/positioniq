// PositionIQ — Position Legs (blended average entry + net qty, with flip)
// Pure functions. No UI.
//
// A position is built from ordered legs:
//   add    — increases position size on the CURRENT side at a price
//   reduce — decreases size. Two modes via reduceOnly flag:
//      reduceOnly true  → clamps at zero (closes, never flips)
//      reduceOnly false → if reduction exceeds net qty, the EXCESS opens
//                         on the OPPOSITE side at the reduction leg's price
//
// We track the current side, weighted-average entry of the open position,
// and net qty (always >= 0; direction is held in `side`).
//
// Each leg: { type:"add"|"reduce", price:number, qty:number, reduceOnly?:bool }
// startSide: the side the FIRST add opens ("long"|"short").

function valid(n) { return isFinite(n) && n > 0; }
const flip = (s) => (s === "long" ? "short" : "long");

/**
 * @param {Array<{type:string,price:number,qty:number,reduceOnly?:boolean}>} legs
 * @param {"long"|"short"} startSide - side of the initial position
 * @returns {{ side:string, avgEntry:number, netQty:number,
 *             totalAdded:number, totalReduced:number,
 *             closed:boolean, flipped:boolean }}
 */
export function blendLegs(legs, startSide = "long") {
  const base = {
    side: startSide, avgEntry: 0, netQty: 0,
    totalAdded: 0, totalReduced: 0, closed: false, flipped: false,
  };
  if (!Array.isArray(legs)) return base;

  let side = startSide;
  let netQty = 0;
  let avgEntry = 0;
  let totalAdded = 0;
  let totalReduced = 0;
  let flipped = false;
  let everOpened = false;

  for (const leg of legs) {
    if (!leg) continue;
    const price = parseFloat(leg.price);
    const qty = parseFloat(leg.qty);
    if (!valid(price) || !valid(qty)) continue;

    if (leg.type === "add") {
      // Add on the current side: weighted-average entry
      const existingNotional = avgEntry * netQty;
      const addedNotional = price * qty;
      netQty += qty;
      avgEntry = netQty > 0 ? (existingNotional + addedNotional) / netQty : 0;
      totalAdded += qty;
      everOpened = true;
    } else if (leg.type === "reduce") {
      if (qty <= netQty) {
        // Partial (or exact) close — avg entry of remainder unchanged
        netQty -= qty;
        totalReduced += qty;
        if (netQty <= 0) { netQty = 0; avgEntry = 0; }
      } else {
        // Over-reduction
        const closedQty = netQty;
        totalReduced += closedQty;
        const excess = qty - netQty;
        if (leg.reduceOnly) {
          // Clamp: position closes, excess ignored
          netQty = 0;
          avgEntry = 0;
        } else {
          // Flip: excess opens on the opposite side at THIS leg's price
          side = flip(side);
          netQty = excess;
          avgEntry = price;
          flipped = true;
          everOpened = true;
        }
      }
    }
  }

  return {
    side,
    avgEntry,
    netQty,
    totalAdded,
    totalReduced,
    closed: everOpened && netQty === 0,
    flipped,
  };
}
