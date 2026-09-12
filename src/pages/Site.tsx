import { useEffect, useState } from "react";
import { BatteryCharging, Factory, MapPin, ShieldCheck, Sun } from "lucide-react";
import { SystemStatus } from "../components/layout/SystemStatus";
import { api } from "../services/api";
import type { SiteInfo, SystemStatusItem } from "../types";

export function Site() {
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([api.getSite("solar-01"), api.getSystemStatus()])
      .then(([siteResponse, statusResponse]) => {
        if (!cancelled) {
          setSite(siteResponse);
          setSystemStatus(statusResponse);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load the site overview.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (isLoading) return <SiteMessage title="Loading site overview" detail="Retrieving live asset configuration and system health." />;

  if (error || !site) {
    return <SiteMessage title="Site overview unavailable" detail={error ?? "The gateway returned no site data."} action={<button className="button-primary" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>} />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel overflow-hidden border-[#dfe7e1] bg-[#f9faf9]">
        <div className="panel-header bg-[#f3f7f4]">
          <div>
            <p className="eyebrow">Site overview</p>
            <h2 className="mt-1 text-base font-semibold text-grid-ink">{site.name}</h2>
          </div>
          <span className="rounded-full border border-[#d6e7dd] bg-[#eef8f2] px-2 py-1 text-[11px] font-bold text-[#386c58]">ONLINE</span>
        </div>
        <div className="panel-body">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard icon={MapPin} label="Location" value={site.location} />
            <InfoCard icon={Sun} label="Technology" value={site.technology} />
            <InfoCard icon={Factory} label="Installed capacity" value={`${site.capacityMw} MW`} />
            <InfoCard icon={Sun} label="Current generation" value={`${site.currentGenerationMw} MW`} />
            <InfoCard icon={BatteryCharging} label="Battery SOC" value={`${site.batterySoc}%`} />
            <InfoCard icon={ShieldCheck} label="Backup availability" value={site.backupAvailable ? "Available" : "Unavailable"} />
          </div>

          <div className="mt-5 rounded-lg border border-[#dfe7e1] bg-white/70">
            <div className="border-b border-[#dfe7e1] px-4 py-3">
              <p className="heading-sm">Operating limits</p>
            </div>
            <div className="grid divide-y divide-[#dfe7e1] md:grid-cols-2 md:divide-x md:divide-y-0">
              <Limit label="Battery capacity" value={`${site.batteryCapacityMwh} MWh`} />
              <Limit label="Charge limit" value={`${site.chargeLimitMw} MW`} />
              <Limit label="Discharge limit" value={`${site.dischargeLimitMw} MW`} />
              <Limit label="Backup capacity" value={`${site.backupCapacityMw} MW`} />
            </div>
          </div>
        </div>
      </section>

      <SystemStatus items={systemStatus} />
    </div>
  );
}

function SiteMessage({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return (
    <section className="panel border-[#dfe7e1] bg-[#f9faf9] p-6 text-center">
      <p className="eyebrow">Site overview</p>
      <h2 className="mt-2 text-lg font-bold text-grid-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-grid-muted">{detail}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </section>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <article className="rounded-xl border border-[#dfe7e1] bg-[#f4faf6] p-4 shadow-sm shadow-slate-200/30">
      <div className="flex items-center gap-2 text-[#396553]">
        <Icon size={18} />
        <p className="eyebrow">{label}</p>
      </div>
      <p className="mt-3 text-lg font-semibold text-grid-ink">{value}</p>
    </article>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-grid-muted">{label}</span>
      <span className="text-sm font-semibold text-grid-ink">{value}</span>
    </div>
  );
}
