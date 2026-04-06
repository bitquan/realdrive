import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import type { MarketRegion, CreateMarketRegionInput, UpdateMarketRegionInput } from "@shared/contracts";
import { PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

// ── Region form ────────────────────────────────────────────────────────────────

interface RegionFormValues {
  marketKey: string;
  displayName: string;
  timezone: string;
  serviceStates: string;
  dispatchWeightMultiplier: string;
  active: boolean;
}

const EMPTY_FORM: RegionFormValues = {
  marketKey: "",
  displayName: "",
  timezone: "America/New_York",
  serviceStates: "",
  dispatchWeightMultiplier: "1.0",
  active: true
};

const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

function parseServiceStates(value: string) {
  return value
    .split(",")
    .map((state) => state.trim().toUpperCase())
    .filter((state) => state.length === 2 && US_STATE_CODES.includes(state as (typeof US_STATE_CODES)[number]));
}

function regionToForm(r: MarketRegion): RegionFormValues {
  return {
    marketKey: r.marketKey,
    displayName: r.displayName,
    timezone: r.timezone,
    serviceStates: r.serviceStates.join(", "),
    dispatchWeightMultiplier: String(r.dispatchWeightMultiplier),
    active: r.active
  };
}

function validateForm(f: RegionFormValues): string | null {
  if (!f.marketKey.trim()) return "Market key is required.";
  if (!/^[a-z0-9_]+$/.test(f.marketKey.trim())) return "Market key must be lowercase letters, numbers, or underscores.";
  if (!f.displayName.trim()) return "Display name is required.";
  if (!f.timezone.trim()) return "Timezone is required.";
  const mult = parseFloat(f.dispatchWeightMultiplier);
  if (isNaN(mult) || mult <= 0) return "Dispatch weight multiplier must be a positive number.";
  return null;
}

function formToCreate(f: RegionFormValues): CreateMarketRegionInput {
  return {
    marketKey: f.marketKey.trim(),
    displayName: f.displayName.trim(),
    timezone: f.timezone.trim(),
    serviceStates: f.serviceStates.split(",").map((s) => s.trim()).filter(Boolean),
    dispatchWeightMultiplier: parseFloat(f.dispatchWeightMultiplier)
  };
}

function formToUpdate(f: RegionFormValues): UpdateMarketRegionInput {
  return {
    displayName: f.displayName.trim(),
    timezone: f.timezone.trim(),
    serviceStates: f.serviceStates.split(",").map((s) => s.trim()).filter(Boolean),
    dispatchWeightMultiplier: parseFloat(f.dispatchWeightMultiplier),
    active: f.active
  };
}

// ── Form dialog ────────────────────────────────────────────────────────────────

function RegionDialog({
  existing,
  onClose
}: {
  existing?: MarketRegion;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const isEdit = Boolean(existing);
  const [form, setForm] = useState<RegionFormValues>(existing ? regionToForm(existing) : EMPTY_FORM);
  const [err, setErr] = useState<string | null>(null);
  const selectedStateSet = new Set(parseServiceStates(form.serviceStates));

  function field(key: keyof RegionFormValues) {
    return {
      value: form[key] as string,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))
    };
  }

  function toggleServiceState(stateCode: string) {
    const next = new Set(selectedStateSet);
    if (next.has(stateCode)) {
      next.delete(stateCode);
    } else {
      next.add(stateCode);
    }
    setForm((current) => ({
      ...current,
      serviceStates: Array.from(next).sort().join(", ")
    }));
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const validation = validateForm(form);
      if (validation) { setErr(validation); throw new Error(validation); }
      if (isEdit && existing) {
        return api.updateMarketRegion(existing.id, formToUpdate(form), token!);
      }
      return api.createMarketRegion(formToCreate(form), token!).then((created) => {
        if (!form.active) {
          return api.updateMarketRegion(created.id, { active: false }, token!);
        }

        return created;
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-regions"] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message || "Save failed. Try again.")
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-ops-surface border border-ops-border rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-5 m-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-ops-overlay flex items-center justify-center">
            <Globe className="h-4 w-4 text-ops-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold">{isEdit ? "Edit region" : "New region"}</p>
            <p className="text-xs text-ops-muted">{isEdit ? existing!.marketKey : "Configure a new market"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs text-ops-muted uppercase tracking-widest">Market key</label>
            <input
              {...field("marketKey")}
              disabled={isEdit}
              className="w-full bg-ops-overlay border border-ops-border rounded-lg px-3 py-2 text-sm font-mono placeholder:text-ops-muted focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              placeholder="nashville"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs text-ops-muted uppercase tracking-widest">Display name</label>
            <input
              {...field("displayName")}
              className="w-full bg-ops-overlay border border-ops-border rounded-lg px-3 py-2 text-sm placeholder:text-ops-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nashville"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs text-ops-muted uppercase tracking-widest">Timezone</label>
            <input
              {...field("timezone")}
              className="w-full bg-ops-overlay border border-ops-border rounded-lg px-3 py-2 text-sm font-mono placeholder:text-ops-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="America/Chicago"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs text-ops-muted uppercase tracking-widest">Dispatch weight</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              {...field("dispatchWeightMultiplier")}
              className="w-full bg-ops-overlay border border-ops-border rounded-lg px-3 py-2 text-sm font-mono placeholder:text-ops-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="1.0"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-xs text-ops-muted uppercase tracking-widest">Service states (comma-separated)</label>
            <input
              {...field("serviceStates")}
              className="w-full bg-ops-overlay border border-ops-border rounded-lg px-3 py-2 text-sm font-mono placeholder:text-ops-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="TN"
            />
          </div>
          <div className="col-span-2 rounded-lg border border-ops-border bg-ops-overlay/65 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-ops-muted uppercase tracking-widest">Service-area map editor</p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setForm((current) => ({ ...current, serviceStates: "" }))}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setForm((current) => ({ ...current, serviceStates: US_STATE_CODES.join(", ") }))}
                >
                  All states
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
              {US_STATE_CODES.map((stateCode) => {
                const selected = selectedStateSet.has(stateCode);
                return (
                  <button
                    key={stateCode}
                    type="button"
                    onClick={() => toggleServiceState(stateCode)}
                    className={cn(
                      "h-8 rounded-md border text-[11px] font-semibold transition",
                      selected
                        ? "border-ops-primary/40 bg-ops-primary/16 text-ops-text"
                        : "border-ops-border text-ops-muted hover:border-ops-primary/28 hover:text-ops-text"
                    )}
                  >
                    {stateCode}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <button
              type="button"
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                form.active ? "bg-blue-500" : "bg-ops-overlay border border-ops-border"
              )}
              onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
            >
              <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm", form.active ? "translate-x-4" : "translate-x-0.5")} />
            </button>
            <span className="text-sm">{form.active ? "Active" : "Inactive"}</span>
          </div>
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? "Saving…" : isEdit ? "Save changes" : "Create region"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Region row ─────────────────────────────────────────────────────────────────

function RegionRow({ region }: { region: MarketRegion }) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => api.deleteMarketRegion(token!, region.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-regions"] })
  });

  const toggleMut = useMutation({
    mutationFn: () => api.updateMarketRegion(region.id, { active: !region.active }, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-regions"] })
  });

  return (
    <>
      {editing && <RegionDialog existing={region} onClose={() => setEditing(false)} />}
      <div className="flex items-start gap-4 py-4 border-b border-ops-border-soft last:border-0">
        <div className="h-9 w-9 rounded-full bg-ops-overlay flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-ops-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold">{region.displayName}</span>
            <code className="text-[10px] font-mono text-ops-muted bg-ops-overlay px-1.5 py-0.5 rounded">{region.marketKey}</code>
            {region.active ? (
              <Badge className="border-green-500/20 bg-green-500/15 text-[10px] text-green-400">Active</Badge>
            ) : (
              <Badge className="text-[10px]">Inactive</Badge>
            )}
          </div>
          <p className="text-xs text-ops-muted">
            {region.timezone}
            {region.serviceStates.length > 0 && ` · ${region.serviceStates.join(", ")}`}
            {` · Dispatch weight ×${region.dispatchWeightMultiplier}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            disabled={toggleMut.isPending}
            onClick={() => toggleMut.mutate()}
            title={region.active ? "Deactivate" : "Activate"}
            className="text-xs"
          >
            {region.active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="ghost" onClick={() => setEditing(true)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {confirming ? (
            <div className="flex items-center gap-1">
              <Button className="bg-red-500/90 text-white hover:bg-red-500" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate()}>
                Delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming(true)} title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function AdminRegionsPage() {
  const { token } = useAuth();
  const [creating, setCreating] = useState(false);

  const regionsQuery = useQuery({
    queryKey: ["admin-regions"],
    queryFn: () => api.listMarketRegions(token!),
    enabled: Boolean(token)
  });

  const regions = regionsQuery.data?.regions ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {creating && <RegionDialog onClose={() => setCreating(false)} />}

      <SurfaceHeader
        eyebrow="Admin — Infrastructure"
        title="Market Regions"
        description="Configure each city or market with its timezone, service states, and dispatch weighting."
        aside={
          <div className="flex justify-end">
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New region
            </Button>
          </div>
        }
      />

      <PanelSection title={`Regions (${regions.length})`}>
        {regionsQuery.isLoading && <p className="text-sm text-ops-muted animate-pulse py-4">Loading…</p>}
        {!regionsQuery.isLoading && regions.length === 0 && (
          <p className="text-sm text-ops-muted py-6 text-center">No regions configured yet.</p>
        )}
        {regions.map((r) => <RegionRow key={r.id} region={r} />)}
      </PanelSection>
    </div>
  );
}

export default AdminRegionsPage;
