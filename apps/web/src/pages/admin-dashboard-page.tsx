import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CreditCard, MessageSquare, QrCode, Route, UserPlus, Users } from "lucide-react";
import type { RideStatus } from "@shared/contracts";
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
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Admin overview"
        title="Run the live RealDrive operation from one shell"
        description="Keep drivers approved, dues clear, community activity visible, and every live ride tied to a real action instead of a mock-only control."
        actions={[
          { label: "Review drivers", to: "/admin/drivers", icon: Users, variant: "primary" },
          { label: "Manage dues", to: "/admin/dues", icon: CreditCard, variant: "secondary" },
          { label: "Share kit", to: "/admin/share", icon: QrCode, variant: "secondary" },
          { label: "Community board", to: "/community", icon: MessageSquare, variant: "ghost" }
        ]}
        aside={
          <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Control notes</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ops-muted">
              <p>{pendingApplications.length} pending driver applications are waiting on approval.</p>
              <p>{pendingDues.length} open dues can affect driver availability and dispatch.</p>
              <p>{communityQuery.data?.proposals.length ?? 0} community proposals are live right now.</p>
            </div>
          </div>
        }
      />

      <MetricStrip className="xl:grid-cols-6">
        <MetricCard label="Active rides" value={activeCount} meta="Requested through in-progress trips" icon={Route} />
        <MetricCard label="Scheduled rides" value={scheduledCount} meta="Future dispatch holds" icon={Route} />
        <MetricCard
          label="Pending dues"
          value={formatMoney(pendingDueTotal)}
          meta={`${pendingDues.length} open finance items`}
          icon={CreditCard}
          tone="warning"
        />
        <MetricCard
          label="Overdue drivers"
          value={overdueDrivers.length}
          meta="Blocked from new dispatch"
          icon={AlertTriangle}
          tone="danger"
        />
        <MetricCard
          label="Driver applications"
          value={pendingApplications.length}
          meta="Pending approval queue"
          icon={Users}
          tone="primary"
        />
        <MetricCard label="Rider leads" value={riderLeads.length} meta="Captured from public flow" icon={UserPlus} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          <PanelSection title="Action queues" description="Surface the real work that already exists in the product today.">
            <div className="grid gap-4 md:grid-cols-2">
              <DataField
                label="Lead review"
                value={`${riderLeads.length} rider leads`}
                subtle={`${driverInterests.length} future-driver interest submissions are also waiting in the queue.`}
              />
              <DataField
                label="Platform dues"
                value={`${pendingDues.length} open dues`}
                subtle={`${overdueDrivers.length} drivers are currently overdue and blocked from new work.`}
              />
              <DataField
                label="Driver approvals"
                value={`${pendingApplications.length} pending`}
                subtle="Approve or reject real applications before they can enter the driver app."
              />
              <DataField
                label="Community board"
                value={`${communityQuery.data?.proposals.length ?? 0} proposals`}
                subtle="Admins can pin, close, and hide content from the live shared board."
              />
            </div>
          </PanelSection>

          <PanelSection title="Overdue drivers" description="These accounts are blocked from new dispatch until overdue dues are cleared.">
            <EntityList>
              {overdueDrivers.length ? (
                overdueDrivers.map((driver) => (
                  <div key={driver.driverId} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ops-text">{driver.name}</p>
                          <Badge className="border-ops-destructive/28 bg-ops-destructive/10 text-ops-destructive">
                            {driver.overdueCount} overdue
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-ops-muted">{driver.email ?? driver.phone ?? "No contact set"}</p>
                      </div>
                      <p className="text-sm font-semibold text-ops-text">{formatMoney(driver.overdueAmount)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No drivers are overdue right now.
                </div>
              )}
            </EntityList>
          </PanelSection>

          <PanelSection title="Community preview" description="Watch what drivers and riders are asking for next.">
            <EntityList>
              {communityQuery.data?.proposals.length ? (
                communityQuery.data.proposals.slice(0, 4).map((proposal) => (
                  <div key={proposal.id} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ops-text">{proposal.title}</p>
                      {proposal.pinned ? <Badge>pinned</Badge> : null}
                      {proposal.closed ? <Badge className="bg-ops-surface">closed</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ops-muted">{proposal.body}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ops-muted">
                      {proposal.yesVotes} yes · {proposal.noVotes} no · {proposal.commentCount} comments
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No community proposals have been posted yet.
                </div>
              )}
            </EntityList>
          </PanelSection>
        </div>

        <PanelSection
          title="Ride operations"
          description="Review dispatch, customer totals, driver payout math, and payment collection from one queue."
          actions={
            <Link
              to="/admin/drivers"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
            >
              Driver settings
            </Link>
          }
        >
          <EntityList>
            {rides.length ? (
              rides.map((ride) => {
                const subtotal = ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal;
                const due = ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue;
                const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;

                return (
                  <div key={ride.id} className="rounded-[1.6rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ops-text">{ride.rider.name}</p>
                          <Badge>{ride.status.replaceAll("_", " ")}</Badge>
                          {ride.driver ? <Badge className="bg-ops-surface">{ride.driver.name}</Badge> : null}
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <DataField label="Pickup" value={ride.pickup.address} />
                          <DataField label="Dropoff" value={ride.dropoff.address} />
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-ops-muted">
                          Scheduled or requested · {formatDateTime(ride.scheduledFor ?? ride.requestedAt)}
                        </p>
                      </div>

                      <div className="w-full max-w-[21rem] space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <DataField label="Customer total" value={formatMoney(customerTotal)} className="sm:col-span-3" />
                          <DataField label="Driver subtotal" value={formatMoney(subtotal)} />
                          <DataField label="Platform due" value={formatMoney(due)} />
                          <DataField label="Payment" value={ride.payment.status} subtle={ride.payment.method} />
                        </div>

                        <div className="flex flex-wrap gap-2.5">
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
                              className="border border-ops-destructive/28 text-ops-destructive hover:bg-ops-destructive/10 hover:text-ops-destructive"
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
              })
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No rides are in the system yet.
              </div>
            )}
          </EntityList>
        </PanelSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelSection title="Rider leads" description="Recent leads captured from the live rider booking surface.">
          <EntityList>
            {riderLeads.length ? (
              riderLeads.slice(0, 6).map((lead) => (
                <div key={lead.id} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                  <p className="font-semibold text-ops-text">{lead.name}</p>
                  <p className="mt-1 text-sm text-ops-muted">{lead.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                    {lead.phone ?? "No phone"}{lead.referredByCode ? ` · referred by ${lead.referredByCode}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No rider leads yet.
              </div>
            )}
          </EntityList>
        </PanelSection>

        <PanelSection title="Driver interest" description="Future-driver interest from the public recruitment flow.">
          <EntityList>
            {driverInterests.length ? (
              driverInterests.slice(0, 6).map((interest) => (
                <div key={interest.id} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ops-text">{interest.name}</p>
                    <Badge>{interest.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-ops-muted">{interest.email}</p>
                  <p className="mt-2 text-sm text-ops-muted">{interest.serviceArea} · {interest.vehicleInfo}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No driver interest submissions yet.
              </div>
            )}
          </EntityList>
        </PanelSection>
      </div>
    </div>
  );
}
