import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type RoadmapFeature, type RoadmapResponse } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export function RoadmapPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<RoadmapResponse>({
    queryKey: ["roadmap"],
    queryFn: () => api.getRoadmap(token || ""),
    enabled: !!token
  });

  const voteMutation = useMutation({
    mutationFn: async ({ featureId, vote }: { featureId: string; vote: boolean }) => {
      return api.voteRoadmapFeature(featureId, vote, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    }
  });

  const handleVote = (featureId: string, currentVoted: boolean) => {
    if (!user || !token) {
      // TODO: redirect to login
      return;
    }
    voteMutation.mutate({ featureId, vote: !currentVoted });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Loading roadmap...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">Failed to load roadmap</div>
      </div>
    );
  }

  const features = data?.features || [];
  const nowFeatures = features.filter(f => f.phase === "now");
  const nextFeatures = features.filter(f => f.phase === "next");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Product Roadmap</h1>
        <p className="text-gray-600 text-lg">
          See what we're building and help us prioritize future features.
        </p>
      </div>

      {/* Phase A: Now */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <h2 className="text-2xl font-bold">Now (Active Work)</h2>
        </div>
        <div className="grid gap-4">
          {nowFeatures.length > 0 ? (
            nowFeatures.map(feature => (
              <RoadmapFeatureCard
                key={feature.id}
                feature={feature}
                onVote={handleVote}
                votingInProgress={voteMutation.isPending}
              />
            ))
          ) : (
            <div className="text-gray-400 text-center py-8">No features in active work</div>
          )}
        </div>
      </section>

      {/* Phase B: Next */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <h2 className="text-2xl font-bold">Next (Planned)</h2>
        </div>
        <div className="grid gap-4">
          {nextFeatures.length > 0 ? (
            nextFeatures.map(feature => (
              <RoadmapFeatureCard
                key={feature.id}
                feature={feature}
                onVote={handleVote}
                votingInProgress={voteMutation.isPending}
              />
            ))
          ) : (
            <div className="text-gray-400 text-center py-8">No planned features</div>
          )}
        </div>
      </section>

      <div className="border-t pt-8 mt-12">
        <p className="text-sm text-gray-500 text-center">
          Total votes: {data?.totalVotes || 0} | {user ? "Logged in" : "Log in to vote"}
        </p>
      </div>
    </div>
  );
}

interface RoadmapFeatureCardProps {
  feature: RoadmapFeature;
  onVote: (featureId: string, currentVoted: boolean) => void;
  votingInProgress: boolean;
}

function RoadmapFeatureCard({ feature, onVote, votingInProgress }: RoadmapFeatureCardProps) {
  const impactColor = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700"
  }[feature.impact];

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <span className={`text-xs px-2 py-1 rounded ${impactColor}`}>
              {feature.impact} impact
            </span>
          </div>
          <p className="text-gray-600 mb-3">{feature.description}</p>
          <div className="text-sm text-gray-500">
            {feature.area}
          </div>
        </div>

        <button
          onClick={() => onVote(feature.id, feature.userVoted)}
          disabled={votingInProgress}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            feature.userVoted
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          } ${votingInProgress ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-xl">👍</span>
          <span className="text-sm font-semibold">{feature.voteCount}</span>
        </button>
      </div>
    </div>
  );
}
