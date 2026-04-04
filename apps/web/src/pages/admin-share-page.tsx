import { Share2 } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function publicOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function AdminSharePage() {
  const baseUrl = publicOrigin();
  const riderUrl = `${baseUrl}/`;
  const driverUrl = `${baseUrl}/driver/signup`;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Business QR kit"
        icon={Share2}
        title="Stable launch QR codes for riders and drivers"
        description="These business QR codes stay tied to the service itself. Personal rider and driver referral QR codes are handled separately inside their own surfaces."
      />

      <div className="grid gap-6 lg:grid-cols-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Launch notes</CardTitle>
          <CardDescription>Use the rider QR for rider growth and the driver QR when you are ready to recruit approved helpers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ops-muted">
          <p>The rider QR is the main acquisition asset for this pilot.</p>
          <p>The driver QR creates a real pending driver account that still requires admin approval.</p>
          <p>If your public base URL changes, regenerate or re-download these QR images from this page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
