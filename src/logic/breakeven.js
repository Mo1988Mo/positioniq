// PositionIQ — Break-even Price
// Pure functions. No UI.
//
// Break-even = the close price where price-move PnL exactly covers
// total round-trip fees (and funding, if held). Above/below it = profit.
//
// IMPORTANT (disclaimer surfaced in UI):
//   The OPENING fee is known exactly (maker/taker already chosen at entry).
//   The CLOSING fee depends on whether you exit as maker or taker, which
//   is NOT known until the position closes. So break-even is an ESTIMATE
//   based on the assumed close order type. Closing as maker vs taker shifts it.
//
// Linear (USDT-margined):
//   qty       = notional / entry
//   totalCost = entryFee + closeFee + paidFunding   (USDT)
//   priceMove = totalCost / qty   (price must move this far just to break even)
//   BE(long)  = entry + priceMove ;  BE(short) = entry - priceMove

function known(v) { return v != null && isFinite(v); }

/**
 * Break-even close price.
 * @param {object} input
 * @param {"long"|"short"} input.side
 * @param {number} input.entry        - entry price, > 0
 * @param {number} input.notional     - position notional (USDT), > 0
 * @param {number} input.entryFee     - opening fee (USDT), exact, >= 0
 * @param {number} input.closeFee     - estimated closing fee (USDT), >= 0
 * @param {number} [input.funding=0]  - signed funding (USDT). Positive = paid
 *                                       (raises break-even). Negative = received
 *                                       (lowers break-even).
 * @returns {{ totalCost:number, priceMove:number, breakEvenPrice:number,
 *             approximate:true } | null}
 */
export function calcBreakEven(input) {
  if (!input) return null;
  const { side } = input;
  const entry = input.entry;
  const notional = input.notional;

  if (side !== "long" && side !== "short") return null;
  if (!known(entry) || entry <= 0) return null;
  if (!known(notional) || notional <= 0) return null;

  const entryFee = known(input.entryFee) && input.entryFee > 0 ? input.entryFee : 0;
  const closeFee = known(input.closeFee) && input.closeFee > 0 ? input.closeFee : 0;
  const funding = known(input.funding) ? input.funding : 0;

  // Paid funding adds to cost; received funding (negative) reduces it.
  const totalCost = entryFee + closeFee + funding;

  const qty = notional / entry;
  const priceMove = totalCost / qty;

  // If net cost is negative (e.g. large received funding), break-even can be
  // on the favourable side — that's valid, the position starts ahead.
  const breakEvenPrice = side === "long" ? entry + priceMove : entry - priceMove;

  if (breakEvenPrice <= 0) return null;

  return { totalCost, priceMove, breakEvenPrice, approximate: true };
}
