import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Copy, CreditCard, RefreshCcw, Route, ShieldCheck, UserRound, Users } from "lucide-react";
import type { AdminInvite, Role, SessionUser } from "@shared/contracts";
import { MetricCard, MetricStrip, PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn, roleLabel } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const roleOrder: Role[] = ["admin", "driver", "rider"];

function roleBadgeClass(role: Role) {
  if (role === "admin") {
    return "border-ops-primary/28 bg-ops-primary/14 text-ops-text";
  }

  if (role === "driver") {
    return "border-ops-success/28 bg-ops-success/12 text-ops-text";
  }

  return "border-ops-border-soft bg-ops-panel/78 text-ops-text";
}

function statusBadgeClass(status: AdminInvite["status"]) {
  if (status === "accepted") {
    return "border-ops-success/28 bg-ops-success/12 text-ops-text";
  }

  if (status === "pending") {
    return "border-ops-primary/28 bg-ops-primary/12 text-ops-text";
  }

  if (status === "expired") {
    return "border-ops-warning/28 bg-ops-warning/10 text-ops-text";
  }

  return "border-ops-border-soft bg-ops-panel/78 text-ops-text";
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is not available in this browser.");
  }

  await navigator.clipboard.writeText(value);
}

function memberRoleSet(member: SessionUser) {
  return new Set(member.roles);
}

export function AdminTeamPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [copyState, setCopyState] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["admin-team"],
    queryFn: () => api.getAdminTeam(token!),
    enabled: Boolean(token)
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.createAdminInvite({ email }, token!),
    onSuccess: async () => {
      setInviteEmail("");
      await queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => api.revokeAdminInvite(inviteId, token!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    }
  });

  const admins = teamQuery.data?.admins ?? [];
  const invites = teamQuery.data?.invites ?? [];
  const pendingInvites = invites.filter((invite) => invite.status === "pending").length;
  const acceptedInvites = invites.filter((invite) => invite.status === "accepted").length;
  const trustedOperators = admins.filter((admin) => {
    const roles = memberRoleSet(admin);
    return roles.has("admin") && roles.has("driver") && roles.has("rider") && admin.approvalStatus === "approved";
  }).length;

  async function handleCopyInvite(invite: AdminInvite) {
    try {
      await copyText(invite.inviteUrl);
      setCopyError(null);
      setCopyState(invite.id);
      window.setTimeout(() => setCopyState((current) => (current === invite.id ? null : current)), 1600);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : "Unable to copy invite link.");
    }
  }

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Admin team"
        title="Invite trusted operators into the live workspace"
        description="Partner admin invites create one trusted operator account with Admin, Driver, and Rider access immediately. Team is where you manage that access; Share kit stays focused on recruit links and launch assets."
        actions={[
          { label: "Share kit", to: "/admin/share", icon: Route, variant: "secondary" },
          { label: "Collector guide", to: "/admin/help", icon: CreditCard, variant: "ghost" }
        ]}
      />

      {teamQuery.error ? (
        <div className="rounded-[1.4rem] border border-ops-error/25 bg-ops-error/10 p-4 text-sm text-ops-error">
          {teamQuery.error.message}
        </div>
      ) : null}

      <MetricStrip>
        <MetricCard label="Workspace admins" value={admins.length} meta="All operator accounts with admin access" icon={Users} tone="primary" />
        <MetricCard label="Trusted operators" value={trustedOperators} meta="Admin + Driver + Rider with approved driver access" icon={ShieldCheck} tone="success" />
        <MetricCard label="Pending invites" value={pendingInvites} meta="Links still waiting to be claimed" icon={Users} />
        <MetricCard label="Accepted invites" value={acceptedInvites} meta="Partner admins already active in the workspace" icon={UserRound} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <PanelSection title="Invite a partner admin" description="This creates a trusted operator account with Admin, Driver, and Rider roles immediately.">
          <Card className="border-ops-border-soft/90 bg-ops-surface/72">
            <CardHeader>
              <CardTitle>Create trusted operator invite</CardTitle>
              <CardDescription>
                Invited partner admins skip driver document review, get their own collector payout settings, and recruit drivers into their own dues queue by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trustedPartnerEmail">Partner email</Label>
                <Input
                  id="trustedPartnerEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="partner@example.com"
                />
              </div>
              {inviteMutation.error ? <p className="text-sm text-ops-error">{inviteMutation.error.message}</p> : null}
              {copyError ? <p className="text-sm text-ops-error">{copyError}</p> : null}
              <div className="flex flex-wrap gap-3">
                <Button disabled={!inviteEmail || inviteMutation.isPending} onClick={() => inviteMutation.mutate(inviteEmail.trim())}>
                  Create partner invite
                </Button>
                <Link
                  to="/admin/help"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
                >
                  Open collector guide
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
              Trusted partner invites land people in the admin shell right away and keep all three role switches visible on desktop and mobile.
            </div>
            <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
              Driver applicants from the public recruit flow still go through insurance, registration, background check, and MVR review. This bypass only applies to invited partner operators.
            </div>
          </div>
        </PanelSection>

        <PanelSection title="Active operators" description="Every admin who can manage dues, recruit drivers, and switch into the driver or rider surfaces.">
          <div className="space-y-3">
            {admins.length ? (
              admins.map((admin) => {
                const roles = memberRoleSet(admin);
                const trustedOperator = roles.has("admin") && roles.has("driver") && roles.has("rider") && admin.approvalStatus === "approved";

                return (
                  <div key={admin.id} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ops-text">{admin.name}</p>
                          {trustedOperator ? (
                            <Badge className="border-ops-success/28 bg-ops-success/12 text-ops-text">trusted operator</Badge>
                          ) : (
                            <Badge className="border-ops-border-soft bg-ops-panel/78 text-ops-text">admin access</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-ops-muted">{admin.email ?? admin.phone ?? "No contact set"}</p>
                        {admin.referralCode ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-ops-muted">
                            Collector code {admin.referralCode}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {roleOrder
                          .filter((role) => roles.has(role))
                          .map((role) => (
                            <span
                              key={`${admin.id}-${role}`}
                              className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", roleBadgeClass(role))}
                            >
                              {roleLabel(role)}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No admin operators found yet.
              </div>
            )}
          </div>
        </PanelSection>
      </div>

      <PanelSection title="Invite history" description="Copy, revoke, or reissue trusted operator links from one queue.">
        <div className="space-y-3">
          {invites.length ? (
            invites.map((invite) => (
              <div key={invite.id} className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ops-text">{invite.email}</p>
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", statusBadgeClass(invite.status))}>
                        {invite.status}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-sm text-ops-muted">{invite.inviteUrl}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                      Sent by {invite.inviter.name} · expires {new Date(invite.expiresAt).toLocaleDateString("en-US")}
                      {invite.acceptedBy ? ` · accepted by ${invite.acceptedBy.name}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void handleCopyInvite(invite)}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copyState === invite.id ? "Copied" : "Copy link"}
                    </Button>
                    {invite.status !== "accepted" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={inviteMutation.isPending}
                        onClick={() => inviteMutation.mutate(invite.email)}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reissue
                      </Button>
                    ) : null}
                    {invite.status === "pending" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(invite.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
              No partner admin invites created yet.
            </div>
          )}
        </div>
      </PanelSection>
    </div>
  );
}
