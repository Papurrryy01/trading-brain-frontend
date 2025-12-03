// frontend/src/App.jsx
import React, { useMemo, useState, useEffect } from "react";
import TradingBrainCanvas from "./components/TradingBrainCanvas.jsx";
import TradingPlatformWidget from "./components/TradingPlatformWidget.jsx";

const MODE = import.meta.env.VITE_MODE || "full";
const isPublicDemo = MODE === "public";

export default function App() {
  // --- Demo pública: solo charts con CryptoCompare (sin backend/IA) ---
  if (isPublicDemo) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#0f172a",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          padding: "16px",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
              Trading Brain — Demo pública (solo charts)
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>
              Datos en vivo desde CryptoCompare. Sin backend, IA ni señales personalizadas.
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: "8px 10px",
              background: "rgba(51,65,85,0.4)",
            }}
          >
            Modo: <strong style={{ color: "#22c55e" }}>demo</strong> (VITE_MODE=public)
          </div>
        </div>

        <div
          style={{
            flex: 1,
            borderRadius: 12,
            border: "1px solid #1e293b",
            background: "#0b1220",
            boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: 13,
              color: "#cbd5e1",
            }}
          >
            <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
              Trading Platform · CryptoCompare feed
            </span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              WS público · sin llamadas a backend propio
            </span>
          </div>
          <div style={{ height: "100%" }}>
            <TradingPlatformWidget />
          </div>
        </div>
      </div>
    );
  }
  const [analysis, setAnalysis] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [symbol, setSymbol] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState("candles");
  const [logScale, setLogScale] = useState(false);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [clearDrawingsSignal, setClearDrawingsSignal] = useState(0);
  const [undoDrawingsSignal, setUndoDrawingsSignal] = useState(0);
  const [activeIndicators, setActiveIndicators] = useState([
    { id: "sma-20", type: "sma", length: 20, label: "SMA 20" },
    { id: "ema-50", type: "ema", length: 50, label: "EMA 50" },
  ]);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [triggered, setTriggered] = useState([]);
  const [indicatorDraft, setIndicatorDraft] = useState({});
  const [alertDraft, setAlertDraft] = useState({ price: "", type: "above", note: "" });
  const [replay, setReplay] = useState({ mode: "live", speed: 1, cursor: null });
  const [compareSymbols, setCompareSymbols] = useState([]);
  const [compareDraft, setCompareDraft] = useState({ symbol: "", color: "#ec4899" });
  const [showCompare, setShowCompare] = useState(false);
  const [drawingSettings, setDrawingSettings] = useState({ snap: true });
  const [comparePercent, setComparePercent] = useState(false);
  const [showTradingPlatform, setShowTradingPlatform] = useState(false);
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn("Sound not supported", e);
    }
  };

  // sync draft when opening indicators
  useEffect(() => {
    if (showIndicators) {
      const map = {};
      activeIndicators.forEach((ind) => {
        map[ind.id] = true;
      });
      setIndicatorDraft(map);
    }
  }, [showIndicators, activeIndicators]);

  const watchlist = useMemo(
    () => [
      {
        header: "INDICES",
        items: [
          { name: "SPX", price: "6,829.38", change: 16.76, pct: 0.25, up: true },
          { name: "NDQ", price: "25,555.87", change: 213.0, pct: 0.84, up: true },
          { name: "DJI", price: "47,474.48", change: 185.13, pct: 0.39, up: true },
          { name: "VIX", price: "16.59", change: -0.65, pct: -3.77, up: false },
          { name: "DXY", price: "99.340", change: -0.067, pct: -0.07, up: false },
        ],
      },
      {
        header: "STOCKS",
        items: [
          { name: "AAPL", price: "286.19", change: 3.09, pct: 1.09, up: true },
          { name: "TSLA", price: "429.24", change: -9.0, pct: -0.21, up: false },
        ],
      },
    ],
    []
  );

  const timeframeList = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "All"];
  const indicatorOptions = [
    { id: "sma-20", type: "sma", length: 20, label: "SMA 20" },
    { id: "ema-50", type: "ema", length: 50, label: "EMA 50" },
    { id: "rsi-14", type: "rsi", length: 14, label: "RSI 14" },
    { id: "vol-basic", type: "volume", label: "Volume" },
    { id: "bb-20-2", type: "bb", length: 20, mult: 2, label: "Bollinger 20/2" },
    { id: "macd-12-26-9", type: "macd", fast: 12, slow: 26, signal: 9, label: "MACD 12/26/9" },
  ];

  const drawingTools = [
    { id: "line", icon: "／", label: "Line" },
    { id: "ray", icon: "↗", label: "Ray" },
    { id: "hline", icon: "━", label: "H-Line" },
    { id: "vline", icon: "┃", label: "V-Line" },
    { id: "rectangle", icon: "▭", label: "Rectangle" },
    { id: "fib", icon: "≋", label: "Fib" },
    { id: "channel", icon: "⇔", label: "Channel" },
    { id: "brush", icon: "✏️", label: "Brush" },
    { id: "text", icon: "T", label: "Text (mock)" },
    { id: "ellipse", icon: "⬭", label: "Ellipse (mock)" },
    { id: "arrow", icon: "➜", label: "Arrow" },
  ];

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f7f8fa",
        color: "#0f172a",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
      height: 56,
      padding: "0 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
          borderBottom: "1px solid #e2e8f0",
      background: "#ffffff",
    }}
  >
        <span style={{ fontSize: 18, color: "#0f172a" }}>☰</span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "6px 10px",
            background: "#f8fafc",
          }}
        >
          <span style={{ fontSize: 14, color: "#475569" }}>🔍</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              minWidth: 80,
              color: "#0f172a",
            }}
          />
          <div
            style={{
              height: 18,
              width: 1,
              background: "#e2e8f0",
              margin: "0 6px",
            }}
          />
          <span style={{ fontSize: 12, color: "#475569" }}>D</span>
          <span style={{ fontSize: 12, color: "#475569" }}>FX</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={pillButton(timeframe === "1D")} onClick={() => setTimeframe("1D")}>
            1D
          </button>
          <button style={pillButton(timeframe === "1W")} onClick={() => setTimeframe("1W")}>
            1W
          </button>
          <button style={pillButton(timeframe === "1M")} onClick={() => setTimeframe("1M")}>
            1M
          </button>
          <button
            style={pillButton(timeframe === "1H")}
            onClick={() => setTimeframe("1H")}
          >
            1H
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
          <button style={chipButton(chartType === "candles")} onClick={() => setChartType("candles")}>
            Candles
          </button>
          <button style={chipButton(chartType === "line")} onClick={() => setChartType("line")}>
            Line
          </button>
          <button style={chipButton(chartType === "area")} onClick={() => setChartType("area")}>
            Area
          </button>
          <button style={chipButton(logScale)} onClick={() => setLogScale((v) => !v)}>
            Log
          </button>
        </div>
        <div style={{ flex: 1 }} />
        <button style={ghostButton} onClick={() => setShowIndicators(true)}>
          Indicators
        </button>
        <button style={ghostButton} onClick={() => setShowAlerts(true)}>
          Alert
        </button>
        <button
          style={ghostButton}
          onClick={() =>
            setReplay((prev) =>
              prev.mode === "live" ? { mode: "replay", speed: 2, cursor: null } : { mode: "live", speed: 1, cursor: null }
            )
          }
        >
          {replay.mode === "live" ? "Replay" : "Live"}
        </button>
        <button
          style={ghostButton}
          onClick={() => {
            setCompareDraft({ symbol: "", color: "#ec4899" });
            setShowCompare(true);
          }}
        >
          Compare
        </button>
        <span style={{ fontSize: 16, color: "#475569" }}>⟳</span>
        <button
          style={ghostButton}
          onClick={() => setShowTradingPlatform((v) => !v)}
        >
          {showTradingPlatform ? "Hide Trading Platform" : "Show Trading Platform"}
        </button>
        <button style={ghostButton}>Save</button>
        <button style={primaryButton}>Publish</button>
      </div>

      {showTradingPlatform && (
        <div style={{ padding: "10px 10px 0 10px" }}>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#ffffff",
              padding: 8,
              boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
              minHeight: 560,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                padding: "0 8px",
                fontSize: 13,
                color: "#475569",
              }}
            >
              <span style={{ fontWeight: 700, color: "#111827" }}>
                Trading Platform (TradingView + Broker mock)
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                Uses CryptoCompare datafeed & WebSocket streaming
              </span>
            </div>
            <TradingPlatformWidget />
          </div>
        </div>
      )}

      {/* MAIN AREA */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "54px minmax(0, 1fr) 360px",
          gridTemplateRows: "1fr auto",
          columnGap: 6,
          rowGap: 0,
          padding: "6px 10px 0 10px",
        }}
      >
        {/* LEFT TOOLBAR */}
        <div
          style={{
            borderRight: "1px solid #e2e8f0",
            background: "#ffffff",
            borderRadius: 12,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {drawingTools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() =>
                  setActiveTool((prev) => (prev === tool.id ? null : tool.id))
                }
                title={tool.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: isActive ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: isActive ? "#eff6ff" : "#ffffff",
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 14, color: isActive ? "#2563eb" : "#475569" }}>
                  {tool.icon}
                </span>
              </button>
            );
          })}
          <div style={{ width: 32, height: 1, background: "#e2e8f0", margin: "4px 0" }} />
          <button
            onClick={() => setUndoDrawingsSignal((n) => n + 1)}
            title="Undo"
            style={sideTool()}
          >
            ↺
          </button>
          <button
            onClick={() => setClearDrawingsSignal((n) => n + 1)}
            title="Clear"
            style={sideTool()}
          >
            🗑️
          </button>
          <div style={{ width: 32, height: 1, background: "#e2e8f0", margin: "4px 0" }} />
          <button
            onClick={() =>
              setDrawingSettings((prev) => ({ ...prev, snap: !prev.snap }))
            }
            title="Snap H/V"
            style={sideTool()}
          >
            {drawingSettings.snap ? "⊞" : "⊟"}
          </button>
        </div>

        {/* CENTER: CHART CANVAS */}
        <div
          style={{
            position: "relative",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 40,
              borderBottom: "1px dashed #e2e8f0",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 12,
              fontSize: 13,
              color: "#475569",
            }}
          >
            <div style={{ fontWeight: 600, color: "#111827" }}>{symbol} · {timeframe}</div>
            <div>O 1.16970</div>
            <div>H 1.17545</div>
            <div>L 1.16970</div>
            <div>C 1.17265</div>
            <div style={{ color: "#16a34a" }}>+0.22%</div>
          </div>
          <TradingBrainCanvas
            onAnalysis={setAnalysis}
            activeTool={activeTool}
            symbol={symbol}
            timeframe={timeframe}
            chartType={chartType}
            logScale={logScale}
            drawingsVisible={drawingsVisible}
            clearDrawingsSignal={clearDrawingsSignal}
            undoDrawingsSignal={undoDrawingsSignal}
            activeIndicators={activeIndicators}
            alerts={alerts}
            onAlertTriggered={(alert, candle) => {
              setTriggered((prev) => [
                {
                  ...alert,
                  triggeredAt: candle?.time,
                  price: alert.price ?? candle?.close,
                },
                ...prev,
              ]);
              if (alert.action === "sound") playBeep();
              setAlerts((prev) =>
                prev.map((a) =>
                  a.id === alert.id
                    ? {
                        ...a,
                        triggered: true,
                        triggeredAt: candle?.time,
                        lastPrice: candle?.close,
                      }
                    : a
                )
              );
            }}
            replay={replay}
            compareSymbols={compareSymbols}
            drawingSettings={drawingSettings}
            comparePercentScale={comparePercent}
          />
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 12,
            display: "flex",
            gap: 6,
          }}
        >
          {timeframeList.map((tf) => (
            <button
              key={tf}
              style={chipButton(timeframe === tf)}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
          <div
            style={{
              position: "absolute",
              right: 16,
              bottom: 12,
              display: "flex",
              gap: 6,
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "6px 8px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
            }}
          >
            <button
              style={ghostButton}
              onClick={() => setReplay({ mode: "replay", speed: 1, cursor: null })}
            >
              Play
            </button>
            <button
              style={ghostButton}
              onClick={() => setReplay((prev) => ({ ...prev, speed: Math.max((prev.speed || 1) - 1, 1), mode: "replay" }))}
            >
              -Speed
            </button>
            <button
              style={ghostButton}
              onClick={() => setReplay((prev) => ({ ...prev, speed: (prev.speed || 1) + 1, mode: "replay" }))}
            >
              +Speed
            </button>
            <button
              style={ghostButton}
              onClick={() => setReplay((prev) => ({ ...prev, cursor: Math.max((prev.cursor ?? (analysis?.candles?.length || 0)) - 1, 0), mode: "replay" }))}
            >
              Step ←
            </button>
            <button
              style={ghostButton}
              onClick={() => setReplay((prev) => ({ ...prev, cursor: (prev.cursor ?? 0) + 1, mode: "replay" }))}
            >
              Step →
            </button>
            <button
              style={ghostButton}
              onClick={() => setReplay((prev) => ({ ...prev, cursor: 0, mode: "replay" }))}
            >
              Jump Start
            </button>
            <button
              style={ghostButton}
              onClick={() => setReplay((prev) => ({ ...prev, cursor: 99999, mode: "replay" }))}
            >
              Jump End
            </button>
            <button
              style={ghostButton}
              onClick={() => setReplay({ mode: "live", speed: 1, cursor: null })}
            >
              Live
            </button>
            {replay.mode === "live" ? (
              <span style={{ fontSize: 12, color: "#16a34a" }}>● Live</span>
            ) : (
              <span style={{ fontSize: 12, color: "#ef4444" }}>Replay</span>
            )}
            {compareSymbols.length > 0 && (
              <button
                style={ghostButton}
                onClick={() => setComparePercent((v) => !v)}
              >
                {comparePercent ? "% Scale" : "$ Scale"}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                Watchlist
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Personal</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, color: "#475569" }}>★</span>
              <span style={{ fontSize: 14, color: "#475569" }}>☰</span>
              <span
                style={{
                  fontSize: 14,
                  color: drawingsVisible ? "#2563eb" : "#cbd5e1",
                  cursor: "pointer",
                }}
                onClick={() => setDrawingsVisible((v) => !v)}
              >
                👁
              </span>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "0 12px 12px 12px" }}>
            {watchlist.map((group) => (
              <div key={group.header} style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    letterSpacing: 0.4,
                    marginBottom: 4,
                  }}
                >
                  {group.header}
                </div>
                {group.items.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 6px",
                      borderRadius: 8,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {item.price}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: item.up ? "#16a34a" : "#ef4444" }}>
                        {item.change.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: item.up ? "#16a34a" : "#ef4444" }}>
                        {item.pct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>{symbol}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              1.16228 USD
            </div>
            <div style={{ fontSize: 12, color: "#ef4444" }}>-0.00001 · 0.00%</div>
            <div style={{ fontSize: 12, color: "#16a34a" }}>Market open</div>
            <div
              style={{
                fontSize: 12,
                color: "#475569",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 10,
              }}
            >
              2 hours ago · Dollar rebounds vs yen; euro firmer after inflation data
            </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>
            Alerts
          </div>
          {alerts.length === 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              No active alerts.
            </div>
          )}
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  fontSize: 12,
                  color: a.triggered ? "#16a34a" : "#0f172a",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>
                  {a.type === "above" ? "≥" : a.type === "below" ? "≤" : "Cross indicator"}{" "}
                  {a.price ?? a.indicatorValue ?? ""}
                  {a.indicatorLabel ? ` (${a.indicatorLabel})` : ""}
                  {a.note ? ` · ${a.note}` : ""}
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {a.triggered && <span>Triggered</span>}
                  <button
                    style={ghostButton}
                    onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {triggered.length > 0 && (
              <div style={{ fontSize: 11, color: "#475569" }}>
                Last trigger: {triggered[0].type === "above" ? "≥" : "≤"}{" "}
                {triggered[0].price} {triggered[0].note ? `· ${triggered[0].note}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* bottom placeholder bar */}
        <div style={{ gridColumn: "1 / span 3", borderTop: "1px solid #e2e8f0", background: "#ffffff", height: 46, display: "flex", alignItems: "center", padding: "0 12px", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#475569" }}>Pine Editor</div>
          <div style={{ fontSize: 13, color: "#475569" }}>Trading Panel</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: "#94a3b8" }}>22:46:04 UTC</div>
        </div>
      </div>

      {showIndicators && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <span style={{ fontWeight: 700 }}>Indicators</span>
              <button style={ghostButton} onClick={() => setShowIndicators(false)}>
                Close
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {indicatorOptions.map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={!!indicatorDraft[opt.id]}
                      onChange={(e) =>
                        setIndicatorDraft((prev) => ({
                          ...prev,
                          [opt.id]: e.target.checked,
                        }))
                      }
                    />
                    <span>{opt.label}</span>
                  </label>
                  {indicatorDraft[opt.id] && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                      {"length" in opt && (
                        <label>
                          Len:
                          <input
                            type="number"
                            min="1"
                            style={{ ...inputStyle, width: 80, display: "inline-block", marginLeft: 6 }}
                            value={opt.length}
                            onChange={(e) =>
                              setIndicatorDraft((prev) => ({
                                ...prev,
                                [`${opt.id}-len`]: Number(e.target.value),
                                [opt.id]: true,
                              }))
                            }
                          />
                        </label>
                      )}
                      {"mult" in opt && (
                        <label>
                          Mult:
                          <input
                            type="number"
                            step="0.1"
                            style={{ ...inputStyle, width: 80, display: "inline-block", marginLeft: 6 }}
                            value={opt.mult}
                            onChange={(e) =>
                              setIndicatorDraft((prev) => ({
                                ...prev,
                                [`${opt.id}-mult`]: Number(e.target.value),
                                [opt.id]: true,
                              }))
                            }
                          />
                        </label>
                      )}
                      {"fast" in opt && (
                        <label>
                          Fast:
                          <input
                            type="number"
                            style={{ ...inputStyle, width: 80, display: "inline-block", marginLeft: 6 }}
                            value={opt.fast}
                            onChange={(e) =>
                              setIndicatorDraft((prev) => ({
                                ...prev,
                                [`${opt.id}-fast`]: Number(e.target.value),
                                [opt.id]: true,
                              }))
                            }
                          />
                        </label>
                      )}
                      {"slow" in opt && (
                        <label>
                          Slow:
                          <input
                            type="number"
                            style={{ ...inputStyle, width: 80, display: "inline-block", marginLeft: 6 }}
                            value={opt.slow}
                            onChange={(e) =>
                              setIndicatorDraft((prev) => ({
                                ...prev,
                                [`${opt.id}-slow`]: Number(e.target.value),
                                [opt.id]: true,
                              }))
                            }
                          />
                        </label>
                      )}
                      {"signal" in opt && (
                        <label>
                          Signal:
                          <input
                            type="number"
                            style={{ ...inputStyle, width: 80, display: "inline-block", marginLeft: 6 }}
                            value={opt.signal}
                            onChange={(e) =>
                              setIndicatorDraft((prev) => ({
                                ...prev,
                                [`${opt.id}-signal`]: Number(e.target.value),
                                [opt.id]: true,
                              }))
                            }
                          />
                        </label>
                      )}
                      <label>
                        Color:
                        <input
                          type="color"
                          style={{ ...inputStyle, width: 60, padding: 2, marginLeft: 6 }}
                          value={indicatorDraft[`${opt.id}-color`] || "#2563eb"}
                          onChange={(e) =>
                            setIndicatorDraft((prev) => ({
                              ...prev,
                              [`${opt.id}-color`]: e.target.value,
                              [opt.id]: true,
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button style={ghostButton} onClick={() => setShowIndicators(false)}>
                Cancel
              </button>
              <button
                style={primaryButton}
                onClick={() => {
                  const selected = indicatorOptions
                    .filter((opt) => indicatorDraft[opt.id])
                    .map((opt) => ({
                      ...opt,
                      length: indicatorDraft[`${opt.id}-len`] || opt.length,
                      mult: indicatorDraft[`${opt.id}-mult`] || opt.mult,
                      fast: indicatorDraft[`${opt.id}-fast`] || opt.fast,
                      slow: indicatorDraft[`${opt.id}-slow`] || opt.slow,
                      signal: indicatorDraft[`${opt.id}-signal`] || opt.signal,
                      color: indicatorDraft[`${opt.id}-color`] || opt.color,
                    }));
                  setActiveIndicators(selected);
                  setShowIndicators(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlerts && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <span style={{ fontWeight: 700 }}>Create Alert</span>
              <button style={ghostButton} onClick={() => setShowAlerts(false)}>
                Close
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 13, color: "#475569" }}>
                Condition
                <select
                  value={alertDraft.type}
                  onChange={(e) =>
                    setAlertDraft((prev) => ({ ...prev, type: e.target.value }))
                  }
                  style={inputStyle}
                >
                  {alertConditions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              {(alertDraft.type === "above" || alertDraft.type === "below") && (
                <label style={{ fontSize: 13, color: "#475569" }}>
                  Price level
                  <input
                    type="number"
                    value={alertDraft.price}
                    onChange={(e) =>
                      setAlertDraft((prev) => ({ ...prev, price: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </label>
              )}
              {alertDraft.type === "indicator-cross" && (
                <>
                  <label style={{ fontSize: 13, color: "#475569" }}>
                    Indicator value (mock)
                    <input
                      type="number"
                      value={alertDraft.indicatorValue || ""}
                      onChange={(e) =>
                        setAlertDraft((prev) => ({
                          ...prev,
                          indicatorValue: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ fontSize: 13, color: "#475569" }}>
                    Direction
                    <select
                      value={alertDraft.direction || "up"}
                      onChange={(e) =>
                        setAlertDraft((prev) => ({ ...prev, direction: e.target.value }))
                      }
                      style={inputStyle}
                    >
                      <option value="up">Crossing Up</option>
                      <option value="down">Crossing Down</option>
                    </select>
                  </label>
                </>
              )}
              <label style={{ fontSize: 13, color: "#475569" }}>
                Expires (minutes)
                <input
                  type="number"
                  value={alertDraft.expires || ""}
                  onChange={(e) =>
                    setAlertDraft((prev) => ({ ...prev, expires: e.target.value }))
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: 13, color: "#475569" }}>
                Action
                <select
                  value={alertDraft.action || "notify"}
                  onChange={(e) =>
                    setAlertDraft((prev) => ({ ...prev, action: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="notify">Notify</option>
                  <option value="sound">Sound</option>
                  <option value="log">Log only</option>
                </select>
              </label>
              <label style={{ fontSize: 13, color: "#475569" }}>
                Note
                <input
                  value={alertDraft.note || ""}
                  onChange={(e) => setAlertDraft((prev) => ({ ...prev, note: e.target.value }))}
                  style={inputStyle}
                  placeholder="optional note"
                />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button style={ghostButton} onClick={() => setShowAlerts(false)}>
                Cancel
              </button>
              <button
                style={primaryButton}
                onClick={() => {
                  if (
                    (alertDraft.type === "above" || alertDraft.type === "below") &&
                    !alertDraft.price
                  )
                    return;
                  setAlerts((prev) => [
                    {
                      id: `alert-${Date.now()}`,
                      price: alertDraft.price ? Number(alertDraft.price) : null,
                      type: alertDraft.type,
                      indicatorValue: alertDraft.indicatorValue
                        ? Number(alertDraft.indicatorValue)
                        : null,
                      direction: alertDraft.direction || "up",
                      expires: alertDraft.expires ? Number(alertDraft.expires) : null,
                      action: alertDraft.action || "notify",
                      indicatorLabel:
                        alertDraft.type === "indicator-cross" ? "Indicator" : null,
                      note: alertDraft.note || "",
                      createdAt: Date.now(),
                      triggered: false,
                    },
                    ...prev,
                  ]);
                  setAlertDraft({ price: "", type: "above", note: "" });
                  setShowAlerts(false);
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompare && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <span style={{ fontWeight: 700 }}>Compare Symbol</span>
              <button style={ghostButton} onClick={() => setShowCompare(false)}>
                Close
              </button>
            </div>
            <label style={{ fontSize: 13, color: "#475569" }}>
              Symbol
              <input
                value={compareDraft.symbol}
                onChange={(e) =>
                  setCompareDraft((prev) => ({ ...prev, symbol: e.target.value }))
                }
                style={inputStyle}
                placeholder="e.g. DXY"
              />
            </label>
            <label style={{ fontSize: 13, color: "#475569" }}>
              Color
              <input
                type="color"
                value={compareDraft.color}
                onChange={(e) =>
                  setCompareDraft((prev) => ({ ...prev, color: e.target.value }))
                }
                style={{ ...inputStyle, padding: 4, height: 40 }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={ghostButton} onClick={() => setShowCompare(false)}>
                Cancel
              </button>
              <button
                style={primaryButton}
                onClick={() => {
                  if (!compareDraft.symbol.trim()) return;
                  setCompareSymbols((prev) => [
                    {
                      id: `${compareDraft.symbol}-${Date.now()}`,
                      label: compareDraft.symbol,
                      color: compareDraft.color,
                    },
                    ...prev,
                  ]);
                  setShowCompare(false);
                }}
              >
                Add
              </button>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={comparePercent}
                onChange={(e) => setComparePercent(e.target.checked)}
              />
              Show as % change
            </label>
            {compareSymbols.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
                  Active overlays
                </div>
                {compareSymbols.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      marginBottom: 6,
                    }}
                    >
                      <span style={{ fontSize: 12 }}>
                        <span style={{ marginRight: 8, color: c.color }}>●</span>
                        {c.label}
                      </span>
                    <button
                      style={ghostButton}
                      onClick={() =>
                        setCompareSymbols((prev) => prev.filter((x) => x.id !== c.id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pillButton = (active) => ({
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 10,
  border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
  background: active ? "#eff6ff" : "#ffffff",
  color: active ? "#2563eb" : "#0f172a",
  cursor: "pointer",
});

const chipButton = (active) => ({
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 10,
  border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
  background: active ? "#eff6ff" : "#ffffff",
  color: active ? "#2563eb" : "#0f172a",
  cursor: "pointer",
});

const ghostButton = {
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
};

const primaryButton = {
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
};

const sideTool = () => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
};

const modalCard = {
  width: 360,
  background: "#ffffff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 20px 60px rgba(15,23,42,0.2)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: 13,
  color: "#0f172a",
  outline: "none",
};
  const alertConditions = [
    { id: "above", label: "Price crossing above" },
    { id: "below", label: "Price crossing below" },
    { id: "indicator-cross", label: "Price crossing indicator" },
  ];
