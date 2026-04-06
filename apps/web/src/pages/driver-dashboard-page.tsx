import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DriverDispatchSettings, PaymentMethod, RideType } from "@shared/contracts";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Route } from "lucide-react";
import { DriverActiveRideCard } from "@/components/driver-home/DriverActiveRideCard";
import { DriverEarningsMini } from "@/components/driver-home/DriverEarningsMini";
import { DriverLiveOfferCard } from "@/components/driver-home/DriverLiveOfferCard";
import { DriverMapSurface } from "@/components/driver-home/DriverMapSurface";
import { DriverOnboardingChecklist } from "@/components/driver-home/DriverOnboardingChecklist";
import { DriverOfferInbox } from "@/components/driver-home/DriverOfferInbox";
import { DriverStatusBar } from "@/components/driver-home/DriverStatusBar";
import { DriverToolsSection } from "@/components/driver-home/DriverToolsSection";
import { formatDriverDispatchSummary, getDriverOfferCountdown, getDriverRidePricing } from "@/components/driver-home/driver-home.utils";
import { HeadrestPrintTemplate } from "@/components/share/headrest-print-template";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const emptyRateForm = {
  standard: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
  suv: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
  xl: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" }
};

const paymentMethodOptions: PaymentMethod[] = ["jim", "cashapp", "cash"];

