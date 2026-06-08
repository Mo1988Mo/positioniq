// PositionIQ — PnL Calculations
// Pure functions. No UI. Funding values are ESTIMATES (rate is volatile).
//
// Definitions (locked spec):
//   Closing PnL  = realized price PnL + received funding − fees
//                  (excludes liquidation loss)
//   Position PnL = ∑Closing PnL − paid funding − fees + |liquidation margin|
//
// Contract types:
//   "linear"  = USDT-margined. PnL denominated in USDT.
//   "inverse" = Coin-margined. PnL denominated in the base coin.

/**
 * Raw price-move PnL (no fees, no funding).
 * @param {"long"|"short"} side
 * @param {number} entry - entry price
 * @param {number} close - close price
 * @param {number} notional - position notional in USDT
 * @param {"linear"|"inverse"} type
 * @returns {number} PnL — in USDT for linear, in base coin for inverse
 */
export function calcRawPnl(side, entry, close, notional, type = "linear") {
  if (!isFinite(entry) || !isFinite(close) || !isFinite(notional)) return 0;
  if (entry <= 0 || close <= 0 || notional <= 0) return 0;

  if (type === "linear") {
    const qty = notional / entry;            // contract qty in base coin
    const diff = side === "short" ? entry - close : close - entry;
    return qty * diff;                        // USDT
  }

  if (type === "inverse") {
    // Inverse PnL in base coin: notional represents USD contract value
    const diff =
      side === "short"
        ? (1 / close) - (1 / entry)
        : (1 / entry) - (1 / close);
    return notional * diff;                   // base coin
  }

  return 0;
}

/**
 * ROI as a percentage of margin used.
 * @param {number} pnl - PnL in the same unit as margin
 * @param {number} margin - margin (collateral) used
 * @returns {number} ROI percent (e.g. 12.5 = +12.5%)
 */
export function calcRoi(pnl, margin) {
  if (!isFinite(pnl) || !isFinite(margin) || margin <= 0) return 0;
  return (pnl / margin) * 100;
}

/**
 * Closing PnL = raw PnL + received funding − fees.
 * Funding is signed: pass the funding amount where NEGATIVE = received.
 * Only the received portion (negative funding) is credited here.
 * @param {number} rawPnl
 * @param {number} fees - total trading fees (always a positive cost)
 * @param {number} funding - signed funding (negative = received, positive = paid)
 * @returns {number}
 */
export function calcClosingPnl(rawPnl, fees, funding) {
  if (!isFinite(rawPnl)) rawPnl = 0;
  if (!isFinite(fees) || fees < 0) fees = 0;
  if (!isFinite(funding)) funding = 0;
  const receivedFunding = funding < 0 ? -funding : 0;  // credit only if received
  return rawPnl + receivedFunding - fees;
}

/**
 * Position PnL = closing PnL − paid funding − |liquidation margin|.
 * Paid funding is the positive portion of the signed funding value.
 * @param {number} closingPnl
 * @param {number} funding - signed funding (positive = paid)
 * @param {number} liquidationMargin - margin lost at liquidation (0 if none)
 * @returns {number}
 */
export function calcPositionPnl(closingPnl, funding, liquidationMargin = 0) {
  if (!isFinite(closingPnl)) closingPnl = 0;
  if (!isFinite(funding)) funding = 0;
  if (!isFinite(liquidationMargin) || liquidationMargin < 0) liquidationMargin = 0;
  const paidFunding = funding > 0 ? funding : 0;       // deduct only if paid
  return closingPnl - paidFunding - Math.abs(liquidationMargin);
}
