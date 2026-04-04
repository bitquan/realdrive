import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { RideStatus } from "@shared/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function AdminDashboardPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const ridesQuery = useQuery({
    queryKey: ["admin-rides"],
    queryFn: () => api.listAdminRides(token!),
    enabled: Boolean(token)
  });
  const leadsQuery = useQuery({
    queryKey: ["admin-leads"],
    queryFn: () => api.listAdminLeads(token!),
    enabled: Boolean(token)
  });
  const duesQuery = useQuery({
    queryKey: ["admin-dues"],
    queryFn: () => api.listAdminDues(token!),
    enabled: Boolean(token)
  });
  const driverApplicationsQuery = useQuery({
    queryKey: ["admin-driver-applications"],
    queryFn: () => api.listDriverApplications(token!),
    enabled: Boolean(token)
  });
  const communityQuery = useQuery({
    queryKey: ["community-board"],
    queryFn: () => api.listCommunityProposals(token!),
    enabled: Boolean(token)
  });

  const updateRideMutation = useMutation({
    mutationFn: (input: { rideId: string; paymentStatus?: "pending" | "collected" | "waived"; status?: RideStatus }) =>
      api.updateAdminRide(
        input.rideId,
        {
          paymentStatus: input.paymentStatus,
          status: input.status
        },
        token!
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
    }
  });

  const rides = ridesQuery.data ?? [];
  const riderLeads = leadsQuery.data?.riderLeads ?? [];
  const driverInterests = leadsQuery.data?.driverInterests ?? [];
  const dues = duesQuery.data?.dues ?? [];
  const overdueDrivers = duesQuery.data?.overdueDrivers ?? [];
  const pendingApplications = driverApplicationsQuery.data ?? [];
  const activeCount = rides.filter((ride) =>
    ["requested", "offered", "accepted", "en_route", "arrived", "in_progress"].includes(ride.status)
  ).length;
  const scheduledCount = rides.filter((ride) => ride.status === "scheduled").length;
  const pendingDues = dues.filter((due) => due.status === "pending" || due.status === "overdue");
  const pendingDueTotal = pendingDues.reduce((total, due) => total + due.amount, 0);

  return (
    <div className="space-y-3.5 md:space-y-6">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-6">
        <Card className="bg-gradient-to-b from-ops-surface to-[#101928]">
          <CardContent className="p-3.5 md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Active rides</p>
            <p className="mt-2 text-2xl font-extrabold md:text-3xl">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-b from-ops-surface to-[#101928]">
          <CardContent className="p-3.5 md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Scheduled rides</p>
            <p className="mt-2 text-2xl font-extrabold md:text-3xl">{scheduledCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-b from-ops-surface to-[#101928]">
          <CardContent className="p-3.5 md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Pending dues</p>
            <p className="mt-2 text-2xl font-extrabold md:text-3xl">{formatMoney(pendingDueTotal)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-b from-ops-surface to-[#101928]">
          <CardContent className="p-3.5 md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Overdue drivers</p>
            <p className="mt-2 text-2xl font-extrabold md:text-3xl">{overdueDrivers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-b from-ops-surface to-[#101928]">
          <CardContent className="p-3.5 md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Driver applications</p>
            <p className="mt-2 text-2xl font-extrabold md:text-3xl">{pendingApplications.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-b from-ops-surface to-[#101928]">
          <CardContent className="p-3.5 md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Rider leads</p>
            <p className="mt-2 text-2xl font-extrabold md:text-3xl">{riderLeads.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operations snapshot</CardTitle>
            <CardDescription>Keep rider growth, driver onboarding, and platform dues moving together.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/65 to-[#121a29] p-4">
              <p className="font-semibold">Lead review</p>
              <p className="mt-2 text-sm text-ops-muted">
                {riderLeads.length} rider leads and {driverInterests.length} driver interest submissions are waiting in
                the admin queue.
              </p>
            </div>
            <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/65 to-[#121a29] p-4">
              <p className="font-semibold">Platform dues</p>
              <p className="mt-2 text-sm text-ops-muted">
                {pendingDues.length} dues are open across approved drivers, including {overdueDrivers.length} overdue
                driver accounts.
              </p>
            </div>
            <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/65 to-[#121a29] p-4">
              <p className="font-semibold">Community board</p>
              <p className="mt-2 text-sm text-ops-muted">
                {communityQuery.data?.proposals.length ?? 0} proposals are live on the board. Drivers can already vote
                and comment.
              </p>
            </div>
            <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/65 to-[#121a29] p-4">
              <p className="font-semibold">Business QR kit</p>
              <p className="mt-2 text-sm text-ops-muted">
                Keep the rider and driver launch QR codes updated if your public URL changes.
              </p>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <Link
                to="/admin/drivers"
                className="inline-flex items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition hover:bg-ops-panel/70"
              >
                Review drivers
              </Link>
              <Link
                to="/admin/dues"
                className="inline-flex items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition hover:bg-ops-panel/70"
              >
                Manage dues
              </Link>
              <Link
                to="/admin/share"
                className="inline-flex items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition hover:bg-ops-panel/70"
              >
                Business QR kit
              </Link>
              <Link
                to="/community"
                className="inline-flex items-center justify-center rounded-2xl border border-ops-primary/40 bg-ops-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3b8fff]"
              >
                Open community board
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue drivers</CardTitle>
            <CardDescription>Drivers with overdue dues are blocked from new dispatch until you clear them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueDrivers.length ? (
              overdueDrivers.map((driver) => (
                <div key={driver.driverId} className="rounded-4xl border border-ops-border-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-sm text-ops-muted">{driver.email ?? driver.phone ?? "No contact set"}</p>
                    </div>
                    <Badge className="border-ops-destructive/35 bg-ops-destructive/15 text-ops-destructive">{driver.overdueCount} overdue</Badge>
                  </div>
                  <p className="mt-3 text-sm text-ops-muted">Outstanding overdue amount: {formatMoney(driver.overdueAmount)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No drivers are overdue right now.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead review</CardTitle>
          <CardDescription>New rider leads and future-driver interest from the public pilot.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="font-semibold">Rider leads</p>
            {riderLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="rounded-4xl border border-ops-border-soft p-4">
                <p className="font-semibold">{lead.name}</p>
                <p className="text-sm text-ops-muted">{lead.email}</p>
                <p className="text-sm text-ops-muted/80">
                  {lead.phone ?? "No phone"}{lead.referredByCode ? ` · referred by ${lead.referredByCode}` : ""}
                </p>
              </div>
            ))}
            {!riderLeads.length ? (
              <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No rider leads yet.
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Driver interest</p>
            {driverInterests.slice(0, 5).map((interest) => (
              <div key={interest.id} className="rounded-4xl border border-ops-border-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{interest.name}</p>
                  <Badge>{interest.status}</Badge>
                </div>
                <p className="text-sm text-ops-muted">{interest.email}</p>
                <p className="text-sm text-ops-muted/80">{interest.serviceArea} · {interest.vehicleInfo}</p>
              </div>
            ))}
            {!driverInterests.length ? (
              <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No driver interest submissions yet.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Community preview</CardTitle>
          <CardDescription>Moderate proposals and watch what drivers are asking for next.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {communityQuery.data?.proposals.slice(0, 4).map((proposal) => (
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
          {!communityQuery.data?.proposals.length ? (
            <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
              No community proposals have been posted yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ride operations</CardTitle>
          <CardDescription>Review dispatch, final fares, customer totals, and payment collection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rides.map((ride) => {
            const subtotal = ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal;
            const due = ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue;
            const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;

            return (
              <div key={ride.id} className="rounded-4xl border border-ops-border-soft p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{ride.rider.name}</p>
                      <Badge>{ride.status.replaceAll("_", " ")}</Badge>
                      {ride.driver ? <Badge className="bg-ops-surface">{ride.driver.name}</Badge> : null}
                    </div>
                    <p className="text-sm text-ops-muted">{ride.pickup.address}</p>
                    <p className="text-sm text-ops-muted">{ride.dropoff.address}</p>
                    <p className="text-sm text-ops-muted/80">
                      Scheduled/requested: {formatDateTime(ride.scheduledFor ?? ride.requestedAt)}
                    </p>
                  </div>
                  <div className="space-y-3 text-left md:text-right">
                    <p className="font-semibold">{formatMoney(customerTotal)}</p>
                    <p className="text-sm text-ops-muted">Customer total</p>
                    <p className="text-sm text-ops-muted">Driver subtotal: {formatMoney(subtotal)}</p>
                    <p className="text-sm text-ops-muted">Platform due: {formatMoney(due)}</p>
                    <p className="text-sm text-ops-muted/80">Payment: {ride.payment.method} · {ride.payment.status}</p>
                    <div className="flex flex-col gap-2 md:items-end">
                      {ride.payment.status !== "collected" ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateRideMutation.mutate({
                              rideId: ride.id,
                              paymentStatus: "collected"
                            })
                          }
                        >
                          Mark collected
                        </Button>
                      ) : null}
                      {ride.status !== "canceled" && ride.status !== "completed" ? (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            updateRideMutation.mutate({
                              rideId: ride.id,
                              status: "canceled"
                            })
                          }
                        >
                          Cancel ride
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!rides.length ? (
            <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
              No rides are in the system yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
