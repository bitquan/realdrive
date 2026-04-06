import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormActions, FormField, FormLayout } from "@/components/ui/form-layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

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
  const toast = useToast();
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
      toast.success("Bug report submitted", "Thanks, the report is queued for engineering triage.");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Bug report failed");
      toast.error("Bug report failed", error instanceof Error ? error.message : "Please try again.");
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
        <CardContent>
          <FormLayout>
            <FormField label="Bug summary" htmlFor="bugSummary">
              <Input
                id="bugSummary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Example: Driver dashboard freezes after accepting a ride"
              />
            </FormField>

            <FormField label="What happened" htmlFor="actualBehavior">
              <Textarea
                id="actualBehavior"
                className="min-h-28"
                value={actualBehavior}
                onChange={(event) => setActualBehavior(event.target.value)}
                placeholder="Describe the visible problem in plain language. No error code is required."
              />
            </FormField>

            <FormField label="What you expected" htmlFor="expectedBehavior">
              <Textarea
                id="expectedBehavior"
                className="min-h-24"
                value={expectedBehavior}
                onChange={(event) => setExpectedBehavior(event.target.value)}
                placeholder="What should have happened instead?"
              />
            </FormField>

            <FormField label="Steps to reproduce" htmlFor="reproduceSteps">
              <Textarea
                id="reproduceSteps"
                className="min-h-32"
                value={reproduceSteps}
                onChange={(event) => setReproduceSteps(event.target.value)}
                placeholder="1. Open the page\n2. Tap the action\n3. Describe what broke"
              />
            </FormField>

            {feedback ? <p className="text-sm text-ops-muted">{feedback}</p> : null}

            <FormActions>
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
            </FormActions>
          </FormLayout>
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