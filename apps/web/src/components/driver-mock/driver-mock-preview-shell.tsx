import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/__mock/driver/idle", label: "Idle" },
  { to: "/__mock/driver/offer", label: "Offer" },
  { to: "/__mock/driver/trip", label: "Trip" }
];

export function DriverMockPreviewShell() {
  const location = useLocation();

  return (
    <div className="space-y-3">
      <section className="rounded-[1.45rem] border border-ops-border-soft/80 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(8,11,16,0.94))] px-3.5 py-3 shadow-elevated backdrop-blur md:px-4 md:py-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-primary">Mock Driver Preview</p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h1 className="text-base font-semibold text-ops-text md:text-lg">State review shell</h1>
              <span className="rounded-full border border-ops-border-soft bg-ops-panel/72 px-2 py-0.5 text-[10px] font-medium text-ops-muted">
                {location.pathname}
              </span>
            </div>
            <p className="mt-1 text-xs text-ops-muted/85">Mock-only driver states for quick iteration.</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-[1rem] border border-ops-border-soft/90 bg-ops-panel/40 p-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-[0.85rem] px-3 py-1.5 text-center text-sm font-semibold transition",
                    isActive
                      ? "bg-ops-primary text-white shadow-soft"
                      : "text-ops-muted hover:bg-ops-panel/80 hover:text-ops-text"
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      <Outlet />
    </div>
  );
}
