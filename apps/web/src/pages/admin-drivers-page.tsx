import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DriverAccount } from "@shared/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

function DriverEditor({ driver }: { driver: DriverAccount }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: driver.name,
    homeState: driver.homeState ?? "",
    homeCity: driver.homeCity ?? "",
    pricingMode: driver.pricingMode,
    localEnabled: driver.dispatchSettings.localEnabled,
    localRadiusMiles: String(driver.dispatchSettings.localRadiusMiles),
    serviceAreaEnabled: driver.dispatchSettings.serviceAreaEnabled,
    serviceAreaStates: driver.dispatchSettings.serviceAreaStates.join(", "),
    nationwideEnabled: driver.dispatchSettings.nationwideEnabled
  });

  useEffect(() => {
    setForm({
      name: driver.name,
      homeState: driver.homeState ?? "",
      homeCity: driver.homeCity ?? "",
      pricingMode: driver.pricingMode,
      localEnabled: driver.dispatchSettings.localEnabled,
      localRadiusMiles: String(driver.dispatchSettings.localRadiusMiles),
      serviceAreaEnabled: driver.dispatchSettings.serviceAreaEnabled,
      serviceAreaStates: driver.dispatchSettings.serviceAreaStates.join(", "),
      nationwideEnabled: driver.dispatchSettings.nationwideEnabled
    });
  }, [driver]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateDriver(
        driver.id,
        {
          name: form.name,
          homeState: form.homeState || null,
          homeCity: form.homeCity || null,
          pricingMode: form.pricingMode,
          dispatchSettings: {
            localEnabled: form.localEnabled,
            localRadiusMiles: Number(form.localRadiusMiles) || 1,
            serviceAreaEnabled: form.serviceAreaEnabled,
            serviceAreaStates: form.serviceAreaStates
              .split(",")
              .map((state) => state.trim().toUpperCase())
              .filter(Boolean),
            nationwideEnabled: form.nationwideEnabled
          }
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
  });

  const approvalMutation = useMutation({
    mutationFn: (approvalStatus: "approved" | "rejected" | "pending") =>
      api.updateDriverApproval(driver.id, { approvalStatus }, token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
  });

  const availabilityMutation = useMutation({
    mutationFn: () => api.updateDriver(driver.id, { available: !driver.available }, token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
  });

  return (
    <div className="rounded-4xl border border-brand-ink/10 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{driver.name}</p>
            <Badge>{driver.approvalStatus}</Badge>
            <Badge>{driver.available ? "available" : "offline"}</Badge>
            <Badge>{driver.pricingMode === "platform" ? "platform rates" : "custom rates"}</Badge>
          </div>
          <p className="mt-1 text-sm text-brand-ink/55">
            {driver.email ?? "No email"} · {driver.phone ?? "No phone"}
          </p>
          <p className="text-sm text-brand-ink/45">
            {driver.vehicle?.makeModel ?? "No vehicle"} · {driver.vehicle?.plate ?? "No plate"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {driver.approvalStatus !== "approved" ? (
            <Button variant="outline" onClick={() => approvalMutation.mutate("approved")}>
              Approve
            </Button>
          ) : null}
          {driver.approvalStatus !== "rejected" ? (
            <Button variant="ghost" onClick={() => approvalMutation.mutate("rejected")}>
              Reject
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => availabilityMutation.mutate()}>
            Toggle availability
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Home state</Label>
              <Input
                value={form.homeState}
                maxLength={2}
                onChange={(event) => setForm((current) => ({ ...current, homeState: event.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Home city</Label>
              <Input value={form.homeCity} onChange={(event) => setForm((current) => ({ ...current, homeCity: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pricing mode</Label>
            <select
              className="h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm"
              value={form.pricingMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  pricingMode: event.target.value as DriverAccount["pricingMode"]
                }))
              }
            >
              <option value="platform">Platform</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4">
            <span className="font-semibold">Local dispatch</span>
            <input
              type="checkbox"
              checked={form.localEnabled}
              onChange={(event) => setForm((current) => ({ ...current, localEnabled: event.target.checked }))}
            />
          </label>
          <div className="space-y-2">
            <Label>Local radius miles</Label>
            <Input
              type="number"
              value={form.localRadiusMiles}
              onChange={(event) => setForm((current) => ({ ...current, localRadiusMiles: event.target.value }))}
            />
          </div>
          <label className="flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4">
            <span className="font-semibold">Service-area dispatch</span>
            <input
              type="checkbox"
              checked={form.serviceAreaEnabled}
              onChange={(event) => setForm((current) => ({ ...current, serviceAreaEnabled: event.target.checked }))}
            />
          </label>
          <div className="space-y-2">
            <Label>Service area states</Label>
            <Input
              value={form.serviceAreaStates}
              onChange={(event) => setForm((current) => ({ ...current, serviceAreaStates: event.target.value.toUpperCase() }))}
              placeholder="VA, NY"
            />
          </div>
          <label className="flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4">
            <span className="font-semibold">Nationwide dispatch</span>
            <input
              type="checkbox"
              checked={form.nationwideEnabled}
              onChange={(event) => setForm((current) => ({ ...current, nationwideEnabled: event.target.checked }))}
            />
          </label>
        </div>
      </div>

      {updateMutation.error ? <p className="mt-3 text-sm text-red-600">{updateMutation.error.message}</p> : null}
      <div className="mt-4">
        <Button onClick={() => updateMutation.mutate()}>Save driver settings</Button>
      </div>
    </div>
  );
}

export function AdminDriversPage() {
  const { token } = useAuth();
  const driversQuery = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: () => api.listDrivers(token!)
  });

  const pending = (driversQuery.data ?? []).filter((driver) => driver.approvalStatus === "pending");
  const approvedOrRejected = (driversQuery.data ?? []).filter((driver) => driver.approvalStatus !== "pending");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending driver applications</CardTitle>
          <CardDescription>Approve new drivers before they can log into the driver app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length ? (
            pending.map((driver) => <DriverEditor key={driver.id} driver={driver} />)
          ) : (
            <div className="rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55">
              No pending driver applications right now.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All drivers</CardTitle>
          <CardDescription>Review approved drivers, reject accounts, and override dispatch or pricing mode settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvedOrRejected.map((driver) => (
            <DriverEditor key={driver.id} driver={driver} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
