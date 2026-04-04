import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Link2, Route, Share2, ShieldCheck, Users } from "lucide-react";
import {
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

function publicOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function AdminSharePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");

  const shareQuery = useQuery({
    queryKey: ["me-share"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
  });
  const invitesQuery = useQuery({
    queryKey: ["admin-invites"],
    queryFn: () => api.listAdminInvites(token!),
    enabled: Boolean(token)
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.createAdminInvite({ email: inviteEmail }, token!),
    onSuccess: () => {
      setInviteEmail("");
      void queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
    }
  });

  const baseUrl = publicOrigin();
  const riderUrl = `${baseUrl}/`;
  const genericDriverUrl = `${baseUrl}/driver/signup`;
  const collectorDriverUrl = shareQuery.data?.referralCode
    ? `${baseUrl}/driver/signup?ref=${encodeURIComponent(shareQuery.data.referralCode)}`
    : genericDriverUrl;

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Share kit"
        title="Recruit into the right collector queue"
        description="Use your own recruit link for drivers you collect from, send real admin invites to partners, and keep launch QR assets tied to routes that already exist."
      />

      <MetricStrip>
        <MetricCard label="Collector driver link" value={shareQuery.data?.referralCode ? "Live" : "Pending"} meta="Drivers from your link default to your dues queue" icon={Share2} tone="primary" />
        <MetricCard label="Generic driver route" value="/driver/signup" meta="Unassigned driver signup stays available too" icon={Route} />
        <MetricCard label="Partner invites" value={invitesQuery.data?.invites.length ?? 0} meta="Admin accounts issued from this shell" icon={Users} />
        <MetricCard label="Guide" value="/admin/help" meta="Collector FAQ and workflow notes" icon={ShieldCheck} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-2">
        <ShareQrCard
          title="Business rider QR"
          description="Points to the public rider booking flow."
          shareUrl={riderUrl}
          fileName="realdrive-business-rider"
        />
        <ShareQrCard
          title="My driver recruit QR"
          description="Drivers from this QR land in your collector ownership by default."
          shareUrl={collectorDriverUrl}
          fileName="realdrive-collector-driver"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PanelSection title="Partner admin invites" description="Send your partner a real admin signup link for their own collector queue.">
          <Card className="border-ops-border-soft/90 bg-ops-surface/72">
            <CardHeader>
              <CardTitle>Create invite</CardTitle>
              <CardDescription>The partner uses the link to create a full admin account with their own payout settings and recruit link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partnerInviteEmail">Partner email</Label>
                <Input
                  id="partnerInviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="partner@example.com"
                />
              </div>
              {inviteMutation.error ? <p className="text-sm text-ops-error">{inviteMutation.error.message}</p> : null}
              <Button disabled={!inviteEmail || inviteMutation.isPending} onClick={() => inviteMutation.mutate()}>
                Create admin invite
              </Button>
            </CardContent>
          </Card>

          <div className="mt-5 space-y-3">
            {(invitesQuery.data?.invites ?? []).length ? (
              invitesQuery.data!.invites.map((invite) => (
                <div key={invite.id} className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ops-text">{invite.email}</p>
                      <p className="mt-1 text-sm text-ops-muted">{invite.inviteUrl}</p>
                    </div>
                    <span className="rounded-full border border-ops-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ops-text">
                      {invite.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No partner invites created yet.
              </div>
            )}
          </div>
        </PanelSection>

        <PanelSection title="Ownership notes" description="Keep ownership and collection rules tight from day one.">
          <div className="grid gap-4">
            <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
              Your collector link is <span className="font-semibold text-ops-text">{collectorDriverUrl}</span>.
            </div>
            <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
              Generic driver signup stays available at <span className="font-semibold text-ops-text">{genericDriverUrl}</span>, but those applications start unassigned until an admin claims them.
            </div>
            <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
              Send your partner to the in-app guide before they start reviewing drivers or collecting dues.
            </div>
            <div>
              <Link
                to="/admin/help"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Open collector guide
              </Link>
            </div>
          </div>
        </PanelSection>
      </div>
    </div>
  );
}
