import type { DriverAccount, DriverDispatchSettings } from "@shared/contracts";
import { CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DriverOnboardingChecklistProps {
  profile: DriverAccount | undefined;
  dispatchSettings: DriverDispatchSettings | undefined;
}

interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
}

export function DriverOnboardingChecklist({ profile, dispatchSettings }: DriverOnboardingChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: "documents",
      label: "Upload required documents",
      detail: profile?.documentReview.missingTypes.length
        ? `${profile.documentReview.missingTypes.length} required upload${profile.documentReview.missingTypes.length === 1 ? "" : "s"} still missing.`
        : profile?.documentReview.rejectedTypes.length
          ? `${profile.documentReview.rejectedTypes.length} document${profile.documentReview.rejectedTypes.length === 1 ? "" : "s"} need a re-upload.`
          : "Required onboarding documents are in place.",
      done:
        Boolean(profile) &&
        (profile?.documentReview.missingTypes.length ?? 1) === 0 &&
        (profile?.documentReview.rejectedTypes.length ?? 1) === 0
    },
    {
      id: "profile",
      label: "Complete profile and vehicle",
      detail:
        profile?.vehicle?.makeModel && profile.homeCity && profile.homeState
          ? `${profile.vehicle.makeModel} · ${profile.homeCity}, ${profile.homeState}`
          : "Add home market and vehicle basics so dispatch can present the right jobs.",
      done: Boolean(profile?.vehicle?.makeModel && profile?.homeCity && profile?.homeState)
    },
    {
      id: "payments",
      label: "Confirm accepted payment methods",
      detail: profile?.acceptedPaymentMethods.length
        ? `Accepting ${profile.acceptedPaymentMethods.length} rider payment option${profile.acceptedPaymentMethods.length === 1 ? "" : "s"}.`
        : "Choose which rider payment methods you can take in the field.",
      done: Boolean(profile?.acceptedPaymentMethods.length)
    },
    {
      id: "dispatch",
      label: "Set dispatch preferences",
      detail:
        dispatchSettings && (dispatchSettings.localEnabled || dispatchSettings.serviceAreaEnabled || dispatchSettings.nationwideEnabled)
          ? "Dispatch visibility is configured for the markets you want."
          : "Turn on at least one dispatch mode before you go live.",
      done: Boolean(dispatchSettings && (dispatchSettings.localEnabled || dispatchSettings.serviceAreaEnabled || dispatchSettings.nationwideEnabled))
    },
    {
      id: "approval",
      label: "Clear approval and go live",
      detail:
        profile?.approvalStatus === "approved"
          ? profile.available
            ? "Approved and online for live offers."
            : "Approved. Go online when you are ready for live offers."
          : profile?.approvalStatus === "rejected"
            ? "Approval needs attention before you can receive offers."
            : "Pending admin approval before live dispatch unlocks.",
      done: profile?.approvalStatus === "approved"
    }
  ];

  const completedCount = items.filter((item) => item.done).length;
  const pendingCount = items.length - completedCount;
  const ready = pendingCount === 0;

  return (
    <Card className="border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.98),rgba(8,11,16,0.96))]">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{ready ? "Driver launch checklist" : "Finish driver onboarding"}</CardTitle>
            <CardDescription className="mt-2">
              {ready
                ? "Everything needed for the driver shell is in place. Keep this list green as your account changes."
                : "Work through the remaining setup steps before relying on live dispatch."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-ops-border-soft bg-ops-panel/75 text-ops-text">{completedCount}/{items.length} done</Badge>
            <Badge className={cn(
              "border text-xs",
              ready ? "border-teal-500/25 bg-teal-500/12 text-teal-300" : "border-ops-warning/30 bg-ops-warning/10 text-ops-warning"
            )}>
              {ready ? "Ready for live work" : `${pendingCount} step${pendingCount === 1 ? "" : "s"} left`}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 rounded-[1.2rem] border px-4 py-3",
              item.done ? "border-teal-500/18 bg-teal-500/7" : "border-ops-border-soft/90 bg-ops-panel/40"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-teal-300" />
              ) : item.id === "approval" ? (
                <Clock3 className="h-5 w-5 text-ops-warning" />
              ) : (
                <CircleDashed className="h-5 w-5 text-ops-muted" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ops-text">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-ops-muted">{item.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
