import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DriverStatusBarProps {
  available: boolean;
  suspended: boolean;
  blockedReason: string | null;
  dispatchSummary: string;
  availabilityPending: boolean;
  onToggleAvailability: () => void;
}

export function DriverStatusBar({
  available,
  suspended,
  blockedReason,
  dispatchSummary,
  availabilityPending,
  onToggleAvailability
}: DriverStatusBarProps) {
  const statusLabel = suspended ? "Blocked" : available ? "Online" : "Offline";
  const statusDetail = blockedReason ?? (available ? "Visible for live dispatch." : "Sign on to start receiving nearby jobs.");

  return (
    <section className="sticky top-3 z-20 rounded-[1.7rem] border border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(8,11,16,0.94))] px-4 py-3.5 shadow-elevated backdrop-blur md:top-4 md:px-5 md:py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={suspended ? "border-ops-destructive/28 bg-ops-destructive/12 text-ops-destructive" : available ? "border-ops-success/28 bg-ops-success/12 text-ops-success" : "border-ops-border-soft bg-ops-panel/80 text-ops-text"}>
              {statusLabel}
            </Badge>
            <Badge className="border-ops-border-soft bg-ops-panel/82 text-ops-text">{dispatchSummary}</Badge>
          </div>
          <p className="mt-2 text-sm text-ops-muted">{statusDetail}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant={available ? "outline" : "default"}
            disabled={availabilityPending || (!available && suspended)}
            onClick={onToggleAvailability}
          >
            {available ? "Go offline" : suspended ? "Blocked from sign-on" : "Go online"}
          </Button>
        </div>
      </div>
    </section>
  );
}
