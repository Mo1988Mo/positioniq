// PositionIQ — Position Legs (blended average entry + net qty)
// Pure functions. No UI.
//
// A position can be built from multiple legs:
//   add    — increases position size at a given price
//   reduce — decreases position size (partial close) at a given price
//
// Blended model (simple): we track weighted-average entry of the OPEN
// position and the net quantity. Reductions lower net qty but do NOT
// change the average entry of what remains (standard avg-cost behaviour).
//
// Each leg: { type: "add"|"reduce", price: number, qty: number }
// qty is in base coin (e.g. BTC). Notional at a leg = price * qty.

function valid(n) { return isFinite(n) && n > 0; }

/**
 * Compute blended average entry and net quantity from a list of legs.
 * Processes legs in order. Reductions that exceed current net qty are
 * clamped (you can't reduce below zero).
 *
 * @param {Array<{type:string, price:number, qty:number}>} legs
 * @returns {{ avgEntry:number, netQty:number, totalAdded:number,
 *             totalReduced:number, closed:boolean }}
 */
export function blendLegs(legs) {
  if (!Array.isArray(legs)) {
    return { avgEntry: 0, netQty: 0, totalAdded: 0, totalReduced: 0, closed: false };
  }

  let netQty = 0;
  let avgEntry = 0;
  let totalAdded = 0;
  let totalReduced = 0;

  for (const leg of legs) {
    if (!leg) continue;
    const price = parseFloat(leg.price);
    const qty = parseFloat(leg.qty);
    if (!valid(price) || !valid(qty)) continue;

    if (leg.type === "add") {
      // New weighted-average entry across existing + added notional
      const existingNotional = avgEntry * netQty;
      const addedNotional = price * qty;
      netQty += qty;
      avgEntry = netQty > 0 ? (existingNotional + addedNotional) / netQty : 0;
      totalAdded += qty;
    } else if (leg.type === "reduce") {
      // Lower net qty; avg entry of remainder is unchanged
      const reduceQty = Math.min(qty, netQty); // clamp
      netQty -= reduceQty;
      totalReduced += reduceQty;
      if (netQty <= 0) {
        netQty = 0;
        avgEntry = 0; // fully closed
      }
    }
  }

  return {
    avgEntry,
    netQty,
    totalAdded,
    totalReduced,
    closed: totalAdded > 0 && netQty === 0,
  };
}
