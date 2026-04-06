import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { DriverActiveRideCard } from "@/components/driver-home/DriverActiveRideCard";
import { DriverMapSurface } from "@/components/driver-home/DriverMapSurface";
import { DriverOfferInbox } from "@/components/driver-home/DriverOfferInbox";
import { formatDriverDispatchSummary } from "@/components/driver-home/driver-home.utils";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/providers/auth-provider";

export function DriverInboxPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["driver-profile"],
    queryFn: () => api.getDriverProfile(token!),
    enabled: Boolean(token)
  });

  const offersQuery = useQuery({
    queryKey: ["driver-offers"],
    queryFn: () => api.listDriverOffers(token!),
    enabled: Boolean(token && profileQuery.data?.approvalStatus === "approved" && profileQuery.data?.available),
    retry: false
  });

  const activeRidesQuery = useQuery({
    queryKey: ["driver-active-rides"],
    queryFn: () => api.listActiveDriverRides(token!),
    enabled: Boolean(token && profileQuery.data?.approvalStatus === "approved"),
    retry: false
  });

  const dispatchQuery = useQuery({
    queryKey: ["driver-dispatch-settings"],
    queryFn: () => api.getDriverDispatchSettings(token!),
    enabled: Boolean(token)
  });

  const acceptMutation = useMutation({
    mutationFn: (rideId: string) => api.acceptOffer(rideId, token!),
    onSuccess: (ride) => {
      void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
      void navigate(`/driver/rides/${ride.id}`);
    }
  });

  const declineMutation = useMutation({
    mutationFn: (rideId: string) => api.declineOffer(rideId, token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-offers"] })
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = getSocket(token);
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
    };

    socket.on("ride.offer", refresh);
    socket.on("ride.status.changed", refresh);

    return () => {
      socket.off("ride.offer", refresh);
      socket.off("ride.status.changed", refresh);
    };
  }, [queryClient, token]);

  const offers = offersQuery.data ?? [];
  const activeRide = activeRidesQuery.data?.[0] ?? null;
  const mapRide = offers[0] ?? activeRide;
  const available = Boolean(profileQuery.data?.available);
  const suspended = Boolean(profileQuery.data && profileQuery.data.approvalStatus !== "approved");
  const dispatchSummary = formatDriverDispatchSummary(dispatchQuery.data);
  const now = Date.now();

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="xl:hidden">
        <div className="-mx-4 md:mx-0">
          <div className="relative isolate min-h-[calc(100dvh-10.5rem)] overflow-hidden rounded-[2.25rem] bg-slate-950 shadow-[0_32px_100px_rgba(2,6,23,0.58)] ring-1 ring-white/10">
            <DriverMapSurface
              ride={mapRide}
              statusLabel={available ? "Inbox live" : "Offline"}
              dispatchSummary={dispatchSummary}
              vehicleLabel={profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}
              mobileOverlayMode
              mobileFitPaddingBottom={360}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3">
              <div className="pointer-events-auto overflow-hidden rounded-[1.15rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,14,24,0.7),rgba(15,23,42,0.58))] shadow-[0_18px_44px_rgba(2,6,23,0.34)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50" />
                      Offer inbox live
                    </div>
                    <p className="mt-1 truncate text-[1rem] font-semibold tracking-[-0.02em] text-white">Driver inbox</p>
                    <p className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-slate-300">{offers.length} pending · map shell active</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/64 px-2.5 py-1.5 text-[11px] font-semibold text-white">
                      <ClipboardList className="h-3.5 w-3.5 text-teal-400" />
                      {offers.length}
                    </div>
                    <div className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 text-[10px] text-slate-300">
                      {available ? "Dispatch on" : "Go online"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] z-20 px-3">
              <div className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,29,0.62),rgba(6,10,18,0.9))] shadow-[0_24px_64px_rgba(2,6,23,0.48)] backdrop-blur-2xl">
                <div className="flex justify-center pb-1 pt-2">
                  <div className="h-1 w-10 rounded-full bg-slate-700" />
                </div>

                <div className="max-h-[calc(100dvh-24rem)] overflow-y-auto overscroll-contain px-3.5 pb-3.5">
                  <div className="border-b border-white/8 px-0.5 pb-2.5 pt-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Inbox cockpit</p>
                        <h1 className="mt-1 text-[1.08rem] font-semibold tracking-[-0.03em] text-white">Pending jobs</h1>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-teal-300">Collapsed by default so the map stays visible</p>
                      </div>
                      <Badge className="border-white/10 bg-slate-950/72 text-slate-100">{offers.length ? `${offers.length} queued` : "Clear"}</Badge>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-teal-400/18 bg-teal-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">
                        Tap a row for details
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-slate-300">
                        {dispatchSummary}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2.5">
                    {activeRide ? <DriverActiveRideCard ride={activeRide} mobileDocked /> : null}
                    <DriverOfferInbox
                      offers={offers}
                      suspended={suspended}
                      available={available}
                      now={now}
                      acceptMutation={acceptMutation}
                      declineMutation={declineMutation}
                      mobile
                      shellMode="route"
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
                    <p className="text-[11px] text-slate-400">Inbox remains a control layer over the live map instead of a stacked page.</p>
                    <Link to="/driver" className="text-[11px] font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline">
                      Driver home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden xl:block rounded-[1.7rem] border border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.98),rgba(8,11,16,0.96))] p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Driver</p>
            <h2 className="mt-1 text-[1.6rem] font-extrabold tracking-[-0.04em] text-ops-text">Inbox</h2>
          </div>
          <Badge className="border-ops-border-soft bg-ops-panel/82 text-ops-text">Use mobile for map shell</Badge>
        </div>
      </div>
    </div>
  );
}