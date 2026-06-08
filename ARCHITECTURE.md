# PositionIQ — Architecture

## Overview
A futures trading position calculator for retail traders.
Offline-first, multi-language ready, dark terminal UI.

## Planned Structure
positioniq/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/      # UI components
│   ├── logic/           # Pure calculation functions (no UI)
│   │   ├── pnl.js        # Closing PnL + Position PnL
│   │   ├── risk.js       # Risk management (position sizing)
│   │   ├── money.js      # Money management (target prices)
│   │   ├── rr.js         # R:R modes 1 & 2
│   │   ├── breakeven.js  # Break-even (with estimate disclaimer)
│   │   └── fees.js       # Maker/taker + funding
│   ├── i18n/            # Language files (en.js first)
│   └── styles/          # Dark terminal theme
└── tests/              # Edge case tests per logic module
## Core Principles
1. **Logic separated from UI** — all math is pure, testable functions
2. **Edge cases tested before commit** — no empty/zero/invalid inputs slip through
3. **Funding rate is always variable** — never hardcoded
4. **Break-even is approximate** — closing fee role unknown until close
5. **Isolated margin only** for v2 (cross margin later)

## Contract Types
- USDT-margined (linear)
- Coin-margined (inverse) — different PnL formula

## PnL Definitions
- **Closing PnL** = realized PnL + received funding − fees (excludes liquidation loss)
- **Position PnL** = ∑Closing PnL − paid funding − fees + |liquidation margin|
