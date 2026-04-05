import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Lightbulb } from "lucide-react";
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

export function RequestFeaturePage() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState(searchParams.get("summary") ?? "");
  const [details, setDetails] = useState("");
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
    mutationFn: () =>
      api.submitIssueReport(
        {
          source,
          summary: summary.trim(),
          details: details.trim() || undefined,
          page: contextPath,
          rideId: source === "rider_app" ? rideId : undefined,
          metadata: {
            kind: "feature_request",
            requestedFromRole: user?.role ?? "unknown"
          }
        },
        token!
      ),
    onSuccess: () => {
      setFeedback("Feature request submitted. Thank you.");
      setDetails("");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Feature request failed");
    }
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.68fr_0.32fr]">
      <Card>
        <CardHeader>
          <CardTitle>Request a feature</CardTitle>
          <CardDescription>
            Share the improvement you want. We route this into the engineering queue and GitHub workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="featureSummary">Feature summary</Label>
            <Input
              id="featureSummary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Example: Add a rider receipt view after trip completion"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="featureDetails">Why this matters</Label>
            <textarea
              id="featureDetails"
              className="min-h-36 w-full rounded-2xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 py-3 text-sm text-ops-text outline-none transition focus:border-ops-primary/40"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What should happen, who it helps, and what result you expect."
            />
          </div>

          {feedback ? <p className="text-sm text-ops-muted">{feedback}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={submitMutation.isPending || summary.trim().length < 4 || details.trim().length < 10}
              onClick={() => submitMutation.mutate()}
            >
              Submit feature request
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
            <Lightbulb className="h-4 w-4" />
            Submission tips
          </CardTitle>
          <CardDescription>Short requests with clear outcomes get implemented faster.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ops-muted">
          <p>1) Describe one feature, not multiple unrelated changes.</p>
          <p>2) Include what screen and role are affected.</p>
          <p>3) Describe expected behavior in one or two sentences.</p>
          <p>4) Add useful edge cases only when needed.</p>
        </CardContent>
      </Card>
    </div>
  );
}
