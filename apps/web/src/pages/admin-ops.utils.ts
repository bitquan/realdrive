import type {
  CommunityProposal,
  DriverAccount,
  DuePaymentMethod,
  IssueReport,
  PlatformPayoutSettings,
  Ride
} from "@shared/contracts";

const docLabelMap: Record<string, string> = {
  insurance: "insurance",
  registration: "registration",
  background_check: "background check",
  mvr: "MVR"
};

function formatMissingDoc(type: string) {
  return docLabelMap[type] ?? type.replaceAll("_", " ");
}

function metadataKind(report: IssueReport) {
  const value = report.metadata && typeof report.metadata.kind === "string" ? report.metadata.kind : "other";
  return value === "feature_request" || value === "bug_report" ? value : "other";
}

export type DriverReviewStage = "ready" | "missing_docs" | "pending_review" | "approved" | "rejected";
export type DispatchPriorityMode = "dispatch_balance" | "manual_attention" | "highest_value";

export function getDriverReviewQueueMeta(driver: DriverAccount) {
  if (driver.approvalStatus === "rejected") {
    return {
      stage: "rejected" as DriverReviewStage,
      priority: 4,
      label: "Rejected",
      summary: "Needs admin follow-up before re-entry.",
      detail: "Review rejection notes, missing documents, and collector ownership before reopening.",
      blocker: "Application rejected"
    };
  }

  if (driver.approvalStatus === "approved") {
    return {
      stage: "approved" as DriverReviewStage,
      priority: 3,
      label: "Live",
      summary: driver.available ? "Approved and currently available." : "Approved but currently offline.",
      detail: driver.available ? "Driver can receive live dispatch now." : "Driver is ready for live dispatch once they go available.",
      blocker: null
    };
  }

  if (driver.documentReview.readyForApproval) {
    return {
      stage: "ready" as DriverReviewStage,
      priority: 0,
      label: "Ready to approve",
      summary: "All required documents are approved.",
      detail: "Final admin approval is the only remaining action before live access.",
      blocker: null
    };
  }

  if (driver.documentReview.missingTypes.length) {
    const nextMissing = driver.documentReview.missingTypes[0];
    return {
      stage: "missing_docs" as DriverReviewStage,
      priority: 1,
      label: "Missing docs",
      summary: `Waiting on ${driver.documentReview.missingTypes.length} required item${driver.documentReview.missingTypes.length === 1 ? "" : "s"}.`,
      detail: `Next blocker: ${formatMissingDoc(nextMissing)}.`,
      blocker: driver.documentReview.missingTypes.map(formatMissingDoc).join(", ")
    };
  }

  return {
    stage: "pending_review" as DriverReviewStage,
    priority: 2,
    label: "In review",
    summary: `${driver.documentReview.pendingCount} document review step${driver.documentReview.pendingCount === 1 ? "" : "s"} still pending.`,
    detail: driver.bgCheckOrderedAt
      ? `Background check ordered ${new Date(driver.bgCheckOrderedAt).toLocaleDateString()}.`
      : "Order or confirm the background-check workflow while documents are pending.",
    blocker: driver.bgCheckOrderedAt ? "Document review still pending" : "Background check follow-up"
  };
}

export function getScheduledRideOpsMeta(ride: Ride, now = new Date()) {
  if (!ride.scheduledFor) {
    return {
      bucket: "not_scheduled" as const,
      minutesUntilStart: null,
      label: "Not scheduled",
      detail: "This ride is already in the live queue.",
      score: 0
    };
  }

  const minutesUntilStart = Math.round((new Date(ride.scheduledFor).getTime() - now.getTime()) / 60_000);

  if (minutesUntilStart <= 0) {
    return {
      bucket: "release_now" as const,
      minutesUntilStart,
      label: "Release now",
      detail: "Scheduled start time has arrived or passed.",
      score: 100
    };
  }

  if (minutesUntilStart <= 30) {
    return {
      bucket: "release_soon" as const,
      minutesUntilStart,
      label: `Starts in ${minutesUntilStart} min`,
      detail: "Keep a driver lined up before release window opens.",
      score: 80 - minutesUntilStart
    };
  }

  return {
    bucket: "later" as const,
    minutesUntilStart,
    label: `Later today${minutesUntilStart > 60 ? ` · ${Math.round(minutesUntilStart / 60)} hr` : ""}`,
    detail: "Scheduled ride is parked outside the immediate release window.",
    score: Math.max(1, 40 - Math.round(minutesUntilStart / 30))
  };
}

