import { useState } from "react";
import { Clock3, DollarSign, Navigation, TrendingUp } from "lucide-react";
import { DriverMockBottomNav } from "@/components/driver-mock/driver-mock-bottom-nav";
import { DriverMockBottomSheet } from "@/components/driver-mock/driver-mock-bottom-sheet";
import { DriverMockFloatingPill } from "@/components/driver-mock/driver-mock-floating-pill";
import { DriverMockMapShell } from "@/components/driver-mock/driver-mock-map-shell";

export function MockDriverIdlePage() {
  const [activeTab, setActiveTab] = useState<"live" | "inbox">("live");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.45rem] border border-ops-border-soft/80 bg-ops-panel/35 px-4 py-3 text-sm text-ops-muted">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-primary">Mock driver preview</p>
          <p className="mt-1 text-sm text-ops-text">Idle / online reference route using local-only data.</p>
        </div>
        <div className="rounded-full border border-ops-primary/25 bg-ops-primary/10 px-3 py-1 text-xs font-semibold text-ops-text">
          /__mock/driver/idle
        </div>
      </div>

      <DriverMockMapShell>
        <div className="flex items-start justify-between gap-3">
          <DriverMockFloatingPill accent="teal">
            <span className="h-2 w-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50" />
            <span className="text-sm font-medium">Online</span>
            <span className="text-xs text-slate-400">• 2h 14m</span>
          </DriverMockFloatingPill>

          <DriverMockFloatingPill>
            <DollarSign className="h-3.5 w-3.5 text-teal-400" />
            <span className="text-sm font-semibold">142.50</span>
          </DriverMockFloatingPill>
        </div>

        <div className="flex flex-1 items-end">
          <DriverMockBottomSheet>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Mock preview</p>
                <h1 className="mt-1 text-base font-semibold text-white">Driver home · idle</h1>
              </div>
              <div className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-300">
                Safe mock
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-800/60 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className={activeTab === "live"
                  ? "rounded-lg border border-teal-500/30 bg-teal-500/20 px-4 py-2 text-sm font-medium text-teal-300"
                  : "rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={activeTab === "inbox"
                  ? "rounded-lg border border-teal-500/30 bg-teal-500/20 px-4 py-2 text-sm font-medium text-teal-300"
                  : "rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"}
              >
                Inbox
              </button>
            </div>

            {activeTab === "live" ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60">
                  <Navigation className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-300">Ready to drive</p>
                <p className="mt-1 text-xs text-slate-500">New requests will appear here in the mock preview flow.</p>
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60">
                  <Clock3 className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-300">No messages</p>
                <p className="mt-1 text-xs text-slate-500">Inbox treatment stays tweakable before porting to live driver routes.</p>
              </div>
            )}

            <div className="border-t border-slate-800/50 pt-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                  <span>Today: 8 trips</span>
                </div>
                <div className="text-slate-500">3.4 hrs online</div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-slate-800/70 bg-slate-950/40 p-3 text-xs text-slate-500">
              Mock notes: top pill, earnings badge, bottom sheet, segmented control, and bottom nav are isolated for quick design iteration.
            </div>
          </DriverMockBottomSheet>
        </div>

        <div className="-mx-4 -mb-4 md:-mx-6 md:-mb-6">
          <DriverMockBottomNav />
        </div>
      </DriverMockMapShell>
    </div>
  );
}
