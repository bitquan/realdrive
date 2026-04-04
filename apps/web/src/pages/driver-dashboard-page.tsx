import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DriverDispatchSettings, Ride, RideType } from "@shared/contracts";
import { Link } from "react-router-dom";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const emptyRateForm = {
  standard: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
  suv: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
  xl: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" }
};

function getRidePricing(ride: Ride) {
  return {
    subtotal: ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal,
    platformDue: ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue,
    customerTotal: ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal
  };
}

export function DriverDashboardPage() {
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
    enabled: Boolean(token)
  });
  const shareQuery = useQuery({
    queryKey: ["me-share"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
  });
  const activeRidesQuery = useQuery({
    queryKey: ["driver-active-rides"],
    queryFn: () => api.listActiveDriverRides(token!),
    enabled: Boolean(token)
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
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
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    };

    socket.on("ride.offer", refresh);
    socket.on("ride.status.changed", refresh);

    return () => {
      socket.off("ride.offer", refresh);
      socket.off("ride.status.changed", refresh);
    };
  }, [queryClient, token]);

  const outstandingDues = duesQuery.data?.outstanding ?? [];
  const dueHistory = duesQuery.data?.history ?? [];
  const payoutSettings = duesQuery.data?.payoutSettings;
  const suspended = duesQuery.data?.suspended ?? false;
  const community = communityQuery.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Driver dashboard</CardTitle>
          <CardDescription>
            Go available, accept work, manage your market settings, and stay current on platform dues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">{profileQuery.data?.name}</p>
                <Badge>{profileQuery.data?.pricingMode === "custom" ? "custom rates" : "platform rates"}</Badge>
                {suspended ? <Badge className="border-red-200 bg-red-50 text-red-700">dues overdue</Badge> : null}
              </div>
              <p className="text-sm text-ops-muted">
                {profileQuery.data?.homeCity && profileQuery.data?.homeState
                  ? `${profileQuery.data.homeCity}, ${profileQuery.data.homeState}`
                  : profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}
              </p>
              <p className="text-sm text-ops-muted/80">
                {dispatchForm.localEnabled ? `Local ${dispatchForm.localRadiusMiles} mi` : "Local off"} ·{" "}
                {dispatchForm.serviceAreaEnabled
                  ? `States ${dispatchForm.serviceAreaStates.join(", ") || serviceAreaText || "none"}`
                  : "Service area off"}{" "}
                · {dispatchForm.nationwideEnabled ? "Nationwide on" : "Nationwide off"}
              </p>
            </div>
            <Button
              variant={profileQuery.data?.available ? "default" : "outline"}
              disabled={availabilityMutation.isPending || (!profileQuery.data?.available && suspended)}
              onClick={() => availabilityMutation.mutate(!profileQuery.data?.available)}
            >
              {profileQuery.data?.available ? "Set offline" : suspended ? "Clear dues to go available" : "Go available"}
            </Button>
          </div>
          {suspended ? (
            <div className="rounded-4xl border border-amber-500/20 bg-amber-50 p-4 text-sm text-amber-800">
              You have overdue platform dues. New offers and availability are blocked until an admin marks those dues
              paid or waived.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Incoming offers</p>
            <p className="mt-2 text-3xl font-extrabold">{offersQuery.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Active rides</p>
            <p className="mt-2 text-3xl font-extrabold">{activeRidesQuery.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Outstanding dues</p>
            <p className="mt-2 text-3xl font-extrabold">{formatMoney(duesQuery.data?.outstandingTotal ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Community access</p>
            <p className="mt-2 text-3xl font-extrabold">{community?.eligibility.canVote ? "Full" : "Read"}</p>
          </CardContent>
        </Card>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incoming offers</CardTitle>
            <CardDescription>First accepted offer wins the trip. New work is blocked when dues are overdue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {offersQuery.data?.map((ride) => {
              const pricing = getRidePricing(ride);

              return (
                <div key={ride.id} className="rounded-4xl border border-ops-border-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{ride.pickup.address}</p>
                      <p className="text-sm text-ops-muted">{ride.dropoff.address}</p>
                    </div>
                    <Badge>{ride.rideType}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-ops-muted">{ride.estimatedMiles} miles · {ride.estimatedMinutes} minutes</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-ops-border-soft p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Customer total</p>
                      <p className="mt-1 font-semibold">{formatMoney(pricing.customerTotal)}</p>
                    </div>
                    <div className="rounded-3xl border border-ops-border-soft p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Your subtotal</p>
                      <p className="mt-1 font-semibold">{formatMoney(pricing.subtotal)}</p>
                    </div>
                    <div className="rounded-3xl border border-ops-border-soft p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Platform due</p>
                      <p className="mt-1 font-semibold">{formatMoney(pricing.platformDue)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button className="flex-1" disabled={suspended} onClick={() => acceptMutation.mutate(ride.id)}>
                      Accept
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => declineMutation.mutate(ride.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
            {!offersQuery.data?.length ? (
              <div className="rounded-4xl border border-dashed border-ops-border p-6 text-center text-sm text-ops-muted">
                No ride offers right now.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active rides</CardTitle>
            <CardDescription>Continue trip workflows, live tracking, and payout visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRidesQuery.data?.map((ride) => {
              const pricing = getRidePricing(ride);

              return (
                <Link
                  key={ride.id}
                  to={`/driver/rides/${ride.id}`}
                  className="block rounded-4xl border border-ops-border-soft p-4 transition hover:bg-ops-panel/55"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{ride.rider.name}</p>
                      <p className="text-sm text-ops-muted">{ride.pickup.address}</p>
                    </div>
                    <Badge>{ride.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Customer total</p>
                      <p className="mt-1 text-sm font-semibold">{formatMoney(pricing.customerTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Your subtotal</p>
                      <p className="mt-1 text-sm font-semibold">{formatMoney(pricing.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Platform due</p>
                      <p className="mt-1 text-sm font-semibold">{formatMoney(pricing.platformDue)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
            {!activeRidesQuery.data?.length ? (
              <div className="rounded-4xl border border-dashed border-ops-border p-6 text-center text-sm text-ops-muted">
                No active rides yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Platform dues</CardTitle>
            <CardDescription>
              Drivers keep the subtotal and send the 5% platform due manually within 48 hours of completed rides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Outstanding</p>
                <p className="mt-2 text-2xl font-extrabold">{formatMoney(duesQuery.data?.outstandingTotal ?? 0)}</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Overdue count</p>
                <p className="mt-2 text-2xl font-extrabold">{duesQuery.data?.overdueCount ?? 0}</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Status</p>
                <p className="mt-2 text-2xl font-extrabold">{suspended ? "Suspended" : "Clear"}</p>
              </div>
            </div>

            <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-4 text-sm text-ops-muted">
              <p className="font-semibold text-ops-text">Where to send dues</p>
              <div className="mt-3 grid gap-2">
                <p>Cash App: {payoutSettings?.cashAppHandle || "Not set yet"}</p>
                <p>Zelle: {payoutSettings?.zelleHandle || "Not set yet"}</p>
                <p>Jim: {payoutSettings?.jimHandle || "Not set yet"}</p>
                <p>Cash: {payoutSettings?.cashInstructions || "Not set yet"}</p>
                <p>Other: {payoutSettings?.otherInstructions || "Not set yet"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Outstanding dues</p>
              {outstandingDues.length ? (
                outstandingDues.map((due) => (
                  <div key={due.id} className="rounded-4xl border border-ops-border-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{due.ride.pickupAddress}</p>
                          <Badge>{due.status}</Badge>
                        </div>
                        <p className="text-sm text-ops-muted">{due.ride.dropoffAddress}</p>
                        <p className="text-sm text-ops-muted/80">Due by {formatDateTime(due.dueAt)}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-semibold">{formatMoney(due.amount)}</p>
                        <p className="text-sm text-ops-muted">Ride subtotal: {formatMoney(due.ride.subtotal)}</p>
                        <p className="text-sm text-ops-muted/80">Customer paid: {formatMoney(due.ride.customerTotal)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No outstanding dues right now.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Recent due history</p>
              {dueHistory.length ? (
                dueHistory.slice(0, 5).map((due) => (
                  <div key={due.id} className="flex items-center justify-between rounded-4xl border border-ops-border-soft p-4">
                    <div>
                      <p className="font-semibold">{due.ride.riderName}</p>
                      <p className="text-sm text-ops-muted">{due.status} · {formatDateTime(due.updatedAt)}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(due.amount)}</p>
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
            <ShareQrCard
              title="Your driver referral QR"
              description="Share this rider-growth link from the driver side. It still points riders back to the booking flow."
              shareUrl={shareQuery.data.shareUrl}
              referralCode={shareQuery.data.referralCode}
              fileName={`realdrive-driver-${shareQuery.data.referralCode.toLowerCase()}`}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
