import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Car, DollarSign, ChevronDown } from "lucide-react";
import type { AdminReportOverview } from "@shared/contracts";
import {
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type Period = "7d" | "30d" | "90d" | "all";
const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time"
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function RidesBarChart({ data }: { data: AdminReportOverview["ridesPerDay"] }) {
  if (!data.length) return <p className="text-xs text-ops-muted py-4 text-center">No ride data for this period.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-[2px] h-20 w-full">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 bg-blue-500/50 rounded-sm min-h-0"
          style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 0)}%` }}
          title={`${d.date}: ${d.count} rides`}
        />
      ))}
    </div>
  );
}

export function AdminReportingPage() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [periodOpen, setPeriodOpen] = useState(false);

  const reportQuery = useQuery({
    queryKey: ["admin-report", period],
    queryFn: () => api.getReportOverview(token!, period),
    enabled: Boolean(token),
    staleTime: 60_000
  });

  const report = reportQuery.data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <SurfaceHeader
        eyebrow="Reporting"
        title="Performance Overview"
        description="Revenue, utilization, and driver metrics for your fleet."
        aside={
          <div className="relative flex justify-end">
            <Button
              variant="outline"
              onClick={() => setPeriodOpen((v) => !v)}
              className="gap-1"
            >
              {PERIOD_LABELS[period]}
              <ChevronDown className="h-3 w-3" />
            </Button>
            {periodOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-ops-surface border border-ops-border rounded-md shadow-lg min-w-36 py-1">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-ops-overlay transition-colors"
                    onClick={() => { setPeriod(p); setPeriodOpen(false); }}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {reportQuery.isLoading && (
        <p className="text-sm text-ops-muted animate-pulse">Loading report…</p>
      )}

      {report && (
        <>
          <PanelSection title="Revenue">
            <MetricStrip>
              <MetricCard label="Total Ride Revenue" value={formatCurrency(report.revenue.total)} icon={DollarSign} tone="success" />
              <MetricCard label="Dues Collected" value={formatCurrency(report.revenue.platformDuesCollected)} icon={DollarSign} tone="primary" />
              <MetricCard label="Dues Pending" value={formatCurrency(report.revenue.platformDuesPending)} icon={DollarSign} tone="warning" />
            </MetricStrip>
          </PanelSection>

          <PanelSection title="Ads">
            <MetricStrip>
              <MetricCard label="Ad Revenue Collected" value={formatCurrency(report.ads.collectedRevenue)} icon={DollarSign} tone="success" />
              <MetricCard label="Ad Revenue Pending" value={formatCurrency(report.ads.pendingRevenue)} icon={DollarSign} tone="warning" />
              <MetricCard label="Submissions" value={String(report.ads.submissions)} icon={Car} />
              <MetricCard label="Published" value={String(report.ads.published)} icon={Car} tone="primary" />
            </MetricStrip>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-ops-border-soft bg-ops-panel/45 p-4">
                <p className="text-xs uppercase tracking-widest text-ops-muted">Scans</p>
                <p className="mt-2 text-2xl font-semibold text-ops-text">{report.ads.scanCount}</p>
                <p className="mt-1 text-sm text-ops-muted">Eligible {report.ads.eligibleScanCount}</p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft bg-ops-panel/45 p-4">
                <p className="text-xs uppercase tracking-widest text-ops-muted">Duplicate blocked</p>
                <p className="mt-2 text-2xl font-semibold text-ops-text">{report.ads.duplicateBlockedCount}</p>
                <p className="mt-1 text-sm text-ops-muted">Protected from repeat-credit abuse</p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft bg-ops-panel/45 p-4">
                <p className="text-xs uppercase tracking-widest text-ops-muted">Driver credits</p>
                <p className="mt-2 text-2xl font-semibold text-ops-text">{formatCurrency(report.ads.pendingDriverCredits)}</p>
                <p className="mt-1 text-sm text-ops-muted">Applied {formatCurrency(report.ads.appliedDriverCredits)}</p>
              </div>
            </div>
          </PanelSection>

          <PanelSection title="Rides">
            <MetricStrip>
              <MetricCard label="Total" value={String(report.rides.total)} icon={Car} />
              <MetricCard label="Completed" value={String(report.rides.completed)} icon={Car} tone="success" />
              <MetricCard label="Cancelled" value={String(report.rides.canceled)} icon={Car} tone="danger" />
              <MetricCard label="Active / Requested" value={String(report.rides.requested)} icon={Car} tone="primary" />
            </MetricStrip>
            {report.ridesPerDay.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-ops-muted mb-3 uppercase tracking-widest">
                  Completed rides / day (last {report.ridesPerDay.length}d)
                </p>
                <RidesBarChart data={report.ridesPerDay} />
              </div>
            )}
          </PanelSection>

          <PanelSection title="Driver Fleet">
            <MetricStrip>
              <MetricCard label="Total Drivers" value={String(report.drivers.total)} icon={Users} />
              <MetricCard label="Approved" value={String(report.drivers.approved)} icon={Users} tone="success" />
              <MetricCard label="Available Now" value={String(report.drivers.available)} icon={Users} tone="primary" />
              <MetricCard
                label="Pending Approval"
                value={String(report.drivers.pendingApproval)}
                icon={Users}
                tone={report.drivers.pendingApproval > 0 ? "warning" : "default"}
              />
            </MetricStrip>
          </PanelSection>

          <PanelSection title="Rider Base">
            <MetricStrip>
              <MetricCard label="Total Riders" value={String(report.riders.total)} icon={Users} />
              <MetricCard label={`New (${PERIOD_LABELS[period]})`} value={String(report.riders.newInPeriod)} icon={Users} tone="primary" />
            </MetricStrip>
          </PanelSection>

          <PanelSection title="Top Drivers" description={`By completed rides — ${PERIOD_LABELS[period]}`}>
            {report.topDrivers.length === 0 ? (
              <p className="text-sm text-ops-muted py-4 text-center">No completed rides in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ops-border-soft text-left text-xs text-ops-muted uppercase tracking-widest">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Driver</th>
                      <th className="pb-2 pr-4 text-right">Rides</th>
                      <th className="pb-2 text-right">Est. Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topDrivers.map((d, i) => (
                      <tr key={d.driverId} className="border-b border-ops-border-soft/40 hover:bg-ops-panel/40 transition-colors">
                        <td className="py-2.5 pr-4 text-ops-muted">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium">{d.name}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{d.rideCount}</td>
                        <td className="py-2.5 text-right tabular-nums text-green-400">{formatCurrency(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelSection>
        </>
      )}
    </div>
  );
}

export default AdminReportingPage;
