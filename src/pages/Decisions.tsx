import { CheckCircle2, CircleAlert, Zap } from "lucide-react";
import { RiskBadge } from "../components/alerts/RiskBadge";
import { recommendation, riskEvents, site } from "../data/mockData";

export function Decisions() {
  const selected = riskEvents[0];
  const actions = ["Discharge storage", "Import energy", "Activate backup", "No action"];

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header bg-[#f3f7f4]">
          <div>
            <p className="eyebrow">Detected events</p>
            <h2 className="mt-1 text-base font-semibold text-grid-ink">Operational risk queue</h2>
          </div>
        </div>
        <div className="divide-y divide-[#dfe7e1] bg-white/60">
          {riskEvents.map((event) => (
            <button key={event.id} className="block w-full px-4 py-3.5 text-left transition hover:bg-[#f4faf6]">
              <div className="flex items-center justify-between gap-3">
                <RiskBadge risk={event.risk} />
                <span className="text-xs font-semibold text-grid-muted">{event.window}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-grid-ink">{event.type.replace("_", " ")}</p>
              <p className="mt-1 text-xs text-grid-muted">{event.expectedImpact}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header bg-[#f3f7f4]">
          <div>
            <p className="eyebrow">Selected event</p>
            <h2 className="mt-1 text-base font-semibold text-grid-ink">Evening shortfall response</h2>
          </div>
          <RiskBadge risk={selected.risk} />
        </div>
        <div className="panel-body space-y-5">
          <div className="rounded-xl border border-[#ebd5d2] bg-[#fff1f0] p-4">
            <div className="flex gap-3">
              <CircleAlert className="mt-0.5 text-[#9b3f42]" size={20} />
              <div>
                <p className="text-sm font-semibold text-grid-ink">{selected.problem}</p>
                <p className="mt-1 text-sm text-grid-muted">{selected.window} - {selected.expectedImpact}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-[#dfe7e1] bg-white p-4 shadow-sm shadow-slate-200/30">
              <p className="eyebrow">Possible actions</p>
              <div className="mt-3 space-y-2">
                {actions.map((action) => (
                  <div key={action} className="flex items-center justify-between rounded-lg border border-[#dfe7e1] bg-[#f3f7f4] px-3 py-2">
                    <span className="text-sm font-medium text-grid-ink">{action}</span>
                    <span className="text-xs font-semibold text-grid-muted">{action === "No action" ? "Rejected" : "Feasible"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#dfe7e1] bg-white p-4 shadow-sm shadow-slate-200/30">
              <p className="eyebrow">Resource availability</p>
              <div className="mt-3 space-y-2">
                <Resource label="Battery SOC" value={`${site.batterySoc}%`} />
                <Resource label="Discharge limit" value={`${site.dischargeLimitMw} MW`} />
                <Resource label="Backup capacity" value={`${site.backupCapacityMw} MW`} />
                <Resource label="Operator approval" value="Required" />
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-[#d6e7dd] bg-[#eef8f2] p-4">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 text-[#396553]" size={20} />
              <div>
                <p className="eyebrow text-[#396553]">Recommended action</p>
                <h3 className="mt-1 text-base font-semibold text-grid-ink">{recommendation.action}</h3>
                <p className="mt-2 text-sm text-grid-ink">{recommendation.reason}</p>
                <p className="mt-2 text-sm text-grid-muted">{recommendation.expectedImpact}</p>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button className="button-primary">
              <CheckCircle2 size={16} />
              Mark Reviewed
            </button>
            <button className="button-secondary">Send to Operator Log</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Resource({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#dfe7e1] pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-grid-muted">{label}</span>
      <span className="text-sm font-semibold text-grid-ink">{value}</span>
    </div>
  );
}
