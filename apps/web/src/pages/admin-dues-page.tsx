import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DuePaymentMethod,
  DriverDueSnapshot,
  PlatformDueBatch,
  PlatformPayoutSettings
} from "@shared/contracts";
import { AlertTriangle, CreditCard, Landmark, Wallet } from "lucide-react";
import {
  EntityList,
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type ScopeFilter = "owned" | "all";

function collectorMatches(scope: ScopeFilter, currentAdminId: string | undefined, collectorId: string | null | undefined) {
  if (scope === "all") {
    return true;
  }

  return collectorId === currentAdminId;
}

function BatchingRow({
  snapshot,
  adminIds,
  scope,
  token
}: {
  snapshot: DriverDueSnapshot;
  adminIds: Array<{ id: string; name: string }>;
  scope: ScopeFilter;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [collectorAdminId, setCollectorAdminId] = useState<string>(snapshot.collector?.id ?? "");

  useEffect(() => {
    setCollectorAdminId(snapshot.collector?.id ?? "");
  }, [snapshot.collector?.id]);

  const generateMutation = useMutation({
    mutationFn: () => api.generateDueBatch(snapshot.driver.id, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    }
  });

  const transferMutation = useMutation({
    mutationFn: () => api.updateDriverCollector(snapshot.driver.id, collectorAdminId || null, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    }
  });

  const pendingAdCredit = snapshot.adProgram.pendingCreditTotal;
  const appliedAdCredit = snapshot.adProgram.appliedCreditTotal;
  const netReadyNow = Math.max(0, snapshot.collectibleUnbatchedTotal - pendingAdCredit);

  return (
    <div className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ops-text">{snapshot.driver.name}</p>
            {snapshot.collector ? (
              <span className="rounded-full border border-ops-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ops-text">
                {scope === "owned" ? "owned by me" : `owner: ${snapshot.collector.name}`}
              </span>
            ) : (
              <span className="rounded-full border border-ops-warning/30 bg-ops-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ops-warning">
                unassigned
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ops-muted">{snapshot.driver.email ?? snapshot.driver.phone ?? "No contact set"}</p>
          <p className="mt-2 text-sm text-ops-muted">
            {snapshot.collectibleUnbatchedCount} completed-trip dues ready for batching · last completed trip{" "}
            {snapshot.lastCompletedRideAt ? formatDateTime(snapshot.lastCompletedRideAt) : "not available"}
          </p>
          <p className="mt-2 text-sm text-ops-muted">
            Ad program {snapshot.adProgram.optedIn ? "opted in" : "not opted in"} · {snapshot.adProgram.scanCount} scans · {snapshot.adProgram.activeAdCount} active ads
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Ready now</p>
          <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-ops-text">{formatMoney(snapshot.collectibleUnbatchedTotal)}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ops-muted">Net after pending credits {formatMoney(netReadyNow)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.2rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ops-muted">Pending ad credit</p>
          <p className="mt-2 text-xl font-bold text-ops-text">{formatMoney(pendingAdCredit)}</p>
        </div>
        <div className="rounded-[1.2rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ops-muted">Applied ad credit</p>
          <p className="mt-2 text-xl font-bold text-ops-text">{formatMoney(appliedAdCredit)}</p>
        </div>
        <div className="rounded-[1.2rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ops-muted">Available scans</p>
          <p className="mt-2 text-xl font-bold text-ops-text">{snapshot.adProgram.scanCount}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_auto_auto]">
        <div className="space-y-2">
          <Label>Collector owner</Label>
          <select
            className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
            value={collectorAdminId}
            onChange={(event) => setCollectorAdminId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {adminIds.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" disabled={transferMutation.isPending} onClick={() => transferMutation.mutate()}>
            Transfer owner
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            disabled={generateMutation.isPending || snapshot.collectibleUnbatchedCount === 0}
            onClick={() => generateMutation.mutate()}
          >
            Generate dues code
          </Button>
        </div>
      </div>

      {generateMutation.error ? <p className="mt-3 text-sm text-ops-error">{generateMutation.error.message}</p> : null}
      {transferMutation.error ? <p className="mt-3 text-sm text-ops-error">{transferMutation.error.message}</p> : null}
    </div>
  );
}

function BatchEditor({
  batch,
  pendingAdCredit,
  token
}: {
  batch: PlatformDueBatch;
  pendingAdCredit: number;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"open" | "paid" | "waived" | "void">(
    batch.status === "overdue" ? "open" : batch.status === "paid" || batch.status === "waived" || batch.status === "void" ? batch.status : "open"
  );
  const [paymentMethod, setPaymentMethod] = useState<DuePaymentMethod>(batch.paymentMethod ?? "cashapp");
  const [observedTitle, setObservedTitle] = useState(batch.observedTitle ?? "");
  const [observedNote, setObservedNote] = useState(batch.observedNote ?? "");
  const [adminNote, setAdminNote] = useState(batch.adminNote ?? "");

  useEffect(() => {
    setStatus(
      batch.status === "overdue"
        ? "open"
        : batch.status === "paid" || batch.status === "waived" || batch.status === "void"
          ? batch.status
          : "open"
    );
    setPaymentMethod(batch.paymentMethod ?? "cashapp");
    setObservedTitle(batch.observedTitle ?? "");
    setObservedNote(batch.observedNote ?? "");
    setAdminNote(batch.adminNote ?? "");
  }, [batch]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateDueBatch(
        batch.id,
        {
          status,
          paymentMethod: status === "paid" ? paymentMethod : null,
          observedTitle: observedTitle || null,
          observedNote: observedNote || null,
          adminNote: adminNote || null
        },
        token
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    }
  });

  const applyAdCreditsMutation = useMutation({
    mutationFn: () =>
      api.applyDriverAdCredits(
        batch.driverId,
        {
          note: `Applied from dues workflow to ${batch.referenceCode}.`,
          platformDueBatchId: batch.id
        },
        token
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    }
  });

  return (
    <div className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ops-text">{batch.referenceCode}</p>
            <span className="rounded-full border border-ops-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ops-text">
              {batch.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-ops-muted">
            {batch.driver.name} · {batch.collector?.name ?? "No collector assigned"}
          </p>
          <p className="mt-1 text-sm text-ops-muted">
            Generated {formatDateTime(batch.generatedAt)} · due {formatDateTime(batch.dueAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-[-0.03em] text-ops-text">{formatMoney(batch.netAmountDue)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ops-muted">
            Gross {formatMoney(batch.amount)} · ad credit {formatMoney(batch.adCreditAppliedTotal)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-ops-border-soft/90 bg-ops-panel/50 p-4 text-sm text-ops-muted">
        Drivers should put <span className="font-semibold text-ops-text">{batch.referenceCode}</span> in the payment title,
        note, or both. Cash and other offline payments require an admin note before reconciliation.
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4 text-sm text-ops-muted">
        Pending driver ad credit available: <span className="font-semibold text-ops-text">{formatMoney(pendingAdCredit)}</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
            value={status}
            onChange={(event) => setStatus(event.target.value as "open" | "paid" | "waived" | "void")}
          >
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
            <option value="void">Void</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Payment method</Label>
          <select
            className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as DuePaymentMethod)}
          >
            <option value="cashapp">Cash App</option>
            <option value="zelle">Zelle</option>
            <option value="jim">Jim</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Observed title</Label>
          <Input value={observedTitle} onChange={(event) => setObservedTitle(event.target.value)} placeholder={`${batch.referenceCode} in payment title`} />
        </div>
        <div className="space-y-2">
          <Label>Observed note</Label>
          <Input value={observedNote} onChange={(event) => setObservedNote(event.target.value)} placeholder={`${batch.referenceCode} in payment note`} />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Admin note</Label>
          <Input value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Required for cash or other offline payments" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button
          variant="outline"
          disabled={applyAdCreditsMutation.isPending || pendingAdCredit <= 0 || batch.netAmountDue <= 0 || (batch.status !== "open" && batch.status !== "overdue")}
          onClick={() => applyAdCreditsMutation.mutate()}
        >
          Apply ad credits to this batch
        </Button>
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          Save batch
        </Button>
      </div>
      {mutation.error ? <p className="mt-3 text-sm text-ops-error">{mutation.error.message}</p> : null}
      {applyAdCreditsMutation.error ? <p className="mt-3 text-sm text-ops-error">{applyAdCreditsMutation.error.message}</p> : null}
    </div>
  );
}

function ReconcilePanel({
  token
}: {
  token: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    referenceText: "",
    paymentMethod: "cashapp" as DuePaymentMethod,
    observedTitle: "",
    observedNote: "",
    adminNote: ""
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.reconcileDueBatch(
        {
          referenceText: form.referenceText,
          paymentMethod: form.paymentMethod,
          observedTitle: form.observedTitle || null,
          observedNote: form.observedNote || null,
          adminNote: form.adminNote || null
        },
        token
      ),
    onSuccess: () => {
      setForm({
        referenceText: "",
        paymentMethod: "cashapp",
        observedTitle: "",
        observedNote: "",
        adminNote: ""
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    }
  });

  return (
    <PanelSection title="Reconcile payment" description="Paste the dues code from a title or note and close the matching open batch.">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <Label>Reference text</Label>
          <Input
            value={form.referenceText}
            onChange={(event) => setForm((current) => ({ ...current, referenceText: event.target.value }))}
            placeholder="#DUES000001"
          />
        </div>
        <div className="space-y-2">
          <Label>Payment method</Label>
          <select
            className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
            value={form.paymentMethod}
            onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value as DuePaymentMethod }))}
          >
            <option value="cashapp">Cash App</option>
            <option value="zelle">Zelle</option>
            <option value="jim">Jim</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Observed title</Label>
          <Input
            value={form.observedTitle}
            onChange={(event) => setForm((current) => ({ ...current, observedTitle: event.target.value }))}
            placeholder="Paste what you see in the payment title"
          />
        </div>
        <div className="space-y-2">
          <Label>Observed note</Label>
          <Input
            value={form.observedNote}
            onChange={(event) => setForm((current) => ({ ...current, observedNote: event.target.value }))}
            placeholder="Paste what you see in the payment note"
          />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Admin note</Label>
          <Input
            value={form.adminNote}
            onChange={(event) => setForm((current) => ({ ...current, adminNote: event.target.value }))}
            placeholder="Required for cash or other offline payments"
          />
        </div>
      </div>
      <div className="mt-5">
        <Button disabled={!form.referenceText || mutation.isPending} onClick={() => mutation.mutate()}>
          Reconcile batch
        </Button>
      </div>
      {mutation.error ? <p className="mt-3 text-sm text-ops-error">{mutation.error.message}</p> : null}
    </PanelSection>
  );
}

export function AdminDuesPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<ScopeFilter>("owned");
  const [payoutForm, setPayoutForm] = useState<PlatformPayoutSettings>({
    adminId: user?.id ?? null,
    cashAppHandle: "",
    zelleHandle: "",
    jimHandle: "",
    cashInstructions: "",
    otherInstructions: "",
    updatedAt: null
  });

  const duesQuery = useQuery({
    queryKey: ["admin-dues"],
    queryFn: () => api.listAdminDues(token!),
    enabled: Boolean(token)
  });

  useEffect(() => {
    if (!duesQuery.data?.payoutSettings) {
      return;
    }

    setPayoutForm(duesQuery.data.payoutSettings);
  }, [duesQuery.data?.payoutSettings]);

  const payoutMutation = useMutation({
    mutationFn: () =>
      api.updatePlatformPayoutSettings(
        {
          cashAppHandle: payoutForm.cashAppHandle || null,
          zelleHandle: payoutForm.zelleHandle || null,
          jimHandle: payoutForm.jimHandle || null,
          cashInstructions: payoutForm.cashInstructions || null,
          otherInstructions: payoutForm.otherInstructions || null
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-dues"] })
  });

  const filteredNeedsBatching = useMemo(
    () =>
      (duesQuery.data?.needsBatching ?? []).filter((snapshot) =>
        collectorMatches(scope, user?.id, snapshot.collector?.id ?? null)
      ),
    [duesQuery.data?.needsBatching, scope, user?.id]
  );
  const filteredOpenBatches = useMemo(
    () =>
      (duesQuery.data?.openBatches ?? []).filter((batch) =>
        collectorMatches(scope, user?.id, batch.collector?.id ?? null)
      ),
    [duesQuery.data?.openBatches, scope, user?.id]
  );
  const filteredOverdueBatches = useMemo(
    () =>
      (duesQuery.data?.overdueBatches ?? []).filter((batch) =>
        collectorMatches(scope, user?.id, batch.collector?.id ?? null)
      ),
    [duesQuery.data?.overdueBatches, scope, user?.id]
  );
  const filteredHistory = useMemo(
    () =>
      (duesQuery.data?.history ?? []).filter((batch) =>
        collectorMatches(scope, user?.id, batch.collector?.id ?? null)
      ),
    [duesQuery.data?.history, scope, user?.id]
  );

  const readyTotal = filteredNeedsBatching.reduce((total, snapshot) => total + snapshot.collectibleUnbatchedTotal, 0);
  const activeBatchTotal = filteredOpenBatches.reduce((total, batch) => total + batch.netAmountDue, 0);
  const overdueBatchTotal = filteredOverdueBatches.reduce((total, batch) => total + batch.netAmountDue, 0);
  const pendingAdCreditTotal = filteredNeedsBatching.reduce((total, snapshot) => total + snapshot.adProgram.pendingCreditTotal, 0);
  const pendingCreditByDriverId = useMemo(
    () =>
      Object.fromEntries(
        (duesQuery.data?.needsBatching ?? []).map((snapshot) => [snapshot.driver.id, snapshot.adProgram.pendingCreditTotal])
      ) as Record<string, number>,
    [duesQuery.data?.needsBatching]
  );

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Finance queue"
        title="Batch, reconcile, and collect completed-trip dues"
        description="Drivers only pay against generated dues codes. Cash trips auto-batch on completion, and unresolved completed-trip dues block driver access after 48 hours."
        aside={
          <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Queue scope</p>
            <div className="mt-4 flex gap-2">
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
        <MetricCard label="Needs batching" value={formatMoney(readyTotal)} meta={`${filteredNeedsBatching.length} driver queues ready now`} icon={Wallet} tone="warning" />
        <MetricCard label="Open batches" value={formatMoney(activeBatchTotal)} meta={`${filteredOpenBatches.length} payable references live`} icon={CreditCard} />
        <MetricCard label="Overdue batches" value={formatMoney(overdueBatchTotal)} meta={`${filteredOverdueBatches.length} blocked driver batches`} icon={AlertTriangle} tone="danger" />
        <MetricCard label="Pending ad credit" value={formatMoney(pendingAdCreditTotal)} meta="Manual dues offset available" icon={Landmark} tone="success" />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <PanelSection title="Collector dues instructions" description="Drivers see these remittance instructions from their assigned collector admin. They do not change rider trip payment.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cash App handle</Label>
                <Input value={payoutForm.cashAppHandle ?? ""} onChange={(event) => setPayoutForm((current) => ({ ...current, cashAppHandle: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Zelle handle</Label>
                <Input value={payoutForm.zelleHandle ?? ""} onChange={(event) => setPayoutForm((current) => ({ ...current, zelleHandle: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Jim handle</Label>
                <Input value={payoutForm.jimHandle ?? ""} onChange={(event) => setPayoutForm((current) => ({ ...current, jimHandle: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cash instructions</Label>
                <Input value={payoutForm.cashInstructions ?? ""} onChange={(event) => setPayoutForm((current) => ({ ...current, cashInstructions: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Other instructions</Label>
                <Input value={payoutForm.otherInstructions ?? ""} onChange={(event) => setPayoutForm((current) => ({ ...current, otherInstructions: event.target.value }))} />
              </div>
            </div>
            <div className="mt-5">
              <Button disabled={payoutMutation.isPending} onClick={() => payoutMutation.mutate()}>
                Save dues instructions
              </Button>
            </div>
            {payoutMutation.error ? <p className="mt-3 text-sm text-ops-error">{payoutMutation.error.message}</p> : null}
          </PanelSection>

          <ReconcilePanel token={token!} />

          <PanelSection title="Needs batching" description="These completed-trip dues are collectible now but not frozen into a payment reference yet.">
            <EntityList>
              {filteredNeedsBatching.length ? (
                filteredNeedsBatching.map((snapshot) => (
                  <BatchingRow
                    key={snapshot.driver.id}
                    snapshot={snapshot}
                    adminIds={(duesQuery.data?.adminUsers ?? []).map((admin) => ({ id: admin.id, name: admin.name }))}
                    scope={scope}
                    token={token!}
                  />
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No completed-trip dues are waiting for a new code in this scope.
                </div>
              )}
            </EntityList>
          </PanelSection>
        </div>

        <div className="space-y-6">
          <PanelSection title="Open batches" description="These dues codes are live and waiting for payment evidence.">
            <EntityList>
              {filteredOpenBatches.length ? (
                filteredOpenBatches.map((batch) => (
                  <BatchEditor key={batch.id} batch={batch} pendingAdCredit={pendingCreditByDriverId[batch.driverId] ?? 0} token={token!} />
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No open batches in this scope.
                </div>
              )}
            </EntityList>
          </PanelSection>

          <PanelSection title="Overdue batches" description="These drivers stay blocked until the matching dues code is reconciled, reopened, waived, or voided.">
            <EntityList>
              {filteredOverdueBatches.length ? (
                filteredOverdueBatches.map((batch) => (
                  <BatchEditor key={batch.id} batch={batch} pendingAdCredit={pendingCreditByDriverId[batch.driverId] ?? 0} token={token!} />
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No overdue batches right now.
                </div>
              )}
            </EntityList>
          </PanelSection>

          <PanelSection title="History" description="Resolved references stay here for audit and collector follow-up.">
            <EntityList>
              {filteredHistory.length ? (
                filteredHistory.map((batch) => (
                  <div key={batch.id} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ops-text">{batch.referenceCode}</p>
                        <p className="mt-1 text-sm text-ops-muted">
                          {batch.driver.name} · {batch.collector?.name ?? "No collector"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ops-muted">
                          {batch.paymentMethod ? `Method ${batch.paymentMethod}` : "No method recorded"} · updated {formatDateTime(batch.updatedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ops-text">{formatMoney(batch.netAmountDue)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ops-muted">
                          Gross {formatMoney(batch.amount)} · credit {formatMoney(batch.adCreditAppliedTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  Paid, waived, and voided batches will appear here.
                </div>
              )}
            </EntityList>
          </PanelSection>
        </div>
      </div>
    </div>
  );
}
