// PositionIQ — Fee & Funding Calculations
// Pure functions. No UI. All inputs validated by caller.

/**
 * Calculate trading fee for one side of a trade.
 * @param {number} notional - Position notional value in USDT
 * @param {number} feeRate - Fee rate as a percentage (e.g. 0.05 for 0.05%)
 * @returns {number} fee amount in USDT
 */
export function calcFee(notional, feeRate) {
  if (!isFinite(notional) || !isFinite(feeRate)) return 0;
  if (notional <= 0 || feeRate < 0) return 0;
  return notional * (feeRate / 100);
}

/**
 * Total round-trip trading fees (entry + exit).
 * @param {number} notional - Position notional in USDT
 * @param {number} entryFeeRate - entry fee % (maker or taker)
 * @param {number} exitFeeRate - exit fee % (maker or taker)
 * @returns {{ entryFee:number, exitFee:number, total:number }}
 */
export function calcTradingFees(notional, entryFeeRate, exitFeeRate) {
  const entryFee = calcFee(notional, entryFeeRate);
  const exitFee = calcFee(notional, exitFeeRate);
  return { entryFee, exitFee, total: entryFee + exitFee };
}

/**
 * Funding cost over a holding period.
 * NOTE: funding rate is volatile and user-supplied — never hardcoded.
 * This is always an ESTIMATE based on the entered rate.
 * @param {number} notional - Position notional in USDT
 * @param {number} fundingRate - rate per period as % (can be negative)
 * @param {number} periods - number of funding periods held
 * @returns {number} signed funding amount.
 *   Positive = cost paid by trader. Negative = funding received.
 */
export function calcFunding(notional, fundingRate, periods) {
  if (!isFinite(notional) || !isFinite(fundingRate) || !isFinite(periods)) return 0;
  if (notional <= 0 || periods <= 0) return 0;
  return notional * (fundingRate / 100) * periods;
}
