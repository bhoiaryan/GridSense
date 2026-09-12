import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cloud,
  CloudSun,
  HelpCircle,
  Info,
  Layers,
  Percent,
  Radio,
  Sparkles,
  Sun,
  Table,
  Thermometer,
  TrendingDown,
  Wind,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ForecastChart } from "../components/charts/ForecastChart";
import { RiskBadge } from "../components/alerts/RiskBadge";
import { api } from "../services/api";
import type { ForecastHorizon, ForecastPoint, SiteInfo } from "../types";

type DetailTab = "ai" | "weather" | "table";

export function Forecast() {
  const [horizon, setHorizon] = useState<ForecastHorizon>("24h");
  const [selectedHour, setSelectedHour] = useState<string>("18:00");
  const [activeTab, setActiveTab] = useState<DetailTab>("ai");

  // Chart Layer Toggles (compact default state)
  const [showUncertainty, setShowUncertainty] = useState<boolean>(true);
  const [showDemand, setShowDemand] = useState<boolean>(true);
  const [showIrradiance, setShowIrradiance] = useState<boolean>(false);
  const [showRiskAreas, setShowRiskAreas] = useState<boolean>(true);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [activeData, setActiveData] = useState<ForecastPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const hours = Number(horizon.slice(0, -1)) as 24 | 48 | 72;

    setIsLoading(true);
    setError(null);
    Promise.all([api.getSite("solar-01"), api.getForecast("solar-01", hours)])
      .then(([siteResponse, forecastResponse]) => {
        if (!cancelled) {
          setSite(siteResponse);
          setActiveData(forecastResponse.forecast);
          const selectedStillExists = forecastResponse.forecast.some((point) => point.hour === selectedHour);
          if (!selectedStillExists) {
            setSelectedHour(forecastResponse.forecast.find((point) => point.hour === "18:00")?.hour ?? forecastResponse.forecast[0]?.hour ?? "");
          }
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load the forecast.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [horizon, reloadKey]);

  const summary = useMemo(() => getForecastSummary(activeData), [activeData]);

  // Currently selected forecast point
  const selectedPoint = useMemo(() => {
    return (
      activeData.find((point) => point.hour === selectedHour) ||
      activeData.find((point) => point.hour === "18:00") ||
      activeData[0]
    );
  }, [activeData, selectedHour]);

  // Risk periods are derived from the live forecast response.
  const relevantRiskPeriods = useMemo(() => {
    return activeData
      .filter((point) => point.risk !== "LOW")
      .slice(0, 6)
      .map((point) => {
        const deficit = point.demand - point.expected;
        const isShortfall = deficit > 0;
        return {
          id: point.timestamp,
          risk: point.risk,
          targetHour: point.hour,
          type: isShortfall ? "SHORTFALL" : "UNCERTAINTY",
          timeWindow: point.fullTimeLabel ?? point.hour,
          name: isShortfall ? "Generation shortfall" : "Forecast uncertainty",
          metricLabel: isShortfall ? "Net deficit" : "Confidence range",
          metricValue: isShortfall ? `${deficit.toFixed(1)} MW` : `${(point.upper - point.lower).toFixed(1)} MW`,
          weatherCause: point.weatherDriver ?? point.explanation ?? "Forecast variance is under active monitoring.",
          actionHint: isShortfall ? "Review response" : "Monitor conditions",
        };
      });
  }, [activeData]);

  // Step between hours in the inspector
  const handleStepHour = (direction: "prev" | "next") => {
    if (!selectedPoint) return;
    const currentIndex = activeData.findIndex((p) => p.hour === selectedPoint.hour);
    if (currentIndex === -1) return;

    if (direction === "prev" && currentIndex > 0) {
      setSelectedHour(activeData[currentIndex - 1].hour);
    } else if (direction === "next" && currentIndex < activeData.length - 1) {
      setSelectedHour(activeData[currentIndex + 1].hour);
    }
  };

  const handleJumpToRisk = (targetHour: string) => {
    setSelectedHour(targetHour);
  };

  const handleSelectPoint = (point: ForecastPoint) => {
    setSelectedHour(point.hour);
  };

  if (isLoading) {
    return <ForecastMessage title="Loading forecast" detail="Retrieving the selected forecast horizon from the GridSense gateway." />;
  }

  if (error || !site || !selectedPoint) {
    return (
      <ForecastMessage
        title="Forecast unavailable"
        detail={error ?? "The gateway returned no forecast points."}
        action={<button className="button-primary" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>}
      />
    );
  }

  const spread = (selectedPoint.upper - selectedPoint.lower).toFixed(1);
  const halfSpread = (Number(spread) / 2).toFixed(1);
  const netBalance = selectedPoint.expected - selectedPoint.demand;
  const isDeficit = netBalance < 0;

  return (
    <div className="space-y-5">
      {/* ─── 1. PAGE HEADER & COMPACT HORIZON BAR ───────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e7dd] bg-[#eef8f2] px-2 py-0.5 text-[11px] font-semibold text-[#386c58]">
              <Sun size={13} />
              {site.name} ({site.capacityMw} MW PV)
            </span>
            <span className="text-[11px] text-grid-muted">Model: XGBoost Ensemble + GHI Inversion</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-grid-ink">
            Generation & Risk Forecast
          </h1>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-grid-muted">
            <Calendar size={13} /> Horizon:
          </span>
          <div className="segmented-control">
            {(["24h", "48h", "72h"] as ForecastHorizon[]).map((h) => {
              const isActive = horizon === h;
              return (
                <button
                  key={h}
                  onClick={() => {
                    setHorizon(h);
                  }}
                  className={`segmented-button min-w-[64px] ${isActive ? "segmented-button-active" : ""}`}
                >
                  {h.toUpperCase()}
                  {h === "24h" && <span className="ml-1 text-[10px] opacity-60">(Today)</span>}
                  {h === "48h" && <span className="ml-1 text-[10px] opacity-60">(2-Day)</span>}
                  {h === "72h" && <span className="ml-1 text-[10px] opacity-60">(3-Day)</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 2. COMPACT FORECAST OVERVIEW STRIP ─────────────────────── */}
      <section className="panel border-[#dfe7e1] bg-[#f9faf9] p-3.5 sm:p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:divide-x sm:divide-[#dfe7e1]">
          {/* Expected Generation */}
          <div className="space-y-1 sm:px-3 first:pl-0">
            <p className="metric-label flex items-center gap-1">
              <Zap size={13} className="text-[#396553]" />
              Projected Generation
            </p>
            <p className="text-lg font-bold text-grid-ink">
              {summary.totalProjectedMwh} <span className="text-xs font-semibold text-grid-muted">MWh</span>
            </p>
            <p className="text-[11px] text-grid-muted">
              vs {summary.totalDemandMwh} MWh grid demand
            </p>
          </div>

          {/* Peak Generation */}
          <div className="space-y-1 sm:px-3">
            <p className="metric-label flex items-center gap-1">
              <Sun size={13} className="text-[#7d6944]" />
              Peak Generation
            </p>
            <p className="text-lg font-bold text-grid-ink">
              {summary.peakGenerationMw} <span className="text-xs font-semibold text-grid-muted">MW</span>
            </p>
            <p className="text-[11px] text-grid-muted">
              Peak hour: <span className="font-semibold text-slate-700">{summary.peakHour}</span>
            </p>
          </div>

          {/* Forecast Confidence */}
          <div className="space-y-1 sm:px-3">
            <p className="metric-label flex items-center gap-1">
              <Percent size={13} className="text-[#386c58]" />
              Overall Confidence
            </p>
            <p className="text-lg font-bold text-grid-ink">
              {summary.avgConfidenceScore}%
            </p>
            <p className="text-[11px] text-grid-muted">
              {horizon === "24h" ? "High confidence (0-24h)" : horizon === "48h" ? "Moderate variance (48h)" : "Higher variance (72h)"}
            </p>
          </div>

          {/* Critical Risk / Shortfall */}
          <div className="space-y-1 sm:px-3 last:pr-0">
            <p className="metric-label flex items-center gap-1">
              {summary.maxDeficitMw > 0 ? (
                <TrendingDown size={13} className="text-[#9b3f42]" />
              ) : (
                <CheckCircle2 size={13} className="text-[#386c58]" />
              )}
              Risk Window Status
            </p>
            {summary.maxDeficitMw > 0 ? (
              <>
                <p className="text-lg font-bold text-[#9b3f42]">
                  {summary.maxDeficitMw} <span className="text-xs font-semibold text-[#9b3f42]">MW Shortfall</span>
                </p>
                <p className="text-[11px] text-[#9b3f42] font-medium">
                  {summary.highRiskHoursCount} high-risk shortfall intervals
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-[#386c58]">
                  Balanced
                </p>
                <p className="text-[11px] text-[#386c58] font-medium">
                  No high-risk shortfall expected
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── 3. HERO FORECAST CHART ─────────────────────────────────── */}
      <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header flex-col gap-3 bg-[#f3f7f4] sm:flex-row sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow">{horizon.toUpperCase()} Solar Curve</p>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock3 size={12} className="text-slate-400" />
                Telemetry replay: {activeData[0]?.fullTimeLabel ?? "—"}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-grid-ink">
              Expected Solar Generation, Grid Demand & Uncertainty Envelope
            </h2>
          </div>

          {/* Chart Controls: Layer Toggles & Jump Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Layer Toggles */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-400 hidden lg:inline-flex">
                <Layers size={13} />
              </span>
              <button
                onClick={() => setShowUncertainty(!showUncertainty)}
                className={`layer-toggle ${showUncertainty ? "layer-toggle-amber" : "layer-toggle-inactive"}`}
                title="Toggle P10-P90 Uncertainty Envelope"
              >
                Uncertainty (P10-P90)
              </button>
              <button
                onClick={() => setShowDemand(!showDemand)}
                className={`layer-toggle ${showDemand ? "layer-toggle-red" : "layer-toggle-inactive"}`}
                title="Toggle Grid Demand Reference Line"
              >
                Demand Line
              </button>
              <button
                onClick={() => setShowIrradiance(!showIrradiance)}
                className={`layer-toggle ${showIrradiance ? "layer-toggle-amber-bold" : "layer-toggle-inactive"}`}
                title="Toggle Solar Irradiance (W/m²) overlay"
              >
                Irradiance
              </button>
              <button
                onClick={() => setShowRiskAreas(!showRiskAreas)}
                className={`layer-toggle ${showRiskAreas ? "layer-toggle-rose" : "layer-toggle-inactive"}`}
                title="Toggle Risk Zones shading"
              >
                Risk Zones
              </button>
            </div>

            {/* Quick Shortcuts */}
            <div className="flex items-center gap-1.5 border-l border-grid-line pl-2">
              <button
                onClick={() => setSelectedHour("15:00")}
                className="button-secondary py-1 px-2 text-[11px] min-h-7"
                title="Jump to current hour (15:00)"
              >
                <Radio size={11} className="text-[#396553] animate-pulse" />
                NOW (15:00)
              </button>
              <button
                onClick={() => setSelectedHour("18:00")}
                className="layer-toggle layer-toggle-red"
                title="Jump to evening shortfall peak (18:00)"
              >
                <AlertTriangle size={11} />
                Risk (18:00)
              </button>
            </div>
          </div>
        </div>

        <div className="panel-body">
          <ForecastChart
            data={activeData}
            selectedHour={selectedPoint.hour}
            onSelectPoint={handleSelectPoint}
            showUncertainty={showUncertainty}
            showDemand={showDemand}
            showIrradiance={showIrradiance}
            showRiskAreas={showRiskAreas}
          />

          {/* Chart Interaction Note & Selected Interval Indicator */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-grid-line pt-2.5 text-xs text-grid-muted">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-grid-teal" />
                Active Interval: <strong className="text-grid-ink">{selectedPoint.fullTimeLabel || selectedPoint.hour}</strong>
              </span>
              <span className="text-slate-400">·</span>
              <span>Expected: <strong className="text-grid-teal">{selectedPoint.expected.toFixed(1)} MW</strong></span>
              <span className="text-slate-400">·</span>
              <span>Demand: <strong className="text-[#9b3f42]">{selectedPoint.demand.toFixed(1)} MW</strong></span>
            </div>

            <span className="text-[11px] text-slate-500 italic">
              Click any point on the chart to inspect details below
            </span>
          </div>
        </div>
      </section>

      {/* ─── 4. KEY FORECAST EVENTS (NO DUPLICATION) ────────────────── */}
      <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header bg-[#f3f7f4]">
          <div>
            <p className="eyebrow">Key Forecast Events</p>
            <h2 className="text-sm font-semibold text-grid-ink">
              Important Shortfall & Surplus Windows ({horizon.toUpperCase()})
            </h2>
          </div>
          <span className="text-[11px] text-grid-muted">Click any event to select in chart & inspector</span>
        </div>

        <div className="panel-body">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relevantRiskPeriods.map((period) => {
              const isSelected = selectedPoint.hour === period.targetHour;
              const isShortfall = period.type === "SHORTFALL";

              return (
                <div
                  key={period.id}
                  onClick={() => handleJumpToRisk(period.targetHour)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition text-left ${
                    isSelected
                      ? "border-[#bfd0c4] bg-[#edf8f2] ring-2 ring-[#d6e7dd] shadow-sm"
                      : "border-[#dfe7e1] bg-white hover:border-[#bfd0c4] hover:bg-[#f4faf6]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <RiskBadge risk={period.risk} />
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      <Clock3 size={11} className="text-slate-400" />
                      {period.timeWindow}
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-grid-ink">{period.name}</h3>

                  <div className="mt-2 rounded-xl border border-[#dfe7e1] bg-[#f3f7f4] p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-500">{period.metricLabel}:</span>
                      <span className={`font-bold ${isShortfall ? "text-[#9b3f42]" : "text-[#386c58]"}`}>
                        {period.metricValue}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{period.weatherCause}</p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#386c58]">{period.actionHint}</span>
                    <ArrowRight size={13} className={isSelected ? "text-[#386c58]" : "text-slate-400"} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. FORECAST DETAILS & TIMESTAMP INSPECTOR ──────────────── */}
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Simplified Timestamp Inspector */}
        <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
          <div className="panel-header bg-[#f3f7f4]">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="eyebrow">Timestamp Inspector</p>
                {selectedPoint.dayLabel && (
                  <span className="rounded border border-[#dfe7e1] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {selectedPoint.dayLabel}
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-base font-bold text-grid-ink">
                {selectedPoint.fullTimeLabel || selectedPoint.hour}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <RiskBadge risk={selectedPoint.risk} />
              <div className="flex items-center rounded-md border border-[#dfe7e1] bg-white shadow-xs">
                <button
                  onClick={() => handleStepHour("prev")}
                  className="rounded-l-md p-1.5 text-slate-600 transition hover:bg-[#f3f7f4]"
                  title="Previous hour"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => handleStepHour("next")}
                  className="rounded-r-md border-l border-[#dfe7e1] p-1.5 text-slate-600 transition hover:bg-[#f3f7f4]"
                  title="Next hour"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="panel-body space-y-3.5">
            {/* Expected Generation Hero */}
            <div className="rounded-xl border border-[#d6e7dd] bg-[#eef8f2] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#386c58]">
                Expected Solar Generation
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-[#1b3e33]">
                    {selectedPoint.expected.toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-[#386c58]">MW</span>
                </div>
                <span className="text-xs font-semibold text-[#386c58]">
                  {((selectedPoint.expected / site.capacityMw) * 100).toFixed(1)}% capacity
                </span>
              </div>

              {typeof selectedPoint.historical === "number" && (
                <p className="mt-2 flex justify-between border-t border-[#d6e7dd] pt-1.5 text-xs text-slate-600">
                  <span>Measured Actual:</span>
                  <span className="font-semibold text-slate-800">{selectedPoint.historical.toFixed(1)} MW</span>
                </p>
              )}
            </div>

            {/* Concise Metric Rows */}
            <div className="space-y-2 text-xs">
              <MetricRow
                label="Uncertainty (P10-P90)"
                value={`${selectedPoint.lower.toFixed(1)} – ${selectedPoint.upper.toFixed(1)} MW`}
                subValue={`(±${halfSpread} MW)`}
                tone="amber"
              />
              <MetricRow
                label="Grid Demand"
                value={`${selectedPoint.demand.toFixed(1)} MW`}
                subValue="Feeder requirement"
                tone="default"
              />
              <MetricRow
                label="Net Balance"
                value={isDeficit ? `${Math.abs(netBalance).toFixed(1)} MW Deficit` : `+${netBalance.toFixed(1)} MW Surplus`}
                subValue={isDeficit ? "Solar deficit" : "Export headroom"}
                tone={isDeficit ? "risk" : "positive"}
              />

              {/* Confidence Progress Bar */}
              <div className="mt-2 rounded-xl border border-[#dfe7e1] bg-[#f3f7f4] p-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-600">Forecast Confidence</span>
                  <span className="font-bold text-slate-800">{selectedPoint.confidenceScore ?? 80}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (selectedPoint.confidenceScore ?? 80) > 80
                        ? "bg-[#3a6d58]"
                        : (selectedPoint.confidenceScore ?? 80) > 65
                          ? "bg-[#a78b52]"
                          : "bg-[#9b3f42]"
                    }`}
                    style={{ width: `${selectedPoint.confidenceScore ?? 80}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Analysis Tabs: AI Explainability / Weather Drivers / Hourly Table */}
        <section className="panel flex flex-col">
          <div className="panel-header flex-col gap-2.5 sm:flex-row sm:items-center justify-between">
            <div>
              <p className="eyebrow">Detailed Analysis</p>
              <h3 className="text-sm font-semibold text-grid-ink">
                Telemetry & Model Explainability
              </h3>
            </div>

            {/* Tab Selector */}
            <div className="segmented-control self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("ai")}
                className={`segmented-button flex items-center gap-1.5 ${activeTab === "ai" ? "segmented-button-active" : ""}`}
              >
                <Sparkles size={13} className={activeTab === "ai" ? "text-grid-teal" : "text-slate-400"} />
                AI Explainability
              </button>
              <button
                onClick={() => setActiveTab("weather")}
                className={`segmented-button flex items-center gap-1.5 ${activeTab === "weather" ? "segmented-button-active" : ""}`}
              >
                <CloudSun size={13} className={activeTab === "weather" ? "text-grid-teal" : "text-slate-400"} />
                Weather Drivers
              </button>
              <button
                onClick={() => setActiveTab("table")}
                className={`segmented-button flex items-center gap-1.5 ${activeTab === "table" ? "segmented-button-active" : ""}`}
              >
                <Table size={13} className={activeTab === "table" ? "text-grid-teal" : "text-slate-400"} />
                Hourly Table
              </button>
            </div>
          </div>

          <div className="panel-body flex-1">
            {/* TAB 1: AI Explainability */}
            {activeTab === "ai" && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-grid-teal" />
                    Why is generation changing at {selectedPoint.hour}?
                  </p>
                  <p className="mt-1.5 leading-relaxed text-slate-700 bg-slate-50 p-3 rounded-md border border-grid-line">
                    {selectedPoint.explanation ||
                      "Generation is driven by standard solar zenith angle transitions and localized atmospheric optical depth."}
                  </p>
                </div>

                <div className="space-y-1 rounded-xl border border-[#e5d9c2] bg-[#f9f1e5] p-3 text-[#6d5d3e]">
                  <div className="flex items-center gap-1.5 font-bold">
                      <Info size={14} className="shrink-0 text-[#7d6944]" />
                    <span>Uncertainty Rationale:</span>
                  </div>
                    <p className="text-[11px] leading-relaxed text-[#6d5d3e]">
                    {selectedPoint.risk === "HIGH"
                      ? "The uncertainty band widens to ±" + halfSpread + " MW due to convective cloud boundary dynamics during evening transition."
                      : selectedPoint.risk === "MEDIUM"
                        ? "Uncertainty is moderate (±" + halfSpread + " MW) due to partial cumulus scattering."
                        : "Low uncertainty (±" + halfSpread + " MW) supported by stable clearness index."}
                  </p>
                </div>

                {isDeficit && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#ebd5d2] bg-[#fff1f0] p-3 text-[11px] text-[#7d3432]">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#9b3f42]" />
                    <div>
                      <span className="font-bold">Operational Impact: </span>
                      <span>
                        Shortfall of {Math.abs(netBalance).toFixed(1)} MW anticipated. Operators should verify battery dispatch or backup availability in Decision Center.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Weather Drivers */}
            {activeTab === "weather" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <WeatherTile
                    label="Cloud Cover"
                    value={`${selectedPoint.cloudCover}%`}
                    status={selectedPoint.cloudCover > 65 ? "Heavy" : selectedPoint.cloudCover > 35 ? "Moderate" : "Clear"}
                    icon={Cloud}
                    warning={selectedPoint.cloudCover > 65}
                  />
                  <WeatherTile
                    label="Solar Irradiance (GHI)"
                    value={`${selectedPoint.irradiance} W/m²`}
                    status={selectedPoint.irradiance > 600 ? "High Beam" : selectedPoint.irradiance > 150 ? "Diffuse" : "Low / Zero"}
                    icon={Sun}
                  />
                  <WeatherTile
                    label="Ambient Temp"
                    value={`${selectedPoint.temperature ?? 32}°C`}
                    status="Derate: -3.2%"
                    icon={Thermometer}
                  />
                  <WeatherTile
                    label="Wind Speed"
                    value={`${selectedPoint.windSpeed ?? 4.2} m/s`}
                    status="Cell cooling +1.1%"
                    icon={Wind}
                  />
                </div>

                <div className="rounded-md border border-grid-line bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Dominant Weather Driver at {selectedPoint.hour}: </span>
                  <span>{selectedPoint.weatherDriver || "Standard diurnal solar elevation curve."}</span>
                </div>
              </div>
            )}

            {/* TAB 3: Hourly Telemetry Matrix */}
            {activeTab === "table" && (
              <div className="max-h-[340px] overflow-y-auto border border-grid-line rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 border-b border-grid-line text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Interval</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Expected</th>
                      <th className="py-2 px-3">P10 - P90</th>
                      <th className="py-2 px-3">Demand</th>
                      <th className="py-2 px-3">Net</th>
                      <th className="py-2 px-3">Cloud</th>
                      <th className="py-2 px-3">GHI</th>
                      <th className="py-2 px-3">Risk</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grid-line bg-white">
                    {activeData.map((pt) => {
                      const isSelected = pt.hour === selectedPoint.hour;
                      const bal = pt.expected - pt.demand;
                      const isNeg = bal < 0;

                      return (
                        <tr
                          key={pt.hour}
                          onClick={() => handleSelectPoint(pt)}
                          className={`cursor-pointer transition hover:bg-slate-50 ${
                            isSelected ? "bg-[#edf8f2] font-medium text-[#234b3e]" : ""
                          }`}
                        >
                          <td className="py-1.5 px-3 font-semibold text-grid-ink">
                            {pt.fullTimeLabel || pt.hour}
                          </td>
                          <td className="py-1.5 px-3">
                            {typeof pt.historical === "number" ? (
                              <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-medium">
                                Actual
                              </span>
                            ) : (
                              <span className="rounded border border-[#dfe7e1] bg-[#eef8f2] px-1.5 py-0.5 text-[10px] font-medium text-[#386c58]">
                                Model
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-grid-ink">
                            {pt.expected.toFixed(1)} MW
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">
                            {pt.lower.toFixed(1)} - {pt.upper.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-[#9b3f42]">
                            {pt.demand.toFixed(1)} MW
                          </td>
                          <td className={`py-1.5 px-3 font-semibold ${isNeg ? "text-[#9b3f42]" : "text-[#386c58]"}`}>
                            {isNeg ? `${bal.toFixed(1)} MW` : `+${bal.toFixed(1)} MW`}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">{pt.cloudCover}%</td>
                          <td className="py-1.5 px-3 text-slate-600">{pt.irradiance}</td>
                          <td className="py-1.5 px-3">
                            <RiskBadge risk={pt.risk} />
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPoint(pt);
                              }}
                              className="text-[11px] text-grid-teal hover:underline font-semibold"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function getForecastSummary(data: ForecastPoint[]) {
  const totalProjectedMwh = data.reduce((sum, point) => sum + point.expected, 0);
  const totalDemandMwh = data.reduce((sum, point) => sum + point.demand, 0);
  const peak = data.reduce<ForecastPoint | undefined>((currentPeak, point) =>
    !currentPeak || point.expected > currentPeak.expected ? point : currentPeak, undefined);
  const deficits = data.map((point) => point.demand - point.expected).filter((deficit) => deficit > 0);
  const confidencePoints = data.filter((point) => point.confidenceScore !== undefined);

  return {
    totalProjectedMwh: Number(totalProjectedMwh.toFixed(1)),
    totalDemandMwh: Number(totalDemandMwh.toFixed(1)),
    peakGenerationMw: Number((peak?.expected ?? 0).toFixed(1)),
    peakHour: peak?.fullTimeLabel ?? peak?.hour ?? "—",
    avgConfidenceScore: confidencePoints.length
      ? Math.round(confidencePoints.reduce((sum, point) => sum + (point.confidenceScore ?? 0), 0) / confidencePoints.length)
      : 0,
    maxDeficitMw: Number((deficits.length ? Math.max(...deficits) : 0).toFixed(1)),
    highRiskHoursCount: data.filter((point) => point.risk === "HIGH" && point.demand > point.expected).length,
  };
}

function ForecastMessage({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <section className="panel border-[#dfe7e1] bg-[#f9faf9] p-6 text-center">
      <p className="eyebrow">Generation & risk forecast</p>
      <h2 className="mt-2 text-lg font-bold text-grid-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-grid-muted">{detail}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </section>
  );
}

function MetricRow({
  label,
  value,
  subValue,
  tone = "default"
}: {
  label: string;
  value: string;
  subValue?: string;
  tone?: "default" | "risk" | "amber" | "positive";
}) {
  const toneClasses = {
    default: "text-grid-ink font-bold",
    risk: "text-[#9b3f42] font-bold",
    amber: "text-[#7d6944] font-bold",
    positive: "text-[#386c58] font-bold"
  };

  return (
    <div className="flex items-center justify-between border-b border-grid-line pb-2 last:border-b-0 last:pb-0">
      <div>
        <span className="text-slate-600 font-medium">{label}</span>
        {subValue && <span className="ml-1 text-[10px] text-slate-400">{subValue}</span>}
      </div>
      <span className={toneClasses[tone]}>{value}</span>
    </div>
  );
}

function WeatherTile({
  label,
  value,
  status,
  icon: Icon,
  warning = false
}: {
  label: string;
  value: string;
  status: string;
  icon: LucideIcon;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-2.5 transition ${
      warning ? "border-[#ebd5d2] bg-[#fff1f0]" : "border-[#dfe7e1] bg-[#f3f7f4]"
    }`}>
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        <Icon size={13} className={warning ? "text-[#9b3f42]" : "text-slate-400"} />
      </div>
      <p className="mt-1 text-sm font-bold text-grid-ink">{value}</p>
      <p className={`mt-0.5 text-[10px] font-medium ${warning ? "text-[#9b3f42] font-bold" : "text-slate-500"}`}>
        {status}
      </p>
    </div>
  );
}
