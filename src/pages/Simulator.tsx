import { RotateCw } from "lucide-react";
import { RiskBadge } from "../components/alerts/RiskBadge";
import { useScenario } from "../hooks/useScenario";

export function Simulator() {
  const { baseline, input, result, setInput } = useScenario();

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header bg-[#f3f7f4]">
          <div>
            <p className="eyebrow">Scenario controls</p>
            <h2 className="mt-1 text-base font-semibold text-grid-ink">Modify operating assumptions</h2>
          </div>
        </div>
        <div className="panel-body space-y-5">
          <Slider
            label="Cloud cover change"
            value={input.cloudCoverChange}
            suffix="%"
            min={0}
            max={50}
            onChange={(value) => setInput({ ...input, cloudCoverChange: value })}
          />
          <Slider
            label="Demand adjustment"
            value={input.demandChange}
            suffix="%"
            min={-10}
            max={25}
            onChange={(value) => setInput({ ...input, demandChange: value })}
          />
          <Toggle label="Battery available" checked={input.batteryAvailable} onChange={(value) => setInput({ ...input, batteryAvailable: value })} />
          <Toggle label="Backup available" checked={input.backupAvailable} onChange={(value) => setInput({ ...input, backupAvailable: value })} />
          <button className="button-primary w-full">
            <RotateCw size={16} />
            Run Simulation
          </button>
        </div>
      </section>

      <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header bg-[#f3f7f4]">
          <div>
            <p className="eyebrow">Scenario results</p>
            <h2 className="mt-1 text-base font-semibold text-grid-ink">Baseline vs scenario</h2>
          </div>
        </div>
        <div className="panel-body">
          <div className="grid gap-4 md:grid-cols-2">
            <ResultCard title="Baseline" generation={baseline.generationMw} shortfall={baseline.shortfallMwh} risk={baseline.risk} recommendation={baseline.recommendation} />
            <ResultCard title="Scenario" generation={result.generationMw} shortfall={result.shortfallMwh} risk={result.risk} recommendation={result.recommendation} />
          </div>
          <div className="mt-5 rounded-lg border border-[#dfe7e1] bg-[#f3f7f4] p-4">
            <p className="eyebrow">Why did the recommendation change?</p>
            <p className="mt-2 text-sm leading-6 text-grid-ink">{result.explanation}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Slider({ label, value, suffix, min, max, onChange }: { label: string; value: number; suffix: string; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-grid-ink">{label}</span>
        <span className="text-sm text-grid-muted">{value}{suffix}</span>
      </div>
      <input className="w-full accent-grid-teal" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[#dfe7e1] bg-[#f3f7f4] px-3 py-2.5">
      <span className="text-sm font-semibold text-grid-ink">{label}</span>
      <input className="h-4 w-4 accent-[#1f5b4b]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ResultCard({ title, generation, shortfall, risk, recommendation }: { title: string; generation: number; shortfall: number; risk: "LOW" | "MEDIUM" | "HIGH"; recommendation: string }) {
  return (
    <article className="rounded-xl border border-[#dfe7e1] bg-white p-4 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-grid-ink">{title}</h3>
        <RiskBadge risk={risk} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Avg generation" value={`${generation.toFixed(1)} MW`} />
        <Metric label="Shortfall" value={`${shortfall.toFixed(1)} MWh`} />
      </div>
      <p className="mt-4 rounded-xl border border-[#dfe7e1] bg-[#f3f7f4] p-3 text-sm font-semibold text-grid-ink">{recommendation}</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-grid-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-grid-ink">{value}</p>
    </div>
  );
}
