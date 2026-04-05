import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

export function AdsVisitPage() {
  const { redirectToken = "" } = useParams();
  const visitQuery = useQuery({
    queryKey: ["ad-visit", redirectToken],
    queryFn: () => api.resolveAdVisit(redirectToken),
    enabled: Boolean(redirectToken),
    retry: false
  });

  useEffect(() => {
    if (visitQuery.data?.destinationUrl) {
      window.location.replace(visitQuery.data.destinationUrl);
    }
  }, [visitQuery.data]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-4xl border border-ops-border-soft bg-ops-surface/85 px-8 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-ops-muted">RealDrive ads</p>
        <h1 className="mt-3 text-2xl font-semibold text-ops-text">Redirecting…</h1>
        <p className="mt-3 text-sm text-ops-muted">
          {visitQuery.error ? visitQuery.error.message : visitQuery.data ? `Opening ${visitQuery.data.businessName}.` : "Logging the visit and opening the ad destination."}
        </p>
      </div>
    </div>
  );
}
