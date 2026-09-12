import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import type { SystemStatusItem } from "../../types";

interface SystemStatusProps {
  items: SystemStatusItem[];
}

export function SystemStatus({ items }: SystemStatusProps) {
  return (
    <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
      <div className="panel-header bg-[#f3f7f4]">
        <div>
          <p className="eyebrow">System status</p>
          <h2 className="mt-1 text-base font-semibold text-grid-ink">Demo pipeline health</h2>
        </div>
      </div>
      <div className="divide-y divide-[#dfe7e1] bg-white/60">
        {items.map((item) => {
          const Icon = item.status === "Operational" ? CircleCheck : item.status === "Degraded" ? CircleDashed : CircleX;
          return (
            <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[#f4faf6]">
              <div>
                <p className="text-sm font-semibold text-grid-ink">{item.label}</p>
                <p className="text-xs text-grid-muted">{item.detail}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e7dd] bg-[#eef8f2] px-2 py-1 text-[11px] font-bold text-[#386c58]">
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
