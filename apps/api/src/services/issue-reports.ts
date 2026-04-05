import type { IssueReport, IssueReportSource } from "@shared/contracts";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;

function redactPii(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.replace(EMAIL_PATTERN, "[redacted-email]").replace(PHONE_PATTERN, "[redacted-phone]").trim();
}

export function sanitizeIssueSummary(summary: string) {
  return redactPii(summary)?.slice(0, 280) ?? "";
}

export function sanitizeIssueDetails(details?: string) {
  const next = redactPii(details);
  return next ? next.slice(0, 4000) : null;
}

export function sanitizeIssuePage(page?: string) {
  const next = page?.trim();
  return next ? next.slice(0, 240) : null;
}

export function sanitizeIssueMetadata(metadata?: Record<string, string | number | boolean | null>) {
  if (!metadata) {
    return null;
  }

  const sanitized = Object.entries(metadata).slice(0, 20).reduce<Record<string, string | number | boolean | null>>((acc, [key, value]) => {
    const normalizedKey = key.trim().slice(0, 80);
    if (!normalizedKey) {
      return acc;
    }

    if (typeof value === "string") {
      acc[normalizedKey] = redactPii(value)?.slice(0, 500) ?? "";
      return acc;
    }

    acc[normalizedKey] = value;
    return acc;
  }, {});

  return Object.keys(sanitized).length ? sanitized : null;
}

function sourceLabel(source: IssueReportSource) {
  if (source === "rider_app") {
    return "Rider App";
  }

  if (source === "driver_app") {
    return "Driver App";
  }

  return "Admin Dashboard";
}

function buildGithubIssueBody(report: IssueReport) {
  const sections: string[] = [
    "## Issue report",
    `- Source: ${sourceLabel(report.source)}`,
    `- Reporter role: ${report.reporterRole}`,
    `- Report id: ${report.id}`,
    report.page ? `- Page: ${report.page}` : "- Page: (not provided)",
    report.rideId ? `- Ride id: ${report.rideId}` : "- Ride id: (not provided)",
    "",
    "## Summary",
    report.summary
  ];

  if (report.details) {
    sections.push("", "## Details", report.details);
  }

  if (report.metadata && Object.keys(report.metadata).length) {
    sections.push("", "## Metadata", "```json", JSON.stringify(report.metadata, null, 2), "```");
  }

  return sections.join("\n");
}

export async function createGitHubIssueForReport(report: IssueReport, config: { githubRepo: string; githubToken: string }) {
  if (!config.githubRepo || !config.githubToken) {
    throw new Error("GitHub issue sync is not configured");
  }

  const isFeatureRequest = report.metadata?.kind === "feature_request";

  const labels = [
    "source:in-app-report",
    `role:${report.reporterRole}`,
    ...(isFeatureRequest ? ["feature:request"] : ["user-reported"]),
  ];

  const titlePrefix = isFeatureRequest ? "[Feature]" : `[${sourceLabel(report.source)}]`;

  const response = await fetch(`https://api.github.com/repos/${config.githubRepo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: `${titlePrefix} ${report.summary}`,
      body: buildGithubIssueBody(report),
      labels,
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "GitHub issue creation failed");
  }

  const payload = (await response.json()) as { number: number; html_url: string };

  return {
    issueNumber: payload.number,
    issueUrl: payload.html_url
  };
}
