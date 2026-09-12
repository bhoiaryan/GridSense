import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
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
import { ForecastChart } from "../components/charts/ForecastChart";
import { RiskBadge } from "../components/alerts/RiskBadge";
import {
  getForecastForHorizon,
  getHorizonSummary,
  riskPeriodsList,
  site
} from "../data/mockData";
import type { ForecastHorizon, ForecastPoint } from "../types";

export function Forecast() {
  const [horizon, setHorizon] = useState<ForecastHorizon>("24h");
  const [selectedHour, setSelectedHour] = useState<string>("18:00");
  const [showTable, setShowTable] = useState<boolean>(false);

  // Chart Layer Toggles
  const [showUncertainty, setShowUncertainty] = useState<boolean>(true);
  const [showDemand, setShowDemand] = useState<boolean>(true);
  const [showIrradiance, setShowIrradiance] = useState<boolean>(false);
  const [showRiskAreas, setShowRiskAreas] = useState<boolean>(true);

  // Filtered dataset according to selected horizon
  const activeData = useMemo(() => getForecastForHorizon(horizon), [horizon]);
  const summary = useMemo(() => getHorizonSummary(horizon), [horizon]);

  // Currently selected forecast point
  const selectedPoint = useMemo(() => {
    return (
      activeData.find((point) => point.hour === selectedHour) ||
      activeData.find((point) => point.hour === "18:00") ||
      activeData[0]
    );
  }, [activeData, selectedHour]);

  // Risk periods that fall within current horizon
  const relevantRiskPeriods = useMemo(() => {
    if (horizon === "24h") {
      return riskPeriodsList.filter((r) => r.horizonTag.includes("24H"));
    }
    if (horizon === "48h") {
      return riskPeriodsList.filter((r) => r.horizonTag.includes("24H") || r.horizonTag.includes("48H"));
    }
    return riskPeriodsList;
  }, [horizon]);

  // Step between hours in the inspector
  const handleStepHour = (direction: "prev" | "next") => {
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

  const spread = (selectedPoint.upper - selectedPoint.lower).toFixed(1);
  const halfSpread = (Number(spread) / 2).toFixed(1);
  const netBalance = selectedPoint.expected - selectedPoint.demand;
  const isDeficit = netBalance < 0;

  return (
    <div className="space-y-5">
      {/* TOP HEADER: Site context & 24H/48H/72H Horizon Selector */}
      <section className="flex flex-col gap-4 rounded-lg border border-grid-line bg-white p-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-grid-teal border border-teal-200">
              <Sun size={13} />
              {site.name} ({site.capacityMw} MW Solar PV)
            </span>
            <span className="text-xs text-grid-muted">Model: XGBoost Ensemble + GHI Inversion</span>
          </div>
          <h2 className="text-lg font-bold text-grid-ink">
            Renewable Generation & Uncertainty Forecast
          </h2>
          <p className="text-xs text-grid-muted">
            Physics-informed ML forecast combining numerical weather predictions, historical telemetry, and uncertainty bounds.
          </p>
        </div>

        {/* 24H / 48H / 72H Selector */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-grid-muted mr-1 flex items-center gap-1">
            <Calendar size={13} /> Horizon:
          </span>
          <div className="flex rounded-md border border-grid-line bg-slate-100 p-1 shadow-inner">
            {(["24h", "48h", "72h"] as ForecastHorizon[]).map((h) => {
              const isActive = horizon === h;
              return (
                <button
                  key={h}
                  onClick={() => {
                    setHorizon(h);
                    // If current selection is outside new horizon, reset to 18:00
                    const newData = getForecastForHorizon(h);
                    if (!newData.some((p) => p.hour === selectedHour)) {
                      setSelectedHour(newData[Math.min(18, newData.length - 1)].hour);
                    }
                  }}
                  className={`relative px-3.5 py-1.5 text-xs font-bold transition-all rounded ${
                    isActive
                      ? "bg-white text-grid-teal shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-grid-ink hover:bg-slate-200/50"
                  }`}
                >
                  {h.toUpperCase()}
                  {h === "24h" && <span className="ml-1 text-[10px] opacity-75">(Today)</span>}
                  {h === "48h" && <span className="ml-1 text-[10px] opacity-75">(2-Day)</span>}
                  {h === "72h" && <span className="ml-1 text-[10px] opacity-75">(3-Day)</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* HORIZON SUMMARY STRIP */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Peak Generation"
          value={`${summary.peakGenerationMw} MW`}
          detail={`At ${summary.peakHour}`}
          icon={Sun}
          accent="teal"
        />
        <SummaryCard
          label="Total Projected Energy"
          value={`${summary.totalProjectedMwh} MWh`}
          detail={`vs ${summary.totalDemandMwh} MWh grid demand`}
          icon={Zap}
          accent="blue"
        />
        <SummaryCard
          label="Max Shortfall Deficit"
          value={`${summary.maxDeficitMw} MW`}
          detail={`${summary.highRiskHoursCount} high-risk shortfall intervals`}
          icon={TrendingDown}
          accent="red"
          highlight={summary.maxDeficitMw > 0}
        />
        <SummaryCard
          label="Avg Confidence Index"
          value={`${summary.avgConfidenceScore}%`}
          detail={horizon === "24h" ? "High confidence (0-24h)" : horizon === "48h" ? "Moderate dispersion (48h)" : "Higher variance (72h)"}
          icon={Percent}
          accent="amber"
        />
      </section>

      {/* MAIN TWO-COLUMN SECTION: CHART + INSPECTOR */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* LEFT COLUMN: MAIN CHART & CONTROLS */}
        <div className="space-y-4">
          <section className="panel">
            <div className="panel-header flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="eyebrow">{horizon.toUpperCase()} Forecast Curve</p>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <Clock3 size={12} className="text-slate-400" />
                    Telemetric sync: 15:00 NOW
                  </span>
                </div>
                <h2 className="text-base font-semibold text-grid-ink">
                  Solar Generation, Demand & Uncertainty Envelope
                </h2>
              </div>

              {/* Layer Toggles */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-slate-400 font-medium mr-1 text-[11px]">
                  <Layers size={13} /> Layers:
                </span>
                <button
                  onClick={() => setShowUncertainty(!showUncertainty)}
                  className={`px-2 py-1 rounded border text-[11px] font-medium transition ${
                    showUncertainty
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  Uncertainty Range (P10-P90)
                </button>
                <button
                  onClick={() => setShowDemand(!showDemand)}
                  className={`px-2 py-1 rounded border text-[11px] font-medium transition ${
                    showDemand
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  Demand Line
                </button>
                <button
                  onClick={() => setShowIrradiance(!showIrradiance)}
                  className={`px-2 py-1 rounded border text-[11px] font-medium transition ${
                    showIrradiance
                      ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}
                  title="Toggle Solar Irradiance (W/m²) overlay on right axis"
                >
                  Irradiance (W/m²)
                </button>
                <button
                  onClick={() => setShowRiskAreas(!showRiskAreas)}
                  className={`px-2 py-1 rounded border text-[11px] font-medium transition ${
                    showRiskAreas
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  Risk Zones
                </button>
              </div>
            </div>

            <div className="panel-body">
              {/* Chart Component */}
              <ForecastChart
                data={activeData}
                selectedHour={selectedPoint.hour}
                onSelectPoint={handleSelectPoint}
                showUncertainty={showUncertainty}
                showDemand={showDemand}
                showIrradiance={showIrradiance}
                showRiskAreas={showRiskAreas}
              />

              {/* Chart Legend & Quick Selection Help */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-grid-line pt-3 text-xs text-grid-muted">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-4 rounded-sm bg-slate-600" />
                    Measured Telemetry (≤15:00)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-4 rounded-sm bg-teal-700" />
                    Expected Solar Model (&gt;15:00)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-4 rounded-sm bg-amber-200 border border-amber-400" />
                    Confidence Interval (P10-P90)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 border-b-2 border-dashed border-red-600" />
                    Local Grid Demand
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedHour("15:00")}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition"
                  >
                    <Radio size={11} className="text-teal-700 animate-pulse" />
                    Jump to NOW (15:00)
                  </button>
                  <button
                    onClick={() => setSelectedHour("18:00")}
                    className="inline-flex items-center gap-1 rounded bg-red-50 hover:bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700 border border-red-200 transition"
                  >
                    <AlertTriangle size={11} />
                    Jump to Shortfall (18:00)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* IDENTIFIED OPERATIONAL RISK PERIODS IN THIS HORIZON */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Operational Risk Windows</p>
                <h3 className="text-sm font-semibold text-grid-ink">
                  Identified Shortfall & Surplus Windows ({horizon.toUpperCase()})
                </h3>
              </div>
              <span className="text-xs text-grid-muted">Click any event to inspect</span>
            </div>

            <div className="panel-body grid gap-3 md:grid-cols-3">
              {relevantRiskPeriods.map((period) => {
                const isSelected = selectedPoint.hour === period.targetHour;
                return (
                  <div
                    key={period.id}
                    onClick={() => handleJumpToRisk(period.targetHour)}
                    className={`cursor-pointer rounded-lg border p-3.5 transition-all text-left ${
                      isSelected
                        ? "border-grid-teal bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20"
                        : "border-grid-line bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <RiskBadge risk={period.risk} />
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {period.horizonTag}
                      </span>
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-grid-ink">{period.name}</h4>
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                      <Clock3 size={12} className="text-slate-400" />
                      {period.timeWindow}
                    </p>

                    <div className="mt-2.5 rounded bg-slate-50 border border-slate-200 p-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{period.metricLabel}:</span>
                        <span className={`font-bold ${period.type === "SHORTFALL" ? "text-red-700" : "text-emerald-700"}`}>
                          {period.metricValue}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{period.weatherCause}</p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span className="text-teal-700 font-medium">{period.actionHint}</span>
                      <ArrowRight size={13} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* HOURLY MATRIX TABLE TOGGLE */}
          <section className="panel">
            <div
              onClick={() => setShowTable(!showTable)}
              className="panel-header cursor-pointer hover:bg-slate-50 transition select-none flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Table size={16} className="text-grid-teal" />
                <div>
                  <h3 className="text-sm font-semibold text-grid-ink">
                    Hourly Telemetry & Forecast Data Table
                  </h3>
                  <p className="text-xs text-grid-muted">
                    Tabular inspectable matrix for all {activeData.length} intervals ({horizon.toUpperCase()})
                  </p>
                </div>
              </div>
              <button className="button-secondary text-xs py-1 px-2.5">
                {showTable ? "Hide Table" : "View Hourly Matrix"}
              </button>
            </div>

            {showTable && (
              <div className="panel-body overflow-x-auto p-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-grid-line bg-slate-50 text-[11px] font-semibold text-slate-600">
                      <th className="py-2.5 px-3">Interval</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Expected (MW)</th>
                      <th className="py-2.5 px-3">P10 - P90 Range</th>
                      <th className="py-2.5 px-3">Demand (MW)</th>
                      <th className="py-2.5 px-3">Net Balance</th>
                      <th className="py-2.5 px-3">Cloud Cover</th>
                      <th className="py-2.5 px-3">GHI (W/m²)</th>
                      <th className="py-2.5 px-3">Confidence</th>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grid-line">
                    {activeData.map((pt) => {
                      const isSelected = pt.hour === selectedPoint.hour;
                      const bal = pt.expected - pt.demand;
                      const isNeg = bal < 0;

                      return (
                        <tr
                          key={pt.hour}
                          onClick={() => handleSelectPoint(pt)}
                          className={`cursor-pointer transition hover:bg-slate-50 ${
                            isSelected ? "bg-teal-50/80 font-medium text-teal-950" : ""
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-grid-ink">
                            {pt.fullTimeLabel || pt.hour}
                          </td>
                          <td className="py-2 px-3">
                            {pt.historical !== undefined ? (
                              <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-medium">
                                Measured
                              </span>
                            ) : (
                              <span className="rounded bg-teal-50 text-teal-700 px-1.5 py-0.5 text-[10px] font-medium border border-teal-200">
                                ML Forecast
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-grid-ink">
                            {pt.expected.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {pt.lower.toFixed(1)} - {pt.upper.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-red-600 font-medium">
                            {pt.demand.toFixed(1)}
                          </td>
                          <td className={`py-2 px-3 font-semibold ${isNeg ? "text-red-700" : "text-emerald-700"}`}>
                            {isNeg ? `${bal.toFixed(1)} MW` : `+${bal.toFixed(1)} MW`}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{pt.cloudCover}%</td>
                          <td className="py-2 px-3 text-slate-600">{pt.irradiance}</td>
                          <td className="py-2 px-3 text-slate-600">{pt.confidenceScore}%</td>
                          <td className="py-2 px-3">
                            <RiskBadge risk={pt.risk} />
                          </td>
                          <td className="py-2 px-3 text-right">
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
          </section>
        </div>

        {/* RIGHT COLUMN: INSPECTOR, WEATHER FACTORS, EXPLAINABILITY */}
        <aside className="space-y-5">
          {/* SELECTED TIMESTAMP INSPECTOR */}
          <section className="panel border-slate-300 shadow-md">
            <div className="panel-header bg-slate-50/80">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="eyebrow">Timestamp Inspector</p>
                  {selectedPoint.dayLabel && (
                    <span className="text-[11px] font-semibold text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
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
                <div className="flex items-center rounded border border-grid-line bg-white">
                  <button
                    onClick={() => handleStepHour("prev")}
                    className="p-1 hover:bg-slate-100 text-slate-600 transition"
                    title="Previous interval"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => handleStepHour("next")}
                    className="p-1 hover:bg-slate-100 text-slate-600 transition border-l border-grid-line"
                    title="Next interval"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="panel-body space-y-4">
              {/* Main Expected Generation Big Stat */}
              <div className="rounded-lg bg-teal-50/70 border border-teal-200 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Expected Solar Generation
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-teal-950">
                      {selectedPoint.expected.toFixed(1)}
                    </span>
                    <span className="text-sm font-bold text-teal-800">MW</span>
                  </div>
                  <span className="text-xs font-semibold text-teal-700">
                    {((selectedPoint.expected / site.capacityMw) * 100).toFixed(1)}% capacity
                  </span>
                </div>

                {selectedPoint.historical !== undefined && (
                  <p className="mt-2 text-xs text-slate-600 border-t border-teal-200/80 pt-1.5 flex justify-between">
                    <span>Measured Telemetry:</span>
                    <span className="font-semibold text-slate-800">{selectedPoint.historical.toFixed(1)} MW</span>
                  </p>
                )}
              </div>

              {/* Key Quantitative Metrics Grid */}
              <div className="space-y-2.5 text-xs">
                <MetricRow
                  label="Uncertainty Range (P10-P90)"
                  value={`${selectedPoint.lower.toFixed(1)} – ${selectedPoint.upper.toFixed(1)} MW`}
                  subValue={`(±${halfSpread} MW spread)`}
                  tone="amber"
                />

                <MetricRow
                  label="Grid Demand Requirement"
                  value={`${selectedPoint.demand.toFixed(1)} MW`}
                  subValue="Local feeder requirement"
                  tone="default"
                />

                <MetricRow
                  label="Net Energy Balance"
                  value={isDeficit ? `${Math.abs(netBalance).toFixed(1)} MW Deficit` : `+${netBalance.toFixed(1)} MW Surplus`}
                  subValue={isDeficit ? "Solar insufficient alone" : "Export / charging headroom"}
                  tone={isDeficit ? "risk" : "positive"}
                />

                <div className="rounded-md border border-grid-line bg-slate-50 p-2.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-600 font-medium">Model Confidence Index</span>
                    <span className="font-bold text-slate-800">{selectedPoint.confidenceScore ?? 80}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        (selectedPoint.confidenceScore ?? 80) > 80
                          ? "bg-emerald-600"
                          : (selectedPoint.confidenceScore ?? 80) > 65
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${selectedPoint.confidenceScore ?? 80}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Calculated from numerical weather ensemble dispersion & horizon decay.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* WEATHER FACTORS TELEMETRY CARD */}
          <section className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2 text-grid-ink">
                <CloudSun size={17} className="text-grid-teal" />
                <h3 className="text-sm font-semibold">Weather Drivers at Selected Interval</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">NWP Ingest</span>
            </div>

            <div className="panel-body space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
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

              <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Dominant Weather Driver: </span>
                <span>{selectedPoint.weatherDriver || "Standard diurnal solar elevation curve."}</span>
              </div>
            </div>
          </section>

          {/* CLEAR EXPLANATION: WHY THE FORECAST CHANGES */}
          <section className="panel border-teal-200 bg-gradient-to-b from-teal-50/40 to-white">
            <div className="panel-header border-b border-teal-100">
              <div className="flex items-center gap-2 text-grid-teal">
                <Sparkles size={17} />
                <h3 className="text-sm font-bold text-teal-950">AI Forecast Intelligence & Causality</h3>
              </div>
              <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                Explainable
              </span>
            </div>

            <div className="panel-body space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-grid-teal" />
                  Why is generation changing at this time?
                </p>
                <p className="mt-1.5 leading-relaxed text-slate-700 bg-white/80 p-3 rounded border border-teal-100/80 shadow-2xs">
                  {selectedPoint.explanation ||
                    "Generation is driven by standard solar zenith angle transitions and localized atmospheric optical depth."}
                </p>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50/80 p-2.5 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info size={14} className="text-amber-700 shrink-0" />
                  <span>Uncertainty Rationale:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  {selectedPoint.risk === "HIGH"
                    ? "The uncertainty band widens to ±" + halfSpread + " MW due to convective cloud boundary dynamics during evening transition."
                    : selectedPoint.risk === "MEDIUM"
                      ? "Uncertainty is moderate (±" + halfSpread + " MW) due to partial cumulus scattering."
                      : "Low uncertainty (±" + halfSpread + " MW) supported by stable clearness index."}
                </p>
              </div>

              {isDeficit && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-red-900 text-[11px] flex items-start gap-2">
                  <AlertTriangle size={15} className="text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Operational Impact: </span>
                    <span>
                      Shortfall of {Math.abs(netBalance).toFixed(1)} MW anticipated. Operators should verify battery dispatch or backup availability in Decision Center.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

// Subcomponent: Summary KPI card
function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = "teal",
  highlight = false
}: {
  label: string;
  value: string;
  detail: string;
  icon: any;
  accent?: "teal" | "blue" | "red" | "amber";
  highlight?: boolean;
}) {
  const accentClasses = {
    teal: "text-grid-teal bg-teal-50 border-teal-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    red: "text-red-700 bg-red-50 border-red-100",
    amber: "text-amber-800 bg-amber-50 border-amber-100"
  };

  return (
    <div
      className={`rounded-lg border bg-white p-3.5 shadow-card transition ${
        highlight ? "border-red-300 bg-red-50/30" : "border-grid-line"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-grid-muted">{label}</p>
        <div className={`rounded-md border p-1.5 ${accentClasses[accent]}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="mt-1 text-xl font-bold text-grid-ink">{value}</p>
      <p className="mt-0.5 text-xs text-grid-muted">{detail}</p>
    </div>
  );
}

// Subcomponent: Metric Row in Inspector
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
    risk: "text-red-700 font-bold",
    amber: "text-amber-800 font-bold",
    positive: "text-emerald-700 font-bold"
  };

  return (
    <div className="flex items-center justify-between border-b border-grid-line pb-2 last:border-b-0 last:pb-0">
      <div>
        <span className="text-slate-600 font-medium">{label}</span>
        {subValue && <p className="text-[10px] text-slate-400">{subValue}</p>}
      </div>
      <span className={toneClasses[tone]}>{value}</span>
    </div>
  );
}

// Subcomponent: Weather Tile
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
  icon: any;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-2.5 transition ${
        warning
          ? "border-red-200 bg-red-50/50"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        <Icon size={13} className={warning ? "text-red-600" : "text-slate-400"} />
      </div>
      <p className="mt-1 text-sm font-bold text-grid-ink">{value}</p>
      <p className={`mt-0.5 text-[10px] font-medium ${warning ? "text-red-600 font-bold" : "text-slate-500"}`}>
        {status}
      </p>
    </div>
  );
}
