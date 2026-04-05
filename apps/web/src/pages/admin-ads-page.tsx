import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdSubmission, AdSubmissionStatus, DriverAccount } from "@shared/contracts";
import { CreditCard, Megaphone, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { MetricCard, MetricStrip, SurfaceHeader } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function AdEditor({
  submission,
  drivers,
  token
}: {
  submission: AdSubmission;
  drivers: DriverAccount[];
  token: string;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AdSubmissionStatus>(submission.status);
  const [assignedDriverId, setAssignedDriverId] = useState(submission.assignedDriverId ?? "");
  const [slotRank, setSlotRank] = useState(String(submission.slotRank));
  const [displaySeconds, setDisplaySeconds] = useState(String(submission.displaySeconds));
  const [driverCreditPerScan, setDriverCreditPerScan] = useState(String(submission.driverCreditPerScan));
  const [paymentNote, setPaymentNote] = useState(submission.paymentNote ?? "");
  const [adminNote, setAdminNote] = useState(submission.adminNote ?? "");

  useEffect(() => {
    setStatus(submission.status);
    setAssignedDriverId(submission.assignedDriverId ?? "");
    setSlotRank(String(submission.slotRank));
    setDisplaySeconds(String(submission.displaySeconds));
    setDriverCreditPerScan(String(submission.driverCreditPerScan));
    setPaymentNote(submission.paymentNote ?? "");
    setAdminNote(submission.adminNote ?? "");
  }, [submission]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateAdminAd(
        submission.id,
        {
          status,
          assignedDriverId: assignedDriverId || null,
          slotRank: Number(slotRank),
          displaySeconds: Number(displaySeconds),
          driverCreditPerScan: Number(driverCreditPerScan),
          paymentNote: paymentNote || null,
          adminNote: adminNote || null
        },
        token
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-ads"] })
  });

  return (
    <div className="rounded-[1.6rem] border border-ops-border-soft bg-ops-surface/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-semibold text-ops-text">{submission.businessName}</p>
            <Badge>{submission.status}</Badge>
            <Badge>{submission.requestedDays} day run</Badge>
          </div>
          <p className="mt-2 text-sm text-ops-muted">{submission.contactName} · {submission.email}{submission.phone ? ` · ${submission.phone}` : ""}</p>
          <p className="mt-2 text-sm text-ops-text">{submission.headline}</p>
          <p className="mt-2 text-sm text-ops-muted">{submission.body}</p>
        </div>
        <div className="text-left xl:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Total</p>
          <p className="mt-2 text-2xl font-bold text-ops-text">{formatMoney(submission.totalPrice)}</p>
          <p className="mt-1 text-sm text-ops-muted">{submission.metrics.scanCount} scans · {formatMoney(submission.metrics.pendingCreditTotal)} pending credits</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <select className="h-11 w-full rounded-2xl border border-ops-border bg-ops-panel px-4 text-sm text-ops-text" value={status} onChange={(event) => setStatus(event.target.value as AdSubmissionStatus)}>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="payment_pending">Payment pending</option>
            <option value="paid">Paid</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Assigned driver</Label>
          <select className="h-11 w-full rounded-2xl border border-ops-border bg-ops-panel px-4 text-sm text-ops-text" value={assignedDriverId} onChange={(event) => setAssignedDriverId(event.target.value)}>
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Slot rank</Label>
          <Input value={slotRank} onChange={(event) => setSlotRank(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Display seconds</Label>
          <Input value={displaySeconds} onChange={(event) => setDisplaySeconds(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Driver credit per scan</Label>
          <Input value={driverCreditPerScan} onChange={(event) => setDriverCreditPerScan(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Payment note</Label>
          <Input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Apple Pay or Cash App confirmation note" />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Admin note</Label>
          <Input value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Approval, quality, or publishing notes" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
        <img src={submission.imageDataUrl} alt={submission.headline} className="h-40 w-full rounded-[1.2rem] object-cover" />
        <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-panel/40 p-4 text-sm text-ops-muted">
          <p>Assigned: {submission.assignedDriver?.name ?? "Not assigned"}</p>
          <p className="mt-1">Published: {submission.publishedAt ?? "Not live yet"}</p>
          <p className="mt-1">Target URL: {submission.targetUrl}</p>
          <p className="mt-1">Redirect token: {submission.redirectToken}</p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
          Save ad
        </Button>
      </div>
      {updateMutation.error ? <p className="mt-3 text-sm text-ops-error">{updateMutation.error.message}</p> : null}
    </div>
  );
}

export function AdminAdsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const adsQuery = useQuery({
    queryKey: ["admin-ads"],
    queryFn: () => api.listAdminAds(token!),
    enabled: Boolean(token)
  });
  const driversQuery = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: () => api.listDrivers(token!),
    enabled: Boolean(token)
  });
  const duesQuery = useQuery({
    queryKey: ["admin-dues"],
    queryFn: () => api.listAdminDues(token!),
    enabled: Boolean(token)
  });
  const [pricingForm, setPricingForm] = useState({
    baseDailyPrice: "10",
    defaultDriverCreditPerScan: "0.25",
    slotOneMultiplier: "1.5",
    slotTwoMultiplier: "1",
    slotThreeMultiplier: "0.85",
    dedupeWindowMinutes: "30"
  });
  const [creditBatchSelections, setCreditBatchSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!adsQuery.data?.pricingSettings) {
      return;
    }

    setPricingForm({
      baseDailyPrice: String(adsQuery.data.pricingSettings.baseDailyPrice),
      defaultDriverCreditPerScan: String(adsQuery.data.pricingSettings.defaultDriverCreditPerScan),
      slotOneMultiplier: String(adsQuery.data.pricingSettings.slotMultipliers.find((entry) => entry.slotRank === 1)?.multiplier ?? 1.5),
      slotTwoMultiplier: String(adsQuery.data.pricingSettings.slotMultipliers.find((entry) => entry.slotRank === 2)?.multiplier ?? 1),
      slotThreeMultiplier: String(adsQuery.data.pricingSettings.slotMultipliers.find((entry) => entry.slotRank === 3)?.multiplier ?? 0.85),
      dedupeWindowMinutes: String(adsQuery.data.pricingSettings.dedupeWindowMinutes)
    });
  }, [adsQuery.data?.pricingSettings]);

  useEffect(() => {
    const nextSelections = Object.fromEntries(
      (adsQuery.data?.driverCredits ?? []).map((driver) => {
        const firstBatchId = (duesQuery.data?.openBatches ?? []).find((batch) => batch.driverId === driver.driver.id)?.id ?? "";
        return [driver.driver.id, creditBatchSelections[driver.driver.id] ?? firstBatchId];
      })
    ) as Record<string, string>;

    setCreditBatchSelections((current) => ({ ...nextSelections, ...current }));
  }, [adsQuery.data?.driverCredits, duesQuery.data?.openBatches]);

  const pricingMutation = useMutation({
    mutationFn: () =>
      api.updateAdminAdPricing(
        {
          baseDailyPrice: Number(pricingForm.baseDailyPrice),
          defaultDriverCreditPerScan: Number(pricingForm.defaultDriverCreditPerScan),
          slotMultipliers: [
            { slotRank: 1, multiplier: Number(pricingForm.slotOneMultiplier) },
            { slotRank: 2, multiplier: Number(pricingForm.slotTwoMultiplier) },
            { slotRank: 3, multiplier: Number(pricingForm.slotThreeMultiplier) }
          ],
          dedupeWindowMinutes: Number(pricingForm.dedupeWindowMinutes)
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-ads"] })
  });

  const applyCreditMutation = useMutation({
    mutationFn: ({ driverId, batchId }: { driverId: string; batchId: string }) =>
      api.applyDriverAdCredits(driverId, { note: "Applied manually against a selected due batch.", platformDueBatchId: batchId }, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-ad-program"] });
    }
  });

  const openBatchesByDriverId = useMemo(() => {
    const grouped = new Map<string, Array<{ id: string; referenceCode: string; netAmountDue: number }>>();
    for (const batch of duesQuery.data?.openBatches ?? []) {
      const current = grouped.get(batch.driverId) ?? [];
      current.push({ id: batch.id, referenceCode: batch.referenceCode, netAmountDue: batch.netAmountDue });
      grouped.set(batch.driverId, current);
    }

    return grouped;
  }, [duesQuery.data?.openBatches]);

  const metrics = useMemo(() => {
    const submissions = adsQuery.data?.submissions ?? [];
    return {
      submitted: submissions.filter((submission) => submission.status === "submitted").length,
      awaitingPayment: submissions.filter((submission) => submission.status === "payment_pending" || submission.status === "approved").length,
      live: submissions.filter((submission) => submission.status === "published").length,
      pendingCredits: (adsQuery.data?.driverCredits ?? []).reduce((sum, driver) => sum + driver.pendingTotal, 0)
    };
  }, [adsQuery.data]);

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Admin"
        title="Ad operations"
        description="Review submissions, confirm manual payment, publish driver-assigned ads, and keep a dues-offset audit trail from QR scans."
        aside={
          <Link to="/admin/ads/analytics">
            <Button variant="outline">Open ad analytics</Button>
          </Link>
        }
      />

      <MetricStrip>
        <MetricCard label="New submissions" value={metrics.submitted} meta="Open review queue" icon={Megaphone} />
        <MetricCard label="Awaiting payment" value={metrics.awaitingPayment} meta="Approved but not live" icon={CreditCard} tone="warning" />
        <MetricCard label="Published" value={metrics.live} meta="Active driver screen ads" icon={QrCode} tone="primary" />
        <MetricCard label="Pending driver credit" value={formatMoney(metrics.pendingCredits)} meta="Manual dues offset available" icon={CreditCard} tone="success" />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
        <Card>
          <CardHeader>
            <CardTitle>Driver credit summary</CardTitle>
            <CardDescription>Apply tracked QR credit manually when you want to offset dues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.45rem] border border-ops-border-soft bg-ops-panel/45 p-4">
              <p className="font-semibold text-ops-text">Pricing and scan rules</p>
              <div className="mt-4 grid gap-4">
                <div className="space-y-2">
                  <Label>Base daily price</Label>
                  <Input value={pricingForm.baseDailyPrice} onChange={(event) => setPricingForm((current) => ({ ...current, baseDailyPrice: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Default driver credit per scan</Label>
                  <Input value={pricingForm.defaultDriverCreditPerScan} onChange={(event) => setPricingForm((current) => ({ ...current, defaultDriverCreditPerScan: event.target.value }))} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Slot 1 multiplier</Label>
                    <Input value={pricingForm.slotOneMultiplier} onChange={(event) => setPricingForm((current) => ({ ...current, slotOneMultiplier: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slot 2 multiplier</Label>
                    <Input value={pricingForm.slotTwoMultiplier} onChange={(event) => setPricingForm((current) => ({ ...current, slotTwoMultiplier: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slot 3 multiplier</Label>
                    <Input value={pricingForm.slotThreeMultiplier} onChange={(event) => setPricingForm((current) => ({ ...current, slotThreeMultiplier: event.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duplicate-scan protection window (minutes)</Label>
                  <Input value={pricingForm.dedupeWindowMinutes} onChange={(event) => setPricingForm((current) => ({ ...current, dedupeWindowMinutes: event.target.value }))} />
                </div>
                <div>
                  <Button disabled={pricingMutation.isPending} onClick={() => pricingMutation.mutate()}>
                    Save pricing rules
                  </Button>
                  {pricingMutation.error ? <p className="mt-3 text-sm text-ops-error">{pricingMutation.error.message}</p> : null}
                </div>
              </div>
            </div>

            {(adsQuery.data?.driverCredits ?? []).length ? (
              adsQuery.data?.driverCredits.map((driver) => (
                <div key={driver.driver.id} className="rounded-[1.45rem] border border-ops-border-soft bg-ops-surface/72 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ops-text">{driver.driver.name}</p>
                        <Badge>{driver.optedIn ? "opted in" : "not opted in"}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-ops-muted">{driver.scanCount} scans · {driver.activeAdCount} active ads</p>
                      <p className="mt-1 text-sm text-ops-muted">Pending {formatMoney(driver.pendingTotal)} · Applied {formatMoney(driver.appliedTotal)}</p>
                    </div>
                    <div className="w-full max-w-xs space-y-3">
                      <select
                        className="h-11 w-full rounded-2xl border border-ops-border bg-ops-panel px-4 text-sm text-ops-text"
                        value={creditBatchSelections[driver.driver.id] ?? ""}
                        onChange={(event) => setCreditBatchSelections((current) => ({ ...current, [driver.driver.id]: event.target.value }))}
                      >
                        <option value="">Select open due batch</option>
                        {(openBatchesByDriverId.get(driver.driver.id) ?? []).map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.referenceCode} · {formatMoney(batch.netAmountDue)} due
                          </option>
                        ))}
                      </select>
                      <Button
                        className="w-full"
                        disabled={applyCreditMutation.isPending || driver.pendingTotal <= 0 || !creditBatchSelections[driver.driver.id]}
                        onClick={() => applyCreditMutation.mutate({ driverId: driver.driver.id, batchId: creditBatchSelections[driver.driver.id] })}
                      >
                        Apply credits to batch
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No driver ad credit tracked yet.
              </div>
            )}
            {applyCreditMutation.error ? <p className="text-sm text-ops-error">{applyCreditMutation.error.message}</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(adsQuery.data?.submissions ?? []).map((submission) => (
            <AdEditor key={submission.id} submission={submission} drivers={driversQuery.data ?? []} token={token!} />
          ))}
          {!adsQuery.data?.submissions.length ? (
            <Card>
              <CardContent className="p-6 text-sm text-ops-muted">No ad submissions yet.</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
