// PositionIQ — English strings (default language)
// All UI text lives here. Adding a language = copy this file (e.g. fa.js)
// and translate the values. Keys never change.

export default {
  app: {
    name: "PositionIQ",
    tagline: "Futures Position Calculator",
  },
  side: {
    long: "Long",
    short: "Short",
  },
  contractType: {
    label: "Contract Type",
    linear: "USDT-Margined",
    inverse: "Coin-Margined",
  },
  fields: {
    entryPrice: "Entry Price",
    closePrice: "Close Price",
    leverage: "Leverage",
    margin: "Margin (USDT)",
    notional: "Nominal Value (USDT)",
    qty: "Contract Qty",
    stopLoss: "Stop Loss",
    takeProfit: "Take Profit",
    makerFee: "Maker Fee %",
    takerFee: "Taker Fee %",
    fundingRate: "Funding Rate % / period",
    fundingPeriods: "Periods Held",
    riskPct: "Risk %",
    rrMultiplier: "R:R Multiplier",
    targetRoi: "Target ROI %",
  },
  results: {
    closingPnl: "Closing PnL",
    positionPnl: "Position PnL",
    roi: "ROI",
    breakEven: "Break-even",
    riskReward: "Risk : Reward",
    priceMove: "Price Move",
    totalFees: "Total Fees",
    fundingCost: "Funding Cost",
    liquidation: "Est. Liquidation",
  },
  actions: {
    calculate: "Calculate",
    reset: "Reset",
    save: "Save",
    load: "Load",
    share: "Share",
    addLeg: "Add",
    reduceLeg: "Reduce",
  },
  notes: {
    breakEvenApprox:
      "Break-even is approximate. Opening fee is exact; closing fee assumes your selected close order type — actual break-even shifts if you close as maker vs taker.",
    fundingEstimate:
      "Funding is volatile and user-entered. All funding figures are estimates based on the rate you provide.",
  },
  errors: {
    entryRequired: "Entry Price is required and must be greater than 0.",
    closeRequired: "Close Price is required and must be greater than 0.",
    marginOrNotional: "Enter either Margin or Nominal Value.",
    leverageInvalid: "Leverage must be greater than 0.",
    slWrongSideLong: "For a long, Stop Loss must be below entry.",
    slWrongSideShort: "For a short, Stop Loss must be above entry.",
  },
};
