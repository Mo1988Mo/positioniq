import { useState } from "react";
import { t } from "./i18n/index.js";
import { calcRawPnl, calcRoi, calcClosingPnl, calcPositionPnl } from "./logic/pnl.js";
import { calcTradingFees, calcFunding } from "./logic/fees.js";

const fmt = (n, d = 2) => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
};
const sign = (n) => (n >= 0 ? "+" : "");
const cls = (n) => (n == null ? "" : n >= 0 ? "pos" : "neg");

export default function App() {
  const [side, setSide] = useState("long");
  const [type, setType] = useState("linear");
  const [entry, setEntry] = useState("");
  const [close, setClose] = useState("");
  const [leverage, setLeverage] = useState("10");
  const [margin, setMargin] = useState("");
  const [notional, setNotional] = useState("");
  const [makerFee, setMakerFee] = useState("0.02");
  const [takerFee, setTakerFee] = useState("0.05");
  const [entryTaker, setEntryTaker] = useState(true);
  const [closeTaker, setCloseTaker] = useState(true);
  const [fundingRate, setFundingRate] = useState("0.01");
  const [fundingPeriods, setFundingPeriods] = useState("3");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Auto-sync margin → notional
  const onMargin = (v) => {
    setMargin(v);
    if (v && leverage) setNotional((parseFloat(v) * parseFloat(leverage)).toFixed(2));
  };

  const calculate = () => {
    setError("");
    if (!entry || parseFloat(entry) <= 0) return setError(t("errors.entryRequired"));
    if (!close || parseFloat(close) <= 0) return setError(t("errors.closeRequired"));
    if (!margin && !notional) return setError(t("errors.marginOrNotional"));
    if (!leverage || parseFloat(leverage) <= 0) return setError(t("errors.leverageInvalid"));

    const lev = parseFloat(leverage);
    let m = parseFloat(margin) || 0;
    let nom = parseFloat(notional) || 0;
    if (m && !nom) nom = m * lev;
    if (nom && !m) m = nom / lev;

    const rawPnl = calcRawPnl(side, parseFloat(entry), parseFloat(close), nom, type);
    const fees = calcTradingFees(
      nom,
      entryTaker ? parseFloat(takerFee) : parseFloat(makerFee),
      closeTaker ? parseFloat(takerFee) : parseFloat(makerFee)
    );
    const funding = calcFunding(nom, parseFloat(fundingRate), parseFloat(fundingPeriods));

    const closingPnl = calcClosingPnl(rawPnl, fees.total, funding);
    const positionPnl = calcPositionPnl(closingPnl, funding, 0);
    const roi = calcRoi(closingPnl, m);
    const priceMove = ((parseFloat(close) - parseFloat(entry)) / parseFloat(entry)) * 100;

    setResult({ rawPnl, fees, funding, closingPnl, positionPnl, roi, priceMove, margin: m, notional: nom });
  };

  const reset = () => {
    setEntry(""); setClose(""); setLeverage("10");
    setMargin(""); setNotional("");
    setMakerFee("0.02"); setTakerFee("0.05");
    setFundingRate("0.01"); setFundingPeriods("3");
    setEntryTaker(true); setCloseTaker(true);
    setResult(null); setError("");
  };

  return (
    <div className="app">
      <div className="header">
        <h1>POSITION<span>IQ</span></h1>
        <p>{t("app.tagline")}</p>
      </div>

      <div className="layout">
        {/* INPUT PANEL */}
        <div className="panel">
          <div className="panel-title">Position Setup</div>
          <div className="panel-body">
            <div className="side-toggle">
              <button className={`side-btn long${side === "long" ? " active" : ""}`} onClick={() => setSide("long")}>▲ {t("side.long")}</button>
              <button className={`side-btn short${side === "short" ? " active" : ""}`} onClick={() => setSide("short")}>▼ {t("side.short")}</button>
            </div>

            <div className="field">
              <label>{t("contractType.label")}</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="linear">{t("contractType.linear")}</option>
                <option value="inverse">{t("contractType.inverse")}</option>
              </select>
            </div>

            <div className="field-grid">
              <div className="field">
                <label>{t("fields.entryPrice")}</label>
                <input type="number" placeholder="0.00" value={entry} onChange={(e) => setEntry(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.closePrice")}</label>
                <input type="number" placeholder="0.00" value={close} onChange={(e) => setClose(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.leverage")}</label>
                <input type="number" placeholder="10" value={leverage} onChange={(e) => setLeverage(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.margin")}</label>
                <input type="number" placeholder="0.00" value={margin} onChange={(e) => onMargin(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.notional")}</label>
                <input type="number" placeholder="auto" value={notional} onChange={(e) => setNotional(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.qty")}</label>
                <input readOnly value={entry && notional ? fmt(parseFloat(notional) / parseFloat(entry), 4) : ""} placeholder="—" />
              </div>
            </div>

            <button className="btn btn-calc" onClick={calculate}>{t("actions.calculate")}</button>
            {error && <div className="error-box">⚠ {error}</div>}
            <button className="btn btn-reset" onClick={reset}>↺ {t("actions.reset")}</button>
          </div>
        </div>

        {/* FEES PANEL */}
        <div className="panel">
          <div className="panel-title">Fees &amp; Funding</div>
          <div className="panel-body">
            <div className="section-divider">Trading Fees</div>
            <div className="field-grid">
              <div className="field">
                <label>{t("fields.makerFee")}</label>
                <input type="number" step="0.001" value={makerFee} onChange={(e) => setMakerFee(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.takerFee")}</label>
                <input type="number" step="0.001" value={takerFee} onChange={(e) => setTakerFee(e.target.value)} />
              </div>
              <div className="field">
                <label>Entry Order</label>
                <select value={entryTaker ? "taker" : "maker"} onChange={(e) => setEntryTaker(e.target.value === "taker")}>
                  <option value="taker">Taker</option>
                  <option value="maker">Maker</option>
                </select>
              </div>
              <div className="field">
                <label>Close Order</label>
                <select value={closeTaker ? "taker" : "maker"} onChange={(e) => setCloseTaker(e.target.value === "taker")}>
                  <option value="taker">Taker</option>
                  <option value="maker">Maker</option>
                </select>
              </div>
            </div>

            <div className="section-divider">Funding (estimate)</div>
            <div className="field-grid">
              <div className="field">
                <label>{t("fields.fundingRate")}</label>
                <input type="number" step="0.001" value={fundingRate} onChange={(e) => setFundingRate(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.fundingPeriods")}</label>
                <input type="number" value={fundingPeriods} onChange={(e) => setFundingPeriods(e.target.value)} />
              </div>
            </div>
            <p style={{ fontSize: 9, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
              {t("notes.fundingEstimate")}
            </p>
          </div>
        </div>

        {/* OUTPUT PANEL */}
        <div className="panel output-panel">
          <div className="panel-title">Position Analysis</div>
          <div className="panel-body">
            {!result ? (
              <div className="empty-state">Fill in your position and hit {t("actions.calculate")}</div>
            ) : (
              <div className="results-grid">
                <div className="result-cell">
                  <span className="rc-label">{t("results.closingPnl")}</span>
                  <span className={`rc-val ${cls(result.closingPnl)}`}>{sign(result.closingPnl)}${fmt(result.closingPnl)}</span>
                  <span className="rc-sub">realized + funding − fees</span>
                </div>
                <div className="result-cell">
                  <span className="rc-label">{t("results.positionPnl")}</span>
                  <span className={`rc-val ${cls(result.positionPnl)}`}>{sign(result.positionPnl)}${fmt(result.positionPnl)}</span>
                  <span className="rc-sub">full position cost</span>
                </div>
                <div className="result-cell">
                  <span className="rc-label">{t("results.roi")}</span>
                  <span className={`rc-val ${cls(result.roi)}`}>{sign(result.roi)}{fmt(result.roi)}%</span>
                  <span className="rc-sub">on margin used</span>
                </div>
                <div className="result-cell">
                  <span className="rc-label">{t("results.priceMove")}</span>
                  <span className={`rc-val ${result.priceMove >= 0 ? "pos" : "neg"}`}>{sign(result.priceMove)}{fmt(result.priceMove)}%</span>
                  <span className="rc-sub">entry → close</span>
                </div>
                <div className="result-cell">
                  <span className="rc-label">Margin</span>
                  <span className="rc-val">${fmt(result.margin)}</span>
                  <span className="rc-sub">collateral</span>
                </div>
                <div className="result-cell">
                  <span className="rc-label">Nominal</span>
                  <span className="rc-val">${fmt(result.notional)}</span>
                  <span className="rc-sub">position value</span>
                </div>
                <div className="result-cell">
                  <span className="rc-label">{t("results.totalFees")}</span>
                  <span className="rc-val neg">−${fmt(result.fees.total)}</span>
                  <span className="rc-sub">entry + close</span>
                </div>
                <div className="result-cell">
                  <span className="rc-label">{t("results.fundingCost")}</span>
                  <span className={`rc-val ${result.funding > 0 ? "neg" : "pos"}`}>{result.funding > 0 ? "−" : "+"}${fmt(Math.abs(result.funding))}</span>
                  <span className="rc-sub">{result.funding > 0 ? "paid" : "received"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
