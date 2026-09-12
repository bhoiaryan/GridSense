import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Calendar,
  CheckCircle2,
  Clock3,
  Layers,
  ShieldCheck,
  Sun,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { ForecastChart } from "../components/charts/ForecastChart";
import { RiskBadge } from "../components/alerts/RiskBadge";
import { api } from "../services/api";
import type { DashboardResponse, ForecastHorizon, ForecastPoint, Kpi } from "../types";

export function Dashboard() {
  const [horizon, setHorizon] = useState<ForecastHorizon>("24h");
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showDemand, setShowDemand] = useState(true);
  const [showRiskAreas, setShowRiskAreas] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    api.getDashboard("solar-01")
      .then((response) => {
        if (!cancelled) {
          setDashboard(response);
          setForecastData(response.currentForecast);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load the operations dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!dashboard) return;

    if (horizon === "24h") {
      setForecastData(dashboard.currentForecast);
      return;
    }

    let cancelled = false;
    setIsForecastLoading(true);
    setError(null);
    const hours = Number(horizon.slice(0, -1)) as 48 | 72;
    api.getForecast("solar-01", hours)
      .then((response) => {
        if (!cancelled) setForecastData(response.forecast);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load the selected forecast horizon.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsForecastLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dashboard, horizon]);

  const summary = useMemo(() => getForecastSummary(forecastData), [forecastData]);

  if (isLoading) {
    return <DashboardMessage title="Loading operations dashboard" detail="Retrieving the latest site, forecast, risk, and decision data." />;
  }

  if (!dashboard) {
    return (
      <DashboardMessage
        title="Dashboard unavailable"
        detail={error ?? "The dashboard response was empty."}
        action={<button className="button-primary" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>}
      />
    );
  }

  const { site, kpis, recommendation, riskEvents, systemStatus } = dashboard;
  const primaryRisk = riskEvents[0] ?? {
    id: "no-active-risk",
    risk: "LOW" as const,
    type: "UNCERTAINTY" as const,
    window: "No active risk window",
    expectedImpact: "No material impact detected.",
    problem: "The risk engine has not reported an active operational event.",
  };
  const generation = kpis.find((item) => item.label === "Current Generation") ?? currentGenerationKpi(site.currentGenerationMw, site.capacityMw);
  const battery = kpis.find((item) => item.label.toLowerCase().includes("battery")) ?? batteryKpi(site.batterySoc, site.dischargeLimitMw);
  const currentPoint = forecastData[0];
  const operationalCount = systemStatus.filter((item) => item.status === "Operational").length;

  return (
    <div className="space-y-4">
      {/* ─── Current Status ──────────────────────────────────────── */}
      <section aria-labelledby="current-status-title" className="panel overflow-hidden border-[#dfe9e1] bg-[#f7faf7] shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 border-b border-[#dfe9e1] bg-[#f3f7f4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow">Current Status</p>
              <span className="text-[11px] text-grid-muted">Telemetry replay: {currentPoint?.fullTimeLabel ?? "—"}</span>
            </div>
            <h2 id="current-status-title" className="mt-0.5 text-base font-bold text-grid-ink">
              {site.name} <span className="text-xs font-normal text-grid-muted">({site.location} · {site.capacityMw} MW PV)</span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 sm:self-auto">
            <span className="state-dot bg-emerald-500" />
            Replay data
          </div>
        </div>

        <div className="p-3.5">
          <div className="mb-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#dfeae1] bg-[#edf5ef] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#536b5a]">Net load</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <span className="text-lg font-bold text-grid-ink">{currentPoint?.demand.toFixed(1) ?? "—"} MW</span>
                <span className="text-[10px] font-semibold text-[#3d6d52]">Forecast demand</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#dde6ec] bg-[#f3f5f7] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6d7a]">Battery reserve</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <span className="text-lg font-bold text-grid-ink">{site.batterySoc}% SOC</span>
                <span className="text-[10px] font-semibold text-[#5a6d7d]">{site.dischargeLimitMw} MW max</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#e8dfd2] bg-[#f5f1ea] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6a5c47]">Forecast stability</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <span className="text-lg font-bold text-grid-ink">{summary.avgConfidenceScore}%</span>
                <span className="text-[10px] font-semibold text-[#6c5b47]">Model confidence</span>
              </div>
            </div>
          </div>

          <dl className="grid gap-3 divide-y divide-[#dfe7e1] rounded-2xl border border-[#dfe7e1] bg-white/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatusMetric icon={Sun} label="Generation" value={generation.value} detail={generation.detail} tone="sun" />
            <StatusMetric icon={BatteryCharging} label="Battery" value={battery.value} detail={battery.trend} tone="battery" />
            <StatusMetric
              icon={ShieldCheck}
              label="Backup"
              value={site.backupAvailable ? "Ready" : "Offline"}
              detail={`${site.backupCapacityMw} MW capacity`}
              tone={site.backupAvailable ? "backup" : "risk"}
            />
          </dl>
        </div>
      </section>

      {/* ─── Risk + Recommended Action ───────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Risk Card */}
        <section aria-labelledby="risk-title" className="panel dashboard-risk-surface flex flex-col justify-between overflow-hidden bg-[#fff8f7] p-3.5 sm:p-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e9d0ce] bg-[#fff1f0] text-[#b54847] shadow-sm">
                  <AlertTriangle size={15} />
                </span>
                <span className="eyebrow text-[#a64a47]">Identified Risk</span>
              </div>
              <RiskBadge risk={primaryRisk.risk} />
            </div>

            <h3 id="risk-title" className="mt-3 text-sm font-bold text-[#7d3432]">
              {primaryRisk.type === "SHORTFALL" ? "Forecast Shortfall" : `Forecast ${primaryRisk.type.toLowerCase()}`}
            </h3>

            <div className="mt-3 space-y-2 rounded-2xl border border-[#ebd5d2] bg-[#fff1f0] p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#8a4946]">Window:</span>
                <span className="font-bold text-[#5d2b29]">{primaryRisk.window}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#8a4946]">Expected Impact:</span>
                <span className="font-bold text-[#9b3f42]">{primaryRisk.expectedImpact}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] font-medium text-[#8a4946]">
            {primaryRisk.problem}
          </p>
        </section>

        {/* Recommended Action Card */}
        <section aria-labelledby="recommended-action-title" className="panel dashboard-action-surface flex flex-col justify-between overflow-hidden bg-[#f5faf6] p-3.5 sm:p-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d6e7dd] bg-[#eef8f2] text-[#3e6d57] shadow-sm">
                  <Zap size={15} />
                </span>
                <span className="eyebrow text-[#3e6d57]">Recommended Action</span>
              </div>
              <span className="rounded-full border border-[#d6e7dd] bg-[#eef8f2] px-2 py-0.5 text-[10px] font-bold text-[#396553]">
                Automated Policy
              </span>
            </div>

            <h3 id="recommended-action-title" className="mt-3 text-sm font-bold text-grid-ink">
              {recommendation.action}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-grid-muted">
              {recommendation.expectedImpact}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#dfece3] pt-2.5">
            <span className="text-[11px] font-medium text-grid-muted">
              {recommendation.constraints[0]}
            </span>
            <Link className="button-primary min-h-7 px-3 py-1 text-xs" to="/simulator">
              Run What-If Scenario <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      </div>

      {/* ─── Generation Trend Chart ──────────────────────────────── */}
      <section aria-labelledby="generation-trend-title" className="panel dashboard-chart-surface min-w-0 overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header flex-col gap-3 bg-[#f3f7f4] sm:flex-row sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow">Generation Trend</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock3 size={12} className="text-slate-400" />
                {isForecastLoading ? "Updating forecast…" : `Telemetry: ${currentPoint?.fullTimeLabel ?? currentPoint?.hour ?? "—"}`}
              </span>
            </div>
            <h2 id="generation-trend-title" className="text-sm font-semibold text-grid-ink">
              Solar generation forecast with uncertainty, demand, and risk windows
            </h2>
          </div>

          {/* Horizon Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-grid-muted">
              <Calendar size={13} /> Horizon:
            </span>
            <div className="segmented-control" role="group" aria-label="Forecast time range">
              {(["24h", "48h", "72h"] as ForecastHorizon[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setHorizon(range)}
                  className={`segmented-button min-w-[56px] ${horizon === range ? "segmented-button-active" : ""}`}
                  aria-pressed={horizon === range}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-body">
          {/* Layer Toggles */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Chart layers">
            <span className="mr-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Layers size={13} />
            </span>
            <LayerToggle label="Uncertainty (P10-P90)" tone="amber" active={showUncertainty} onClick={() => setShowUncertainty((v) => !v)} />
            <LayerToggle label="Demand Line" tone="red" active={showDemand} onClick={() => setShowDemand((v) => !v)} />
            <LayerToggle label="Risk Zones" tone="red" active={showRiskAreas} onClick={() => setShowRiskAreas((v) => !v)} />
            {error && <span className="text-[11px] font-medium text-[#9b3f42]">{error}</span>}
          </div>

          <ForecastChart
            data={forecastData}
            compact
            showUncertainty={showUncertainty}
            showDemand={showDemand}
            showRiskAreas={showRiskAreas}
          />

          {/* Compact Overview Stats */}
          <dl className="mt-3 grid gap-3 border-t border-grid-line pt-3 text-xs sm:grid-cols-3">
            <TrendMetric label="Projected Energy" value={`${summary.totalProjectedMwh} MWh`} detail={`vs ${summary.totalDemandMwh} MWh demand`} />
            <TrendMetric label="Peak Generation" value={`${summary.peakGenerationMw} MW`} detail={`At ${summary.peakHour}`} />
            <TrendMetric label="Model Confidence" value={`${summary.avgConfidenceScore}%`} detail={horizon === "24h" ? "High confidence" : "Higher variance"} />
          </dl>
        </div>
      </section>

      {/* ─── System Health ───────────────────────────────────────── */}
      <section aria-labelledby="system-health-title" className="panel dashboard-health-surface overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header bg-[#f3f7f4] py-2.5 px-4">
          <div>
            <p className="eyebrow">System Status</p>
            <h2 id="system-health-title" className="text-sm font-semibold text-grid-ink">
              Core Subsystems & Telemetry Ingestion
            </h2>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            {operationalCount} of {systemStatus.length} Services Operational
          </span>
        </div>

        <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {systemStatus.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 rounded-2xl border border-grid-line bg-white/80 p-2.5 shadow-sm shadow-slate-200/40">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={15} className="shrink-0" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <p className="truncate text-xs font-bold text-grid-ink">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function getForecastSummary(data: ForecastPoint[]) {
  const totalProjectedMwh = data.reduce((sum, point) => sum + point.expected, 0);
  const totalDemandMwh = data.reduce((sum, point) => sum + point.demand, 0);
  const peak = data.reduce<ForecastPoint | undefined>((currentPeak, point) =>
    !currentPeak || point.expected > currentPeak.expected ? point : currentPeak, undefined);
  const confidencePoints = data.filter((point) => point.confidenceScore !== undefined);
  const avgConfidenceScore = confidencePoints.length
    ? Math.round(confidencePoints.reduce((sum, point) => sum + (point.confidenceScore ?? 0), 0) / confidencePoints.length)
    : 0;

  return {
    totalProjectedMwh: totalProjectedMwh.toFixed(1),
    totalDemandMwh: totalDemandMwh.toFixed(1),
    peakGenerationMw: peak?.expected.toFixed(1) ?? "—",
    peakHour: peak?.fullTimeLabel ?? peak?.hour ?? "—",
    avgConfidenceScore,
  };
}

function currentGenerationKpi(currentGenerationMw: number, capacityMw: number): Kpi {
  return {
    label: "Current Generation",
    value: `${currentGenerationMw.toFixed(1)} MW`,
    detail: `${((currentGenerationMw / capacityMw) * 100).toFixed(1)}% of ${capacityMw} MW rated capacity`,
    trend: "Telemetry replay",
    status: "OK",
  };
}

function batteryKpi(batterySoc: number, dischargeLimitMw: number): Kpi {
  return {
    label: "Battery Readiness",
    value: `${batterySoc}% SoC`,
    detail: "Storage availability from current site telemetry",
    trend: `Discharge ready at ${dischargeLimitMw} MW max`,
    status: "OK",
  };
}

function DashboardMessage({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <section className="panel border-[#dfe7e1] bg-[#f9faf9] p-6 text-center">
      <p className="eyebrow">Operations dashboard</p>
      <h2 className="mt-2 text-lg font-bold text-grid-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-grid-muted">{detail}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </section>
  );
}

function StatusMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  className
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  detail: string;
  tone: "sun" | "battery" | "backup" | "risk";
  className?: string;
}) {
  const iconStyle = {
    sun: "border-[#e6ddd0] bg-[#f6f0e6] text-[#6f5d39]",
    battery: "border-[#dfeae1] bg-[#edf8f1] text-[#3e6d57]",
    backup: "border-[#dfe5ea] bg-[#f1f5f8] text-[#4f6475]",
    risk: "border-[#ebd5d2] bg-[#fff1f0] text-[#a34d49]"
  }[tone];

  return (
    <div className={`flex items-start gap-3 p-3.5 sm:p-4 transition-colors duration-150 hover:bg-slate-50/50 ${className ?? ""}`}>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${iconStyle}`}>
        <Icon size={15} />
      </span>
      <div>
        <dt className="metric-label">{label}</dt>
        <dd className="mt-0.5 text-lg font-bold text-grid-ink">{value}</dd>
        <dd className="mt-0.5 text-[11px] text-grid-muted">{detail}</dd>
      </div>
    </div>
  );
}

function TrendMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="metric-label">{label}</dt>
      <dd className="text-base font-bold text-grid-ink">{value}</dd>
      {detail && <dd className="text-[11px] text-grid-muted">{detail}</dd>}
    </div>
  );
}

function LayerToggle({
  label,
  active,
  onClick,
  tone
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone: "amber" | "red";
}) {
  const activeClass = tone === "amber" ? "layer-toggle-amber" : "layer-toggle-red";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`layer-toggle ${active ? activeClass : "layer-toggle-inactive"}`}
    >
      <span className={`state-dot ${active ? (tone === "amber" ? "bg-[#b98d4f]" : "bg-[#9b3f42]") : "bg-slate-300"}`} />
      {label}
    </button>
  );
}