export function getDispatchPriorityMeta(ride: Ride, mode: DispatchPriorityMode, now = new Date()) {
  const scheduledMeta = getScheduledRideOpsMeta(ride, now);
  const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;
  const activeWithoutPing = ["accepted", "en_route", "arrived", "in_progress"].includes(ride.status) && !ride.latestLocation;
  const targetedPending = Boolean(ride.test.targetDriverId) && !ride.driver;

  if (mode === "highest_value") {
    const score = Math.round(customerTotal);
    return {
      score,
      label: score >= 45 ? "High value" : "Standard value",
      detail: `Customer total ${customerTotal.toFixed(2)} keeps the highest-value jobs at the top.`,
      tone: score >= 45 ? "primary" : "default"
    } as const;
  }

  if (mode === "manual_attention") {
    const score = (activeWithoutPing ? 80 : 0) + (targetedPending ? 25 : 0) + (ride.payment.status !== "collected" ? 10 : 0);
    return {
      score,
      label: activeWithoutPing ? "Needs live ping" : targetedPending ? "Targeted follow-up" : "Normal watch",
      detail: activeWithoutPing
        ? "Driver is active without a fresh location ping."
        : targetedPending
          ? "This job is pinned to one driver and still awaiting acceptance."
          : "No special manual follow-up signal detected.",
      tone: score >= 60 ? "danger" : score >= 20 ? "warning" : "default"
    } as const;
  }

  const score =
    (scheduledMeta.bucket === "release_now" ? 100 : scheduledMeta.bucket === "release_soon" ? 70 : 20) +
    (ride.status === "requested" && !ride.driver ? 20 : 0) +
    (targetedPending ? 12 : 0);

  return {
    score,
    label: scheduledMeta.label,
    detail: scheduledMeta.detail,
    tone: scheduledMeta.bucket === "release_now" ? "danger" : scheduledMeta.bucket === "release_soon" ? "warning" : "default"
  } as const;
}

export function sortDispatchQueue(rides: Ride[], mode: DispatchPriorityMode, now = new Date()) {
  return [...rides].sort((left, right) => {
    const rightMeta = getDispatchPriorityMeta(right, mode, now);
    const leftMeta = getDispatchPriorityMeta(left, mode, now);
    if (rightMeta.score !== leftMeta.score) {
      return rightMeta.score - leftMeta.score;
    }

    const rightTime = new Date(right.scheduledFor ?? right.requestedAt ?? 0).getTime();
    const leftTime = new Date(left.scheduledFor ?? left.requestedAt ?? 0).getTime();
    return leftTime - rightTime;
  });
}

