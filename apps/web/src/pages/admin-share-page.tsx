import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Link2, Route, Share2, ShieldCheck, Users } from "lucide-react";
import {
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
        description="Use your own recruit link for drivers you collect from, keep QR assets tied to live routes, and leave partner admin management to the Team tab."
      />

      <MetricStrip>
        <MetricCard label="Collector driver link" value={shareQuery.data?.referralCode ? "Live" : "Pending"} meta="Drivers from your link default to your dues queue" icon={Share2} tone="primary" />
        <MetricCard label="Generic driver route" value="/driver/signup" meta="Unassigned driver signup stays available too" icon={Route} />
        <MetricCard label="Team management" value="/admin/team" meta="Trusted operator invites now live in the Team tab" icon={Users} />
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
