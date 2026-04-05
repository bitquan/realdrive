import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CreditCard, Megaphone, QrCode } from "lucide-react";
import { MetricCard, MetricStrip, PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function BarChart({ items }: { items: Array<{ label: string; value: number; meta: string }> }) {
  if (!items.length) {
    return <p className="py-6 text-sm text-ops-muted">No ad analytics yet.</p>;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ops-text">{item.label}</span>
            <span className="text-ops-muted">{item.meta}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ops-panel/60">
            <div className="h-full rounded-full bg-ops-primary" style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminAdAnalyticsPage() {
  const { token } = useAuth();
  const adsQuery = useQuery({
    queryKey: ["admin-ads"],
    queryFn: () => api.listAdminAds(token!),
    enabled: Boolean(token)
  });
  const reportQuery = useQuery({
    queryKey: ["admin-report", "ads-analytics"],
    queryFn: () => api.getReportOverview(token!, "30d"),
    enabled: Boolean(token),
    staleTime: 60_000
  });

  const topAds = useMemo(
    () =>
      [...(adsQuery.data?.submissions ?? [])]
        .sort((left, right) => right.metrics.scanCount - left.metrics.scanCount || right.totalPrice - left.totalPrice)
        .slice(0, 8)
        .map((submission) => ({
          label: submission.businessName,
          value: submission.metrics.scanCount,
          meta: `${submission.metrics.eligibleScanCount} eligible · ${formatMoney(submission.metrics.pendingCreditTotal + submission.metrics.appliedCreditTotal)} credits`
        })),
    [adsQuery.data?.submissions]
  );

  const topDrivers = useMemo(
    () =>
      [...(adsQuery.data?.driverCredits ?? [])]
        .sort((left, right) => right.scanCount - left.scanCount || right.pendingTotal - left.pendingTotal)
        .slice(0, 8)
        .map((driver) => ({
          label: driver.driver.name,
          value: driver.scanCount,
          meta: `${driver.activeAdCount} live · pending ${formatMoney(driver.pendingTotal)}`
        })),
    [adsQuery.data?.driverCredits]
  );

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Admin"
        title="Ad analytics"
        description="Dedicated ad performance view for submissions, scan quality, driver credit, and who is producing the most traffic."
      />

      <MetricStrip>
        <MetricCard label="Collected revenue" value={formatMoney(reportQuery.data?.ads.collectedRevenue ?? 0)} meta="Paid ad submissions" icon={CreditCard} tone="success" />
        <MetricCard label="Pending revenue" value={formatMoney(reportQuery.data?.ads.pendingRevenue ?? 0)} meta="Approved or awaiting payment" icon={Megaphone} tone="warning" />
        <MetricCard label="Total scans" value={String(reportQuery.data?.ads.scanCount ?? 0)} meta={`Eligible ${reportQuery.data?.ads.eligibleScanCount ?? 0}`} icon={QrCode} tone="primary" />
        <MetricCard label="Duplicate blocked" value={String(reportQuery.data?.ads.duplicateBlockedCount ?? 0)} meta="Protected against repeat credit" icon={BarChart3} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelSection title="Top ads by scans" description="Highest-performing campaigns from the current submission set.">
          <BarChart items={topAds} />
        </PanelSection>
        <PanelSection title="Top drivers by ad scans" description="Drivers generating the most ad traffic and credit opportunity.">
          <BarChart items={topDrivers} />
        </PanelSection>
      </div>

      <PanelSection title="Submission table" description="Review scan totals, duplicate protection, slot placement, and credit impact in one place.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ops-border-soft text-left text-xs uppercase tracking-[0.18em] text-ops-muted">
                <th className="pb-3 pr-4">Business</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4 text-right">Slot</th>
                <th className="pb-3 pr-4 text-right">Scans</th>
                <th className="pb-3 pr-4 text-right">Eligible</th>
                <th className="pb-3 pr-4 text-right">Duplicates</th>
                <th className="pb-3 pr-4 text-right">Credits</th>
                <th className="pb-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(adsQuery.data?.submissions ?? []).map((submission) => (
                <tr key={submission.id} className="border-b border-ops-border-soft/50">
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium text-ops-text">{submission.businessName}</p>
                      <p className="text-xs text-ops-muted">{submission.assignedDriver?.name ?? "Unassigned"}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4 capitalize text-ops-muted">{submission.status.replaceAll("_", " ")}</td>
                  <td className="py-3 pr-4 text-right text-ops-text">{submission.slotRank}</td>
                  <td className="py-3 pr-4 text-right text-ops-text">{submission.metrics.scanCount}</td>
                  <td className="py-3 pr-4 text-right text-ops-text">{submission.metrics.eligibleScanCount}</td>
                  <td className="py-3 pr-4 text-right text-ops-text">{submission.metrics.blockedDuplicateCount}</td>
                  <td className="py-3 pr-4 text-right text-ops-text">{formatMoney(submission.metrics.pendingCreditTotal + submission.metrics.appliedCreditTotal)}</td>
                  <td className="py-3 text-right font-medium text-ops-text">{formatMoney(submission.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelSection>
    </div>
  );
}

export default AdminAdAnalyticsPage;
