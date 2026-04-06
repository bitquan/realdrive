import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/__mock/driver/idle", label: "Idle" },
  { to: "/__mock/driver/offer", label: "Offer" },
  { to: "/__mock/driver/trip", label: "Trip" }
];

export function DriverMockPreviewShell() {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.7rem] border border-ops-border-soft/80 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(8,11,16,0.94))] p-4 shadow-elevated backdrop-blur md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-primary">Mock Driver Preview</p>
            <h1 className="mt-1 text-lg font-semibold text-ops-text md:text-xl">State review shell</h1>
            <p className="mt-1 text-sm text-ops-muted">Use these mock-only states to iterate on the new driver design without touching the live driver flow.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[1.2rem] border border-ops-border-soft/90 bg-ops-panel/40 p-1.5">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-[0.95rem] px-4 py-2 text-center text-sm font-semibold transition",
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
