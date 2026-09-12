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
        isRisk ? "border-[#ebd5d2] bg-[#fff8f7]" : isWarning ? "border-[#e5d9c2] bg-[#faf5ee]" : "border-[#dfe7e1] bg-[#f9faf9]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{kpi.label}</p>
          <p className={isRisk ? "mt-2 text-2xl font-bold tracking-normal text-[#9b3f42]" : "mt-2 text-2xl font-bold tracking-normal text-grid-ink"}>
            {kpi.value}
          </p>
        </div>
        <div
          className={`rounded-md border p-2 ${
            isRisk
              ? "border-[#ebd5d2] bg-[#fff1f0] text-[#9b3f42]"
              : isWarning
                ? "border-[#e5d9c2] bg-[#f9f1e5] text-[#7d6944]"
                : "border-[#dfe7e1] bg-[#edf8f1] text-[#396553]"
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
          <span className="rounded-full border border-[#d6e7dd] bg-[#eef8f2] px-2 py-1 text-[11px] font-bold text-[#386c58]">OK</span>
        )}
      </div>
      <p className="mt-3 border-t border-[#dfe7e1] pt-3 text-xs font-semibold text-grid-ink">{kpi.trend}</p>
    </article>
  );
}
