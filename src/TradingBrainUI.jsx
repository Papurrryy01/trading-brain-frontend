import React, { useState } from "react";
import {
  ChevronDown,
  Settings,
  Activity,
  BarChart3,
  LineChart,
  BookOpen,
  Filter,
  Play,
  Pause,
  Clock,
  Sparkles,
  Brain,
  Radar,
  SlidersHorizontal,
  PanelLeft,
  PanelRight,
  LayoutDashboard,
} from "lucide-react";

// Root layout component
export default function TradingBrainUI() {
  const [pair, setPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("5M");
  const [analysisTab, setAnalysisTab] = useState("context");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top navigation bar */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-sm">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              Pair
            </span>
            <button className="flex items-center gap-1 text-sm font-semibold text-slate-50">
              {pair}
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs sm:text-sm">
            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono">
              1.22473
            </span>
            <span className="text-slate-400">
              H: <span className="text-slate-100">1.22510</span>
            </span>
            <span className="text-slate-400">
              L: <span className="text-slate-100">1.22390</span>
            </span>
            <span className="text-slate-400 hidden lg:inline">
              Vol: <span className="text-slate-100">87.5M</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timeframe selector */}
          <div className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-700/80 px-1.5 py-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  timeframe === tf
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Brain mode toggle / presets */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/60 text-xs font-semibold text-indigo-300 shadow-[0_0_20px_rgba(79,70,229,0.45)]">
            <Brain className="w-4 h-4" />
            <span>Brain Mode</span>
          </button>

          {/* Settings icon */}
          <button className="p-2 rounded-full hover:bg-slate-800 text-slate-300">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar tools */}
        <aside className="w-14 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-4 gap-3">
          <ToolIcon icon={Activity} label="Chart" active />
          <ToolIcon icon={LineChart} label="Patterns" />
          <ToolIcon icon={BarChart3} label="Stats" />
          <ToolIcon icon={Filter} label="Filters" />
          <ToolIcon icon={BookOpen} label="Playbook" />
          <div className="flex-1" />
          <ToolIcon icon={SlidersHorizontal} label="Layout" />
        </aside>

        {/* Chart + analysis layout */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Session / range controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/80">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="uppercase tracking-[0.2em] text-slate-500">
                Session
              </span>
              <button className="px-2 py-1 rounded-lg bg-slate-900 text-slate-200 border border-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                London + NY
              </button>
              <button className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800">
                Últimas 4h
              </button>
              <button className="px-2 py-1 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800">
                Desde 02:00
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/60">
                <Radar className="w-3 h-3" />
                Analizar rango
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/60">
                <Sparkles className="w-3 h-3" />
                Evaluar setup
              </button>
            </div>
          </div>

          {/* Chart + right panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* Chart area */}
            <section
              className={`flex-1 relative ${
                isRightPanelOpen ? "border-r border-slate-800" : ""
              }`}
            >
              <div className="absolute inset-0 flex flex-col">
                {/* Live status bar */}
                <div className="flex items-center justify-between px-4 py-1.5 text-[11px] border-b border-slate-900 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/90">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Datos en tiempo real · Demo</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>
                      Latencia: <span className="text-slate-100">5ms</span>
                    </span>
                    <span className="hidden sm:inline">
                      Feed: TradingBrain Core v1
                    </span>
                  </div>
                </div>

                {/* Placeholder chart box */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="border border-dashed border-slate-700/80 rounded-2xl px-6 py-8 max-w-xl text-center bg-slate-950/70">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/15 mb-4">
                      <Activity className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-semibold mb-1">
                      Área del Gráfico Principal
                    </h2>
                    <p className="text-sm text-slate-400 mb-3">
                      Mostrando datos para:{" "}
                      <button className="text-indigo-300 hover:underline font-medium">
                        {pair}
                      </button>{" "}
                      en temporalidad{" "}
                      <button className="text-indigo-300 hover:underline font-medium">
                        {timeframe}
                      </button>
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      Aquí se integrará la librería de gráficos en tiempo real
                      (TradingView, lightweight-charts, D3, etc.) y las
                      herramientas de dibujo.
                    </p>
                    <p className="text-xs text-slate-500">
                      Usa el menú superior para cambiar par/temporalidad, o los
                      botones de sesión para seleccionar el rango a analizar.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Right analysis panel */}
            {isRightPanelOpen && (
              <aside className="w-[340px] max-w-sm bg-slate-950 border-l border-slate-800 flex flex-col">
                {/* Tabs */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/95">
                  <div className="flex text-xs rounded-xl bg-slate-900 p-1 border border-slate-700/80">
                    <TabButton
                      label="Contexto"
                      active={analysisTab === "context"}
                      onClick={() => setAnalysisTab("context")}
                    />
                    <TabButton
                      label="Patrones"
                      active={analysisTab === "patterns"}
                      onClick={() => setAnalysisTab("patterns")}
                    />
                    <TabButton
                      label="Probabilidad"
                      active={analysisTab === "probability"}
                      onClick={() => setAnalysisTab("probability")}
                    />
                  </div>
                  <button
                    onClick={() => setIsRightPanelOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-xs">
                  {analysisTab === "context" && <ContextPanel />}
                  {analysisTab === "patterns" && <PatternsPanel />}
                  {analysisTab === "probability" && <ProbabilityPanel />}
                </div>

                {/* Bottom mini-controller */}
                <div className="border-t border-slate-800 px-3 py-2 flex items-center justify-between text-[11px] bg-slate-950/95">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Play className="w-3 h-3" />
                    <span>Auto-análisis: Manual</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <LayoutDashboard className="w-3 h-3" />
                    <span>Perfil: Sniper 5M</span>
                  </div>
                </div>
              </aside>
            )}

            {!isRightPanelOpen && (
              <button
                onClick={() => setIsRightPanelOpen(true)}
                className="absolute right-2 top-20 z-10 p-2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <PanelRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bottom status bar */}
          <footer className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-950/95 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">TradingBrain</span>
              <span className="hidden sm:inline">v0.1 · UI Prototype</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Modo análisis · Sin ejecución automática</span>
              <span className="hidden sm:flex items-center gap-1">
                <Clock className="w-3 h-3" /> Latencia simulada: 5ms
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

// ========== Small components ==========

function ToolIcon({ icon: Icon, label, active }) {
  return (
    <button
      className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
        active
          ? "bg-indigo-500/20 text-indigo-300 shadow-[0_0_20px_rgba(79,70,229,0.5)]"
          : "text-slate-500 hover:text-slate-100 hover:bg-slate-900"
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
        active
          ? "bg-slate-100 text-slate-900 shadow-sm"
          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function ContextPanel() {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-400" />
            <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-300">
              Contexto actual
            </h3>
          </div>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-mono">
            LIVE
          </span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300">
          <li>
            <span className="text-slate-500">Tendencia:</span> Alcista suave
            (EMA50 &gt; EMA200)
          </li>
          <li>
            <span className="text-slate-500">Estructura:</span> Higher Highs +
            Higher Lows desde Londres
          </li>
          <li>
            <span className="text-slate-500">Sesión:</span> NY abierta ·
            volatilidad media
          </li>
          <li>
            <span className="text-slate-500">ATR(14) 5M:</span> 1.4 pips · rango
            intradía 22 pips
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LineChart className="w-3 h-3 text-indigo-400" />
            <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-300">
              Último impulso
            </h3>
          </div>
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300">
          <li>
            <span className="text-slate-500">Dirección:</span> Impulso alcista ·
            retroceso activo
          </li>
          <li>
            <span className="text-slate-500">Zona Fib:</span> Precio dentro de
            50–61.8%
          </li>
          <li>
            <span className="text-slate-500">Prob. continuación:</span> ~62%
            (histórico)
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between mb-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-sky-400" />
            <h3 className="font-semibold tracking-wide uppercase text-slate-300">
              Filtros activos
            </h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600">
            Solo tendencia clara
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600">
            Excluir rango asiático
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600">
            Patrones pullback 5M
          </span>
        </div>
      </section>
    </div>
  );
}

function PatternsPanel() {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LineChart className="w-3 h-3 text-amber-400" />
            <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-300">
              Patrones detectados
            </h3>
          </div>
          <button className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <Radar className="w-3 h-3" />
            Re-escanear
          </button>
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300">
          <li>
            <span className="font-semibold text-amber-300">
              Impulso + Pullback 5M
            </span>
            <span className="block text-slate-500">
              3 ocurrencias en el rango seleccionado
            </span>
          </li>
          <li>
            <span className="font-semibold text-emerald-300">
              Rechazo de zona Fib 61.8%
            </span>
            <span className="block text-slate-500">
              2 setups alineados con la tendencia
            </span>
          </li>
          <li>
            <span className="font-semibold text-sky-300">
              Ruptura de consolidación
            </span>
            <span className="block text-slate-500">
              1 ruptura limpia con volumen elevado
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 mb-2 flex items-center gap-2">
          <BookOpen className="w-3 h-3 text-violet-400" />
          Reglas del patrón seleccionado
        </h3>
        <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300">
          <li>Tendencia alineada en 5M y 15M.</li>
          <li>Impulso mínimo de 3 velas fuertes en la dirección de la tendencia.</li>
          <li>Retroceso entre 38.2% y 61.8% del impulso.</li>
          <li>Vela de confirmación con cierre en la mitad superior/inferior.</li>
        </ul>
      </section>
    </div>
  );
}

function ProbabilityPanel() {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-300">
              Evaluación del setup
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-3">
          <div className="rounded-lg bg-slate-900 p-2 border border-slate-700/80">
            <p className="text-slate-500 mb-1">Prob. estimada</p>
            <p className="text-xl font-semibold text-emerald-400">63%</p>
          </div>
          <div className="rounded-lg bg-slate-900 p-2 border border-slate-700/80">
            <p className="text-slate-500 mb-1">R:R del setup</p>
            <p className="text-xl font-semibold text-slate-100">1 : 1.3</p>
          </div>
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300">
          <li>
            <span className="text-slate-500">Tendencia:</span> A favor (bonus
            +10%)
          </li>
          <li>
            <span className="text-slate-500">Zona Fib:</span> Dentro de 50–61.8%
            (bonus +8%)
          </li>
          <li>
            <span className="text-slate-500">Contexto:</span> Sin rango asiático
            reciente
          </li>
          <li>
            <span className="text-slate-500">Riesgo:</span> SL 1.4×ATR · TP
            1.3×ATR
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 mb-2 flex items-center gap-2">
          <SlidersHorizontal className="w-3 h-3 text-sky-400" />
          Parámetros del cerebro
        </h3>
        <div className="space-y-1.5 text-[11px] text-slate-300">
          <div className="flex items-center justify-between">
            <span>Sensibilidad a la tendencia</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-100">
              Alta
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Peso historial 2020–2025</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-100">
              Normal
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Filtro de rango</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300">
              Activo
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
