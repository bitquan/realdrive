import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, Landmark, Wallet } from "lucide-react";
import type { DuePaymentMethod, PlatformDue } from "@shared/contracts";
import {
  DataField,
  EntityList,
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
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function DueEditor({
  due,
  token
}: {
  due: PlatformDue;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"pending" | "paid" | "waived">(due.status === "overdue" ? "pending" : due.status);
  const [paymentMethod, setPaymentMethod] = useState<DuePaymentMethod>(due.paymentMethod ?? "cashapp");
  const [note, setNote] = useState(due.note ?? "");

  useEffect(() => {
    setStatus(due.status === "overdue" ? "pending" : due.status);
    setPaymentMethod(due.paymentMethod ?? "cashapp");
    setNote(due.note ?? "");
  }, [due]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateAdminDue(
        due.id,
        {
          status,
          paymentMethod: status === "paid" ? paymentMethod : null,
          note: note || null
        },
        token
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    }
  });

  return (
    <div className="rounded-[1.6rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ops-text">{due.driver.name}</p>
            <Badge className={due.status === "overdue" ? "border-ops-destructive/28 bg-ops-destructive/10 text-ops-destructive" : undefined}>
              {due.status}
            </Badge>
          </div>
          <p className="text-sm text-ops-muted">{due.driver.email ?? due.driver.phone ?? "No contact set"}</p>
          <p className="text-sm text-ops-muted">{due.ride.pickupAddress}</p>
          <p className="text-sm text-ops-muted">{due.ride.dropoffAddress}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-ops-muted">Due by {formatDateTime(due.dueAt)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:w-[24rem]">
          <DataField label="Due amount" value={formatMoney(due.amount)} />
          <DataField label="Ride subtotal" value={formatMoney(due.ride.subtotal)} />
          <DataField label="Customer total" value={formatMoney(due.ride.customerTotal)} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_0.85fr_1.4fr_auto]">
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
            value={status}
            onChange={(event) => setStatus(event.target.value as "pending" | "paid" | "waived")}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
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
          <Label>Admin note</Label>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for this due" />
        </div>
        <div className="flex items-end">
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            Save
          </Button>
        </div>
      </div>

      {mutation.error ? <p className="mt-3 text-sm text-ops-error">{mutation.error.message}</p> : null}
    </div>
  );
}

