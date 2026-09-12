import { AlertTriangle, ArrowRight, Clock3, CloudSun, PlayCircle, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { ForecastChart } from "../components/charts/ForecastChart";
import { KpiCard } from "../components/cards/KpiCard";
import { RecommendationCard } from "../components/recommendations/RecommendationCard";
import { RiskBadge } from "../components/alerts/RiskBadge";
import { SystemStatus } from "../components/layout/SystemStatus";
import { forecastData, kpis, recommendation, riskEvents, site, systemStatus } from "../data/mockData";

export function Dashboard() {
  const primaryRisk = riskEvents[0];
  const currentPoint = forecastData.find((point) => point.hour === "15:00");
  const eveningPeakDeficit = 31;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-lg border border-grid-line bg-white px-4 py-3 shadow-card md:grid-cols-4">
        <div>
          <p className="eyebrow">Operating site</p>
          <p className="mt-1 text-sm font-semibold text-grid-ink">{site.name}</p>
        </div>
        <div>
          <p className="eyebrow">Current interval</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-grid-ink">
            <Clock3 size={15} />
            15:00 local / NOW marker
          </p>
        </div>
        <div>
          <p className="eyebrow">Weather driver</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-grid-ink">
            <CloudSun size={15} />
            Cloud cover rising to 76%
          </p>
        </div>
        <div>
          <p className="eyebrow">Decision posture</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-grid-red">
            <Zap size={15} />
            Storage dispatch likely
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">24-hour solar generation forecast</p>
              <h2 className="mt-1 text-lg font-semibold text-grid-ink">Forecast vs demand with uncertainty band</h2>
              <p className="mt-1 text-sm text-grid-muted">
                Historical generation is shown up to NOW; the forecast band widens during the cloudy evening ramp-down.
              </p>
            </div>
            <div className="hidden gap-2 text-xs text-grid-muted sm:flex">
              <span className="rounded-full border border-grid-line px-2 py-1">Historical</span>
              <span className="rounded-full border border-grid-line px-2 py-1">Forecast</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-grid-amber">Uncertainty</span>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-grid-red">High risk</span>
            </div>
          </div>
          <div className="panel-body">
            <ForecastChart data={forecastData} />
            <div className="mt-4 grid gap-3 border-t border-grid-line pt-4 md:grid-cols-3">
              <ChartStat label="Now generation" value={`${currentPoint?.historical?.toFixed(1) ?? "72.4"} MW`} detail="Measured site output" />
              <ChartStat label="Peak shortfall" value={`${eveningPeakDeficit} MW`} detail="Expected near 19:00" tone="risk" />
              <ChartStat label="Battery coverage" value="2.0 hr" detail="At current discharge plan" />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section className="panel border-red-200 bg-red-50">
            <div className="panel-body">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-red-100 p-2 text-grid-red">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-3">
                  <RiskBadge risk={primaryRisk.risk} />
                  <div>
                    <h2 className="text-base font-semibold text-grid-ink">Potential Evening Shortfall</h2>
                    <p className="mt-1 text-sm text-grid-muted">{primaryRisk.window} - {primaryRisk.expectedImpact}</p>
                  </div>
                  <p className="text-sm text-grid-ink">{primaryRisk.problem}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-red-200 bg-white/60 p-2">
                      <p className="font-semibold text-grid-red">31 MW</p>
                      <p className="text-grid-muted">peak deficit</p>
                    </div>
                    <div className="rounded-md border border-red-200 bg-white/60 p-2">
                      <p className="font-semibold text-grid-red">76%</p>
                      <p className="text-grid-muted">cloud cover</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <RecommendationCard recommendation={recommendation} />

          <section className="panel">
            <div className="panel-body flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-start">
              <div>
                <p className="eyebrow">Quick action</p>
                <h2 className="mt-1 text-base font-semibold text-grid-ink">Run What-If Scenario</h2>
                <p className="mt-1 text-sm text-grid-muted">Stress cloud cover, demand, battery, and backup availability.</p>
              </div>
              <Link className="button-primary" to="/simulator">
                <PlayCircle size={16} />
                Run Scenario
                <ArrowRight size={15} />
              </Link>
            </div>
          </section>

          <SystemStatus items={systemStatus} />
        </div>
      </section>
    </div>
  );
}

function ChartStat({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "risk" }) {
  return (
    <div className="rounded-md border border-grid-line bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-grid-muted">{label}</p>
      <p className={tone === "risk" ? "mt-1 text-lg font-semibold text-grid-red" : "mt-1 text-lg font-semibold text-grid-ink"}>{value}</p>
      <p className="mt-1 text-xs text-grid-muted">{detail}</p>
    </div>
  );
}
