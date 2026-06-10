import { useState } from "react";
import { t } from "./i18n/index.js";
import { calcRawPnl, calcRoi, calcClosingPnl, calcPositionPnl } from "./logic/pnl.js";
import { calcTradingFees, calcFunding } from "./logic/fees.js";
import { calcRR, deriveTpFromSl, deriveSlFromTp } from "./logic/rr.js";
import { solveRisk } from "./logic/risk.js";
import { calcTargetClose } from "./logic/money.js";
import { calcBreakEven } from "./logic/breakeven.js";
import { listItems, saveItem, deleteItem, getItem } from "./logic/storage.js";

const fmt = (n, d = 2) => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
};
const sign = (n) => (n >= 0 ? "+" : "");
const cls = (n) => (n == null ? "" : n >= 0 ? "pos" : "neg");

function SolverField({ label, value, setValue, solvedVal, decimals = 2, suffix = "" }) {
  const isFaded = (value === "" || value == null) && solvedVal != null && isFinite(solvedVal);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          value={value}
          placeholder={isFaded ? `${fmt(solvedVal, decimals)}${suffix}` : "—"}
          onChange={(e) => setValue(e.target.value)}
          style={isFaded ? { borderColor: "rgba(0,153,255,0.3)", color: "var(--muted)" } : {}}
        />
        {isFaded && (
          <button
            onClick={() => setValue(solvedVal.toFixed(decimals))}
            title="Confirm this calculated value"
            style={{
              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
              background: "rgba(0,153,255,0.15)", color: "var(--accent2)",
              border: "1px solid rgba(0,153,255,0.35)", borderRadius: 2,
              fontSize: 9, padding: "2px 6px", cursor: "pointer", letterSpacing: "0.5px"
            }}>
            ✓ use
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [side, setSide] = useState("long");
  const [type, setType] = useState("linear");
  const [entry, setEntry] = useState("");
  const [close, setClose] = useState("");
  const [leverage, setLeverage] = useState("10");
  const [margin, setMargin] = useState("");
  const [notional, setNotional] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [rrMult, setRrMult] = useState("");
  const [makerFee, setMakerFee] = useState("0.02");
  const [takerFee, setTakerFee] = useState("0.05");
  const [entryTaker, setEntryTaker] = useState(true);
  const [closeTaker, setCloseTaker] = useState(true);
  const [fundingRate, setFundingRate] = useState("0.01");
  const [fundingPeriods, setFundingPeriods] = useState("3");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [rsEntry, setRsEntry] = useState("");
  const [rsSl, setRsSl] = useState("");
  const [rsRiskPct, setRsRiskPct] = useState("");
  const [rsLeverage, setRsLeverage] = useState("");
  const [rsMargin, setRsMargin] = useState("");
  const [rsNotional, setRsNotional] = useState("");

  const [mmEntry, setMmEntry] = useState("");
  const [mmNotional, setMmNotional] = useState("");
  const [mmMargin, setMmMargin] = useState("");
  const [mmTargetRoi, setMmTargetRoi] = useState("");

  // Save/load state
  const [draftName, setDraftName] = useState("");
  const [drafts, setDrafts] = useState(() => listItems("drafts"));
  const [selectedDraft, setSelectedDraft] = useState("");

  const livePreview = (() => {
    const e = parseFloat(entry);
    const s = parseFloat(sl);
    const p = parseFloat(tp);
    if (!e || (!s && !p)) return null;
    const rr = (s && p) ? calcRR(side, e, s, p) : null;
    return { rr };
  })();

  const derived = (() => {
    const e = parseFloat(entry);
    const m = parseFloat(rrMult);
    if (!e || !m || m <= 0) return null;
    const s = parseFloat(sl);
    const p = parseFloat(tp);
    if (s && !p) { const v = deriveTpFromSl(side, e, s, m); return v != null ? { field: "tp", value: v } : null; }
    if (p && !s) { const v = deriveSlFromTp(side, e, p, m); return v != null ? { field: "sl", value: v } : null; }
    return null;
  })();

  const applyDerived = () => {
    if (!derived) return;
    if (derived.field === "tp") setTp(derived.value.toFixed(2));
    if (derived.field === "sl") setSl(derived.value.toFixed(2));
    setRrMult("");
  };

  const solved = solveRisk({
    side, entry: rsEntry, sl: rsSl, riskPct: rsRiskPct,
    leverage: rsLeverage, margin: rsMargin, notional: rsNotional,
  });

  const resetSolver = () => {
    setRsEntry(""); setRsSl(""); setRsRiskPct("");
    setRsLeverage(""); setRsMargin(""); setRsNotional("");
  };

  const mmResult = calcTargetClose({
    side,
    entry: parseFloat(mmEntry),
    notional: parseFloat(mmNotional),
    margin: parseFloat(mmMargin),
    targetRoi: parseFloat(mmTargetRoi),
  });

  const resetMoney = () => {
    setMmEntry(""); setMmNotional(""); setMmMargin(""); setMmTargetRoi("");
  };

  // ── Save / Load draft ──
  const currentConfig = () => ({
    side, type, entry, close, leverage, margin, notional, sl, tp,
    makerFee, takerFee, entryTaker, closeTaker, fundingRate, fundingPeriods,
  });

  const saveDraft = () => {
    const saved = saveItem("drafts", draftName, currentConfig());
    if (saved) {
      setDrafts(listItems("drafts"));
      setDraftName("");
    }
  };

  const loadDraft = (id) => {
    setSelectedDraft(id);
    if (!id) return;
    const item = getItem("drafts", id);
    if (!item || !item.data) return;
    const d = item.data;
    setSide(d.side ?? "long"); setType(d.type ?? "linear");
    setEntry(d.entry ?? ""); setClose(d.close ?? "");
    setLeverage(d.leverage ?? "10"); setMargin(d.margin ?? "");
    setNotional(d.notional ?? ""); setSl(d.sl ?? ""); setTp(d.tp ?? "");
    setMakerFee(d.makerFee ?? "0.02"); setTakerFee(d.takerFee ?? "0.05");
    setEntryTaker(d.entryTaker ?? true); setCloseTaker(d.closeTaker ?? true);
    setFundingRate(d.fundingRate ?? "0.01"); setFundingPeriods(d.fundingPeriods ?? "3");
    setResult(null); setError("");
  };

  const removeDraft = () => {
    if (!selectedDraft) return;
    deleteItem("drafts", selectedDraft);
    setDrafts(listItems("drafts"));
    setSelectedDraft("");
  };

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
    const be = calcBreakEven({
      side, entry: parseFloat(entry), notional: nom,
      entryFee: fees.entryFee, closeFee: fees.exitFee, funding,
    });

    setResult({ rawPnl, fees, funding, closingPnl, positionPnl, roi, priceMove, margin: m, notional: nom, be });
  };

  const reset = () => {
    setEntry(""); setClose(""); setLeverage("10");
    setMargin(""); setNotional("");
    setSl(""); setTp(""); setRrMult("");
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
        <div className="panel">
          <div className="panel-title">Position Setup</div>
          <div className="panel-body">

            {/* SAVE / LOAD BAR */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                type="text" placeholder="Name this setup…" value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                style={{
                  flex: "1 1 120px", background: "var(--bg)", border: "1px solid var(--border)",
                  color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12,
                  padding: "6px 8px", borderRadius: 3
                }}
              />
              <button className="btn" onClick={saveDraft} disabled={!draftName.trim()}
                style={{
                  background: draftName.trim() ? "rgba(0,212,170,0.15)" : "transparent",
                  color: draftName.trim() ? "var(--accent)" : "var(--muted)",
                  border: `1px solid ${draftName.trim() ? "rgba(0,212,170,0.35)" : "var(--border)"}`,
                  cursor: draftName.trim() ? "pointer" : "not-allowed"
                }}>
                {t("actions.save")}
              </button>
              <select value={selectedDraft} onChange={(e) => loadDraft(e.target.value)}
                style={{
                  flex: "1 1 120px", background: "var(--bg)", border: "1px solid var(--border)",
                  color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12,
                  padding: "6px 8px", borderRadius: 3
                }}>
                <option value="">Load saved…</option>
                {drafts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {selectedDraft && (
                <button className="btn" onClick={removeDraft}
                  style={{ background: "rgba(255,69,96,0.1)", color: "var(--red)", border: "1px solid rgba(255,69,96,0.25)" }}>
                  ✕
                </button>
              )}
            </div>

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

            <div className="section-divider">Risk Levels</div>
            <div className="field-grid">
              <div className="field">
                <label>{t("fields.stopLoss")}</label>
                <input type="number" placeholder="price" value={sl} onChange={(e) => setSl(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("fields.takeProfit")}</label>
                <input type="number" placeholder="price" value={tp} onChange={(e) => setTp(e.target.value)} />
              </div>
            </div>

            {livePreview && livePreview.rr != null && (
              <div style={{
                padding: "8px 10px", marginBottom: 8,
                background: "rgba(0,212,170,0.06)",
                border: "1px solid rgba(0,212,170,0.25)",
                borderRadius: 3, fontSize: 11, color: "var(--accent)",
                letterSpacing: "1px", textAlign: "center"
              }}>
                {t("results.riskReward")}: {fmt(livePreview.rr, 2)} : 1
              </div>
            )}

            <div className="field-grid">
              <div className="field">
                <label>{t("fields.rrMultiplier")}</label>
                <input type="number" step="0.1" placeholder="e.g. 2.5" value={rrMult} onChange={(e) => setRrMult(e.target.value)} />
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button className="btn" onClick={applyDerived} disabled={!derived}
                  style={{
                    width: "100%", padding: "7px",
                    background: derived ? "rgba(0,153,255,0.15)" : "transparent",
                    color: derived ? "var(--accent2)" : "var(--muted)",
                    border: `1px solid ${derived ? "rgba(0,153,255,0.35)" : "var(--border)"}`,
                    cursor: derived ? "pointer" : "not-allowed"
                  }}>
                  {derived ? `Set ${derived.field.toUpperCase()} → ${fmt(derived.value, 2)}` : "Enter SL or TP + R:R"}
                </button>
              </div>
            </div>

            <button className="btn btn-calc" onClick={calculate}>{t("actions.calculate")}</button>
            {error && <div className="error-box">⚠ {error}</div>}
            <button className="btn btn-reset" onClick={reset}>↺ {t("actions.reset")}</button>
          </div>
        </div>

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

        {/* RISK SOLVER */}
        <div className="panel output-panel">
          <div className="panel-title">Risk Management Solver</div>
          <div className="panel-body">
            <p style={{ fontSize: 10, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>
              Fill any fields — the rest are calculated and shown faded. Click "✓ use" to lock a calculated value in. (Uses the {side.toUpperCase()} side selected above.)
            </p>
            <div className="field-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <SolverField label="Entry Price" value={rsEntry} setValue={setRsEntry} solvedVal={solved ? solved.entry : null} decimals={2} />
              <SolverField label="Stop Loss" value={rsSl} setValue={setRsSl} solvedVal={solved ? solved.sl : null} decimals={2} />
              <SolverField label="Risk %" value={rsRiskPct} setValue={setRsRiskPct} solvedVal={solved ? solved.riskPct : null} decimals={2} suffix="%" />
              <SolverField label="Leverage ×" value={rsLeverage} setValue={setRsLeverage} solvedVal={solved ? solved.leverage : null} decimals={2} />
              <SolverField label="Margin (USDT)" value={rsMargin} setValue={setRsMargin} solvedVal={solved ? solved.margin : null} decimals={2} />
              <SolverField label="Notional (USDT)" value={rsNotional} setValue={setRsNotional} solvedVal={solved ? solved.notional : null} decimals={2} />
            </div>
            {solved && solved.riskAmount != null && (
              <div style={{
                marginTop: 12, padding: "8px 10px",
                background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.25)",
                borderRadius: 3, fontSize: 11, color: "var(--accent)", letterSpacing: "1px", textAlign: "center"
              }}>
                Max risk at SL: ${fmt(solved.riskAmount, 2)}
                {solved.qty != null && <> · Position qty: {fmt(solved.qty, 4)}</>}
              </div>
            )}
            <button className="btn btn-reset" onClick={resetSolver} style={{ marginTop: 10 }}>↺ Reset Solver</button>
          </div>
        </div>

        {/* MONEY MANAGEMENT */}
        <div className="panel output-panel">
          <div className="panel-title">Money Management — Target Close</div>
          <div className="panel-body">
            <p style={{ fontSize: 10, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>
              Enter your entry, position size, and a target ROI% (negative for a loss target) to find the gross close price needed. (Uses the {side.toUpperCase()} side selected above. Price move only — fees excluded.)
            </p>
            <div className="field-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="field">
                <label>Entry Price</label>
                <input type="number" placeholder="0.00" value={mmEntry} onChange={(e) => setMmEntry(e.target.value)} />
              </div>
              <div className="field">
                <label>Notional (USDT)</label>
                <input type="number" placeholder="0.00" value={mmNotional} onChange={(e) => setMmNotional(e.target.value)} />
              </div>
              <div className="field">
                <label>Margin (USDT)</label>
                <input type="number" placeholder="0.00" value={mmMargin} onChange={(e) => setMmMargin(e.target.value)} />
              </div>
              <div className="field">
                <label>Target ROI %</label>
                <input type="number" placeholder="e.g. 50 or -30" value={mmTargetRoi} onChange={(e) => setMmTargetRoi(e.target.value)} />
              </div>
            </div>
            {mmResult && (
              <div style={{
                marginTop: 12, padding: "10px 12px",
                background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.25)",
                borderRadius: 3, fontSize: 12, color: "var(--accent)", letterSpacing: "0.5px", textAlign: "center"
              }}>
                Target close price: <strong>{fmt(mmResult.closePrice, 2)}</strong>
                {"  ·  "}target PnL: {sign(mmResult.targetPnl)}${fmt(mmResult.targetPnl, 2)}
                {"  ·  "}move: {sign(mmResult.priceMove)}{fmt((mmResult.priceMove / parseFloat(mmEntry)) * 100, 2)}%
              </div>
            )}
            <button className="btn btn-reset" onClick={resetMoney} style={{ marginTop: 10 }}>↺ Reset</button>
          </div>
        </div>

        {/* OUTPUT */}
        <div className="panel output-panel">
          <div className="panel-title">Position Analysis</div>
          <div className="panel-body">
            {!result ? (
              <div className="empty-state">Fill in your position and hit {t("actions.calculate")}</div>
            ) : (
              <>
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
                {result.be && (
                  <div className="result-cell">
                    <span className="rc-label">{t("results.breakEven")}</span>
                    <span className="rc-val" style={{ color: "var(--yellow)" }}>{fmt(result.be.breakEvenPrice, 2)}</span>
                    <span className="rc-sub">approx · {fmt(result.be.priceMove, 2)} move</span>
                  </div>
                )}
              </div>
              {result.be && result.be.approximate && (
                <p style={{ fontSize: 9, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
                  {t("notes.breakEvenApprox")}
                </p>
              )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
