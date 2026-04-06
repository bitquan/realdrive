import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bug, ExternalLink, LayoutDashboard, Lightbulb, RefreshCcw } from "lucide-react";
import type { IssueReport } from "@shared/contracts";
import { Link } from "react-router-dom";
import {
  DataField,
  EntityList,
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { getIssueReportKind, summarizeIssueReports } from "./admin-ops.utils";

type KindFilter = "all" | "feature_request" | "bug_report";
type SyncFilter = "all" | IssueReport["githubSyncStatus"];

function syncBadgeClass(status: IssueReport["githubSyncStatus"]) {
  if (status === "synced") {
    return "border-ops-success/30 bg-ops-success/12 text-ops-success";
  }

  if (status === "failed") {
    return "border-ops-destructive/30 bg-ops-destructive/12 text-ops-destructive";
  }

  return "border-ops-warning/30 bg-ops-warning/12 text-ops-warning";
}

export function AdminFeatureRequestsPage() {
  const { token } = useAuth();
  const [kindFilter, setKindFilter] = useState<KindFilter>("feature_request");
  const [syncFilter, setSyncFilter] = useState<SyncFilter>("all");
  const [search, setSearch] = useState("");

  const reportsQuery = useQuery({
    queryKey: ["admin-issue-reports"],
    queryFn: () => api.listAdminIssueReports(token!),
    enabled: Boolean(token)
  });

  const reports = reportsQuery.data?.reports ?? [];
  const summary = useMemo(() => summarizeIssueReports(reports), [reports]);
  const filteredReports = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return reports.filter((report) => {
      const kind = getIssueReportKind(report);
      if (kindFilter !== "all" && kind !== kindFilter) {
        return false;
      }
      if (syncFilter !== "all" && report.githubSyncStatus !== syncFilter) {
        return false;
      }
      if (!searchValue) {
        return true;
      }
      return [report.summary, report.page ?? "", report.source, report.reporterRole]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [kindFilter, reports, search, syncFilter]);

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Product intake"
        title="Feature request triage dashboard"
        description="Review in-app feature requests and bug reports, spot GitHub sync failures, and keep the admin roadmap intake moving without leaving the ops shell."
        actions={[
          { label: "Admin overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" },
          { label: "Dispatch", to: "/admin/dispatch", icon: RefreshCcw, variant: "ghost" }
        ]}
        aside={
          <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Routing rule</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ops-muted">
              <p>Feature requests continue to come through the existing in-app intake and GitHub sync path.</p>
              <p>Use this queue to decide what needs follow-up, more context, or manual GitHub cleanup.</p>
            </div>
            <Link
              to="/request-feature?source=admin_dashboard&contextPath=%2Fadmin%2Ffeature-requests"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              Submit test request
            </Link>
          </div>
        }
      />

      <MetricStrip className="xl:grid-cols-4">
        <MetricCard label="Feature requests" value={summary.featureRequests} meta="Requests from rider, driver, and admin shells" icon={Lightbulb} tone="primary" />
        <MetricCard label="Bug reports" value={summary.bugReports} meta="User-submitted defects in the same intake" icon={Bug} tone="warning" />
        <MetricCard label="Pending sync" value={summary.pendingSync} meta="Still waiting on GitHub issue sync" icon={RefreshCcw} />
        <MetricCard label="Failed sync" value={summary.failedSync} meta="Needs manual GitHub follow-up" icon={AlertTriangle} tone="danger" />
      </MetricStrip>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search summary, page, source, or role" />
        <select
          value={kindFilter}
          onChange={(event) => setKindFilter(event.target.value as KindFilter)}
          className="h-11 rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
        >
          <option value="all">All intake</option>
          <option value="feature_request">Feature requests</option>
          <option value="bug_report">Bug reports</option>
        </select>
        <select
          value={syncFilter}
          onChange={(event) => setSyncFilter(event.target.value as SyncFilter)}
          className="h-11 rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
        >
          <option value="all">All sync states</option>
          <option value="pending">Pending</option>
          <option value="synced">Synced</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <PanelSection
        title="Incoming reports"
        description="The queue keeps feature requests and bug reports together so admins can compare theme, source, and sync state quickly."
      >
        <EntityList>
          {filteredReports.length ? (
            filteredReports.map((report) => {
              const kind = getIssueReportKind(report);
              return (
                <div key={report.id} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ops-text">{report.summary}</p>
                        <Badge className={kind === "feature_request" ? "bg-ops-primary/18 text-ops-primary" : "bg-ops-warning/18 text-ops-warning"}>
                          {kind === "feature_request" ? "feature request" : kind === "bug_report" ? "bug report" : "intake"}
                        </Badge>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${syncBadgeClass(report.githubSyncStatus)}`}>
                          {report.githubSyncStatus}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DataField label="Reporter" value={report.reporterRole} subtle={report.source.replaceAll("_", " ")} />
                        <DataField label="Page" value={report.page ?? "Not provided"} />
                        <DataField label="Created" value={formatDateTime(report.createdAt)} />
                        <DataField label="GitHub" value={report.githubIssueNumber ? `#${report.githubIssueNumber}` : "Not synced yet"} subtle={report.githubSyncError ?? "No sync error"} />
                      </div>

                      {report.details ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ops-muted">{report.details}</p> : null}
                    </div>

                    <div className="w-full max-w-[18rem] space-y-3 rounded-[1.3rem] border border-ops-border-soft/90 bg-ops-panel/42 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Next step</p>
                      <p className="text-sm text-ops-muted">
                        {report.githubIssueUrl
                          ? "Open the GitHub issue, verify labels, and decide whether roadmap follow-up is needed."
                          : report.githubSyncStatus === "failed"
                            ? "Sync failed. Recreate or file manually in GitHub after reviewing the error text."
                            : "Wait for the async GitHub sync or refresh if this request was just submitted."}
                      </p>
                      {report.githubIssueUrl ? (
                        <a
                          href={report.githubIssueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open GitHub issue
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
              No issue reports match the current filters.
            </div>
          )}
        </EntityList>
      </PanelSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelSection title="Queue notes" description="Keep the intake flow tied to the existing production workflow.">
          <div className="space-y-3 text-sm text-ops-muted">
            <p>Feature requests should keep using /request-feature so they stay attached to role, page, and GitHub sync metadata.</p>
            <p>Bug reports should keep using /report-bug so the same queue can compare product demand and defects side by side.</p>
          </div>
        </PanelSection>
        <PanelSection title="Fresh activity" description="Most recent queue volume in the last 24 hours.">
          <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
            <p className="text-3xl font-bold tracking-[-0.03em] text-ops-text">{summary.recent24h}</p>
            <p className="mt-2 text-sm text-ops-muted">Reports submitted in the last 24 hours.</p>
          </div>
        </PanelSection>
      </div>
    </div>
  );
}
