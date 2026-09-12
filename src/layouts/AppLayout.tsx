import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, BarChart3, BatteryCharging, Bell, Building2, Gauge, GitBranch, LayoutDashboard, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../services/api";
import type { SiteInfo, SystemStatusItem } from "../types";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Forecast", path: "/forecast", icon: BarChart3 },
  { label: "Simulator", path: "/simulator", icon: GitBranch },
  { label: "Decision Center", path: "/decisions", icon: Gauge },
  { label: "Site", path: "/site", icon: Building2 }
];

const titles: Record<string, { title: string; description: string }> = {
  "/": { title: "Operations Dashboard", description: "Forecast, risk, and recommended action for the current site." },
  "/forecast": { title: "Forecast", description: "Detailed generation forecast with uncertainty and weather drivers." },
  "/simulator": { title: "Scenario Simulator", description: "Stress-test cloud, demand, storage, and backup assumptions." },
  "/decisions": { title: "Decision Center", description: "Review detected events, feasible actions, and operator-ready recommendations." },
  "/site": { title: "Site Overview", description: "Plant configuration, asset availability, and operating limits." }
};

export function AppLayout() {
  const location = useLocation();
  const current = titles[location.pathname] ?? titles["/"];
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.getSite("solar-01"), api.getSystemStatus()])
      .then(([siteResponse, statusResponse]) => {
        if (!cancelled) {
          setSite(siteResponse);
          setSystemStatus(statusResponse);
        }
      })
      .catch(() => {
        // Page-level views show their own request errors. The layout remains
        // usable while the gateway is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const health = useMemo(() => {
    if (!systemStatus.length) return null;
    const operationalCount = systemStatus.filter((item) => item.status === "Operational").length;
    return {
      percent: Math.round((operationalCount / systemStatus.length) * 100),
      operationalCount,
      totalCount: systemStatus.length,
    };
  }, [systemStatus]);

  const siteName = site?.name ?? "Loading site…";

  return (
    <div className="min-h-screen bg-grid-bg text-grid-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-emerald-900/70 bg-[radial-gradient(circle_at_top,_rgba(20,83,45,0.75),_rgba(9,29,22,0.98)_56%)] text-white shadow-[0_20px_40px_rgba(6,20,16,0.25)] lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-white/5 px-3 py-2.5 shadow-inner shadow-emerald-950/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-emerald-50 shadow-lg shadow-emerald-900/30">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">GridSense AI</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Renewable intelligence</p>
            </div>
          </div>
        </div>

        <div className="px-3 pt-4">
          <div className="rounded-2xl border border-emerald-300/15 bg-white/5 p-3 shadow-inner shadow-emerald-950/20">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200/80">
              <span>Grid health</span>
              <span>{health ? `${health.percent}%` : "—"}</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-emerald-950/60">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-lime-300" style={{ width: `${health?.percent ?? 0}%` }} />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-300">
              {health ? `${health.operationalCount} of ${health.totalCount} reported subsystems operational.` : "Checking reported subsystem status…"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )
              }
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/20 text-slate-300 transition-colors duration-200 group-hover:border-emerald-300/20 group-hover:text-white">
                <item.icon size={16} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {location.pathname !== "/" && (
          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl border border-emerald-300/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-3.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                <BatteryCharging size={14} />
                System Status
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                This workspace is showing a historical telemetry replay and model-derived decisions.
              </p>
            </div>
          </div>
        )}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-white/60 bg-white/80 backdrop-blur-xl">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <p className="eyebrow">GridSense AI</p>
              <h1 className="text-xl font-bold tracking-tight text-grid-ink">{current.title}</h1>
              {location.pathname !== "/" && <p className="text-sm text-grid-muted">{current.description}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {location.pathname !== "/" && (
                <div className="hidden items-center gap-2 rounded-xl border border-grid-line bg-slate-50/90 px-3 py-2 text-sm text-grid-muted shadow-sm md:flex">
                  <Search size={15} className="text-emerald-700" />
                  <span>{siteName}</span>
                </div>
              )}
              <select aria-label="Site" className="field min-w-44 shadow-sm" value={site?.id ?? "loading"} disabled>
                <option value={site?.id ?? "loading"}>{siteName}</option>
              </select>
              {location.pathname !== "/" && (
                <select className="field shadow-sm" defaultValue="24h">
                  <option value="24h">Next 24 hours</option>
                  <option value="48h">Next 48 hours</option>
                  <option value="72h">Next 72 hours</option>
                </select>
              )}
              <button className="button-secondary shadow-sm" aria-label="Notifications">
                <Bell size={16} />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-grid-line/80 bg-emerald-50/40 px-3 py-2 lg:hidden" aria-label="Primary navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600",
                    isActive ? "bg-grid-teal text-white shadow-sm" : "text-grid-muted hover:bg-white hover:text-grid-ink"
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="px-4 py-5 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
