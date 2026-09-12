import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Recommendation } from "../../types";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <section className="panel border-teal-200 bg-teal-50/30">
      <div className="panel-header border-teal-100">
        <div>
          <p className="eyebrow text-grid-teal">AI recommendation</p>
          <h2 className="mt-1 text-xl font-bold text-grid-ink">{recommendation.action}</h2>
          <p className="mt-1 text-xs text-grid-muted">Advisory only. Operator approval required.</p>
        </div>
        <div className="rounded-md border border-teal-200 bg-white p-2 text-grid-teal">
          <CheckCircle2 size={22} />
        </div>
      </div>
      <div className="panel-body space-y-4">
        <div className="rounded-md border border-teal-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-grid-muted">Reason</p>
          <p className="mt-1 text-sm text-grid-ink">{recommendation.reason}</p>
        </div>
        <div className="rounded-md border border-teal-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-grid-muted">Expected impact</p>
          <p className="mt-1 text-sm text-grid-ink">{recommendation.expectedImpact}</p>
        </div>
        <ul className="space-y-2 border-t border-grid-line pt-3">
          {recommendation.constraints.map((item) => (
            <li key={item} className="flex gap-2 text-xs text-grid-muted">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-grid-teal" />
              {item}
            </li>
          ))}
        </ul>
        <button className="button-primary w-full" type="button">
          View Details
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
