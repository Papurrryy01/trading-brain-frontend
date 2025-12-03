// frontend/src/components/TradingBrainCanvas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createChart, PriceScaleMode } from "lightweight-charts";

const TOOL_META = {
  line: { points: 2 },
  trendline: { points: 2 },
  ray: { points: 2 },
  hline: { points: 1 },
  vline: { points: 1 },
  rectangle: { points: 2 },
  fib: { points: 2 },
  channel: { points: 3 },
  brush: { points: 0, freehand: true },
  arrow: { points: 2 },
  text: { points: 1, label: true },
  label: { points: 1, label: true },
};

const DEFAULT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const stripTrailingSlash = (url = "") =>
  url.endsWith("/") ? url.slice(0, -1) : url;
// Base URLs configurables para consumir la API desde red pública
const API_BASE_URL =
  stripTrailingSlash(import.meta.env.VITE_API_URL) ||
  (typeof window !== "undefined"
    ? stripTrailingSlash(window.location.origin)
    : "");
const WS_BASE_URL =
  stripTrailingSlash(import.meta.env.VITE_WS_URL) ||
  stripTrailingSlash(
    (API_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    ).replace(/^http/i, "ws")
  );

const sma = (data, length) => {
  const out = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= length) sum -= data[i - length];
    if (i >= length - 1) out.push(sum / length);
    else out.push(null);
  }
  return out;
};

const ema = (data, length) => {
  const out = [];
  const k = 2 / (length + 1);
  let prev = data.find((v) => v != null) ?? 0;
  for (let i = 0; i < data.length; i++) {
    const val = data[i] != null ? data[i] : prev;
    prev = val * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
};

const rsi = (data, length) => {
  const out = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= length) {
      avgGain += gain;
      avgLoss += loss;
      if (i === length) {
        avgGain /= length;
        avgLoss /= length;
      }
      out.push(null);
    } else {
      avgGain = (avgGain * (length - 1) + gain) / length;
      avgLoss = (avgLoss * (length - 1) + loss) / length;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const val = 100 - 100 / (1 + rs);
      out.push(val);
    }
  }
  return [null, ...out];
};

const bollinger = (data, length = 20, mult = 2) => {
  const out = [];
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      out.push({ basis: null, upper: null, lower: null });
      continue;
    }
    const slice = data.slice(i - length + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / length;
    const variance =
      slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
    const stdev = Math.sqrt(variance);
    out.push({
      basis: mean,
      upper: mean + mult * stdev,
      lower: mean - mult * stdev,
    });
  }
  return out;
};

const macd = (data, fast = 12, slow = 26, signal = 9) => {
  const emaFast = ema(data, fast);
  const emaSlow = ema(data, slow);
  const macdLine = emaFast.map((v, i) =>
    v != null && emaSlow[i] != null ? v - emaSlow[i] : null
  );
  const signalLine = ema(macdLine.map((v) => (v == null ? 0 : v)), signal);
  const histogram = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? v - signalLine[i] : null
  );
  return { macdLine, signalLine, histogram };
};

