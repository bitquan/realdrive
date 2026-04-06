import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Link2, Route, Share2, ShieldCheck, Users } from "lucide-react";
import {
  DataField,
  EntityList,
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { HeadrestPrintTemplate } from "@/components/share/headrest-print-template";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

function publicOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function AdminSharePage() {
  const { token } = useAuth();

  const shareQuery = useQuery({
    queryKey: ["me-share"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
  });
  const ridesQuery = useQuery({
    queryKey: ["admin-rides", "share-analytics"],
    queryFn: () => api.listAdminRides(token!),
    enabled: Boolean(token)
  });
  const leadsQuery = useQuery({
    queryKey: ["admin-leads", "share-analytics"],
    queryFn: () => api.listAdminLeads(token!),
    enabled: Boolean(token)
  });

  const baseUrl = publicOrigin();
  const riderUrl = `${baseUrl}/`;
  const genericDriverUrl = `${baseUrl}/driver/signup`;
  const collectorDriverUrl = shareQuery.data?.referralCode
    ? `${baseUrl}/driver/signup?ref=${encodeURIComponent(shareQuery.data.referralCode)}`
    : genericDriverUrl;
  const rides = ridesQuery.data ?? [];
  const riderLeads = leadsQuery.data?.riderLeads ?? [];
  const referredRides = rides.filter((ride) => Boolean(ride.referredByCode));
  const referredCompletedRides = referredRides.filter((ride) => ride.status === "completed");
  const referredRides30d = referredRides.filter((ride) => isWithinDays(ride.requestedAt, 30));
  const referredLeads = riderLeads.filter((lead) => Boolean(lead.referredByCode));
  const byCode = buildReferralCodeStats(referredLeads, referredRides);
  const topCodes = Array.from(byCode.values())
    .sort((left, right) => {
      if (right.completedRides !== left.completedRides) {
        return right.completedRides - left.completedRides;
      }

      if (right.rides !== left.rides) {
        return right.rides - left.rides;
      }

      return right.leads - left.leads;
    })
    .slice(0, 6);
  const myCodeStats = shareQuery.data?.referralCode ? byCode.get(shareQuery.data.referralCode) : undefined;
  const completionRate = referredRides.length
    ? `${Math.round((referredCompletedRides.length / referredRides.length) * 100)}%`
    : "0%";

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Share kit"
        title="Recruit into the right collector queue"
        description="Use your own recruit link for drivers you collect from, keep QR assets tied to live routes, and leave partner admin management to the Team tab."
      />

      <MetricStrip>
        <MetricCard label="Collector driver link" value={shareQuery.data?.referralCode ? "Live" : "Pending"} meta="Drivers from your link default to your dues queue" icon={Share2} tone="primary" />
        <MetricCard label="Generic driver route" value="/driver/signup" meta="Unassigned driver signup stays available too" icon={Route} />
        <MetricCard label="Team management" value="/admin/team" meta="Trusted operator invites now live in the Team tab" icon={Users} />
        <MetricCard label="Guide" value="/admin/help" meta="Collector FAQ and workflow notes" icon={ShieldCheck} />
      </MetricStrip>

      <PanelSection title="Share and referral analytics" description="Track referral-code performance across lead capture and ride completion.">
        <MetricStrip className="xl:grid-cols-5">
          <MetricCard label="Referred leads" value={referredLeads.length} meta="Captured with a referral code" icon={Users} tone="primary" />
          <MetricCard label="Referred rides" value={referredRides.length} meta="Booked rides tied to a code" icon={Route} />
          <MetricCard label="Completed rides" value={referredCompletedRides.length} meta="Referred rides that completed" icon={ShieldCheck} />
          <MetricCard label="Last 30 days" value={referredRides30d.length} meta="Recent referred booking volume" icon={Share2} />
          <MetricCard label="Completion rate" value={completionRate} meta="Completed / referred rides" icon={Link2} />
        </MetricStrip>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-ops-border-soft/90 bg-ops-surface/72">
            <CardHeader>
              <CardTitle>My code performance</CardTitle>
              <CardDescription>Snapshot for your collector referral code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shareQuery.data?.referralCode ? (
                <>
                  <DataField label="Referral code" value={shareQuery.data.referralCode} subtle="Use this for driver recruitment and campaign attribution." />
                  <DataField label="Referred leads" value={myCodeStats?.leads ?? 0} subtle="Leads captured with your code." />
                  <DataField label="Referred rides" value={myCodeStats?.rides ?? 0} subtle="Rides booked with your code." />
                  <DataField label="Completed referred rides" value={myCodeStats?.completedRides ?? 0} subtle="Completed bookings attributed to your code." />
                </>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-ops-border p-4 text-sm text-ops-muted">
                  Referral code still initializing. Refresh this page after your account code is issued.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-ops-border-soft/90 bg-ops-surface/72">
            <CardHeader>
              <CardTitle>Top referral codes</CardTitle>
              <CardDescription>Ranked by completed rides, then total referred rides.</CardDescription>
            </CardHeader>
            <CardContent>
              <EntityList>
                {topCodes.length ? (
                  topCodes.map((entry) => (
                    <div key={entry.code} className="rounded-[1.25rem] border border-ops-border-soft/80 bg-ops-panel/46 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-ops-text">{entry.code}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-ops-muted">{entry.completedRides} completed</p>
                      </div>
                      <p className="mt-2 text-sm text-ops-muted">{entry.rides} rides · {entry.leads} leads</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-ops-border p-4 text-sm text-ops-muted">
                    No referral activity yet. Share campaigns will appear here once leads and rides begin flowing.
                  </div>
                )}
              </EntityList>
            </CardContent>
          </Card>
        </div>
      </PanelSection>

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

      <HeadrestPrintTemplate
        title="Headrest rider flyer (collector link)"
        shareUrl={collectorDriverUrl}
        fileName="realdrive-headrest-collector"
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PanelSection title="Team handoff" description="Trusted operator invites moved into Team so this page can stay focused on recruiting and launch assets.">
          <Card className="border-ops-border-soft/90 bg-ops-surface/72">
            <CardHeader>
              <CardTitle>Admin invites live in Team</CardTitle>
              <CardDescription>
                Use the Team tab to issue trusted operator invites, copy invite links, reissue them, or revoke stale access before it is claimed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.25rem] border border-ops-border-soft/80 bg-ops-panel/46 p-4 text-sm leading-6 text-ops-muted">
                Partner admins created from Team get Admin, Driver, and Rider access right away and skip the public driver document review flow.
              </div>
              <Link
                to="/admin/team"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-primary/45 bg-ops-primary px-4 text-sm font-semibold text-white transition hover:bg-[#6887ff]"
              >
                Open Team
              </Link>
            </CardContent>
          </Card>
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
              Send your partner through Team first, then send them to the in-app guide before they start reviewing drivers or collecting dues.
            </div>
            <div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/admin/team"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Open Team
                </Link>
                <Link
                  to="/admin/help"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Open collector guide
                </Link>
              </div>
            </div>
          </div>
        </PanelSection>
      </div>
    </div>
  );
}

function isWithinDays(isoDate: string | null, days: number) {
  if (!isoDate) {
    return false;
  }

  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const age = Date.now() - timestamp;
  return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
}

function buildReferralCodeStats(
  leads: Array<{ referredByCode?: string | null }>,
  rides: Array<{ referredByCode?: string | null; status: string }>
) {
  const stats = new Map<string, { code: string; leads: number; rides: number; completedRides: number }>();

  for (const lead of leads) {
    if (!lead.referredByCode) {
      continue;
    }

    const current = stats.get(lead.referredByCode) ?? {
      code: lead.referredByCode,
      leads: 0,
      rides: 0,
      completedRides: 0
    };

    current.leads += 1;
    stats.set(lead.referredByCode, current);
  }

  for (const ride of rides) {
    if (!ride.referredByCode) {
      continue;
    }

    const current = stats.get(ride.referredByCode) ?? {
      code: ride.referredByCode,
      leads: 0,
      rides: 0,
      completedRides: 0
    };

    current.rides += 1;
    if (ride.status === "completed") {
      current.completedRides += 1;
    }

    stats.set(ride.referredByCode, current);
  }

  return stats;
}
