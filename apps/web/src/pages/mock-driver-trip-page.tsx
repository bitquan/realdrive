import { DollarSign, MapPin, MessageSquare, Navigation, Phone, UserRound } from "lucide-react";
import { DriverMockBottomNav } from "@/components/driver-mock/driver-mock-bottom-nav";
import { DriverMockBottomSheet } from "@/components/driver-mock/driver-mock-bottom-sheet";
import { DriverMockFloatingPill } from "@/components/driver-mock/driver-mock-floating-pill";
import { DriverMockMapShell } from "@/components/driver-mock/driver-mock-map-shell";

const mockTrip = {
  rider: "Sarah Martinez",
  riderTier: "Private Client",
  status: "En Route to Pickup",
  eta: "3 min",
  payout: "$24.50",
  payment: "Card •• 4242",
  pickup: {
    label: "Pickup",
    address: "423 Oak Avenue",
    meta: "0.8 mi • 3 min away"
  },
  dropoff: {
    label: "Dropoff",
    address: "156 Pine Street",
    meta: "8.5 mi • ~18 min trip"
  },
  cta: "Arrive at Pickup"
};

export function MockDriverTripPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.45rem] border border-ops-border-soft/80 bg-ops-panel/35 px-4 py-3 text-sm text-ops-muted">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-primary">Mock driver preview</p>
          <p className="mt-1 text-sm text-ops-text">Trip-in-motion reference route using local-only data.</p>
        </div>
        <div className="rounded-full border border-ops-primary/25 bg-ops-primary/10 px-3 py-1 text-xs font-semibold text-ops-text">
          /__mock/driver/trip
        </div>
      </div>

      <DriverMockMapShell>
        <div className="pointer-events-none absolute inset-0 z-0">
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="mock-trip-route" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" />
                <stop offset="50%" stopColor="rgb(20, 184, 166)" />
                <stop offset="100%" stopColor="rgb(6, 182, 212)" />
              </linearGradient>
              <linearGradient id="mock-trip-future" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgb(100, 116, 139)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="rgb(71, 85, 105)" stopOpacity="0.55" />
              </linearGradient>
              <filter id="mock-trip-glow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d="M 50% 50% L 52% 46% L 54% 42% L 57% 38% L 60% 34% L 63% 30% L 65% 28%"
              fill="none"
              stroke="url(#mock-trip-route)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#mock-trip-glow)"
            />
            <path
              d="M 50% 50% L 52% 46% L 54% 42% L 57% 38% L 60% 34% L 63% 30% L 65% 28%"
              fill="none"
              stroke="rgb(34, 211, 238)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.65"
              className="animate-pulse"
            />
            <path
              d="M 65% 28% L 67% 25% L 69% 22% L 72% 20% L 75% 18%"
              fill="none"
              stroke="url(#mock-trip-future)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 6"
              opacity="0.75"
            />
          </svg>

          <div className="absolute left-[61%] top-[26%]">
            <div className="relative">
              <div className="absolute -left-6 -top-6 h-12 w-12 rounded-full bg-cyan-400/25 animate-pulse" />
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-cyan-400 text-sm font-black text-slate-900 shadow-xl shadow-cyan-400/60">
                A
              </div>
            </div>
          </div>

          <div className="absolute left-[72%] top-[16%]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-slate-600 text-xs font-bold text-white shadow-xl">
              B
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-start justify-between gap-3">
          <DriverMockFloatingPill accent="teal">
            <span className="h-2 w-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50" />
            <span className="text-sm font-medium">On Trip</span>
            <span className="text-xs text-slate-400">• 2h 26m</span>
          </DriverMockFloatingPill>

          <DriverMockFloatingPill>
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300">166.92</span>
          </DriverMockFloatingPill>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-between">
          <div className="flex justify-center pt-2">
            <DriverMockFloatingPill className="border-cyan-500/40 bg-slate-900/90 px-4 py-2 shadow-xl shadow-cyan-500/10">
              <MapPin className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">ETA</span>
              <span className="text-sm font-bold text-white">{mockTrip.eta}</span>
            </DriverMockFloatingPill>
          </div>

          <div className="flex items-end">
            <DriverMockBottomSheet className="max-w-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800 text-slate-400">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-white">{mockTrip.rider}</h1>
                    <p className="text-xs text-slate-400">{mockTrip.riderTier}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/60 text-slate-300 transition hover:bg-slate-800">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/60 text-slate-300 transition hover:bg-slate-800">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-cyan-500/30 bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-300">
                  {mockTrip.status}
                </div>
                <div className="text-xs text-slate-400">{mockTrip.payment}</div>
              </div>

              <div className="mb-4 rounded-[1.45rem] border border-slate-700/50 bg-slate-800/60 p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex flex-col items-center gap-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                      <div className="h-6 w-0.5 bg-slate-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-xs font-medium text-cyan-400">{mockTrip.pickup.label}</div>
                      <div className="text-sm font-medium text-white">{mockTrip.pickup.address}</div>
                      <div className="text-xs text-slate-500">{mockTrip.pickup.meta}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-600" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-xs text-slate-400">{mockTrip.dropoff.label}</div>
                      <div className="text-sm font-medium text-white">{mockTrip.dropoff.address}</div>
                      <div className="text-xs text-slate-500">{mockTrip.dropoff.meta}</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mb-2 flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-base font-bold text-white shadow-xl shadow-teal-500/40 transition hover:from-teal-400 hover:to-cyan-400"
              >
                <Navigation className="mr-2 h-4 w-4" />
                {mockTrip.cta}
              </button>

              <div className="text-center text-xs">
                <span className="text-slate-500">Trip Earnings: </span>
                <span className="font-medium text-teal-400">{mockTrip.payout}</span>
              </div>
            </DriverMockBottomSheet>
          </div>
        </div>

        <div className="-mx-4 -mb-4 md:-mx-6 md:-mb-6">
          <DriverMockBottomNav />
        </div>
      </DriverMockMapShell>
    </div>
  );
}
