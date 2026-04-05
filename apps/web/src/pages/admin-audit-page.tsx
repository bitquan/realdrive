import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { MetricCard, MetricStrip, PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function AdminAuditPage() {
  const { token } = useAuth();
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");

  const auditQuery = useQuery({
    queryKey: ["admin-audit-logs", actionFilter, entityTypeFilter],
    queryFn: () =>
      api.listAdminAuditLogs(token!, {
        limit: 200,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined
      }),
    enabled: Boolean(token)
  });

  const logs = auditQuery.data?.logs ?? [];
  const uniqueActions = useMemo(() => new Set(logs.map((log) => log.action)).size, [logs]);
  const uniqueEntities = useMemo(() => new Set(logs.map((log) => log.entityType)).size, [logs]);

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Admin"
        title="Audit trail"
        description="Review key admin and system actions with searchable operational logs."
      />

      <MetricStrip>
        <MetricCard label="Rows loaded" value={logs.length} meta="Last 200 entries max" icon={ClipboardList} tone="primary" />
        <MetricCard label="Unique actions" value={uniqueActions} meta="Action keys in result set" icon={Search} />
        <MetricCard label="Entity types" value={uniqueEntities} meta="Object categories touched" icon={ClipboardList} />
      </MetricStrip>

      <PanelSection title="Search audit logs" description="Filter by action and entity type to narrow results quickly.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ops-muted">Action contains</label>
            <Input value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} placeholder="pricing.auto_apply" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ops-muted">Entity type</label>
            <Input value={entityTypeFilter} onChange={(event) => setEntityTypeFilter(event.target.value)} placeholder="platformRates" />
          </div>
        </div>

        {auditQuery.error ? <p className="mt-4 text-sm text-ops-error">{auditQuery.error.message}</p> : null}

        <div className="mt-5 overflow-hidden rounded-2xl border border-ops-border-soft/90 bg-ops-surface/72">
          <div className="grid grid-cols-[170px_1fr_1fr_1fr_1fr] gap-3 border-b border-ops-border-soft/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ops-muted">
            <span>When</span>
            <span>Action</span>
            <span>Entity</span>
            <span>Actor</span>
            <span>Metadata</span>
          </div>

          <div className="max-h-[520px] overflow-auto">
            {logs.length ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[170px_1fr_1fr_1fr_1fr] gap-3 border-b border-ops-border-soft/40 px-4 py-3 text-sm text-ops-text"
                >
                  <span className="text-ops-muted">{formatDateTime(log.createdAt)}</span>
                  <span className="font-medium">{log.action}</span>
                  <span>{log.entityType}:{log.entityId}</span>
                  <span>{log.actorName ?? "System"}</span>
                  <span className="truncate text-ops-muted" title={JSON.stringify(log.metadata ?? {})}>
                    {JSON.stringify(log.metadata ?? {})}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-ops-muted">No audit entries found for current filters.</div>
            )}
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