export function DriverDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const shareQuery = useQuery({
    queryKey: ["me-share"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
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
  const ratesQuery = useQuery({
    queryKey: ["driver-rates"],
    queryFn: () => api.getDriverRates(token!),
    enabled: Boolean(token)
  });
  const duesQuery = useQuery({
    queryKey: ["driver-dues"],
    queryFn: () => api.getDriverDues(token!),
    enabled: Boolean(token)
  });
  const adProgramQuery = useQuery({
    queryKey: ["driver-ad-program"],
    queryFn: () => api.getDriverAdProgram(token!),
    enabled: Boolean(token)
  });
  const communityQuery = useQuery({
    queryKey: ["community-board"],
    queryFn: () => api.listCommunityProposals(token!),
    enabled: Boolean(token)
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    homeState: "",
    homeCity: "",
    makeModel: "",
    plate: "",
    color: "",
    rideType: "standard" as RideType,
    seats: "4"
  });
  const [dispatchForm, setDispatchForm] = useState<DriverDispatchSettings>({
    localEnabled: true,
    localRadiusMiles: 25,
    serviceAreaEnabled: true,
    serviceAreaStates: [],
    nationwideEnabled: false
  });
  const [serviceAreaText, setServiceAreaText] = useState("");
  const [rateMode, setRateMode] = useState<"platform" | "custom">("platform");
  const [rateForm, setRateForm] = useState(emptyRateForm);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<PaymentMethod[]>(paymentMethodOptions);
  const [offerView, setOfferView] = useState<"live" | "inbox">(searchParams.get("tab") === "inbox" ? "inbox" : "live");
  const [toolsOpen, setToolsOpen] = useState(searchParams.get("tab") === "account");
  const [now, setNow] = useState(() => Date.now());
  const toolsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setProfileForm({
      name: profileQuery.data.name,
      phone: profileQuery.data.phone ?? "",
      homeState: profileQuery.data.homeState ?? "",
      homeCity: profileQuery.data.homeCity ?? "",
      makeModel: profileQuery.data.vehicle?.makeModel ?? "",
      plate: profileQuery.data.vehicle?.plate ?? "",
      color: profileQuery.data.vehicle?.color ?? "",
      rideType: profileQuery.data.vehicle?.rideType ?? "standard",
      seats: String(profileQuery.data.vehicle?.seats ?? 4)
    });
    setAcceptedPaymentMethods(profileQuery.data.acceptedPaymentMethods?.length ? profileQuery.data.acceptedPaymentMethods : paymentMethodOptions);
  }, [profileQuery.data]);

  useEffect(() => {
    if (!dispatchQuery.data) {
      return;
    }

    setDispatchForm(dispatchQuery.data);
    setServiceAreaText(dispatchQuery.data.serviceAreaStates.join(", "));
  }, [dispatchQuery.data]);

  useEffect(() => {
    if (!ratesQuery.data) {
      return;
    }

    setRateMode(ratesQuery.data.pricingMode);
    setRateForm({
      standard: {
        baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.baseFare ?? 0),
        perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.perMile ?? 0),
        perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.perMinute ?? 0),
        multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.multiplier ?? 1)
      },
      suv: {
        baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.baseFare ?? 0),
        perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.perMile ?? 0),
        perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.perMinute ?? 0),
        multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.multiplier ?? 1)
      },
      xl: {
        baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.baseFare ?? 0),
        perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.perMile ?? 0),
        perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.perMinute ?? 0),
        multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.multiplier ?? 1)
      }
    });
  }, [ratesQuery.data]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab === "inbox") {
      setOfferView("inbox");
      return;
    }

    setOfferView("live");
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("tab") !== "account") {
      return;
    }

    setToolsOpen(true);
    window.requestAnimationFrame(() => {
      toolsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams]);

  const availabilityMutation = useMutation({
    mutationFn: (available: boolean) => api.updateDriverAvailability(available, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    }
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      api.updateDriverProfile(
        {
          name: profileForm.name,
          phone: profileForm.phone,
          homeState: profileForm.homeState,
          homeCity: profileForm.homeCity,
          acceptedPaymentMethods,
          vehicle: {
            makeModel: profileForm.makeModel,
            plate: profileForm.plate,
            color: profileForm.color || undefined,
            rideType: profileForm.rideType,
            seats: Number(profileForm.seats)
          }
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-profile"] })
  });

  const dispatchMutation = useMutation({
    mutationFn: () =>
      api.updateDriverDispatchSettings(
        {
          ...dispatchForm,
          serviceAreaStates: serviceAreaText
            .split(",")
            .map((state) => state.trim().toUpperCase())
            .filter(Boolean)
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-dispatch-settings"] })
  });

  const rateMutation = useMutation({
    mutationFn: () =>
      api.updateDriverRates(
        {
          pricingMode: rateMode,
          rules: (Object.keys(rateForm) as RideType[]).map((rideType) => ({
            rideType,
            baseFare: Number(rateForm[rideType].baseFare),
            perMile: Number(rateForm[rideType].perMile),
            perMinute: Number(rateForm[rideType].perMinute),
            multiplier: Number(rateForm[rideType].multiplier)
          }))
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-rates"] })
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

  const adProgramMutation = useMutation({
    mutationFn: (optedIn: boolean) => api.updateDriverAdProgram({ optedIn }, token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-ad-program"] })
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = getSocket(token);
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    };

    socket.on("ride.offer", refresh);
    socket.on("ride.status.changed", refresh);

    return () => {
      socket.off("ride.offer", refresh);
      socket.off("ride.status.changed", refresh);
    };
  }, [queryClient, token]);

  const collectibleAccrued = duesQuery.data?.collectibleAccrued ?? [];
  const openBatches = duesQuery.data?.openBatches ?? [];
  const overdueBatches = duesQuery.data?.overdueBatches ?? [];
  const dueHistory = duesQuery.data?.history ?? [];
  const payoutSettings = duesQuery.data?.payoutSettings;
  const collector = duesQuery.data?.collector;
  const suspended = duesQuery.data?.blocked ?? false;
  const community = communityQuery.data;
  const adProgram = adProgramQuery.data;
  const requestFeatureUrl = `/request-feature?source=driver_app&contextPath=${encodeURIComponent("/driver")}`;
  const offers = offersQuery.data ?? [];
  const activeRides = activeRidesQuery.data ?? [];
  const liveOffer = offers[0] ?? null;
  const activeRide = activeRides[0] ?? null;
  const mapRide = activeRide ?? liveOffer;
  const requestedTab = searchParams.get("tab");
  const projectedLiveEarnings = useMemo(() => {
    const activeSubtotal = activeRides.reduce((total, ride) => total + getDriverRidePricing(ride).subtotal, 0);
    const liveOfferSubtotal = liveOffer ? getDriverRidePricing(liveOffer).subtotal : 0;
    return Number((activeSubtotal + liveOfferSubtotal).toFixed(2));
  }, [activeRides, liveOffer]);
  const jobsInFlow = activeRides.length + (liveOffer ? 1 : 0);
  const dispatchSummary = formatDriverDispatchSummary(dispatchQuery.data);
  const statusLabel = suspended ? "Blocked" : profileQuery.data?.available ? "Online" : "Offline";
  const hasActiveTrip = activeRides.length > 0;
  const mobileHomeState = requestedTab === "ride" && hasActiveTrip
    ? "ride"
    : offerView === "inbox"
      ? "inbox"
      : liveOffer
        ? "offer"
        : hasActiveTrip
          ? "ride"
          : "idle";
  const mobileHomeTitle = mobileHomeState === "ride"
    ? "Active ride"
    : mobileHomeState === "inbox"
      ? "Inbox"
      : mobileHomeState === "offer"
        ? "Live offer"
        : "Stand by";
  const mobileHomeDescription = mobileHomeState === "ride"
    ? "Trip continuity stays docked on home until you jump back into the live ride route."
    : mobileHomeState === "inbox"
      ? "Pending requests stay inside the same map shell instead of breaking the flow."
      : mobileHomeState === "offer"
        ? "The current live request owns the sheet until you accept or decline it."
        : "Stay online and keep the shell open. New requests will land here first.";

  function updateDriverHomeTab(tab: "home" | "inbox" | "ride" | "account") {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="hidden xl:block">
        <DriverStatusBar
          available={Boolean(profileQuery.data?.available)}
          suspended={suspended}
          blockedReason={duesQuery.data?.blockedReason ?? null}
          dispatchSummary={dispatchSummary}
          availabilityPending={availabilityMutation.isPending}
          onToggleAvailability={() => availabilityMutation.mutate(!profileQuery.data?.available)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.95fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <div className="xl:hidden">
            <div className="-mx-4 md:mx-0">
              <div className="relative isolate">
                <DriverMapSurface
                  ride={mapRide}
                  statusLabel={statusLabel}
                  dispatchSummary={dispatchSummary}
                  vehicleLabel={profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}
                  mobileOverlayMode
                  mobileFitPaddingBottom={470}
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="pointer-events-auto flex max-w-[68%] flex-col gap-1.5">
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-3.5 py-2 shadow-[0_18px_44px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
                        <span className={`h-2 w-2 rounded-full ${suspended ? "bg-red-400" : profileQuery.data?.available ? "bg-teal-400 shadow-lg shadow-teal-400/45" : "bg-slate-500"}`} />
                        <span className="truncate text-sm font-medium text-white">{statusLabel}</span>
                      </div>
                      <div className="rounded-full border border-white/8 bg-slate-950/56 px-3.5 py-1.5 text-[11px] text-slate-300 shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-xl">
                        <span className="block truncate">{dispatchSummary}</span>
                      </div>
                    </div>

                    <div className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-slate-950/68 px-3 py-2 shadow-[0_18px_44px_rgba(2,6,23,0.32)] backdrop-blur-2xl">
                      <Route className="h-3.5 w-3.5 text-teal-400" />
                      <span className="text-sm font-semibold text-white">{formatMoney(projectedLiveEarnings)}</span>
                    </div>
                  </div>

                  {liveOffer && mobileHomeState !== "ride" ? (
                    <div className="mt-2 flex justify-center">
                      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-cyan-500/22 bg-slate-950/70 px-3.5 py-1.5 shadow-[0_18px_44px_rgba(2,6,23,0.28)] backdrop-blur-2xl">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Offer</span>
                        <span className="text-sm font-bold text-white">{getDriverOfferCountdown(liveOffer, now) ?? "Queued"}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="absolute inset-x-0 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] z-20 px-3">
                  <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,29,0.74),rgba(6,10,18,0.93))] shadow-[0_22px_54px_rgba(2,6,23,0.46)] backdrop-blur-2xl">
                    <div className="flex justify-center pb-1.5 pt-2.5">
                      <div className="h-1 w-10 rounded-full bg-slate-700" />
                    </div>

                    <div className="max-h-[calc(100dvh-20rem)] overflow-y-auto overscroll-contain px-4 pb-3">
                      <div className="mb-2.5 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Driver work surface</p>
                          <h2 className="mt-1 text-[15px] font-semibold text-white">{mobileHomeTitle}</h2>
                          <p className="mt-0.5 max-w-[14rem] text-[11px] leading-4 text-slate-400">{mobileHomeDescription}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="h-8 rounded-full border-slate-700/50 bg-slate-800/65 px-3 text-xs text-slate-200 hover:bg-slate-800"
                          disabled={availabilityMutation.isPending || (!profileQuery.data?.available && suspended)}
                          onClick={() => availabilityMutation.mutate(!profileQuery.data?.available)}
                        >
                          {profileQuery.data?.available ? "Go offline" : suspended ? "Blocked" : "Go online"}
                        </Button>
                      </div>

                      <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-xl bg-slate-800/52 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOfferView("live");
                            updateDriverHomeTab("home");
                          }}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${offerView === "live" && requestedTab !== "ride" ? "border border-teal-500/26 bg-teal-500/18 text-teal-300" : "text-slate-400 hover:text-slate-200"}`}
                        >
                          Live
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOfferView("inbox");
                            updateDriverHomeTab("inbox");
                          }}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${offerView === "inbox" ? "border border-teal-500/26 bg-teal-500/18 text-teal-300" : "text-slate-400 hover:text-slate-200"}`}
                        >
                          Inbox
                        </button>
                      </div>

                      {hasActiveTrip && mobileHomeState !== "ride" ? (
                        <div className="mt-1 mb-1.5">
                          <DriverActiveRideCard ride={activeRide} emphasize={requestedTab === "ride" || (!liveOffer && hasActiveTrip)} mobileDocked />
                        </div>
                      ) : null}

                      {mobileHomeState === "ride" ? (
                        <DriverActiveRideCard ride={activeRide} emphasize mobileDocked />
                      ) : mobileHomeState === "inbox" ? (
                        <DriverOfferInbox
                          offers={offers}
                          suspended={suspended}
                          available={Boolean(profileQuery.data?.available)}
                          now={now}
                          acceptMutation={acceptMutation}
                          declineMutation={declineMutation}
                          mobile
                        />
                      ) : (
                        <DriverLiveOfferCard
                          offer={liveOffer}
                          suspended={suspended}
                          countdown={liveOffer ? getDriverOfferCountdown(liveOffer, now) : null}
                          acceptMutation={acceptMutation}
                          declineMutation={declineMutation}
                          mobile
                        />
                      )}

                      <div className="mt-2.5 border-t border-white/8 pt-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-teal-400" />
                            <span>{jobsInFlow} jobs in flow</span>
                          </div>
                          <div className="text-slate-500">{profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden xl:block">
            <DriverMapSurface
              ride={mapRide}
              statusLabel={statusLabel}
              dispatchSummary={dispatchSummary}
              vehicleLabel={profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}
            />
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-24">
          <div className="hidden space-y-4 xl:block">
            <div className="rounded-[1.7rem] border border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.98),rgba(8,11,16,0.96))] p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Work rail</p>
                  <h2 className="mt-1 text-[1.6rem] font-extrabold tracking-[-0.04em] text-ops-text">Driver cockpit</h2>
                </div>
                <Badge className="border-ops-border-soft bg-ops-panel/82 text-ops-text">{statusLabel}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-panel/40 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOfferView("live");
                    updateDriverHomeTab("home");
                  }}
                  className={`rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${offerView === "live" ? "bg-ops-primary text-white" : "text-ops-muted hover:bg-ops-panel/80 hover:text-ops-text"}`}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOfferView("inbox");
                    updateDriverHomeTab("inbox");
                  }}
                  className={`rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${offerView === "inbox" ? "bg-ops-primary text-white" : "text-ops-muted hover:bg-ops-panel/80 hover:text-ops-text"}`}
                >
                  Inbox
                </button>
              </div>
            </div>

            {offerView === "live" ? (
              <DriverLiveOfferCard
                offer={liveOffer}
                suspended={suspended}
                countdown={liveOffer ? getDriverOfferCountdown(liveOffer, now) : null}
                acceptMutation={acceptMutation}
                declineMutation={declineMutation}
              />
            ) : (
              <DriverOfferInbox
                offers={offers}
                suspended={suspended}
                available={Boolean(profileQuery.data?.available)}
                now={now}
                acceptMutation={acceptMutation}
                declineMutation={declineMutation}
              />
            )}

            <DriverActiveRideCard ride={activeRide} emphasize={requestedTab === "ride" || (!liveOffer && hasActiveTrip)} />
            <DriverEarningsMini projectedTotal={projectedLiveEarnings} jobsInFlow={jobsInFlow} />
          </div>
        </div>
      </div>

      <div ref={toolsRef} id="driver-tools">
        <DriverToolsSection open={toolsOpen} onToggle={() => setToolsOpen((current) => !current)} outstandingTotal={duesQuery.data?.outstandingTotal ?? 0}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3 rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/35 px-4 py-3 text-sm text-ops-muted">
            <div className="flex flex-wrap items-center gap-2 text-ops-text">
              <Route className="h-4 w-4 text-ops-primary" />
              {profileQuery.data?.homeCity && profileQuery.data?.homeState
                ? `${profileQuery.data.homeCity}, ${profileQuery.data.homeState}`
                : profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-ops-border-soft bg-ops-panel/75 text-ops-text">{profileQuery.data?.pricingMode === "custom" ? "custom rates" : "platform rates"}</Badge>
              {suspended ? <Badge className="border-ops-destructive/28 bg-ops-destructive/12 text-ops-destructive">dues overdue</Badge> : null}
              <Link
                to={requestFeatureUrl}
                className="inline-flex items-center text-xs font-semibold text-ops-primary transition hover:text-[#82a0ff]"
              >
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                Request feature
              </Link>
            </div>
          </div>

          <DriverOnboardingChecklist profile={profileQuery.data} dispatchSettings={dispatchQuery.data} />

          <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Keep your contact info and vehicle basics current.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Home state</Label>
                <Input
                  value={profileForm.homeState}
                  maxLength={2}
                  onChange={(event) => setProfileForm((current) => ({ ...current, homeState: event.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Home city</Label>
                <Input value={profileForm.homeCity} onChange={(event) => setProfileForm((current) => ({ ...current, homeCity: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vehicle make and model</Label>
              <Input value={profileForm.makeModel} onChange={(event) => setProfileForm((current) => ({ ...current, makeModel: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plate</Label>
                <Input value={profileForm.plate} onChange={(event) => setProfileForm((current) => ({ ...current, plate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input value={profileForm.color} onChange={(event) => setProfileForm((current) => ({ ...current, color: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ride type</Label>
                <select
                  className="h-11 w-full rounded-2xl border border-ops-border bg-ops-surface px-4 text-sm"
                  value={profileForm.rideType}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      rideType: event.target.value as RideType
                    }))
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="suv">SUV</option>
                  <option value="xl">XL</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Seats</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={profileForm.seats}
                  onChange={(event) => setProfileForm((current) => ({ ...current, seats: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accepted rider payments</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {paymentMethodOptions.map((method) => {
                  const active = acceptedPaymentMethods.includes(method);

                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        if (active && acceptedPaymentMethods.length === 1) {
                          return;
                        }

                        setAcceptedPaymentMethods((current) =>
                          current.includes(method)
                            ? current.filter((entry) => entry !== method)
                            : [...current, method]
                        );
                      }}
                      className={`rounded-3xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-ops-primary/45 bg-ops-primary text-white"
                          : "border-ops-border-soft bg-ops-surface text-ops-text hover:bg-ops-panel"
                      }`}
                    >
                      <p className="font-semibold">{formatPaymentMethod(method)}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ops-muted">Riders selecting a disabled method will be asked to choose one you accept.</p>
            </div>
            {profileMutation.error ? <p className="text-sm text-ops-error">{profileMutation.error.message}</p> : null}
            <Button onClick={() => profileMutation.mutate()}>Save profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispatch settings</CardTitle>
            <CardDescription>Choose whether you want nearby rides, specific states, or nationwide visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-4xl border border-ops-border-soft p-4">
              <div>
                <p className="font-semibold">Local dispatch</p>
                <p className="text-sm text-ops-muted">Receive rides inside your live-location radius.</p>
              </div>
              <input
                type="checkbox"
                checked={dispatchForm.localEnabled}
                onChange={(event) => setDispatchForm((current) => ({ ...current, localEnabled: event.target.checked }))}
              />
            </label>
            <div className="space-y-2">
              <Label>Local radius miles</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={dispatchForm.localRadiusMiles}
                onChange={(event) =>
                  setDispatchForm((current) => ({
                    ...current,
                    localRadiusMiles: Number(event.target.value) || 1
                  }))
                }
              />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-4xl border border-ops-border-soft p-4">
              <div>
                <p className="font-semibold">Service-area dispatch</p>
                <p className="text-sm text-ops-muted">Receive rides where the pickup state matches your approved markets.</p>
              </div>
              <input
                type="checkbox"
                checked={dispatchForm.serviceAreaEnabled}
                onChange={(event) => setDispatchForm((current) => ({ ...current, serviceAreaEnabled: event.target.checked }))}
              />
            </label>
            <div className="space-y-2">
              <Label>Service area states</Label>
              <Input
                value={serviceAreaText}
                onChange={(event) => setServiceAreaText(event.target.value.toUpperCase())}
                placeholder="VA, NY, NJ"
              />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-4xl border border-ops-border-soft p-4">
              <div>
                <p className="font-semibold">Nationwide dispatch</p>
                <p className="text-sm text-ops-muted">Receive eligible ride offers from anywhere in the US.</p>
              </div>
              <input
                type="checkbox"
                checked={dispatchForm.nationwideEnabled}
                onChange={(event) => setDispatchForm((current) => ({ ...current, nationwideEnabled: event.target.checked }))}
              />
            </label>
            {dispatchMutation.error ? <p className="text-sm text-ops-error">{dispatchMutation.error.message}</p> : null}
            <Button onClick={() => dispatchMutation.mutate()}>Save dispatch settings</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Stick with the platform market rate card or switch to your own custom rates. The rider still sees one
            all-in total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setRateMode("platform")}
              className={`rounded-4xl border p-4 text-left ${rateMode === "platform" ? "border-ops-primary/45 bg-ops-primary text-white" : "border-ops-border-soft bg-ops-surface"}`}
            >
              <p className="font-semibold">Use platform market rates</p>
              <p className={`mt-1 text-sm ${rateMode === "platform" ? "text-white/75" : "text-ops-muted"}`}>
                Riders keep the quoted all-in total when you accept.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRateMode("custom")}
              className={`rounded-4xl border p-4 text-left ${rateMode === "custom" ? "border-ops-primary/45 bg-ops-primary text-white" : "border-ops-border-soft bg-ops-surface"}`}
            >
              <p className="font-semibold">Use custom driver rates</p>
              <p className={`mt-1 text-sm ${rateMode === "custom" ? "text-white/75" : "text-ops-muted"}`}>
                The rider sees the platform estimate first, then your final accepted total takes over.
              </p>
            </button>
          </div>

          {(Object.keys(rateForm) as RideType[]).map((rideType) => (
            <div key={rideType} className="rounded-4xl border border-ops-border-soft p-4">
              <h3 className="mb-4 text-lg font-semibold capitalize">{rideType}</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Base fare</Label>
                  <Input
                    value={rateForm[rideType].baseFare}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], baseFare: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per mile</Label>
                  <Input
                    value={rateForm[rideType].perMile}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], perMile: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per minute</Label>
                  <Input
                    value={rateForm[rideType].perMinute}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], perMinute: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multiplier</Label>
                  <Input
                    value={rateForm[rideType].multiplier}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], multiplier: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          {rateMutation.error ? <p className="text-sm text-ops-error">{rateMutation.error.message}</p> : null}
          <Button onClick={() => rateMutation.mutate()}>Save pricing</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Platform dues</CardTitle>
            <CardDescription>
              Only completed trips create collectible dues. Pay against the live batch code and use that code in the payment title, note, or both when the app allows it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Collectible total</p>
                <p className="mt-2 text-2xl font-extrabold">{formatMoney(duesQuery.data?.outstandingTotal ?? 0)}</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Open batches</p>
                <p className="mt-2 text-2xl font-extrabold">{openBatches.length + overdueBatches.length}</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Status</p>
                <p className="mt-2 text-2xl font-extrabold">{suspended ? "Suspended" : "Clear"}</p>
              </div>
            </div>

            <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-4 text-sm text-ops-muted">
              <p className="font-semibold text-ops-text">Collector dues instructions</p>
              <p className="mt-2 text-sm leading-6 text-ops-muted">
                Trip payment method comes from the rider booking choice. These instructions are only for platform dues batches.
              </p>
              <div className="mt-3 grid gap-2">
                <p>Collector: {collector?.name ?? "Unassigned"}</p>
                <p>Cash App: {payoutSettings?.cashAppHandle || "Not set yet"}</p>
                <p>Zelle: {payoutSettings?.zelleHandle || "Not set yet"}</p>
                <p>Jim: {payoutSettings?.jimHandle || "Not set yet"}</p>
                <p>Cash: {payoutSettings?.cashInstructions || "Not set yet"}</p>
                <p>Other: {payoutSettings?.otherInstructions || "Not set yet"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Current payable batches</p>
              {[...overdueBatches, ...openBatches].length ? (
                [...overdueBatches, ...openBatches].map((batch) => (
                  <div key={batch.id} className="rounded-4xl border border-ops-border-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{batch.referenceCode}</p>
                          <Badge>{batch.status}</Badge>
                        </div>
                        <p className="text-sm text-ops-muted">{batch.dues.length} completed trips in this batch</p>
                        <p className="text-sm text-ops-muted/80">Due by {formatDateTime(batch.dueAt)}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-semibold">{formatMoney(batch.amount)}</p>
                        <p className="text-sm text-ops-muted">Use {batch.referenceCode} in title, note, or both</p>
                        <p className="text-sm text-ops-muted/80">
                          {batch.paymentMethod ? `Last recorded method ${batch.paymentMethod}` : "Waiting for reconciliation"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No open dues batches right now.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Completed-trip dues ready to collect</p>
              {collectibleAccrued.length ? (
                collectibleAccrued.map((due) => (
                  <div key={due.id} className="flex items-center justify-between rounded-4xl border border-ops-border-soft p-4">
                    <div>
                      <p className="font-semibold">{due.ride.riderName}</p>
                      <p className="text-sm text-ops-muted">{due.ride.pickupAddress}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(due.amount)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No unbatched completed-trip dues right now.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Recent due history</p>
              {dueHistory.length ? (
                dueHistory.slice(0, 5).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between rounded-4xl border border-ops-border-soft p-4">
                    <div>
                      <p className="font-semibold">{batch.referenceCode}</p>
                      <p className="text-sm text-ops-muted">{batch.status} · {formatDateTime(batch.updatedAt)}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(batch.amount)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  Paid or waived dues will appear here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Community board</CardTitle>
              <CardDescription>
                Drivers can create proposals, vote, and comment immediately. Riders unlock those actions after 51
                completed rides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-4xl border border-ops-border-soft bg-ops-surface p-4">
                <p className="font-semibold">Your access</p>
                <p className="mt-2 text-sm text-ops-muted">
                  {community?.eligibility.reason ?? "You have full community access."}
                </p>
              </div>
              {community?.proposals.slice(0, 3).map((proposal) => (
                <div key={proposal.id} className="rounded-4xl border border-ops-border-soft p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{proposal.title}</p>
                    {proposal.pinned ? <Badge>pinned</Badge> : null}
                    {proposal.closed ? <Badge className="bg-ops-surface">closed</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-ops-muted">{proposal.body}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ops-muted">
                    {proposal.yesVotes} yes · {proposal.noVotes} no · {proposal.commentCount} comments
                  </p>
                </div>
              ))}
              {!community?.proposals.length ? (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No proposals yet. You can start the first one from the community board.
                </div>
              ) : null}
              <Link
                to="/community"
                className="inline-flex items-center justify-center rounded-2xl border border-ops-primary/40 bg-ops-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3b8fff]"
              >
                Open community board
              </Link>
            </CardContent>
          </Card>

          {shareQuery.data ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ad dues offset</CardTitle>
                  <CardDescription>
                    Opt in if you want paid ad scans tracked for manual dues offset. If scans do not happen, dues stay the same.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-4xl border border-ops-border-soft p-4">
                      <p className="text-sm text-ops-muted">Program</p>
                      <p className="mt-2 text-2xl font-extrabold">{adProgram?.enrollment.optedIn ? "On" : "Off"}</p>
                    </div>
                    <div className="rounded-4xl border border-ops-border-soft p-4">
                      <p className="text-sm text-ops-muted">Pending offset</p>
                      <p className="mt-2 text-2xl font-extrabold">{formatMoney(adProgram?.summary.pendingTotal ?? 0)}</p>
                    </div>
                    <div className="rounded-4xl border border-ops-border-soft p-4">
                      <p className="text-sm text-ops-muted">Tracked scans</p>
                      <p className="mt-2 text-2xl font-extrabold">{adProgram?.summary.scanCount ?? 0}</p>
                    </div>
                  </div>
                  <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-4 text-sm text-ops-muted">
                    <p>
                      Available ads: <span className="font-semibold text-ops-text">{adProgram?.summary.activeAdCount ?? 0}</span>
                    </p>
                    <p className="mt-2">
                      Applied credits: <span className="font-semibold text-ops-text">{formatMoney(adProgram?.summary.appliedTotal ?? 0)}</span>
                    </p>
                    <p className="mt-2">
                      Public preview: <span className="font-semibold text-ops-text">/ads/display/{shareQuery.data.referralCode}</span>
                    </p>
                    <p className="mt-2">
                      Tablet mode login: <span className="font-semibold text-ops-text">/tablet/ads/login</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={adProgramMutation.isPending} onClick={() => adProgramMutation.mutate(!adProgram?.enrollment.optedIn)}>
                      {adProgram?.enrollment.optedIn ? "Disable ad program" : "Enable ad program"}
                    </Button>
                    <Link
                      to="/tablet/ads"
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-ops-panel px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-surface"
                    >
                      Open tablet mode
                    </Link>
                    <Link
                      to={`/ads/display/${shareQuery.data.referralCode}`}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-ops-panel px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-surface"
                    >
                      Open public preview
                    </Link>
                  </div>
                  {adProgramMutation.error ? <p className="text-sm text-ops-error">{adProgramMutation.error.message}</p> : null}
                </CardContent>
              </Card>

              <ShareQrCard
                title="Your driver referral QR"
                description="Share this rider-growth link from the driver side. It still points riders back to the booking flow."
                shareUrl={shareQuery.data.shareUrl}
                referralCode={shareQuery.data.referralCode}
                fileName={`realdrive-driver-${shareQuery.data.referralCode.toLowerCase()}`}
              />

              <HeadrestPrintTemplate
                title="Headrest rider flyer"
                shareUrl={shareQuery.data.shareUrl}
                fileName={`realdrive-headrest-${shareQuery.data.referralCode.toLowerCase()}`}
              />
            </div>
          ) : null}
        </div>
      </div>
        </DriverToolsSection>
      </div>
    </div>
  );
}
