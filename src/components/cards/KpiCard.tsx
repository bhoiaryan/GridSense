import { Activity, AlertTriangle, Battery, Sun } from "lucide-react";
import type { Kpi } from "../../types";
import { RiskBadge } from "../alerts/RiskBadge";

const iconMap = {
  "Current Generation": Sun,
  "Forecasted Generation": Activity,
  "Current Risk": AlertTriangle,
  "Battery Status": Battery
};

interface KpiCardProps {
  kpi: Kpi;
}

export function KpiCard({ kpi }: KpiCardProps) {
  const Icon = iconMap[kpi.label as keyof typeof iconMap] ?? Activity;
  const isRisk = kpi.status === "HIGH";
  const isWarning = kpi.status === "MEDIUM";

  return (
    <article
      className={`panel p-4 ${
        isRisk ? "border-red-200 bg-red-50/30" : isWarning ? "border-amber-200 bg-amber-50/20" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{kpi.label}</p>
          <p className={isRisk ? "mt-2 text-2xl font-bold tracking-normal text-grid-red" : "mt-2 text-2xl font-bold tracking-normal text-grid-ink"}>
            {kpi.value}
          </p>
        </div>
        <div
          className={`rounded-md border p-2 ${
            isRisk
              ? "border-red-200 bg-red-100 text-grid-red"
              : isWarning
                ? "border-amber-200 bg-amber-100 text-grid-amber"
                : "border-grid-line bg-slate-50 text-grid-teal"
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-grid-muted">{kpi.detail}</p>
        {kpi.status && kpi.status !== "OK" ? (
          <RiskBadge risk={kpi.status} />
        ) : (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-grid-green">OK</span>
        )}
      </div>
      <p className="mt-3 border-t border-grid-line pt-3 text-xs font-semibold text-grid-ink">{kpi.trend}</p>
    </article>
  );
}