export function extractDueReference(input: { referenceText?: string | null; observedTitle?: string | null; observedNote?: string | null }) {
  const match = `${input.referenceText ?? ""} ${input.observedTitle ?? ""} ${input.observedNote ?? ""}`.match(/#DUES\d{6}/i);
  return match?.[0]?.toUpperCase() ?? null;
}

export function getDueWorkflowValidation(input: {
  status?: "open" | "paid" | "waived" | "void";
  paymentMethod?: DuePaymentMethod | null;
  observedTitle?: string | null;
  observedNote?: string | null;
  adminNote?: string | null;
  referenceCode?: string | null;
  referenceText?: string | null;
}) {
  const warnings: string[] = [];
  const status = input.status ?? "paid";
  const paymentMethod = input.paymentMethod ?? "cashapp";
  const memoCapable: DuePaymentMethod[] = ["cashapp", "zelle", "jim"];
  const detectedReference = input.referenceCode ?? extractDueReference(input);

  if (status === "paid" && memoCapable.includes(paymentMethod) && !input.observedTitle?.trim() && !input.observedNote?.trim()) {
    warnings.push("Memo-capable payments need the dues code captured in the title, note, or both.");
  }

  if (status === "paid" && (paymentMethod === "cash" || paymentMethod === "other") && !input.adminNote?.trim()) {
    warnings.push("Cash and other offline payments require an admin note before reconciliation.");
  }

  if (status === "paid" && !detectedReference) {
    warnings.push("A valid dues reference like #DUES000001 must be visible before reconciliation.");
  }

  return {
    ready: warnings.length === 0,
    warnings,
    referenceCode: detectedReference
  };
}

export function getPayoutInstructionPreview(settings: PlatformPayoutSettings | null | undefined) {
  const entries = [
    { label: "Cash App", value: settings?.cashAppHandle?.trim() || null },
    { label: "Zelle", value: settings?.zelleHandle?.trim() || null },
    { label: "Jim", value: settings?.jimHandle?.trim() || null },
    { label: "Cash", value: settings?.cashInstructions?.trim() || null },
    { label: "Other", value: settings?.otherInstructions?.trim() || null }
  ].filter((entry) => entry.value);

  return {
    entries,
    hasInstructions: entries.length > 0,
    updatedAtLabel: settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "Not updated yet"
  };
}

export function summarizeIssueReports(reports: IssueReport[], now = new Date()) {
  const lastDay = now.getTime() - 24 * 60 * 60 * 1000;

  return reports.reduce(
    (summary, report) => {
      const kind = metadataKind(report);
      if (kind === "feature_request") {
        summary.featureRequests += 1;
      }
      if (kind === "bug_report") {
        summary.bugReports += 1;
      }
      if (report.githubSyncStatus === "failed") {
        summary.failedSync += 1;
      }
      if (report.githubSyncStatus === "pending") {
        summary.pendingSync += 1;
      }
      if (new Date(report.createdAt).getTime() >= lastDay) {
        summary.recent24h += 1;
      }
      return summary;
    },
    {
      total: reports.length,
      featureRequests: 0,
      bugReports: 0,
      failedSync: 0,
      pendingSync: 0,
      recent24h: 0
    }
  );
}

export function getIssueReportKind(report: IssueReport) {
  return metadataKind(report);
}

export function getCommunityModerationMeta(proposal: CommunityProposal) {
  if (proposal.hidden) {
    return {
      priority: 100,
      label: "Hidden",
      detail: "This proposal is hidden from the shared board and may need a final decision."
    };
  }

  if (proposal.commentCount >= 5) {
    return {
      priority: 80,
      label: "Comment-heavy",
      detail: "High discussion volume means this thread needs active moderation."
    };
  }

  if (proposal.totalVotes >= 5 && proposal.noVotes > proposal.yesVotes) {
    return {
      priority: 70,
      label: "Negative signal",
      detail: "Down-vote pressure is higher than support right now."
    };
  }

  if (proposal.closed) {
    return {
      priority: 40,
      label: "Closed",
      detail: "Voting is closed, but comments and follow-up may still need review."
    };
  }

  return {
    priority: proposal.pinned ? 20 : 10,
    label: proposal.pinned ? "Pinned" : "Open",
    detail: proposal.pinned ? "Pinned items should stay accurate and current." : "Open proposal with no urgent moderation signal."
  };
}

export function sortModerationQueue(proposals: CommunityProposal[]) {
  return [...proposals].sort((left, right) => {
    const rightMeta = getCommunityModerationMeta(right);
    const leftMeta = getCommunityModerationMeta(left);

    if (rightMeta.priority !== leftMeta.priority) {
      return rightMeta.priority - leftMeta.priority;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}
