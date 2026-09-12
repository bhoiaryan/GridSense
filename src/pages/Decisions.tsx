import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Zap } from "lucide-react";
import { RiskBadge } from "../components/alerts/RiskBadge";
import { api } from "../services/api";
import type { Recommendation, RiskEvent, SiteInfo } from "../types";

export function Decisions() {
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const actions = ["Discharge storage", "Import energy", "Activate backup", "No action"];

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([api.getSite("solar-01"), api.getEvents("solar-01"), api.getRecommendation("solar-01")])
      .then(([siteResponse, eventsResponse, recommendationResponse]) => {
        if (!cancelled) {
          setSite(siteResponse);
          setRiskEvents(eventsResponse);
          setRecommendation(recommendationResponse);
          setSelectedEventId((currentId) => currentId ?? eventsResponse[0]?.id ?? null);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load decision data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const selected = useMemo(
    () => riskEvents.find((event) => event.id === selectedEventId) ?? riskEvents[0],
    [riskEvents, selectedEventId],
  );

  if (isLoading) return <DecisionMessage title="Loading decision center" detail="Retrieving active risks, resources, and the recommended action." />;

  if (error || !site || !recommendation) {
    return <DecisionMessage title="Decision center unavailable" detail={error ?? "The gateway returned incomplete decision data."} action={<button className="button-primary" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>} />;
  }

  if (!selected) return <DecisionMessage title="No active events" detail="The risk engine has not reported an actionable event for this site." />;

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
            <button key={event.id} onClick={() => setSelectedEventId(event.id)} className={`block w-full px-4 py-3.5 text-left transition hover:bg-[#f4faf6] ${selected.id === event.id ? "bg-[#edf8f2]" : ""}`}>
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
            <h2 className="mt-1 text-base font-semibold text-grid-ink">{selected.type.replace("_", " ")} response</h2>
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

function DecisionMessage({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return (
    <section className="panel border-[#dfe7e1] bg-[#f9faf9] p-6 text-center">
      <p className="eyebrow">Decision center</p>
      <h2 className="mt-2 text-lg font-bold text-grid-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-grid-muted">{detail}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </section>
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
