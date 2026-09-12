import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import type { SystemStatusItem } from "../../types";

interface SystemStatusProps {
  items: SystemStatusItem[];
}

export function SystemStatus({ items }: SystemStatusProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">System status</p>
          <h2 className="mt-1 text-base font-semibold text-grid-ink">Demo pipeline health</h2>
        </div>
      </div>
      <div className="divide-y divide-grid-line">
        {items.map((item) => {
          const Icon = item.status === "Operational" ? CircleCheck : item.status === "Degraded" ? CircleDashed : CircleX;
          return (
            <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-grid-ink">{item.label}</p>
                <p className="text-xs text-grid-muted">{item.detail}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-grid-green">
                <Icon size={13} />
                {item.status}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
