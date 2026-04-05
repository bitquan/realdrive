import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AdDisplayBoard } from "@/components/ads/ad-display-board";
import { api } from "@/lib/api";

export function AdsDisplayPage() {
  const { referralCode = "" } = useParams();
  const displayQuery = useQuery({
    queryKey: ["public-ad-display", referralCode],
    queryFn: () => api.getPublicAdDisplay(referralCode),
    enabled: Boolean(referralCode),
    retry: false,
    refetchInterval: 60_000
  });
  const shareUrl = useMemo(() => {
    if (!referralCode) {
      return "";
    }

    return typeof window === "undefined" ? `/share/${referralCode}` : new URL(`/share/${referralCode}`, window.location.origin).toString();
  }, [referralCode]);

  if (displayQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#04070d] text-sm text-white/70">Loading display…</div>;
  }

  if (displayQuery.error || !displayQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04070d] p-6 text-center text-sm text-rose-300">
        {displayQuery.error?.message ?? "Ad display not available."}
      </div>
    );
  }

  return (
    <AdDisplayBoard
      driverName={displayQuery.data.driverName}
      referralCode={displayQuery.data.referralCode}
      shareUrl={shareUrl}
      optedIn={displayQuery.data.optedIn}
      items={displayQuery.data.items}
    />
  );
}
