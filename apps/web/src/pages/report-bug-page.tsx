import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type IssueSource = "rider_app" | "driver_app" | "admin_dashboard";

const VALID_SOURCES: IssueSource[] = ["rider_app", "driver_app", "admin_dashboard"];

function sourceFromRole(role: string | undefined): IssueSource {
  if (role === "admin") {
    return "admin_dashboard";
  }

  if (role === "driver") {
    return "driver_app";
  }

  return "rider_app";
}

export function ReportBugPage() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState(searchParams.get("summary") ?? "");
  const [actualBehavior, setActualBehavior] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [reproduceSteps, setReproduceSteps] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const source = useMemo<IssueSource>(() => {
    const fromQuery = searchParams.get("source");
    if (fromQuery && VALID_SOURCES.includes(fromQuery as IssueSource)) {
      return fromQuery as IssueSource;
    }

    return sourceFromRole(user?.role);
  }, [searchParams, user?.role]);

  const contextPath = searchParams.get("contextPath") ?? window.location.pathname;
  const rideId = searchParams.get("rideId")?.trim() || undefined;

  const submitMutation = useMutation({
    mutationFn: () => {
      const details = [
        `What happened:\n${actualBehavior.trim()}`,
        `Expected:\n${expectedBehavior.trim()}`,
        `Steps to reproduce:\n${reproduceSteps.trim()}`
      ].join("\n\n");

      return api.submitIssueReport(
        {
          source,
          summary: summary.trim(),
          details,
          page: contextPath,
          rideId: source === "rider_app" ? rideId : undefined,
          metadata: {
            kind: "bug_report",
            requestedFromRole: user?.role ?? "unknown",
            hasVisibleErrorCode: false
          }
        },
        token!
      );
    },
    onSuccess: () => {
      setFeedback("Bug report submitted. Thank you.");
      setActualBehavior("");
      setExpectedBehavior("");
      setReproduceSteps("");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Bug report failed");
    }
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.68fr_0.32fr]">
      <Card>
        <CardHeader>
          <CardTitle>Report a bug</CardTitle>
          <CardDescription>
            Send a clear bug report even if no error code showed up. We attach context and route it into the engineering queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bugSummary">Bug summary</Label>
            <Input
              id="bugSummary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Example: Driver dashboard freezes after accepting a ride"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actualBehavior">What happened</Label>
            <textarea
              id="actualBehavior"
              className="min-h-28 w-full rounded-2xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 py-3 text-sm text-ops-text outline-none transition focus:border-ops-primary/40"
              value={actualBehavior}
              onChange={(event) => setActualBehavior(event.target.value)}
              placeholder="Describe the visible problem in plain language. No error code is required."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedBehavior">What you expected</Label>
            <textarea
              id="expectedBehavior"
              className="min-h-24 w-full rounded-2xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 py-3 text-sm text-ops-text outline-none transition focus:border-ops-primary/40"
              value={expectedBehavior}
              onChange={(event) => setExpectedBehavior(event.target.value)}
              placeholder="What should have happened instead?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reproduceSteps">Steps to reproduce</Label>
            <textarea
              id="reproduceSteps"
              className="min-h-32 w-full rounded-2xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 py-3 text-sm text-ops-text outline-none transition focus:border-ops-primary/40"
              value={reproduceSteps}
              onChange={(event) => setReproduceSteps(event.target.value)}
              placeholder="1. Open the page\n2. Tap the action\n3. Describe what broke"
            />
          </div>

          {feedback ? <p className="text-sm text-ops-muted">{feedback}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                submitMutation.isPending ||
                summary.trim().length < 5 ||
                actualBehavior.trim().length < 10 ||
                expectedBehavior.trim().length < 6 ||
                reproduceSteps.trim().length < 8
              }
              onClick={() => submitMutation.mutate()}
            >
              Submit bug report
            </Button>
            <Link
              to={source === "admin_dashboard" ? "/admin" : source === "driver_app" ? "/driver" : "/rider/rides"}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
            >
              Back
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Bug report tips
          </CardTitle>
          <CardDescription>Short, specific notes help us reproduce the issue faster.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ops-muted">
          <p>1) Explain the visible bug, even if there was no error code.</p>
          <p>2) Name the page, trip, or role involved when possible.</p>
          <p>3) Include the last action you took before the issue showed up.</p>
          <p>4) One report per bug keeps the fixes easier to track.</p>
        </CardContent>
      </Card>
    </div>
  );
}