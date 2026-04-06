import { useState } from "react";
import { Clock3, DollarSign, MapPin, Navigation, TrendingUp } from "lucide-react";
import { DriverMockBottomNav } from "@/components/driver-mock/driver-mock-bottom-nav";
import { DriverMockBottomSheet } from "@/components/driver-mock/driver-mock-bottom-sheet";
import { DriverMockFloatingPill } from "@/components/driver-mock/driver-mock-floating-pill";
import { DriverMockMapShell } from "@/components/driver-mock/driver-mock-map-shell";

const mockOffer = {
  countdown: "00:12",
  payout: "$24.50",
  pickupEta: "3 min",
  pickupDistance: "0.8 mi away",
  pickupAddress: "423 Oak Avenue",
  pickupMeta: "Near Central Station",
  dropoffAddress: "156 Pine Street",
  dropoffMeta: "8.5 mi • ~18 min trip"
};

export function MockDriverOfferPage() {
  const [activeTab, setActiveTab] = useState<"live" | "inbox">("live");

  return (
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

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-center pt-2">
          <DriverMockFloatingPill className="border-cyan-500/40 bg-slate-900/90 px-4 py-2 shadow-xl shadow-cyan-500/10">
            <Clock3 className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">{mockOffer.countdown}</span>
          </DriverMockFloatingPill>
        </div>

        <div className="flex items-end">
          <DriverMockBottomSheet className="max-w-xl">
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
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">New Request</h2>
                    <p className="mt-1 text-xs text-slate-500">Mock incoming offer state</p>
                  </div>
                  <div className="rounded-full border border-cyan-500/30 bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-300">
                    Live
                  </div>
                </div>

                <div className="mb-3 rounded-[1.45rem] border border-slate-700/50 bg-slate-800/60 p-4">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-4">
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Est. Earnings</div>
                      <div className="text-3xl font-bold text-teal-400">{mockOffer.payout}</div>
                    </div>
                    <div className="text-right">
                      <div className="mb-1 text-xs text-slate-400">Pickup ETA</div>
                      <div className="text-2xl font-bold text-white">{mockOffer.pickupEta}</div>
                      <div className="text-xs text-slate-500">{mockOffer.pickupDistance}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex flex-col items-center gap-1">
                        <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                        <div className="h-6 w-0.5 bg-slate-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 text-xs font-medium text-cyan-400">Pickup</div>
                        <div className="text-sm font-medium text-white">{mockOffer.pickupAddress}</div>
                        <div className="text-xs text-slate-500">{mockOffer.pickupMeta}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-600" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 text-xs text-slate-400">Dropoff</div>
                        <div className="text-sm font-medium text-white">{mockOffer.dropoffAddress}</div>
                        <div className="text-xs text-slate-500">{mockOffer.dropoffMeta}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button type="button" className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-base font-bold text-white shadow-xl shadow-teal-500/40 transition hover:from-teal-400 hover:to-cyan-400">
                    <Navigation className="mr-2 h-4 w-4" />
                    Accept Ride
                  </button>
                  <button type="button" className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/60 text-sm font-medium text-slate-300 transition hover:bg-slate-800">
                    Decline
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60">
                  <MapPin className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-300">Offer inbox preview</p>
                <p className="mt-1 text-xs text-slate-500">The inbox tab stays mock-only and easy to tweak.</p>
              </div>
            )}

            <div className="mt-4 border-t border-slate-800/50 pt-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                  <span>Today: 8 trips</span>
                </div>
                <div className="text-slate-500">3.4 hrs online</div>
              </div>
            </div>
          </DriverMockBottomSheet>
        </div>
      </div>

      <div className="-mx-4 -mb-4 md:-mx-6 md:-mb-6">
        <DriverMockBottomNav />
      </div>
    </DriverMockMapShell>
  );
}