export function AdminDuesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const duesQuery = useQuery({
    queryKey: ["admin-dues"],
    queryFn: () => api.listAdminDues(token!),
    enabled: Boolean(token)
  });

  const [payoutForm, setPayoutForm] = useState({
    cashAppHandle: "",
    zelleHandle: "",
    jimHandle: "",
    cashInstructions: "",
    otherInstructions: ""
  });

  useEffect(() => {
    if (!duesQuery.data?.payoutSettings) {
      return;
    }

    setPayoutForm({
      cashAppHandle: duesQuery.data.payoutSettings.cashAppHandle ?? "",
      zelleHandle: duesQuery.data.payoutSettings.zelleHandle ?? "",
      jimHandle: duesQuery.data.payoutSettings.jimHandle ?? "",
      cashInstructions: duesQuery.data.payoutSettings.cashInstructions ?? "",
      otherInstructions: duesQuery.data.payoutSettings.otherInstructions ?? ""
    });
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

  const dues = duesQuery.data?.dues ?? [];
  const overdueDrivers = duesQuery.data?.overdueDrivers ?? [];
  const outstanding = dues.filter((due) => due.status === "pending" || due.status === "overdue");
  const history = dues.filter((due) => due.status === "paid" || due.status === "waived");
  const outstandingTotal = outstanding.reduce((total, due) => total + due.amount, 0);

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Finance queue"
        title="Keep dues and payout instructions tied to real driver accounts"
        description="This surface manages the live manual 5% due workflow. Drivers see these settings directly and overdue accounts affect dispatch in real time."
        aside={
          <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Current posture</p>
            <p className="mt-4 text-sm leading-6 text-ops-muted">
              Outstanding dues, payout instructions, and overdue driver status all stay inside the same queue so finance changes do not drift away from dispatch behavior.
            </p>
          </div>
        }
      />

      <MetricStrip>
        <MetricCard label="Outstanding dues" value={formatMoney(outstandingTotal)} meta="Pending and overdue combined" icon={Wallet} tone="warning" />
        <MetricCard label="Open dues" value={outstanding.length} meta="Editable finance records" icon={CreditCard} />
        <MetricCard label="Overdue drivers" value={overdueDrivers.length} meta="Currently blocked from new dispatch" icon={AlertTriangle} tone="danger" />
        <MetricCard label="Resolved history" value={history.length} meta="Paid or waived dues on record" icon={Landmark} tone="success" />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <PanelSection title="Payout instructions" description="Drivers see these instructions inside their live dues surface.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cash App handle</Label>
                <Input
                  value={payoutForm.cashAppHandle}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, cashAppHandle: event.target.value }))}
                  placeholder="$realdrive"
                />
              </div>
              <div className="space-y-2">
                <Label>Zelle handle</Label>
                <Input
                  value={payoutForm.zelleHandle}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, zelleHandle: event.target.value }))}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Jim handle</Label>
                <Input
                  value={payoutForm.jimHandle}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, jimHandle: event.target.value }))}
                  placeholder="@jim-handle"
                />
              </div>
              <div className="space-y-2">
                <Label>Cash instructions</Label>
                <Input
                  value={payoutForm.cashInstructions}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, cashInstructions: event.target.value }))}
                  placeholder="Meet in person, text first"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Other instructions</Label>
                <Input
                  value={payoutForm.otherInstructions}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, otherInstructions: event.target.value }))}
                  placeholder="Anything drivers should know about manual dues payment"
                />
              </div>
            </div>
            {payoutMutation.error ? <p className="mt-4 text-sm text-ops-error">{payoutMutation.error.message}</p> : null}
            <div className="mt-5">
              <Button onClick={() => payoutMutation.mutate()}>Save payout settings</Button>
            </div>
          </PanelSection>

          <PanelSection title="Overdue drivers" description="These drivers are blocked from new dispatch until overdue dues are cleared.">
            <EntityList>
              {overdueDrivers.length ? (
                overdueDrivers.map((driver) => (
                  <div key={driver.driverId} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ops-text">{driver.name}</p>
                          <Badge className="border-ops-destructive/28 bg-ops-destructive/10 text-ops-destructive">
                            {driver.overdueCount} overdue
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-ops-muted">{driver.email ?? driver.phone ?? "No contact set"}</p>
                      </div>
                      <p className="font-semibold text-ops-text">{formatMoney(driver.overdueAmount)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No overdue drivers right now.
                </div>
              )}
            </EntityList>
          </PanelSection>
        </div>

        <div className="space-y-6">
          <PanelSection title="Outstanding dues" description="Mark dues paid, waived, or back to pending after reviewing manual payment proof.">
            <EntityList>
              {outstanding.length ? (
                outstanding.map((due) => <DueEditor key={due.id} due={due} token={token!} />)
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No outstanding dues right now.
                </div>
              )}
            </EntityList>
          </PanelSection>

          <PanelSection title="Resolved history" description="Paid and waived dues stay here as the finance audit trail.">
            <EntityList>
              {history.length ? (
                history.map((due) => (
                  <div key={due.id} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ops-text">{due.driver.name}</p>
                          <Badge>{due.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-ops-muted">{due.ride.riderName}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                          {due.paymentMethod ? `Method: ${due.paymentMethod}` : "No payment method recorded"} · Updated{" "}
                          {formatDateTime(due.updatedAt)}
                        </p>
                      </div>
                      <p className="font-semibold text-ops-text">{formatMoney(due.amount)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  Paid or waived dues will appear here.
                </div>
              )}
            </EntityList>
          </PanelSection>
        </div>
      </div>
    </div>
  );
}
