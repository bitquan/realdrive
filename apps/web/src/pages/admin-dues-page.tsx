import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DuePaymentMethod, PlatformDue } from "@shared/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="rounded-4xl border border-ops-border-soft p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{due.driver.name}</p>
            <Badge className={due.status === "overdue" ? "border-red-200 bg-red-50 text-red-700" : undefined}>
              {due.status}
            </Badge>
          </div>
          <p className="text-sm text-ops-muted">{due.driver.email ?? due.driver.phone ?? "No contact set"}</p>
          <p className="text-sm text-ops-muted">{due.ride.pickupAddress}</p>
          <p className="text-sm text-ops-muted">{due.ride.dropoffAddress}</p>
          <p className="text-sm text-ops-muted/80">Due by {formatDateTime(due.dueAt)}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="font-semibold">{formatMoney(due.amount)}</p>
          <p className="text-sm text-ops-muted">Driver subtotal: {formatMoney(due.ride.subtotal)}</p>
          <p className="text-sm text-ops-muted/80">Customer total: {formatMoney(due.ride.customerTotal)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1.4fr_auto]">
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="h-11 w-full rounded-2xl border border-ops-border bg-ops-surface px-4 text-sm"
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
            className="h-11 w-full rounded-2xl border border-ops-border bg-ops-surface px-4 text-sm"
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Outstanding dues</p>
            <p className="mt-2 text-3xl font-extrabold">{formatMoney(outstandingTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Open dues</p>
            <p className="mt-2 text-3xl font-extrabold">{outstanding.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Overdue drivers</p>
            <p className="mt-2 text-3xl font-extrabold">{overdueDrivers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ops-muted">Resolved dues</p>
            <p className="mt-2 text-3xl font-extrabold">{history.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform payout instructions</CardTitle>
          <CardDescription>Drivers see these instructions in their dues area when they need to send the 5% platform due.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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
          {payoutMutation.error ? <p className="text-sm text-ops-error md:col-span-2">{payoutMutation.error.message}</p> : null}
          <div className="md:col-span-2">
            <Button onClick={() => payoutMutation.mutate()}>Save payout settings</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overdue drivers</CardTitle>
          <CardDescription>These drivers are blocked from new dispatch until all overdue dues are cleared.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {overdueDrivers.length ? (
            overdueDrivers.map((driver) => (
              <div key={driver.driverId} className="rounded-4xl border border-ops-border-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{driver.name}</p>
                    <p className="text-sm text-ops-muted">{driver.email ?? driver.phone ?? "No contact set"}</p>
                  </div>
                  <Badge className="border-red-200 bg-red-50 text-red-700">{driver.overdueCount} overdue</Badge>
                </div>
                <p className="mt-3 text-sm text-ops-muted">Overdue amount: {formatMoney(driver.overdueAmount)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
              No overdue drivers right now.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding dues</CardTitle>
          <CardDescription>Mark dues paid, waived, or back to pending after reviewing manual payment proof.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {outstanding.length ? (
            outstanding.map((due) => <DueEditor key={due.id} due={due} token={token!} />)
          ) : (
            <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
              No outstanding dues right now.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resolved history</CardTitle>
          <CardDescription>Paid and waived dues stay here as the finance audit trail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.length ? (
            history.map((due) => (
              <div key={due.id} className="rounded-4xl border border-ops-border-soft p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{due.driver.name}</p>
                      <Badge>{due.status}</Badge>
                    </div>
                    <p className="text-sm text-ops-muted">{due.ride.riderName}</p>
                    <p className="text-sm text-ops-muted/80">
                      {due.paymentMethod ? `Method: ${due.paymentMethod}` : "No payment method recorded"} · Updated{" "}
                      {formatDateTime(due.updatedAt)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(due.amount)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
              Paid or waived dues will appear here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
