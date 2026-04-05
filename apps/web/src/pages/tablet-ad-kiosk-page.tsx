import { useQuery } from "@tanstack/react-query";
import { AdDisplayBoard } from "@/components/ads/ad-display-board";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export function TabletAdKioskPage() {
  const { token, logout } = useAuth();
  const shareQuery = useQuery({
    queryKey: ["me-share", "tablet"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
  });
  const displayQuery = useQuery({
    queryKey: ["tablet-ad-display", shareQuery.data?.referralCode],
    queryFn: () => api.getPublicAdDisplay(shareQuery.data!.referralCode),
    enabled: Boolean(shareQuery.data?.referralCode),
    refetchInterval: 60_000
  });

  if (shareQuery.isLoading || displayQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#04070d] text-sm text-white/70">Loading tablet display…</div>;
  }

  if (shareQuery.error || !shareQuery.data?.referralCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04070d] p-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Tablet setup is missing a driver share code.</p>
          <p className="mt-3 text-sm text-white/65">Open the full driver app once, make sure the driver account is active, then try again.</p>
          <Button className="mt-5" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (displayQuery.error || !displayQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04070d] p-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Unable to load the tablet ad board.</p>
          <p className="mt-3 text-sm text-white/65">{displayQuery.error?.message ?? "The screen is not ready yet."}</p>
          <Button className="mt-5" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdDisplayBoard
      driverName={displayQuery.data.driverName}
      referralCode={displayQuery.data.referralCode}
      shareUrl={shareQuery.data.shareUrl}
      optedIn={displayQuery.data.optedIn}
      items={displayQuery.data.items}
      showDeviceControls
      onSignOut={() => void logout()}
    />
  );
}

export default TabletAdKioskPage;
