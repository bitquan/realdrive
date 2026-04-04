import { Link2, QrCode, Route, Share2 } from "lucide-react";
import {
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { ShareQrCard } from "@/components/share/share-qr-card";

function publicOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function AdminSharePage() {
  const baseUrl = publicOrigin();
  const riderUrl = `${baseUrl}/`;
  const driverUrl = `${baseUrl}/driver/signup`;

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Share kit"
        title="Keep the business launch links clean and real"
        description="These QR assets point to routes that already exist today. They stay separate from personal rider and driver referral QR codes inside the logged-in surfaces."
      />

      <MetricStrip>
        <MetricCard label="Business rider route" value="/" meta="Public booking and rider lead capture" icon={Route} tone="primary" />
        <MetricCard label="Business driver route" value="/driver/signup" meta="Creates a real pending driver account" icon={Share2} />
        <MetricCard label="QR assets" value="2" meta="One for rider growth and one for driver recruiting" icon={QrCode} />
        <MetricCard label="Public origin" value={baseUrl || "Local"} meta="Regenerate if the public base URL changes" icon={Link2} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-2">
        <ShareQrCard
          title="Business rider QR"
          description="Points to the public rider booking and email-capture landing page."
          shareUrl={riderUrl}
          fileName="realdrive-business-rider"
        />
        <ShareQrCard
          title="Business driver QR"
          description="Points to the public driver signup page. Drivers still need admin approval before they can work."
          shareUrl={driverUrl}
          fileName="realdrive-business-driver"
        />
      </div>

      <PanelSection title="Launch notes" description="Use these assets only for the routes the app already supports today.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
            The rider QR is the main acquisition asset for the public booking flow.
          </div>
          <div className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
            The driver QR creates a real pending driver account that still requires admin approval.
          </div>
          <div className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 text-sm leading-6 text-ops-muted">
            If your public base URL changes, re-download these QR assets from this page so the shell stays honest.
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
