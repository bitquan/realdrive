import type { Ride } from "@shared/contracts";
import { Clock3, CreditCard, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { RiderFeatureGrid } from "@/components/rider-home/rider-feature-grid";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";

function CompactRideRow({ ride }: { ride: Ride }) {
  return (
    <Link
      to={`/rider/rides/${ride.id}`}
      className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.04] px-3 py-2.5 transition hover:bg-white/[0.07]"
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-white">{ride.pickup.address}</p>
        <p className="truncate text-[11px] text-slate-400">to {ride.dropoff.address}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] font-semibold text-white">{formatMoney(ride.payment.amountDue)}</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{ride.status.replaceAll("_", " ")}</p>
      </div>
    </Link>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-full border border-white/8 bg-slate-950/62 px-3 py-1.5 text-center shadow-[0_14px_32px_rgba(2,6,23,0.28)] backdrop-blur-xl">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-white">{value}</p>
    </div>
  );
}

export function RiderMapShell({
  mapRide,
  nextRide,
  recentRides,
  activeCount,
  completedCount,
  totalSpend,
  hasRides
}: {
  mapRide: Ride | null;
  nextRide: Ride | null;
  recentRides: Ride[];
  activeCount: number;
  completedCount: number;
  totalSpend: number;
  hasRides: boolean;
}) {
  return (
    <div className="-mx-3 md:hidden">
      <div className="relative isolate min-h-[calc(100dvh-9.6rem)] overflow-hidden rounded-[2.1rem] bg-slate-950 shadow-[0_32px_100px_rgba(2,6,23,0.58)] ring-1 ring-white/10">
        {mapRide ? (
          <DeferredLiveMap
            ride={mapRide}
            title="Rider map shell"
            height={760}
            meta="Compact rider states stay layered over the live map instead of pushing the map below the fold."
            surfaceChrome="bare"
            fitPaddingBottom={330}
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-[#040814]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(45,212,191,0.08),transparent_18%),radial-gradient(circle_at_82%_28%,rgba(56,189,248,0.08),transparent_20%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.45))]" />
            <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
              <defs>
                <pattern id="rider-shell-grid" width="72" height="72" patternUnits="userSpaceOnUse">
                  <path d="M 72 0 L 0 0 0 72" fill="none" stroke="rgb(71, 85, 105)" strokeWidth="0.45" />
                </pattern>
                <pattern id="rider-shell-major-grid" width="216" height="216" patternUnits="userSpaceOnUse">
                  <rect width="216" height="216" fill="url(#rider-shell-grid)" />
                  <path d="M 216 0 L 0 0 0 216" fill="none" stroke="rgb(100, 116, 139)" strokeWidth="1.1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#rider-shell-major-grid)" />
            </svg>
            <div className="absolute left-[11%] top-[18%] h-20 w-28 rounded-sm border border-slate-700/25 bg-slate-800/35" />
            <div className="absolute right-[14%] top-[24%] h-28 w-32 rounded-sm border border-slate-700/25 bg-slate-800/35" />
            <div className="absolute left-[18%] top-[48%] h-20 w-28 rounded-sm border border-slate-700/25 bg-slate-800/45" />
            <div className="absolute bottom-[32%] right-[20%] h-24 w-32 rounded-sm border border-slate-700/25 bg-slate-800/40" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/72 via-slate-950/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-slate-950 via-slate-950/78 to-transparent" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto flex max-w-[72%] flex-col gap-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-3.5 py-2 shadow-[0_18px_44px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
                <span className={`h-2 w-2 rounded-full ${activeCount ? "bg-teal-400 shadow-lg shadow-teal-400/45" : "bg-slate-500"}`} />
                <span className="truncate text-sm font-medium text-white">{activeCount ? "Ride shell live" : "Rider shell ready"}</span>
              </div>
              <div className="rounded-full border border-white/8 bg-slate-950/56 px-3.5 py-1.5 text-[11px] text-slate-300 shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-xl">
                <span className="block truncate">{nextRide ? nextRide.status.replaceAll("_", " ") : "Compact rider states over the map"}</span>
              </div>
            </div>

            <div className="pointer-events-auto shrink-0">
              <Badge className="border-white/10 bg-slate-950/68 px-3 py-2 text-[11px] text-white normal-case tracking-[0.02em]">
                {hasRides ? `${recentRides.length} in queue` : "Guest-first"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-20 px-3">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,29,0.68),rgba(6,10,18,0.92))] shadow-[0_24px_64px_rgba(2,6,23,0.48)] backdrop-blur-2xl">
            <div className="flex justify-center pb-1 pt-2">
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            <div className="max-h-[calc(100dvh-23rem)] overflow-y-auto overscroll-contain px-3.5 pb-3.5">
              <div className="border-b border-white/8 px-0.5 pb-2.5 pt-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Rider map shell</p>
                    <h1 className="mt-1 text-[1.08rem] font-semibold tracking-[-0.03em] text-white">
                      {nextRide ? "Your trip queue" : "Compact rider home"}
                    </h1>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-teal-300">
                      Cards stay collapsed so the map remains in view
                    </p>
                  </div>
                  <Link to="/" className="text-[11px] font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline">
                    Book
                  </Link>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  <StatPill label="Live" value={activeCount} />
                  <StatPill label="Done" value={completedCount} />
                  <StatPill label="Spend" value={formatMoney(totalSpend)} />
                </div>
              </div>

              {nextRide ? (
                <div className="space-y-2.5 pt-2.5">
                  <Link
                    to={`/rider/rides/${nextRide.id}`}
                    className="block rounded-[1.2rem] border border-teal-400/18 bg-teal-400/10 p-3.5 transition hover:bg-teal-400/14"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-200">Primary ride</p>
                        <p className="mt-1 truncate text-sm font-semibold text-white">{nextRide.pickup.address}</p>
                        <p className="truncate text-[11px] text-slate-300">to {nextRide.dropoff.address}</p>
                      </div>
                      <Badge className="border-white/10 bg-slate-950/70 text-slate-100">{nextRide.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-slate-300">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1">
                        <Clock3 className="h-3.5 w-3.5 text-teal-300" />
                        {formatDateTime(nextRide.scheduledFor ?? nextRide.requestedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1">
                        <CreditCard className="h-3.5 w-3.5 text-teal-300" />
                        {formatPaymentMethod(nextRide.payment.method)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1">
                        <Route className="h-3.5 w-3.5 text-teal-300" />
                        {formatMoney(nextRide.payment.amountDue)}
                      </span>
                    </div>
                  </Link>

                  {recentRides.length > 1 ? (
                    <div className="space-y-2">
                      {recentRides.slice(1, 4).map((ride) => (
                        <CompactRideRow key={ride.id} ride={ride} />
                      ))}
                    </div>
                  ) : null}

                  <RiderFeatureGrid
                    context="rider"
                    contextPath="/rider/rides"
                    canRequest
                    compact
                    title="Rider roadmap grid"
                    description="Use live rider tools now. Future rider modules stay marked and route into feature intake instead of behaving like fake screens."
                  />
                </div>
              ) : (
                <div className="space-y-2.5 pt-2.5">
                  <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-3.5">
                    <p className="text-sm font-semibold text-white">No rides yet</p>
                    <p className="mt-1.5 text-[12px] leading-5 text-slate-300">
                      Book from the public home page first. This rider shell stays compact until there are real trip states to show.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link to="/" className="inline-flex h-9 items-center justify-center rounded-full border border-teal-400/28 bg-teal-400/12 px-4 text-[12px] font-semibold text-teal-200 transition hover:bg-teal-400/18">
                        Book a ride
                      </Link>
                      <Link to="/rider/login" className="inline-flex h-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] px-4 text-[12px] font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
                        Rider access
                      </Link>
                    </div>
                  </div>

                  <RiderFeatureGrid
                    context="rider"
                    contextPath="/rider/rides"
                    canRequest
                    compact
                    title="Rider roadmap grid"
                    description="The rider shell can expose future modules safely during design phase while routing demand into the live roadmap workflow."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
