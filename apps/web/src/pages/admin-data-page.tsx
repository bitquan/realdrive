import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock3, Route, Users } from "lucide-react";
import {
  DataField,
  EntityList,
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const WINDOW_OPTIONS = [15, 30, 60] as const;

export function AdminDataPage() {
  const { token } = useAuth();
  const [windowMinutes, setWindowMinutes] = useState<(typeof WINDOW_OPTIONS)[number]>(30);

  const activityQuery = useQuery({
    queryKey: ["admin-activity", windowMinutes],
    queryFn: () => api.getAdminActivity(token!, windowMinutes),
    enabled: Boolean(token),
    refetchInterval: 30_000
  });

  const activity = activityQuery.data;

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Admin data"
        title="Live activity monitor"
        description="Watch how many people are currently active and which pages are getting traffic in near real-time."
      />

      <div className="flex flex-wrap gap-2">
        {WINDOW_OPTIONS.map((minutes) => {
          const active = minutes === windowMinutes;
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => setWindowMinutes(minutes)}
              className={`inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition ${
                active
                  ? "border-ops-primary/40 bg-ops-primary/16 text-ops-text"
                  : "border-ops-border bg-ops-panel/70 text-ops-muted hover:border-ops-primary/28 hover:text-ops-text"
              }`}
            >
              Last {minutes} min
            </button>
          );
        })}
      </div>

      <MetricStrip>
        <MetricCard
          label="Active visitors"
          value={activity?.activeVisitors ?? (activityQuery.isLoading ? "..." : 0)}
          meta={`Seen in last ${windowMinutes} minutes`}
          icon={Users}
          tone="primary"
        />
        <MetricCard
          label="Visitors (24h)"
          value={activity?.visitors24h ?? (activityQuery.isLoading ? "..." : 0)}
          meta="Unique sessions first seen in 24h"
          icon={Activity}
        />
        <MetricCard
          label="Heartbeats (24h)"
          value={activity?.heartbeats24h ?? (activityQuery.isLoading ? "..." : 0)}
          meta="Approx page activity signal"
          icon={Clock3}
        />
        <MetricCard
          label="Tracked pages"
          value={activity?.topPaths.length ?? 0}
          meta="Top paths by heartbeat volume"
          icon={Route}
        />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <PanelSection title="Top paths" description="Most active routes in the last 24h.">
          <EntityList>
            {activity?.topPaths.length ? (
              activity.topPaths.map((entry) => (
                <div key={entry.path} className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                  <DataField label="Path" value={entry.path} subtle={`${entry.hits} heartbeats`} />
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No path activity recorded yet.
              </div>
            )}
          </EntityList>
        </PanelSection>

        <PanelSection title="Recent visitors" description="Latest sessions seen in the last 24h.">
          <EntityList>
            {activity?.recentVisitors.length ? (
              activity.recentVisitors.map((visitor) => (
                <div key={visitor.sessionId} className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <DataField label="Session" value={visitor.sessionId} subtle={visitor.userId ? `User: ${visitor.userId}` : "Anonymous"} />
                    <DataField label="Last path" value={visitor.lastPath ?? "(unknown)"} subtle={`${visitor.heartbeatCount} heartbeats`} />
                    <DataField label="First seen" value={formatDateTime(visitor.firstSeenAt)} />
                    <DataField label="Last seen" value={formatDateTime(visitor.lastSeenAt)} subtle={visitor.referrer || "No referrer"} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No sessions recorded yet.
              </div>
            )}
          </EntityList>
        </PanelSection>
      </div>
    </div>
  );
}