const TradingBrainCanvas = ({
  onAnalysis,
  activeTool,
  chartType = "candles",
  logScale = false,
  drawingsVisible = true,
  symbol = "EUR/USD",
  timeframe = "5M",
  clearDrawingsSignal = 0,
  undoDrawingsSignal = 0,
  activeIndicators = [],
  alerts = [],
  onAlertTriggered = () => {},
  replay = { mode: "live", speed: 1, cursor: null },
  compareSymbols = [],
  drawingSettings = { snap: true },
  drawingsMeta = {},
  comparePercentScale = false,
  onSelectDrawing = () => {},
  onCreateAlertFromDrawing = () => {},
}) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const seriesKindRef = useRef("candles");
  const wsRef = useRef(null);
  const [, setViewportVersion] = useState(0);
  const indicatorSeriesRef = useRef({});
  const triggeredAlertsRef = useRef(new Set());
  const compareSeriesRef = useRef({});
  const replayTimerRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [toolbarAnchor, setToolbarAnchor] = useState(null);

  // Buffer de velas que usaremos para mandar al /analyze
  const [candleBuffer, setCandleBuffer] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [draft, setDraft] = useState(null);

  const forceViewportRender = () =>
    setViewportVersion((prev) => (prev > 10000 ? 0 : prev + 1));

  const getStorageKey = () => `drawings:${symbol}:${timeframe}`;

  const baseCandleStyle = () => ({
    upColor: "#22c55e",
    downColor: "#ef4444",
    borderUpColor: "#22c55e",
    borderDownColor: "#ef4444",
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
  });

  const createSeries = (chart, type) => {
    switch (type) {
      case "bars":
        seriesKindRef.current = "bars";
        return chart.addBarSeries(baseCandleStyle());
      case "line":
        seriesKindRef.current = "line";
        return chart.addLineSeries({
          color: "#a78bfa",
          lineWidth: 2,
        });
      case "area":
        seriesKindRef.current = "area";
        return chart.addAreaSeries({
          lineColor: "#22c55e",
          topColor: "rgba(34,197,94,0.35)",
          bottomColor: "rgba(34,197,94,0.06)",
          lineWidth: 2,
        });
      case "baseline":
        seriesKindRef.current = "baseline";
        return chart.addBaselineSeries({
          topLineColor: "#22c55e",
          bottomLineColor: "#ef4444",
          topFillColor1: "rgba(34,197,94,0.35)",
          topFillColor2: "rgba(34,197,94,0.08)",
          bottomFillColor1: "rgba(239,68,68,0.35)",
          bottomFillColor2: "rgba(239,68,68,0.08)",
        });
      default:
        seriesKindRef.current = "candles";
        return chart.addCandlestickSeries(baseCandleStyle());
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#0f172a",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
        priceFormat: {
          type: "price",
          precision: 5,
          minMove: 0.00001,
        },
        mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: "#e2e8f0",
        rightOffset: 0,
        fixLeftEdge: false,
        lockVisibleTimeRangeOnResize: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    seriesRef.current = createSeries(chart, chartType);

    // Ajustar siempre que cambie el tamaño del contenedor
    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      chartRef.current.timeScale().fitContent();
      forceViewportRender();
    };
    window.addEventListener("resize", handleResize);

    const timeScale = chart.timeScale();
    const handleRangeChange = () => forceViewportRender();
    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);

    // ---------- WebSocket LIVE FEED ----------
    const ws = new WebSocket(`${WS_BASE_URL}/ws/live_feed`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🟢 WebSocket conectado a /ws/live_feed");
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);

        const candle = {
          time: Math.floor(raw.time),
          open: Number(raw.open),
          high: Number(raw.high),
          low: Number(raw.low),
          close: Number(raw.close),
        };

        if (seriesRef.current && replay?.mode === "live") {
          const kind = seriesKindRef.current;
          if (kind === "line" || kind === "area" || kind === "baseline") {
            seriesRef.current.update({ time: candle.time, value: candle.close });
          } else {
            seriesRef.current.update(candle);
          }
          chartRef.current.timeScale().fitContent();
        }

        setCandleBuffer((prev) => {
          const next = [...prev, candle];
          if (next.length > 500) next.shift();
          // Evaluar alertas de precio simples
          if (alerts && alerts.length) {
            alerts.forEach((alert) => {
              if (triggeredAlertsRef.current.has(alert.id)) return;
              if (alert.expires && alert.createdAt) {
                const now = Date.now();
                if (now > alert.createdAt + alert.expires * 60000) return;
              }
              const price = candle.close;
              if (alert.type === "above" && alert.price != null) {
                if (price >= alert.price) {
                  triggeredAlertsRef.current.add(alert.id);
                  onAlertTriggered(alert, candle);
                }
              } else if (alert.type === "below" && alert.price != null) {
                if (price <= alert.price) {
                  triggeredAlertsRef.current.add(alert.id);
                  onAlertTriggered(alert, candle);
                }
              } else if (alert.type === "indicator-cross" && alert.indicatorValue != null) {
                const indVal = alert.indicatorValue;
                if (
                  alert.direction === "up" &&
                  price >= indVal &&
                  candle.open <= indVal
                ) {
                  triggeredAlertsRef.current.add(alert.id);
                  onAlertTriggered(alert, candle);
                }
                if (
                  alert.direction === "down" &&
                  price <= indVal &&
                  candle.open >= indVal
                ) {
                  triggeredAlertsRef.current.add(alert.id);
                  onAlertTriggered(alert, candle);
                }
              }
            });
          }
          return next;
        });
      } catch (e) {
        console.error("❌ Error parseando vela:", e);
      }
    };

    ws.onerror = (err) => {
      console.error("⚠️ Error en WebSocket:", err);
    };

    ws.onclose = () => {
      console.log("🟡 WebSocket cerrado");
    };

    // cleanup al desmontar
    return () => {
      window.removeEventListener("resize", handleResize);
      timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;

    const prevSeries = seriesRef.current;
    chart.removeSeries(prevSeries);

    const nextSeries = createSeries(chart, chartType);
    seriesRef.current = nextSeries;

    // Rehidratar datos según el tipo
    if (candleBuffer.length) {
      if (
        seriesKindRef.current === "line" ||
        seriesKindRef.current === "area" ||
        seriesKindRef.current === "baseline"
      ) {
        nextSeries.setData(
          candleBuffer.map((c) => ({ time: c.time, value: c.close }))
        );
      } else {
        nextSeries.setData(candleBuffer);
      }
      chart.timeScale().fitContent();
    }

    // reset indicator series on type change to avoid mismatched scales
    Object.values(indicatorSeriesRef.current).forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch (e) {
        //
      }
    });
    indicatorSeriesRef.current = {};
    Object.values(compareSeriesRef.current).forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch (e) {
        //
      }
    });
    compareSeriesRef.current = {};
  }, [chartType, candleBuffer]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      rightPriceScale: {
        mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
      },
    });
  }, [logScale]);

  // Replay mode: render buffered candles instead of live
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;
    const series = seriesRef.current;

    if (replay?.mode !== "replay") {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
      return;
    }

    const speedMs = replay.speed && replay.speed > 0 ? 1000 / replay.speed : 1000;
    let cursor = replay.cursor ?? Math.max(candleBuffer.length - 1, 0);

    const pushAt = (idx) => {
      const c = candleBuffer[idx];
      if (!c) return;
      if (seriesKindRef.current === "line" || seriesKindRef.current === "area" || seriesKindRef.current === "baseline") {
        series.update({ time: c.time, value: c.close });
      } else {
        series.update(c);
      }
    };

    // initial hydrate
    series.setData(candleBuffer.slice(0, cursor + 1));
    chart.timeScale().fitContent();

    replayTimerRef.current = setInterval(() => {
      cursor = Math.min(cursor + 1, candleBuffer.length - 1);
      pushAt(cursor);
    }, speedMs);

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    };
  }, [replay, candleBuffer]);

  // Load drawings per symbol/TF
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) setDrawings(JSON.parse(stored));
      else setDrawings([]);
      setDraft(null);
    } catch (err) {
      console.warn("No se pudieron cargar los dibujos", err);
    }
  }, [symbol, timeframe]);

  // Delete selected drawing with Delete/Backspace
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setDrawings((prev) => prev.filter((d) => d.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // Delete selected drawing with Delete/Backspace
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setDrawings((prev) => prev.filter((d) => d.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // Persist drawings
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(drawings));
    } catch (err) {
      console.warn("No se pudieron guardar los dibujos", err);
    }
  }, [drawings, symbol, timeframe]);

  // Clear / undo external signals
  useEffect(() => {
    setDrawings([]);
    setDraft(null);
  }, [clearDrawingsSignal]);

  useEffect(() => {
    setDrawings((prev) => prev.slice(0, -1));
  }, [undoDrawingsSignal]);

  useEffect(() => {
    triggeredAlertsRef.current = new Set(
      alerts.filter((a) => a.triggered).map((a) => a.id)
    );
  }, [alerts]);

  // ---------- Llamar al cerebro IA (/analyze) ----------
  const callAnalyze = async () => {
    if (candleBuffer.length < 20) {
      console.log("⚠️ Aún no hay suficientes velas para analizar.");
      return;
    }

    const lastCandles = candleBuffer.slice(-120);

    const inputs = lastCandles.map((c) => {
      const features = new Array(64).fill(0);
      features[0] = c.open ?? 0;
      features[1] = c.high ?? 0;
      features[2] = c.low ?? 0;
      features[3] = c.close ?? 0;
      return features;
    });

    const body = {
      pair: symbol,
      timeframe,
      session: "London+NY",
      inputs,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("❌ Error HTTP en /analyze:", res.status, txt);
        return;
      }

      const data = await res.json();
      console.log("🧠 Respuesta PatternFinder:", data);

      if (onAnalysis && data?.payload) {
        onAnalysis(data.payload);
      }
    } catch (err) {
      console.error("🔥 Error llamando /analyze:", err);
    }
  };

  const snapEnabled = drawingSettings?.snap !== false;

  const pointerToValue = (evt) => {
    if (!containerRef.current || !chartRef.current || !seriesRef.current)
      return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    const time = chartRef.current.timeScale().coordinateToTime(x);
    const price = seriesRef.current.priceScale().coordinateToPrice(y);

    if (time == null || price == null) return null;
    return { time, price };
  };

  const toScreen = (point) => {
    if (!chartRef.current || !seriesRef.current || !point) return { x: 0, y: 0 };
    const x = chartRef.current.timeScale().timeToCoordinate(point.time);
    const y = seriesRef.current.priceScale().priceToCoordinate(point.price);
    return { x, y };
  };

  const handlePointerDown = (evt) => {
    if (!drawingsVisible) return;

    if (!activeTool) {
      const hit = hitTest(evt);
      setSelectedId(hit ? hit.id : null);
      setDraft(null);
      if (hit) {
        const valuePoint = pointerToValue(evt);
        if (valuePoint) {
          setDragState({
            id: hit.id,
            start: valuePoint,
            original: hit.points,
          });
        }
      }
      return;
    }

    const valuePoint = pointerToValue(evt);
    if (!valuePoint) return;
    evt.preventDefault();

    const meta = TOOL_META[activeTool] || { points: 2 };
    if (meta.freehand) {
      setDraft({
        tool: activeTool,
        points: [valuePoint],
        preview: valuePoint,
      });
      return;
    }

    setDraft({
      tool: activeTool,
      points: [valuePoint],
      preview: valuePoint,
    });
  };

  const handlePointerMove = (evt) => {
    if (!drawingsVisible) return;

    if (dragState) {
      const valuePoint = pointerToValue(evt);
      if (!valuePoint) return;
      const dt = valuePoint.time - dragState.start.time;
      const dp = valuePoint.price - dragState.start.price;
      setDrawings((prev) =>
        prev.map((d) =>
          d.id === dragState.id
            ? {
                ...d,
                points: dragState.original.map((p) => ({
                  time: p.time + dt,
                  price: p.price + dp,
                })),
              }
            : d
        )
      );
      return;
    }

    if (!draft) return;
    const valuePoint = pointerToValue(evt);
    if (!valuePoint) return;
    const meta = TOOL_META[draft.tool] || { points: 2 };

    if (meta.freehand) {
      setDraft((prev) => {
        if (!prev) return prev;
        const last = prev.points[prev.points.length - 1];
        const lastCoord = toScreen(last);
        const currCoord = toScreen(valuePoint);
        const dist = Math.hypot(
          (currCoord?.x || 0) - (lastCoord?.x || 0),
          (currCoord?.y || 0) - (lastCoord?.y || 0)
        );
        if (dist < 2) return prev;
        return { ...prev, points: [...prev.points, valuePoint], preview: valuePoint };
      });
    } else {
      setDraft((prev) =>
        prev ? { ...prev, preview: snapPoint(valuePoint, prev.points[0]) } : prev
      );
    }
  };

  const handlePointerUp = (evt) => {
    if (!drawingsVisible) {
      setDragState(null);
      return;
    }

    if (dragState) {
      setDragState(null);
      return;
    }

    if (!draft) return;
    const valuePoint = pointerToValue(evt);
    const meta = TOOL_META[draft.tool] || { points: 2 };

    if (meta.freehand) {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      const points = valuePoint
        ? [...draft.points, valuePoint]
        : draft.points.slice();
      setDrawings((prev) => [...prev, { id, tool: draft.tool, points }]);
      setDraft(null);
      return;
    }

    if (!valuePoint) {
      setDraft(null);
      return;
    }

    const nextPoints = [...draft.points, snapPoint(valuePoint, draft.points[0])];
    if (nextPoints.length >= meta.points) {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      setDrawings((prev) => [
        ...prev,
        { id, tool: draft.tool, points: nextPoints, text: draft.text },
      ]);
      setDraft(null);
    } else {
      setDraft({ ...draft, points: nextPoints, preview: valuePoint });
    }
  };

  const cursorForTool = useMemo(() => {
    if (!activeTool) return "crosshair";
    return "crosshair";
  }, [activeTool]);

  const hitTest = (evt) => {
    if (!drawings.length || !containerRef.current || !chartRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const thresh = 6;

    const distLine = (p, a, b) => {
      const apx = x - a.x;
      const apy = y - a.y;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const ab2 = abx * abx + aby * aby || 1;
      const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
      const projx = a.x + abx * t;
      const projy = a.y + aby * t;
      return Math.hypot(x - projx, y - projy);
    };

    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      const pts = d.points.map(toScreen);
      switch (d.tool) {
        case "line":
        case "ray":
        case "trendline":
        case "channel": {
          if (pts.length >= 2 && distLine(0, pts[0], pts[1]) < thresh) {
            return d;
          }
          break;
        }
        case "rectangle": {
          if (pts.length >= 2) {
            const x1 = Math.min(pts[0].x, pts[1].x);
            const y1 = Math.min(pts[0].y, pts[1].y);
            const x2 = Math.max(pts[0].x, pts[1].x);
            const y2 = Math.max(pts[0].y, pts[1].y);
            if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return d;
          }
          break;
        }
        case "hline": {
          if (pts[0] && Math.abs(y - pts[0].y) < thresh) return d;
          break;
        }
        case "vline": {
          if (pts[0] && Math.abs(x - pts[0].x) < thresh) return d;
          break;
        }
        case "fib": {
          if (pts.length >= 2) {
            const x1 = Math.min(pts[0].x, pts[1].x);
            const x2 = Math.max(pts[0].x, pts[1].x);
            if (x >= x1 && x <= x2) return d;
          }
          break;
        }
        case "brush": {
          const path = pts;
          for (let j = 1; j < path.length; j++) {
            if (distLine(0, path[j - 1], path[j]) < thresh) return d;
          }
          break;
        }
        case "text":
        case "label":
        case "arrow": {
          if (pts[0]) {
            if (Math.hypot(x - pts[0].x, y - pts[0].y) < thresh * 1.5) return d;
          }
          break;
        }
        default:
          break;
      }
    }
    return null;
  };

  const renderShapes = () => {
    if (!containerRef.current || !chartRef.current || !seriesRef.current)
      return null;
    if (!drawingsVisible) return null;

    const shapes = [
      ...drawings,
      draft
        ? {
            ...draft,
            id: "draft",
            isDraft: true,
            points: draft.points.slice(),
            preview: draft.preview,
          }
        : null,
    ].filter(Boolean);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    return shapes.map((shape) => {
      const color = shape.isDraft ? "rgba(37,99,235,0.65)" : "#0f172a";
      const meta = TOOL_META[shape.tool] || { points: 2 };
      const pts =
        shape.isDraft && shape.preview
          ? [...shape.points, shape.preview]
          : shape.points;

      if (!pts.length) return null;

      const screenPts = pts.map(toScreen);

      switch (shape.tool) {
        case "line":
        case "trendline": {
          const [a, b] = screenPts;
          if (!a || !b) return null;
          const stroke = selectedId === shape.id ? "#2563eb" : color;
          return (
            <g key={shape.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={1.6}
              />
              {selectedId === shape.id && (
                <>
                  <circle cx={a.x} cy={a.y} r={4} fill="#2563eb" />
                  <circle cx={b.x} cy={b.y} r={4} fill="#2563eb" />
                </>
              )}
            </g>
          );
        }
        case "ray": {
          const [a, b] = screenPts;
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const targetX = width;
          const slope = dx !== 0 ? dy / dx : 0;
          const targetY = a.y + slope * (targetX - a.x);
          const stroke = selectedId === shape.id ? "#2563eb" : color;
          return (
            <line
              key={shape.id}
              x1={a.x}
              y1={a.y}
              x2={targetX}
              y2={targetY}
              stroke={stroke}
              strokeWidth={1.6}
            />
          );
        }
        case "hline": {
          const [a] = screenPts;
          if (!a) return null;
          const stroke = selectedId === shape.id ? "#2563eb" : color;
          return (
            <line
              key={shape.id}
              x1={0}
              y1={a.y}
              x2={width}
              y2={a.y}
              stroke={stroke}
              strokeWidth={1.4}
              strokeDasharray={shape.isDraft ? "4 3" : "0"}
            />
          );
        }
        case "vline": {
          const [a] = screenPts;
          if (!a) return null;
          const stroke = selectedId === shape.id ? "#2563eb" : color;
          return (
            <line
              key={shape.id}
              x1={a.x}
              y1={0}
              x2={a.x}
              y2={height}
              stroke={stroke}
              strokeWidth={1.4}
              strokeDasharray={shape.isDraft ? "4 3" : "0"}
            />
          );
        }
        case "rectangle": {
          const [a, b] = screenPts;
          if (!a || !b) return null;
          const x = Math.min(a.x, b.x);
          const y = Math.min(a.y, b.y);
          const w = Math.abs(b.x - a.x);
          const h = Math.abs(b.y - a.y);
          const stroke = selectedId === shape.id ? "#2563eb" : color;
          const dash = shape.isDraft ? "5 4" : "0";
          return (
            <g key={shape.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="none"
                stroke={stroke}
                strokeWidth={1.4}
                strokeDasharray={dash}
              />
              {selectedId === shape.id && (
                <>
                  <circle cx={x} cy={y} r={4} fill="#2563eb" />
                  <circle cx={x + w} cy={y} r={4} fill="#2563eb" />
                  <circle cx={x} cy={y + h} r={4} fill="#2563eb" />
                  <circle cx={x + w} cy={y + h} r={4} fill="#2563eb" />
                </>
              )}
            </g>
          );
        }
        case "fib": {
          const [a, b] = pts;
          if (!a || !b) return null;
          const ax = chartRef.current.timeScale().timeToCoordinate(a.time);
          const bx = chartRef.current.timeScale().timeToCoordinate(b.time);
          const left = Math.min(ax, bx);
          const right = Math.max(ax, bx);
          const diff = b.price - a.price;
          return (
            <g key={shape.id}>
              {DEFAULT_LEVELS.map((lvl) => {
                const price = a.price + diff * lvl;
                const y = seriesRef.current.priceScale().priceToCoordinate(price);
                return (
                  <g key={lvl}>
                    <line
                      x1={left}
                      y1={y}
                      x2={right}
                      y2={y}
                      stroke={color}
                      strokeWidth={1}
                      strokeDasharray={shape.isDraft ? "4 3" : "0"}
                    />
                    <text
                      x={right + 4}
                      y={y + 3}
                      fill={color}
                      fontSize="10"
                      opacity={0.8}
                    >
                      {(lvl * 100).toFixed(1)}%
                    </text>
                  </g>
                );
              })}
              <rect
                x={left}
                y={Math.min(
                  seriesRef.current.priceScale().priceToCoordinate(a.price),
                  seriesRef.current.priceScale().priceToCoordinate(b.price)
                )}
                width={right - left}
                height={Math.abs(
                  seriesRef.current.priceScale().priceToCoordinate(a.price) -
                    seriesRef.current.priceScale().priceToCoordinate(b.price)
                )}
                fill="rgba(79,70,229,0.08)"
                stroke="rgba(79,70,229,0.35)"
                strokeWidth={1}
              />
              {selectedId === shape.id && (
                <>
                  <circle cx={left} cy={seriesRef.current.priceScale().priceToCoordinate(a.price)} r={4} fill="#2563eb" />
                  <circle cx={right} cy={seriesRef.current.priceScale().priceToCoordinate(b.price)} r={4} fill="#2563eb" />
                </>
              )}
            </g>
          );
        }
        case "channel": {
          const [p0, p1, p2] = pts;
          if (!p0 || !p1) return null;
          const a = toScreen(p0);
          const b = toScreen(p1);
          const c = toScreen(p2 || p1);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = -dy / len;
          const uy = dx / len;
          const dist =
            (c.x - a.x) * ux + (c.y - a.y) * uy;
          const offsetX = ux * dist;
          const offsetY = uy * dist;

          const a2 = { x: a.x + offsetX, y: a.y + offsetY };
          const b2 = { x: b.x + offsetX, y: b.y + offsetY };
          const stroke = selectedId === shape.id ? "#2563eb" : color;

          return (
            <g key={shape.id}>
              <polygon
                points={`${a.x},${a.y} ${b.x},${b.y} ${b2.x},${b2.y} ${a2.x},${a2.y}`}
                fill="rgba(34,197,94,0.08)"
                stroke="rgba(34,197,94,0.4)"
                strokeWidth={1}
              />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={1.4} />
              <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke={stroke} strokeWidth={1.4} />
              {selectedId === shape.id && (
                <>
                  <circle cx={a.x} cy={a.y} r={4} fill="#2563eb" />
                  <circle cx={b.x} cy={b.y} r={4} fill="#2563eb" />
                  <circle cx={a2.x} cy={a2.y} r={4} fill="#2563eb" />
                  <circle cx={b2.x} cy={b2.y} r={4} fill="#2563eb" />
                </>
              )}
            </g>
          );
        }
        case "brush": {
          const path = screenPts
            .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`)
            .join(" ");
          return (
            <path
              key={shape.id}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={shape.isDraft ? 0.6 : 1}
            />
          );
        }
        case "arrow": {
          const [a, b] = screenPts;
          if (!a || !b) return null;
          const stroke = selectedId === shape.id ? "#2563eb" : color;
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const headLen = 10;
          const hx = b.x - headLen * Math.cos(angle - Math.PI / 6);
          const hy = b.y - headLen * Math.sin(angle - Math.PI / 6);
          const hx2 = b.x - headLen * Math.cos(angle + Math.PI / 6);
          const hy2 = b.y - headLen * Math.sin(angle + Math.PI / 6);
          return (
            <g key={shape.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={1.6} />
              <line x1={b.x} y1={b.y} x2={hx} y2={hy} stroke={stroke} strokeWidth={1.6} />
              <line x1={b.x} y1={b.y} x2={hx2} y2={hy2} stroke={stroke} strokeWidth={1.6} />
            </g>
          );
        }
        case "text":
        case "label": {
          const [a] = screenPts;
          if (!a) return null;
          const fill = selectedId === shape.id ? "#2563eb" : "#0f172a";
          const bg = shape.tool === "label" ? "rgba(255,255,255,0.8)" : "transparent";
          return (
            <g key={shape.id}>
              {shape.tool === "label" && (
                <rect
                  x={a.x - 4}
                  y={a.y - 14}
                  width={Math.max(40, (shape.text?.length || 4) * 7)}
                  height={18}
                  rx={4}
                  fill={bg}
                  stroke="#e2e8f0"
                />
              )}
              <text x={a.x} y={a.y} fill={fill} fontSize="12" fontWeight="600">
                {shape.text || "Text"}
              </text>
              {selectedId === shape.id && <circle cx={a.x} cy={a.y} r={4} fill="#2563eb" />}
            </g>
          );
        }
        default:
          return null;
      }
    });
  };

  useEffect(() => {
    if (!chartRef.current || !candleBuffer.length) return;
    const chart = chartRef.current;
    const closes = candleBuffer.map((c) => c.close);

    const needed = new Set(activeIndicators.map((i) => i.id));
    Object.entries(indicatorSeriesRef.current).forEach(([id, series]) => {
      if (!needed.has(id)) {
        try {
          chart.removeSeries(series);
        } catch (e) {
          //
        }
        delete indicatorSeriesRef.current[id];
      }
    });

    const ensureSeries = (id, type, colorOverride) => {
      if (indicatorSeriesRef.current[id]) return indicatorSeriesRef.current[id];
      let s;
      if (type === "volume") {
        s = chart.addHistogramSeries({
          priceFormat: { type: "volume" },
          priceScaleId: "left",
          color: "#94a3b8",
          lineWidth: 1,
        });
      } else if (type === "bb-u" || type === "bb-l") {
        s = chart.addLineSeries({
          lineWidth: 1,
          color: type === "bb-u" ? "#0ea5e9" : "#0ea5e9",
          lineStyle: 2,
        });
      } else if (type === "macd-hist") {
        s = chart.addHistogramSeries({
          priceScaleId: "left",
          color: "#16a34a",
          lineWidth: 1,
        });
      } else {
        s = chart.addLineSeries({
          lineWidth: 2,
          color:
            colorOverride ||
            (type === "rsi"
              ? "#8b5cf6"
              : type === "ema"
              ? "#f97316"
              : type === "macd-signal"
              ? "#f97316"
              : type === "macd"
              ? "#2563eb"
              : "#2563eb"),
        });
      }
      indicatorSeriesRef.current[id] = s;
      return s;
    };

    activeIndicators.forEach((ind) => {
      const series = ensureSeries(ind.id, ind.type, ind.color);
      switch (ind.type) {
        case "sma": {
          const length = ind.length || 20;
          const values = sma(closes, length);
          const data = candleBuffer
            .map((c, idx) =>
              values[idx] != null
                ? { time: c.time, value: values[idx] }
                : null
            )
            .filter(Boolean);
          if (data.length) series.setData(data);
          break;
        }
        case "ema": {
          const length = ind.length || 20;
          const values = ema(closes, length);
          const data = candleBuffer
            .map((c, idx) =>
              values[idx] != null
                ? { time: c.time, value: values[idx] }
                : null
            )
            .filter(Boolean);
          if (data.length) series.setData(data);
          break;
        }
        case "rsi": {
          const length = ind.length || 14;
          const values = rsi(closes, length);
          const data = candleBuffer
            .map((c, idx) =>
              values[idx] != null
                ? { time: c.time, value: values[idx] }
                : null
            )
            .filter(Boolean);
          if (data.length) series.setData(data);
          break;
        }
        case "volume": {
          series.setData(
            candleBuffer.map((c) => ({
              time: c.time,
              value: Math.max(c.high - c.low, 0.0001),
              color: c.close >= c.open ? "#16a34a" : "#ef4444",
            }))
          );
          break;
        }
        case "bb": {
          const length = ind.length || 20;
          const mult = ind.mult || 2;
          const bands = bollinger(closes, length, mult);
          const upper = ensureSeries(`${ind.id}-upper`, "bb-u", ind.color || "#0ea5e9");
          const lower = ensureSeries(`${ind.id}-lower`, "bb-l", ind.color || "#0ea5e9");
          const basisSeries = series;
          const upperData = [];
          const lowerData = [];
          const basisData = [];
          bands.forEach((b, idx) => {
            if (b.basis != null && candleBuffer[idx]) {
              const time = candleBuffer[idx].time;
              basisData.push({ time, value: b.basis });
              upperData.push({ time, value: b.upper });
              lowerData.push({ time, value: b.lower });
            }
          });
          if (basisData.length) basisSeries.setData(basisData);
          if (upperData.length) upper.setData(upperData);
          if (lowerData.length) lower.setData(lowerData);
          break;
        }
        case "macd": {
          const fast = ind.fast || 12;
          const slow = ind.slow || 26;
          const signalLen = ind.signal || 9;
          const { macdLine, signalLine, histogram } = macd(closes, fast, slow, signalLen);
          const macdSeries = series;
          const signalSeries = ensureSeries(`${ind.id}-signal`, "macd-signal", ind.color || "#f97316");
          const histSeries = ensureSeries(`${ind.id}-hist`, "macd-hist");

          const macdData = [];
          const signalData = [];
          const histData = [];
          macdLine.forEach((v, idx) => {
            const time = candleBuffer[idx]?.time;
            if (time == null) return;
            if (v != null) macdData.push({ time, value: v });
            if (signalLine[idx] != null) signalData.push({ time, value: signalLine[idx] });
            if (histogram[idx] != null)
              histData.push({
                time,
                value: histogram[idx],
                color: histogram[idx] >= 0 ? "#16a34a" : "#ef4444",
              });
          });
          if (macdData.length) macdSeries.setData(macdData);
          if (signalData.length) signalSeries.setData(signalData);
          if (histData.length) histSeries.setData(histData);
          break;
        }
        default:
          break;
      }
    });
  }, [activeIndicators, candleBuffer]);

  // Compare overlays (simple line series)
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    const needed = new Set(compareSymbols.map((c) => c.id));
    Object.entries(compareSeriesRef.current).forEach(([id, series]) => {
      if (!needed.has(id)) {
        try {
          chart.removeSeries(series);
        } catch (e) {
          //
        }
        delete compareSeriesRef.current[id];
      }
    });

    compareSymbols.forEach((c, idx) => {
      if (!compareSeriesRef.current[c.id]) {
        compareSeriesRef.current[c.id] = chart.addLineSeries({
          color: c.color || ["#ec4899", "#0ea5e9", "#f59e0b", "#10b981"][idx % 4],
          lineWidth: 2,
          priceScaleId: "right",
        });
      }

      const s = compareSeriesRef.current[c.id];
      let data = c.data;
      if (!data || !data.length) {
        const closes = candleBuffer.map((candle) => candle.close);
        const base = closes[0] || 1;
        data = closes.map((val, i) => ({
          time: candleBuffer[i]?.time || 0,
          value: comparePercentScale ? ((val / base) - 1) * 100 : (val / base) * (c.base || 1),
        }));
      }
      const sanitized = data
        .map((point, i) => ({
          time: point.time ?? (candleBuffer[i]?.time || 0),
          value: comparePercentScale
            ? ((point.value / (point.base ?? (point.value || 1))) - 1) * 100
            : point.value,
        }))
        .filter((p) => p.value != null && !Number.isNaN(p.value));
      if (sanitized.length) s.setData(sanitized);
    });
  }, [compareSymbols, candleBuffer, comparePercentScale]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: drawingsVisible ? "auto" : "none",
          cursor: cursorForTool,
          zIndex: 5,
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {renderShapes()}
          {selectedId && (
            <rect
              x={0}
              y={0}
              width={0}
              height={0}
              fill="none"
              stroke="transparent"
            />
          )}
        </svg>
      </div>
      <button
        onClick={callAnalyze}
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "24px",
          zIndex: 10,
          padding: "8px 18px",
          borderRadius: "999px",
          border: "none",
          background: "#16a34a",
          color: "#f9fafb",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
        }}
      >
        Analizar rango 🧠
      </button>
    </>
  );
};

export default TradingBrainCanvas;
