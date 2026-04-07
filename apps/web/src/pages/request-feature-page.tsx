import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
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

export function RequestFeaturePage() {
  const { token, user } = useAuth();
  const toast = useToast();
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
      toast.success("Feature request submitted", "Your request is queued for review.");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Feature request failed");
      toast.error("Feature request failed", error instanceof Error ? error.message : "Please try again.");
    }
  });

  return (
    <div className="space-y-3 pb-24 md:space-y-4 md:pb-0">
      <PageHero
        eyebrow="Feature intake"
        icon={Lightbulb}
        title="Request a feature from the mobile shell"
        description="Send one clear improvement request through the same live intake flow used by admin triage and GitHub sync."
        compact
        aside={(
          <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Mobile intake</p>
            <p className="mt-2 font-semibold text-ops-text">Keep it short and specific</p>
            <div className="mt-2.5 space-y-1.5 text-ops-muted">
              <p>One feature per request.</p>
              <p>Name the role and screen.</p>
              <p>Describe the expected result.</p>
            </div>
          </div>
        )}
      />

      <div className="grid gap-3 xl:grid-cols-[0.68fr_0.32fr] md:gap-3.5">
      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
        <CardHeader>
          <CardTitle>Request a feature</CardTitle>
          <CardDescription>
            Share the improvement you want. We route this into the engineering queue and GitHub workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormLayout>
            <FormField label="Feature summary" htmlFor="featureSummary">
              <Input
                id="featureSummary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Example: Add a rider receipt view after trip completion"
              />
            </FormField>

            <FormField label="Why this matters" htmlFor="featureDetails">
              <Textarea
                id="featureDetails"
                className="min-h-36"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="What should happen, who it helps, and what result you expect."
              />
            </FormField>

            {feedback ? <p className="text-sm text-ops-muted">{feedback}</p> : null}

            <FormActions>
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
            </FormActions>
          </FormLayout>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
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
    </div>
  );
}
