import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, ToggleLeft, Users } from "lucide-react";
import type { DriverAccount } from "@shared/contracts";
import {
  DataField,
  EntityList,
  EntityListItem,
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

function DriverEditorPanel({ driver }: { driver: DriverAccount }) {
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
    <div className="space-y-6">
      <div className="rounded-[1.8rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-bold tracking-[-0.03em] text-ops-text">{driver.name}</p>
              <Badge>{driver.approvalStatus}</Badge>
              <Badge>{driver.available ? "available" : "offline"}</Badge>
              <Badge>{driver.pricingMode === "platform" ? "platform rates" : "custom rates"}</Badge>
            </div>
            <p className="mt-2 text-sm text-ops-muted">{driver.email ?? "No email"} · {driver.phone ?? "No phone"}</p>
            <p className="mt-1 text-sm text-ops-muted">{driver.vehicle?.makeModel ?? "No vehicle"} · {driver.vehicle?.plate ?? "No plate"}</p>
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

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <DataField label="Home market" value={driver.homeCity && driver.homeState ? `${driver.homeCity}, ${driver.homeState}` : "Not set"} />
          <DataField
            label="Dispatch footprint"
            value={driver.dispatchSettings.localEnabled ? `${driver.dispatchSettings.localRadiusMiles} mi local` : "Local off"}
            subtle={
              driver.dispatchSettings.serviceAreaEnabled
                ? `States: ${driver.dispatchSettings.serviceAreaStates.join(", ") || "none"}`
                : driver.dispatchSettings.nationwideEnabled
                  ? "Nationwide enabled"
                  : "Service area off"
            }
          />
          <DataField label="Created" value={driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : "Existing driver"} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
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
              className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
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
          <label className="flex items-center justify-between rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/48 p-4">
            <div>
              <p className="font-semibold text-ops-text">Local dispatch</p>
              <p className="text-sm text-ops-muted">Nearby live-location ride offers.</p>
            </div>
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
          <label className="flex items-center justify-between rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/48 p-4">
            <div>
              <p className="font-semibold text-ops-text">Service-area dispatch</p>
              <p className="text-sm text-ops-muted">Pickup state must match an approved market.</p>
            </div>
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
          <label className="flex items-center justify-between rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/48 p-4">
            <div>
              <p className="font-semibold text-ops-text">Nationwide dispatch</p>
              <p className="text-sm text-ops-muted">Allow fallback offers from any US market.</p>
            </div>
            <input
              type="checkbox"
              checked={form.nationwideEnabled}
              onChange={(event) => setForm((current) => ({ ...current, nationwideEnabled: event.target.checked }))}
            />
          </label>
        </div>
      </div>

      {updateMutation.error ? <p className="text-sm text-ops-error">{updateMutation.error.message}</p> : null}
      <div className="flex flex-wrap gap-2.5">
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
  const [search, setSearch] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const drivers = driversQuery.data ?? [];
  const filteredDrivers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) {
      return drivers;
    }

    return drivers.filter((driver) =>
      [driver.name, driver.email ?? "", driver.phone ?? "", driver.vehicle?.makeModel ?? "", driver.vehicle?.plate ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    );
  }, [drivers, search]);

  useEffect(() => {
    if (!filteredDrivers.length) {
      setSelectedDriverId("");
      return;
    }

    const stillExists = filteredDrivers.some((driver) => driver.id === selectedDriverId);
    if (!selectedDriverId || !stillExists) {
      setSelectedDriverId(filteredDrivers[0].id);
    }
  }, [filteredDrivers, selectedDriverId]);

  const selectedDriver = filteredDrivers.find((driver) => driver.id === selectedDriverId) ?? filteredDrivers[0] ?? null;
  const pendingCount = drivers.filter((driver) => driver.approvalStatus === "pending").length;
  const approvedCount = drivers.filter((driver) => driver.approvalStatus === "approved").length;
  const availableCount = drivers.filter((driver) => driver.available).length;
  const rejectedCount = drivers.filter((driver) => driver.approvalStatus === "rejected").length;

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Driver operations"
        title="Keep the live driver network clean and searchable"
        description="Approve real applicants, tune dispatch settings, and avoid hiding active capabilities behind the old stacked forms."
        aside={
          <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Selection model</p>
            <p className="mt-4 text-sm leading-6 text-ops-muted">
              The left column is now a real searchable queue. Every item on the page resolves to a live driver record and editable settings.
            </p>
          </div>
        }
      />

      <MetricStrip>
        <MetricCard label="Pending approval" value={pendingCount} meta="Applicants waiting for review" icon={ShieldCheck} tone="warning" />
        <MetricCard label="Approved drivers" value={approvedCount} meta="Drivers currently allowed into the app" icon={Users} tone="primary" />
        <MetricCard label="Available now" value={availableCount} meta="Live network capacity" icon={ToggleLeft} tone="success" />
        <MetricCard label="Rejected" value={rejectedCount} meta="Accounts held out of dispatch" icon={Users} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[0.44fr_0.56fr]">
        <PanelSection
          title="Driver queue"
          description="Search by name, contact, or vehicle and open the live settings panel on the right."
          contentClassName="space-y-4"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, vehicle, or plate"
              className="pl-11"
            />
          </div>

          <EntityList className="max-h-[74vh] overflow-y-auto pr-1">
            {filteredDrivers.length ? (
              filteredDrivers.map((driver) => (
                <EntityListItem
                  key={driver.id}
                  active={driver.id === selectedDriver?.id}
                  onClick={() => setSelectedDriverId(driver.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-ops-text">{driver.name}</p>
                        <Badge>{driver.approvalStatus}</Badge>
                        {driver.available ? <Badge className="text-ops-success">available</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-ops-muted">
                        {driver.vehicle?.makeModel ?? "No vehicle"} · {driver.vehicle?.plate ?? "No plate"}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                        {driver.homeCity && driver.homeState ? `${driver.homeCity}, ${driver.homeState}` : "No market set"}
                      </p>
                    </div>
                  </div>
                </EntityListItem>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No drivers match this search.
              </div>
            )}
          </EntityList>
        </PanelSection>

        <PanelSection
          title={selectedDriver ? "Driver detail" : "Driver detail"}
          description={selectedDriver ? "Edit real dispatch and pricing settings without leaving the queue." : "Select a driver from the queue to open their live settings."}
        >
          {selectedDriver ? (
            <DriverEditorPanel driver={selectedDriver} />
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-ops-border p-8 text-sm text-ops-muted">
              No driver selected.
            </div>
          )}
        </PanelSection>
      </div>
    </div>
  );
}
