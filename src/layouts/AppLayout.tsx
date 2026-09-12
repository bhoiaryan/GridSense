import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, BarChart3, BatteryCharging, Bell, Building2, Gauge, GitBranch, LayoutDashboard, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { site } from "../data/mockData";

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

  return (
    <div className="min-h-screen bg-grid-bg text-grid-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-grid-sidebar text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-500/20 text-teal-200">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">GridSense AI</p>
              <p className="text-xs text-grid-sidebarMuted">Renewable intelligence</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-white text-grid-ink" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-200">
              <BatteryCharging size={15} />
              System Status
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">Forecast, risk, and decision services are running in demo mode.</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-grid-line bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <p className="eyebrow">GridSense AI</p>
              <h1 className="text-xl font-semibold tracking-normal text-grid-ink">{current.title}</h1>
              <p className="text-sm text-grid-muted">{current.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-2 rounded-md border border-grid-line bg-slate-50 px-3 py-2 text-sm text-grid-muted md:flex">
                <Search size={15} />
                <span>{site.name}</span>
              </div>
              <select className="field min-w-44" defaultValue={site.id}>
                <option value={site.id}>{site.name}</option>
              </select>
              <select className="field" defaultValue="24h">
                <option value="24h">Next 24 hours</option>
                <option value="48h">Next 48 hours</option>
                <option value="72h">Next 72 hours</option>
              </select>
              <button className="button-secondary" aria-label="Notifications">
                <Bell size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
