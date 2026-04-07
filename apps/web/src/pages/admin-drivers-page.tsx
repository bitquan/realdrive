import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DriverAccount, DriverDocumentStatus } from "@shared/contracts";
import { Download, FileBadge2, Search, ShieldAlert, ShieldCheck, ToggleLeft, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
import {
  formatDriverDocumentFileSize,
  formatDriverDocumentLabel
} from "@/lib/driver-documents";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { getDriverReviewQueueMeta } from "./admin-ops.utils";

type ReviewFilter = "all" | "ready" | "missing_docs" | "pending_review" | "approved" | "rejected";

function documentStatusBadgeClass(status: DriverDocumentStatus) {
  if (status === "approved") {
    return "border-ops-success/30 bg-ops-success/12 text-ops-success";
  }

  if (status === "rejected") {
    return "border-ops-error/30 bg-ops-error/12 text-ops-error";
  }

  return "border-ops-warning/30 bg-ops-warning/12 text-ops-warning";
}

function DriverEditorPanel({ driver }: { driver: DriverAccount }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [bgCheckExternalId, setBgCheckExternalId] = useState(driver.bgCheckExternalId ?? "");
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
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>(
    Object.fromEntries(driver.documents.map((document) => [document.id, document.reviewNote ?? ""]))
  );
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [bgCheckError, setBgCheckError] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);

  useEffect(() => {
    setBgCheckExternalId(driver.bgCheckExternalId ?? "");
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
    setDocumentNotes(Object.fromEntries(driver.documents.map((document) => [document.id, document.reviewNote ?? ""])));
    setDocumentError(null);
    setBgCheckError(null);
    setDownloadingDocumentId(null);
  }, [driver]);

  const invalidateDrivers = () => void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });

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
    onSuccess: invalidateDrivers
  });

  const approvalMutation = useMutation({
    mutationFn: (approvalStatus: "approved" | "rejected" | "pending") =>
      api.updateDriverApproval(driver.id, { approvalStatus }, token!),
    onSuccess: invalidateDrivers
  });

  const availabilityMutation = useMutation({
    mutationFn: () => api.updateDriver(driver.id, { available: !driver.available }, token!),
    onSuccess: invalidateDrivers
  });

  const reviewDocumentMutation = useMutation({
    mutationFn: ({ documentId, status }: { documentId: string; status: DriverDocumentStatus }) =>
      api.reviewDriverDocument(
        driver.id,
        documentId,
        {
          status,
          reviewNote: documentNotes[documentId]?.trim() ? documentNotes[documentId].trim() : null
        },
        token!
      ),
    onSuccess: () => {
      setDocumentError(null);
      invalidateDrivers();
    },
    onError: (error) => {
      setDocumentError(error instanceof Error ? error.message : "Unable to review that document");
    }
  });

  const bgCheckMutation = useMutation({
    mutationFn: () => api.orderDriverBgCheck(driver.id, { externalId: bgCheckExternalId.trim() || undefined }, token!),
    onSuccess: () => {
      setBgCheckError(null);
      invalidateDrivers();
    },
    onError: (error) => {
      setBgCheckError(error instanceof Error ? error.message : "Unable to order background check");
    }
  });

  const canApproveDriver = driver.documentReview.readyForApproval;

  async function openDocument(documentId: string) {
    try {
      setDownloadingDocumentId(documentId);
      setDocumentError(null);
      const blob = await api.downloadDriverDocument(driver.id, documentId, token!);
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Unable to open that document");
    } finally {
      setDownloadingDocumentId(null);
    }
  }

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
            <p className="mt-2 text-sm text-ops-muted">
              {driver.email ?? "No email"} · {driver.phone ?? "No phone"}
            </p>
            <p className="mt-1 text-sm text-ops-muted">
              {driver.vehicle?.makeModel ?? "No vehicle"} · {driver.vehicle?.plate ?? "No plate"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!canApproveDriver || approvalMutation.isPending}
              onClick={() => approvalMutation.mutate("approved")}
            >
              Approve
            </Button>
            {driver.approvalStatus !== "rejected" ? (
              <Button variant="ghost" disabled={approvalMutation.isPending} onClick={() => approvalMutation.mutate("rejected")}>
                Reject
              </Button>
            ) : null}
            <Button variant="outline" disabled={availabilityMutation.isPending} onClick={() => availabilityMutation.mutate()}>
              Toggle availability
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <DataField
            label="Home market"
            value={driver.homeCity && driver.homeState ? `${driver.homeCity}, ${driver.homeState}` : "Not set"}
          />
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
          <DataField
            label="Documents"
            value={`${driver.documentReview.approvedTypes.length}/${driver.documentReview.requiredTypes.length} approved`}
            subtle={
              driver.documentReview.readyForApproval
                ? "Document packet is ready for final approval"
                : driver.documentReview.missingTypes.length
                  ? `Missing: ${driver.documentReview.missingTypes.map(formatDriverDocumentLabel).join(", ")}`
                  : `${driver.documentReview.pendingCount} still pending review`
            }
          />
          <DataField
            label="Created"
            value={driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : "Existing driver"}
          />
          <DataField
            label="Background check"
            value={driver.bgCheckOrderedAt ? formatDateTime(driver.bgCheckOrderedAt) : "Not ordered"}
            subtle={driver.bgCheckExternalId ? `Reference: ${driver.bgCheckExternalId}` : "No external reference saved"}
          />
        </div>

        {!canApproveDriver ? (
          <div className="mt-5 rounded-[1.35rem] border border-ops-warning/30 bg-ops-warning/10 p-4 text-sm text-ops-warning">
            Admin approval stays locked until insurance, registration, background check, and MVR are all approved.
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.8rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-[-0.02em] text-ops-text">Background check workflow</p>
            <p className="mt-1 text-sm text-ops-muted">
              Save the vendor reference used for manual or external screening and keep the onboarding queue current.
            </p>
            <p className="mt-2 text-xs text-ops-muted">
              {driver.bgCheckOrderedAt ? `Last ordered ${formatDateTime(driver.bgCheckOrderedAt)}` : "No background check has been ordered yet."}
            </p>
          </div>

          <div className="w-full max-w-xl space-y-2">
            <Label htmlFor={`bg-check-${driver.id}`}>External reference ID</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`bg-check-${driver.id}`}
                value={bgCheckExternalId}
                onChange={(event) => setBgCheckExternalId(event.target.value)}
                placeholder="optional vendor order id"
                className="font-mono"
              />
              <Button disabled={bgCheckMutation.isPending} onClick={() => bgCheckMutation.mutate()}>
                {bgCheckMutation.isPending ? "Saving…" : driver.bgCheckOrderedAt ? "Re-order" : "Order background check"}
              </Button>
            </div>
            {bgCheckError ? <p className="text-xs text-ops-error">{bgCheckError}</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-[1.8rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tracking-[-0.02em] text-ops-text">Document review</p>
            <p className="mt-1 text-sm text-ops-muted">
              Review the uploaded compliance packet before sending this driver into the live dispatch app.
            </p>
          </div>
          <div className="rounded-[1.1rem] border border-ops-border-soft/90 bg-ops-panel/60 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Ready state</p>
            <p className="mt-1 font-semibold text-ops-text">
              {driver.documentReview.readyForApproval ? "Ready for approval" : "Still blocked"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {driver.documents.map((document) => (
            <div key={document.id} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/46 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-2xl border border-ops-border-soft bg-ops-surface/88 p-2.5 text-ops-primary">
                      <FileBadge2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-ops-text">{formatDriverDocumentLabel(document.type)}</p>
                      <p className="mt-1 text-sm text-ops-muted">
                        {document.fileName} · {formatDriverDocumentFileSize(document.fileSizeBytes)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${documentStatusBadgeClass(document.status)}`}
                    >
                      {document.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <DataField label="Uploaded" value={formatDateTime(document.uploadedAt)} />
                    <DataField
                      label="Last review"
                      value={document.reviewedAt ? formatDateTime(document.reviewedAt) : "Not reviewed yet"}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`document-note-${document.id}`}>Review note</Label>
                    <textarea
                      id={`document-note-${document.id}`}
                      value={documentNotes[document.id] ?? ""}
                      onChange={(event) =>
                        setDocumentNotes((current) => ({
                          ...current,
                          [document.id]: event.target.value
                        }))
                      }
                      rows={3}
                      className="w-full rounded-[1.15rem] border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 py-3 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
                      placeholder="Optional note for approval, rejection, or follow-up"
                    />
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 lg:w-[220px]">
                  <Button
                    variant="outline"
                    disabled={downloadingDocumentId === document.id}
                    onClick={() => void openDocument(document.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Open file
                  </Button>
                  <Button
                    disabled={reviewDocumentMutation.isPending}
                    onClick={() => reviewDocumentMutation.mutate({ documentId: document.id, status: "approved" })}
                  >
                    Approve document
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={reviewDocumentMutation.isPending}
                    onClick={() => reviewDocumentMutation.mutate({ documentId: document.id, status: "rejected" })}
                  >
                    Reject document
                  </Button>
                  <Button
                    variant="outline"
                    disabled={reviewDocumentMutation.isPending}
                    onClick={() => reviewDocumentMutation.mutate({ documentId: document.id, status: "pending" })}
                  >
                    Reset to pending
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {documentError ? <p className="mt-4 text-sm text-ops-error">{documentError}</p> : null}
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
      {approvalMutation.error ? <p className="text-sm text-ops-error">{approvalMutation.error.message}</p> : null}
      {availabilityMutation.error ? <p className="text-sm text-ops-error">{availabilityMutation.error.message}</p> : null}
      <div className="flex flex-wrap gap-2.5">
        <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
          Save driver settings
        </Button>
      </div>
    </div>
  );
}

export function AdminDriversPage() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const driversQuery = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: () => api.listDrivers(token!)
  });
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"owned" | "all">("owned");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [selectedDriverId, setSelectedDriverId] = useState(() => searchParams.get("driverId") ?? "");

  const drivers = driversQuery.data ?? [];
  const requestedDriverId = searchParams.get("driverId");

  useEffect(() => {
    if (!requestedDriverId) {
      return;
    }

    const requestedDriver = drivers.find((driver) => driver.id === requestedDriverId);
    if (!requestedDriver) {
      return;
    }

    if (scope === "owned" && requestedDriver.collectorAdminId !== user?.id) {
      setScope("all");
    }
  }, [drivers, requestedDriverId, scope, user?.id]);

  const filteredDrivers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return drivers.filter((driver) => {
      if (scope === "owned" && driver.collectorAdminId !== user?.id) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [driver.name, driver.email ?? "", driver.phone ?? "", driver.vehicle?.makeModel ?? "", driver.vehicle?.plate ?? "", driver.collectorAdmin?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [drivers, scope, search, user?.id]);

  const reviewFilteredDrivers = useMemo(() => {
    const next = filteredDrivers.filter((driver) => {
      const meta = getDriverReviewQueueMeta(driver);
      return reviewFilter === "all" ? true : meta.stage === reviewFilter;
    });

    return next.sort((left, right) => {
      const leftMeta = getDriverReviewQueueMeta(left);
      const rightMeta = getDriverReviewQueueMeta(right);
      if (leftMeta.priority !== rightMeta.priority) {
        return leftMeta.priority - rightMeta.priority;
      }

      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    });
  }, [filteredDrivers, reviewFilter]);

  useEffect(() => {
    if (requestedDriverId && reviewFilteredDrivers.some((driver) => driver.id === requestedDriverId) && requestedDriverId !== selectedDriverId) {
      setSelectedDriverId(requestedDriverId);
      return;
    }

    if (!reviewFilteredDrivers.length) {
      setSelectedDriverId("");
      return;
    }

    const stillExists = reviewFilteredDrivers.some((driver) => driver.id === selectedDriverId);
    if (!selectedDriverId || !stillExists) {
      setSelectedDriverId(reviewFilteredDrivers[0].id);
    }
  }, [reviewFilteredDrivers, selectedDriverId, requestedDriverId]);

  const selectedDriver = reviewFilteredDrivers.find((driver) => driver.id === selectedDriverId) ?? reviewFilteredDrivers[0] ?? null;
  const pendingCount = drivers.filter((driver) => driver.approvalStatus === "pending").length;
  const approvedCount = drivers.filter((driver) => driver.approvalStatus === "approved").length;
  const availableCount = drivers.filter((driver) => driver.available).length;
  const documentReadyCount = drivers.filter((driver) => driver.documentReview.readyForApproval).length;
  const missingDocsCount = drivers.filter((driver) => getDriverReviewQueueMeta(driver).stage === "missing_docs").length;

  return (
    <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:space-y-6 md:pb-0">
      <SurfaceHeader
        eyebrow="Driver operations"
        title="Keep the live driver network clean and reviewable"
        description="Approve real applicants, review the required compliance packet, and keep dispatch settings tied to the live driver record."
        aside={
          <div className="rounded-[1.35rem] border border-ops-border-soft bg-ops-panel/55 p-4 md:rounded-[1.7rem] md:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Selection model</p>
            <p className="mt-3 text-sm leading-6 text-ops-muted md:mt-4">
              The left column defaults to drivers owned by you. Switch to all drivers when you need full oversight across
              both collector admins.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 md:mt-4">
              <Button variant={scope === "owned" ? "default" : "outline"} onClick={() => setScope("owned")}>
                Owned by me
              </Button>
              <Button variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>
                All drivers
              </Button>
            </div>
          </div>
        }
      />

      <MetricStrip>
        <MetricCard label="Pending approval" value={pendingCount} meta="Applicants waiting for final admin approval" icon={ShieldAlert} tone="warning" />
        <MetricCard label="Docs ready" value={documentReadyCount} meta="Packets cleared for approval" icon={ShieldCheck} tone="primary" />
        <MetricCard label="Missing docs" value={missingDocsCount} meta="Packets blocked by missing uploads" icon={Download} tone="warning" />
        <MetricCard label="Approved drivers" value={approvedCount} meta="Drivers currently allowed into the app" icon={Users} tone="success" />
        <MetricCard label="Available now" value={availableCount} meta="Live network capacity" icon={ToggleLeft} tone="success" />
      </MetricStrip>

      <div className="grid gap-4 xl:grid-cols-[0.44fr_0.56fr] xl:gap-6">
        <PanelSection
          title="Driver queue"
          description="Search by name, contact, or vehicle and open the live review panel on the right."
          contentClassName="space-y-3.5 md:space-y-4"
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

          <div className="flex flex-wrap gap-2">
            {[
              ["all", `All (${filteredDrivers.length})`],
              ["ready", `Ready (${documentReadyCount})`],
              ["missing_docs", `Missing docs (${missingDocsCount})`],
              ["pending_review", "In review"],
              ["approved", `Approved (${approvedCount})`],
              ["rejected", "Rejected"]
            ].map(([value, label]) => (
              <Button key={value} variant={reviewFilter === value ? "default" : "outline"} onClick={() => setReviewFilter(value as ReviewFilter)}>
                {label}
              </Button>
            ))}
          </div>

          <EntityList className="max-h-[74vh] overflow-y-auto pr-1">
            {reviewFilteredDrivers.length ? (
              reviewFilteredDrivers.map((driver) => {
                const reviewMeta = getDriverReviewQueueMeta(driver);

                return (
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
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                        Owner: {driver.collectorAdmin?.name ?? "Unassigned"}
                      </p>
                      <p className="mt-2 text-sm font-medium text-ops-text">{reviewMeta.label}</p>
                      <p className="mt-1 text-sm text-ops-muted">{reviewMeta.summary}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                        {driver.documentReview.approvedTypes.length}/{driver.documentReview.requiredTypes.length} docs approved · {reviewMeta.detail}
                      </p>
                    </div>
                  </div>
                </EntityListItem>
                );
              })
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No drivers match this review filter.
              </div>
            )}
          </EntityList>
        </PanelSection>

        <PanelSection
          title="Driver detail"
          description={
            selectedDriver
              ? "Review required documents, approve the application, and edit live dispatch settings without leaving the queue."
              : "Select a driver from the queue to open their live settings."
          }
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
