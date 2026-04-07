import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bug, Lightbulb, Loader2, ThumbsUp } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type RoadmapFeature, type RoadmapResponse } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export function RoadmapPage() {
  const { user, token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<RoadmapResponse>({
    queryKey: ["roadmap"],
    queryFn: () => (token ? api.getRoadmap(token) : api.getPublicRoadmap())
  });

  const voteMutation = useMutation({
    mutationFn: async ({ featureId, vote }: { featureId: string; vote: boolean }) => {
      if (!token) {
        throw new Error("Sign in to vote on roadmap priorities.");
      }

      return api.voteRoadmapFeature(featureId, vote, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      toast.success("Roadmap vote updated", "Thanks for helping prioritize upcoming work.");
    },
    onError: (voteError) => {
      toast.error("Vote not saved", voteError instanceof Error ? voteError.message : "Please try again.");
    }
  });

  const handleVote = (featureId: string, currentVoted: boolean) => {
    if (!token || !user) {
      toast.error("Sign in required", "Use the live app first, then return to vote.");
      return;
    }

    voteMutation.mutate({ featureId, vote: !currentVoted });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-ops-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading roadmap...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4" />
          Failed to load roadmap.
        </CardContent>
      </Card>
    );
  }

  const features = data?.features || [];
  const nowFeatures = features.filter((feature) => feature.phase === "now");
  const nextFeatures = features.filter((feature) => feature.phase === "next");
  const completedFeatures = features.filter((feature) => feature.phase === "completed");
  const requestFeaturePath = user ? `/request-feature?source=${sourceFromRole(user.role)}&contextPath=%2Froadmap` : "/";
  const reportBugPath = user ? `/report-bug?source=${sourceFromRole(user.role)}&contextPath=%2Froadmap` : "/";
  const stats = [
    { label: "Active now", value: String(nowFeatures.length), tone: "success" as const },
    { label: "Planned next", value: String(nextFeatures.length), tone: "primary" as const },
    { label: "Total votes", value: String(data?.totalVotes || 0), tone: "default" as const }
  ];

  return (
    <div className="space-y-3 pb-24 md:space-y-4 md:pb-0">
      <PageHero
        eyebrow="Roadmap"
        icon={Lightbulb}
        title="Track the live roadmap from the same mobile shell"
        description={token ? "Vote on current priorities and jump into the existing feature or bug intake routes without leaving the public mobile flow." : "Browse active and planned work, then sign in when you want to vote or submit intake."}
        compact
        aside={(
          <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Mobile roadmap</p>
            <p className="mt-2 font-semibold text-ops-text">Same workflow, cleaner on phone</p>
            <div className="mt-2.5 space-y-1.5 text-ops-muted">
              <p>See active and next work quickly.</p>
              <p>Vote when signed in.</p>
              <p>Use the real intake routes for follow-up.</p>
            </div>
          </div>
        )}
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={
              stat.tone === "success"
                ? "rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/10 p-3.5"
                : stat.tone === "primary"
                  ? "rounded-[1.2rem] border border-ops-primary/25 bg-ops-primary/10 p-3.5"
                  : "rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5"
            }
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">{stat.label}</p>
            <p className="mt-2 text-lg font-semibold text-ops-text">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.7fr_0.3fr] md:gap-3.5">
      <div className="space-y-6">
        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
          <CardHeader>
            <CardTitle>Product roadmap</CardTitle>
            <CardDescription>
              Active and next-up product work. {token ? "Vote to prioritize." : "Sign in to vote and submit intake."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-ops-muted">
            Total votes: <span className="font-semibold text-ops-text">{data?.totalVotes || 0}</span>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <h2 className="text-lg font-semibold text-ops-text">Now (active work)</h2>
          </div>
          <div className="grid gap-3">
            {nowFeatures.length > 0 ? (
              nowFeatures.map((feature) => (
                <RoadmapFeatureCard
                  key={feature.id}
                  feature={feature}
                  onVote={handleVote}
                  votingInProgress={voteMutation.isPending}
                  canVote={Boolean(token)}
                />
              ))
            ) : (
              <Card><CardContent className="p-4 text-sm text-ops-muted">No active items currently listed.</CardContent></Card>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <h2 className="text-lg font-semibold text-ops-text">Next (planned)</h2>
          </div>
          <div className="grid gap-3">
            {nextFeatures.length > 0 ? (
              nextFeatures.map((feature) => (
                <RoadmapFeatureCard
                  key={feature.id}
                  feature={feature}
                  onVote={handleVote}
                  votingInProgress={voteMutation.isPending}
                  canVote={Boolean(token)}
                />
              ))
            ) : (
              <Card><CardContent className="p-4 text-sm text-ops-muted">No planned items currently listed.</CardContent></Card>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-lg font-semibold text-ops-text">Completed (shipped)</h2>
          </div>
          <div className="grid gap-3">
            {completedFeatures.length > 0 ? (
              completedFeatures.map((feature) => (
                <RoadmapFeatureCard
                  key={feature.id}
                  feature={feature}
                  onVote={handleVote}
                  votingInProgress={voteMutation.isPending}
                  canVote={Boolean(token)}
                />
              ))
            ) : (
              <Card><CardContent className="p-4 text-sm text-ops-muted">No completed items currently listed.</CardContent></Card>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-3">
        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
          <CardHeader>
            <CardTitle className="text-base">Keep intake in the live workflow</CardTitle>
            <CardDescription>Use the same issue intake routes that feed admin triage and GitHub sync.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to={requestFeaturePath}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              Request feature
            </Link>
            <Link
              to={reportBugPath}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
            >
              <Bug className="mr-2 h-4 w-4" />
              Report bug
            </Link>
            {!token ? <p className="text-xs text-ops-muted">Sign in first to submit intake and vote.</p> : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
          <CardHeader>
            <CardTitle className="text-base">Mobile notes</CardTitle>
            <CardDescription>Keep roadmap follow-up short and route-specific.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm text-ops-muted">
            <p>Vote on one item at a time so priorities stay clear.</p>
            <p>Use feature intake for improvements and bug intake for broken behavior.</p>
            <p>Link back to the exact screen whenever possible.</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

interface RoadmapFeatureCardProps {
  feature: RoadmapFeature;
  onVote: (featureId: string, currentVoted: boolean) => void;
  votingInProgress: boolean;
  canVote: boolean;
}

function sourceFromRole(role: "rider" | "driver" | "admin") {
  if (role === "admin") {
    return "admin_dashboard";
  }

  if (role === "driver") {
    return "driver_app";
  }

  return "rider_app";
}

function RoadmapFeatureCard({ feature, onVote, votingInProgress, canVote }: RoadmapFeatureCardProps) {
  const impactClassName = {
    high: "border-red-400/35 bg-red-500/15 text-red-200",
    medium: "border-amber-400/35 bg-amber-500/15 text-amber-200",
    low: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
  }[feature.impact];

  return (
    <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(17,22,31,0.98),rgba(11,15,22,0.99))]">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ops-text">{feature.title}</p>
            <Badge className={impactClassName}>{feature.impact} impact</Badge>
          </div>
          <p className="text-sm text-ops-muted">{feature.description}</p>
          <p className="text-xs uppercase tracking-wide text-ops-muted">{feature.area}</p>
        </div>

        <Button
          type="button"
          variant={feature.userVoted ? "default" : "outline"}
          onClick={() => onVote(feature.id, feature.userVoted)}
          disabled={votingInProgress || !canVote}
          className="h-auto min-w-[4.5rem] flex-col gap-1 py-2"
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs font-semibold">{feature.voteCount}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
