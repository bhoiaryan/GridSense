import { useMemo, useState } from "react";
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
import {
  getForecastForHorizon,
  getHorizonSummary,
  kpis,
  recommendation,
  riskEvents,
  site,
  systemStatus
} from "../data/mockData";
import type { ForecastHorizon } from "../types";

export function Dashboard() {
  const [horizon, setHorizon] = useState<ForecastHorizon>("24h");
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showDemand, setShowDemand] = useState(true);
  const [showRiskAreas, setShowRiskAreas] = useState(true);

  const forecastData = useMemo(() => getForecastForHorizon(horizon), [horizon]);
  const summary = useMemo(() => getHorizonSummary(horizon), [horizon]);
  const primaryRisk = riskEvents[0];
  const generation = kpis.find((item) => item.label === "Current Generation")!;
  const battery = kpis.find((item) => item.label === "Battery Status")!;

  return (
    <div className="space-y-4">
      {/* ─── Current Status ──────────────────────────────────────── */}
      <section aria-labelledby="current-status-title" className="panel dashboard-status-surface overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-grid-line bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow">Current Status</p>
              <span className="text-[11px] text-grid-muted">Telemetry ingest: 15:00 NOW</span>
            </div>
            <h2 id="current-status-title" className="text-base font-bold text-grid-ink mt-0.5">
              {site.name} <span className="text-xs font-normal text-grid-muted">({site.location} · {site.capacityMw} MW PV)</span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <span className="state-dot bg-emerald-500" />
            Live
          </div>
        </div>

        <dl className="grid divide-y divide-grid-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
      </section>

      {/* ─── Risk + Recommended Action ───────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Risk Card */}
        <section aria-labelledby="risk-title" className="panel dashboard-risk-surface overflow-hidden p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600">
                  <AlertTriangle size={15} />
                </span>
                <span className="eyebrow text-red-700">Identified Risk</span>
              </div>
              <RiskBadge risk={primaryRisk.risk} />
            </div>

            <h3 id="risk-title" className="mt-2 text-sm font-bold text-red-950">
              Potential Evening Shortfall
            </h3>

            <div className="mt-2.5 rounded-md bg-red-50/60 border border-red-200 p-2.5 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-red-800/80 font-medium">Window:</span>
                <span className="font-bold text-red-950">{primaryRisk.window}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-800/80 font-medium">Expected Impact:</span>
                <span className="font-bold text-red-700">{primaryRisk.expectedImpact}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-red-800/80 font-medium">
            Solar generation declines while feeder demand peaks.
          </p>
        </section>

        {/* Recommended Action Card */}
        <section aria-labelledby="recommended-action-title" className="panel dashboard-action-surface overflow-hidden p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-teal-200 bg-teal-50 text-teal-700">
                  <Zap size={15} />
                </span>
                <span className="eyebrow text-teal-700">Recommended Action</span>
              </div>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                Automated Policy
              </span>
            </div>

            <h3 id="recommended-action-title" className="mt-2 text-sm font-bold text-grid-ink">
              {recommendation.action}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-grid-muted">
              {recommendation.expectedImpact}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-teal-100 pt-2.5">
            <span className="text-[11px] text-grid-muted font-medium">
              {recommendation.constraints[0]}
            </span>
            <Link className="button-primary min-h-7 py-1 px-3 text-xs" to="/simulator">
              Run What-If Scenario <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      </div>

      {/* ─── Generation Trend Chart ──────────────────────────────── */}
      <section aria-labelledby="generation-trend-title" className="panel dashboard-chart-surface min-w-0">
        <div className="panel-header flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow">Generation Trend</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock3 size={12} className="text-slate-400" />
                Live: 15:00 NOW
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
      <section aria-labelledby="system-health-title" className="panel dashboard-health-surface">
        <div className="panel-header py-2.5 px-4">
          <div>
            <p className="eyebrow">System Status</p>
            <h2 id="system-health-title" className="text-sm font-semibold text-grid-ink">
              Core Subsystems & Telemetry Ingestion
            </h2>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            All 4 Services Operational
          </span>
        </div>

        <div className="p-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {systemStatus.map((item) => (
            <div key={item.label} className="rounded-md border border-grid-line bg-slate-50/60 p-2.5 flex items-center gap-2.5">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">{item.label}</p>
                <p className="text-xs font-bold text-grid-ink truncate">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function StatusMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  detail: string;
  tone: "sun" | "battery" | "backup" | "risk";
}) {
  const iconStyle = {
    sun: "border-amber-200 bg-amber-50 text-amber-600",
    battery: "border-emerald-200 bg-emerald-50 text-emerald-700",
    backup: "border-blue-200 bg-blue-50 text-blue-600",
    risk: "border-red-200 bg-red-50 text-grid-red"
  }[tone];

  return (
    <div className="flex items-start gap-3 p-3.5 sm:p-4 transition-colors duration-150 hover:bg-slate-50/50">
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
      <span className={`state-dot ${active ? (tone === "amber" ? "bg-amber-500" : "bg-red-500") : "bg-slate-300"}`} />
      {label}
    </button>
  );
}
