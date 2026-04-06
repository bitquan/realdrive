import type { Ride, RideStatus } from "@shared/contracts";
import { cn, formatDateTime } from "@/lib/utils";

const TIMELINE_SEQUENCE: Array<{ status: RideStatus; label: string }> = [
  { status: "requested", label: "Requested" },
  { status: "accepted", label: "Accepted" },
  { status: "en_route", label: "Driver en route" },
  { status: "arrived", label: "Driver arrived" },
  { status: "in_progress", label: "Trip started" },
  { status: "completed", label: "Completed" }
];

function normalizeStatus(status: RideStatus) {
  if (status === "offered") {
    return "requested";
  }

  if (status === "scheduled") {
    return "requested";
  }

  if (status === "draft") {
    return "requested";
  }

  if (status === "expired") {
    return "canceled";
  }

  return status;
}

function statusTimestamp(ride: Pick<Ride, "status" | "requestedAt" | "acceptedAt" | "startedAt" | "completedAt" | "canceledAt">, status: RideStatus) {
  if (status === "requested") {
    return ride.requestedAt;
  }

  if (status === "accepted" || status === "en_route" || status === "arrived") {
    return ride.acceptedAt;
  }

  if (status === "in_progress") {
    return ride.startedAt;
  }

  if (status === "completed") {
    return ride.completedAt;
  }

  if (status === "canceled") {
    return ride.canceledAt;
  }

  return null;
}

export function RideTimeline({
  ride,
  className,
  compact
}: {
  ride: Pick<Ride, "status" | "requestedAt" | "acceptedAt" | "startedAt" | "completedAt" | "canceledAt">;
  className?: string;
  compact?: boolean;
}) {
  const activeStatus = normalizeStatus(ride.status);
  const activeIndex = TIMELINE_SEQUENCE.findIndex((item) => item.status === activeStatus);

  return (
    <div className={cn("rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Ride timeline</p>
      <div className={cn("mt-3", compact ? "space-y-2" : "space-y-2.5")}>
        {TIMELINE_SEQUENCE.map((step, index) => {
          const done = activeIndex >= index;
          const current = activeIndex === index;
          const timestamp = statusTimestamp(ride, step.status);

          return (
            <div key={step.status} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                  done
                    ? "border-ops-primary/40 bg-ops-primary/18 text-ops-primary"
                    : "border-ops-border-soft bg-ops-surface text-ops-muted"
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className={cn("text-sm", current || done ? "font-semibold text-ops-text" : "text-ops-muted")}>{step.label}</p>
                {timestamp ? <p className="text-xs text-ops-muted">{formatDateTime(timestamp)}</p> : null}
              </div>
            </div>
          );
        })}
        {activeStatus === "canceled" ? (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ops-destructive/35 bg-ops-destructive/12 text-[10px] font-semibold text-ops-destructive">!</span>
            <div>
              <p className="text-sm font-semibold text-ops-destructive">Ride canceled</p>
              {ride.canceledAt ? <p className="text-xs text-ops-muted">{formatDateTime(ride.canceledAt)}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
