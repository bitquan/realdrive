import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDateTime, roleLabel, userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { getCommunityModerationMeta, sortModerationQueue } from "./admin-ops.utils";

export function CommunityPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [moderationFilter, setModerationFilter] = useState<"all" | "attention" | "hidden">("attention");
  const [proposalForm, setProposalForm] = useState({
    title: "",
    body: ""
  });
  const [commentBody, setCommentBody] = useState("");
  const canModerate = userHasRole(user, "admin");

  const boardQuery = useQuery({
    queryKey: ["community-board"],
    queryFn: () => api.listCommunityProposals(token!),
    enabled: Boolean(token)
  });

  const adminBoardQuery = useQuery({
    queryKey: ["admin-community-board"],
    queryFn: () => api.listAdminCommunityProposals(token!),
    enabled: Boolean(token) && canModerate
  });

  const boardData = canModerate ? adminBoardQuery.data : boardQuery.data;

  useEffect(() => {
    const proposals = boardData?.proposals ?? [];
    if (!proposals.length) {
      setSelectedProposalId("");
      return;
    }

    const stillExists = proposals.some((proposal) => proposal.id === selectedProposalId);
    if (!selectedProposalId || !stillExists) {
      setSelectedProposalId(proposals[0].id);
    }
  }, [boardData?.proposals, selectedProposalId]);

  const commentsQuery = useQuery({
    queryKey: ["community-comments", selectedProposalId],
    queryFn: () => api.getCommunityComments(selectedProposalId, token!),
    enabled: Boolean(token) && Boolean(selectedProposalId)
  });

  const adminCommentsQuery = useQuery({
    queryKey: ["admin-community-comments", selectedProposalId],
    queryFn: () => api.getAdminCommunityComments(selectedProposalId, token!),
    enabled: Boolean(token) && Boolean(selectedProposalId) && canModerate
  });

  const commentsData = canModerate ? adminCommentsQuery.data : commentsQuery.data;

  const createProposalMutation = useMutation({
    mutationFn: () => api.createCommunityProposal(proposalForm, token!),
    onSuccess: (proposal) => {
      setProposalForm({ title: "", body: "" });
      setSelectedProposalId(proposal.id);
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-board"] });
    }
  });

  const voteMutation = useMutation({
    mutationFn: (choice: "yes" | "no") => api.voteOnCommunityProposal(selectedProposalId, { choice }, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-comments", selectedProposalId] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: () => api.createCommunityComment(selectedProposalId, { body: commentBody }, token!),
    onSuccess: () => {
      setCommentBody("");
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-comments", selectedProposalId] });
    }
  });

  const updateProposalMutation = useMutation({
    mutationFn: (input: { pinned?: boolean; closed?: boolean; hidden?: boolean }) =>
      api.updateCommunityProposal(selectedProposalId, input, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-comments", selectedProposalId] });
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, hidden }: { commentId: string; hidden: boolean }) =>
      api.updateCommunityComment(commentId, { hidden }, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-community-comments", selectedProposalId] });
    }
  });

  const proposals = boardData?.proposals ?? [];
  const moderationProposals = canModerate
    ? sortModerationQueue(
        proposals.filter((proposal) => {
          if (moderationFilter === "hidden") {
            return proposal.hidden;
          }
          if (moderationFilter === "attention") {
            return getCommunityModerationMeta(proposal).priority >= 70;
          }
          return true;
        })
      )
    : proposals;
  const eligibility = boardData?.eligibility;
  const selectedProposal =
    commentsData?.proposal ?? proposals.find((proposal) => proposal.id === selectedProposalId) ?? null;
  const comments = commentsData?.comments ?? [];

  const summary = useMemo(() => {
    if (!eligibility) {
      return "Loading community access...";
    }

    if (eligibility.reason) {
      return eligibility.reason;
    }

    return "You can read, post, vote, and comment on community proposals.";
  }, [eligibility]);

  const stats = [
    { label: canModerate ? "Queue items" : "Open proposals", value: String(moderationProposals.length) },
    { label: "Comments", value: String(comments.length) },
    { label: "Access", value: eligibility?.canCreateProposal ? "Posting on" : "Read only" }
  ];

  return (
    <div className="space-y-3 pb-[calc(7rem+env(safe-area-inset-bottom))] md:space-y-4 md:pb-0">
      <PageHero
        eyebrow="Community"
        title="RealDrive community board"
        description="One board, simple yes-or-no voting, flat comments, and a clear path for drivers and experienced riders to guide what gets built next."
        compact
        aside={(
          <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:p-4">
            <p className="font-semibold">{user ? `${user.name} · ${roleLabel(user.role)}` : "Community access"}</p>
            <p className="mt-2 text-ops-muted">{summary}</p>
          </div>
        )}
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5 transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">{stat.label}</p>
            <p className="mt-2 text-lg font-semibold text-ops-text">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
        <CardHeader>
          <CardTitle>Start a proposal</CardTitle>
          <CardDescription>
            Drivers can post immediately. Riders unlock posting after 51 completed rides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {eligibility?.canCreateProposal ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="proposalTitle">Title</Label>
                <Input
                  id="proposalTitle"
                  value={proposalForm.title}
                  onChange={(event) => setProposalForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Add live trip receipts to the rider page"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposalBody">Details</Label>
                <Textarea
                  id="proposalBody"
                  className="min-h-32"
                  value={proposalForm.body}
                  onChange={(event) => setProposalForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Explain the problem, why it matters, and what should happen next."
                />
              </div>
              {createProposalMutation.error ? <p className="text-sm text-ops-error">{createProposalMutation.error.message}</p> : null}
              <Button
                disabled={createProposalMutation.isPending || proposalForm.title.length < 4 || proposalForm.body.length < 10}
                onClick={() => createProposalMutation.mutate()}
              >
                Post proposal
              </Button>
            </>
          ) : (
            <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-panel/55 p-4 text-sm text-ops-muted">
              {summary}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[0.92fr_1.08fr] md:gap-3.5">
        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
          <CardHeader>
            <CardTitle>{canModerate ? "Moderation queue" : "Open proposals"}</CardTitle>
            <CardDescription>
              {canModerate
                ? "Review hidden threads, comment-heavy proposals, and open discussions from one admin queue."
                : "Select a proposal to vote, comment, or moderate it."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canModerate ? (
              <div className="flex flex-wrap gap-2">
                <Button variant={moderationFilter === "attention" ? "default" : "outline"} onClick={() => setModerationFilter("attention")}>Attention</Button>
                <Button variant={moderationFilter === "hidden" ? "default" : "outline"} onClick={() => setModerationFilter("hidden")}>Hidden</Button>
                <Button variant={moderationFilter === "all" ? "default" : "outline"} onClick={() => setModerationFilter("all")}>All</Button>
              </div>
            ) : null}
            {moderationProposals.map((proposal) => (
              <button
                key={proposal.id}
                type="button"
                onClick={() => setSelectedProposalId(proposal.id)}
                className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
                  proposal.id === selectedProposalId
                    ? "border-ops-primary/35 bg-ops-panel/70"
                    : "border-ops-border-soft bg-ops-surface hover:bg-ops-panel/65"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{proposal.title}</p>
                  {proposal.pinned ? <Badge>pinned</Badge> : null}
                  {proposal.closed ? <Badge>closed</Badge> : null}
                  {proposal.hidden ? <Badge className="border-ops-destructive/25 bg-ops-destructive/10 text-ops-destructive">hidden</Badge> : null}
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-ops-muted">{proposal.body}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ops-muted">
                  {proposal.author.name} · {proposal.yesVotes} yes · {proposal.noVotes} no · {proposal.commentCount} comments
                </p>
                {canModerate ? <p className="mt-2 text-xs text-ops-muted">{getCommunityModerationMeta(proposal).detail}</p> : null}
              </button>
            ))}
            {!moderationProposals.length ? (
              <div className="rounded-[1.25rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                {canModerate ? "No proposals match the current moderation filter." : "No proposals yet. The first approved driver or eligible rider can start the board."}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))]">
          <CardHeader>
            <CardTitle>{selectedProposal?.title ?? "Proposal details"}</CardTitle>
            <CardDescription>
              {selectedProposal
                ? `Posted by ${selectedProposal.author.name} on ${formatDateTime(selectedProposal.createdAt)}`
                : "Choose a proposal from the list to open its comments and voting."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedProposal ? (
              <>
                <div className="rounded-[1.25rem] border border-ops-border-soft p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedProposal.pinned ? <Badge>pinned</Badge> : null}
                    {selectedProposal.closed ? <Badge>closed</Badge> : null}
                    {selectedProposal.hidden ? <Badge className="border-ops-destructive/25 bg-ops-destructive/10 text-ops-destructive">hidden</Badge> : null}
                    {selectedProposal.viewerVote ? <Badge>you voted {selectedProposal.viewerVote}</Badge> : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ops-muted">{selectedProposal.body}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-ops-border-soft p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Yes votes</p>
                      <p className="mt-1 font-semibold">{selectedProposal.yesVotes}</p>
                    </div>
                    <div className="rounded-3xl border border-ops-border-soft p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">No votes</p>
                      <p className="mt-1 font-semibold">{selectedProposal.noVotes}</p>
                    </div>
                    <div className="rounded-3xl border border-ops-border-soft p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ops-muted">Comments</p>
                      <p className="mt-1 font-semibold">{selectedProposal.commentCount}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={selectedProposal.viewerVote === "yes" ? "default" : "outline"}
                    disabled={!eligibility?.canVote || selectedProposal.closed || voteMutation.isPending}
                    onClick={() => voteMutation.mutate("yes")}
                  >
                    Vote yes
                  </Button>
                  <Button
                    variant={selectedProposal.viewerVote === "no" ? "default" : "outline"}
                    disabled={!eligibility?.canVote || selectedProposal.closed || voteMutation.isPending}
                    onClick={() => voteMutation.mutate("no")}
                  >
                    Vote no
                  </Button>
                  {canModerate ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => updateProposalMutation.mutate({ pinned: !selectedProposal.pinned })}
                      >
                        {selectedProposal.pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateProposalMutation.mutate({ closed: !selectedProposal.closed })}
                      >
                        {selectedProposal.closed ? "Reopen" : "Close voting"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => updateProposalMutation.mutate({ hidden: !selectedProposal.hidden })}
                      >
                        {selectedProposal.hidden ? "Unhide proposal" : "Hide proposal"}
                      </Button>
                    </>
                  ) : null}
                </div>
                {!eligibility?.canVote && eligibility?.reason ? (
                  <p className="text-sm text-ops-muted">{eligibility.reason}</p>
                ) : null}
                {voteMutation.error ? <p className="text-sm text-ops-error">{voteMutation.error.message}</p> : null}
                {updateProposalMutation.error ? <p className="text-sm text-ops-error">{updateProposalMutation.error.message}</p> : null}

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">Comments</p>
                    {selectedProposal.closed ? <Badge>comments locked</Badge> : null}
                  </div>
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-[1.25rem] border border-ops-border-soft p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold">{comment.author.name}</p>
                          <p className="text-sm text-ops-muted/80">
                            {roleLabel(comment.author.role)} · {formatDateTime(comment.createdAt)}
                          </p>
                        </div>
                        {canModerate ? (
                          <Button variant="ghost" onClick={() => updateCommentMutation.mutate({ commentId: comment.id, hidden: !comment.hidden })}>
                            {comment.hidden ? "Unhide" : "Hide"}
                          </Button>
                        ) : null}
                      </div>
                      {comment.hidden ? <Badge className="mt-3 border-ops-destructive/25 bg-ops-destructive/10 text-ops-destructive">hidden from public board</Badge> : null}
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ops-muted">{comment.body}</p>
                    </div>
                  ))}
                  {!comments.length ? (
                    <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                      No comments yet on this proposal.
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="communityComment">Add a comment</Label>
                  <Textarea
                    id="communityComment"
                    className="min-h-28"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Keep it simple and focused on what should improve next."
                    disabled={!eligibility?.canComment || selectedProposal.closed}
                  />
                  {!eligibility?.canComment && eligibility?.reason ? (
                    <p className="text-sm text-ops-muted">{eligibility.reason}</p>
                  ) : null}
                  {selectedProposal.closed ? (
                    <p className="text-sm text-ops-muted">Comments are closed on this proposal.</p>
                  ) : null}
                  {commentMutation.error ? <p className="text-sm text-ops-error">{commentMutation.error.message}</p> : null}
                  <Button
                    disabled={!eligibility?.canComment || selectedProposal.closed || commentBody.trim().length < 1 || commentMutation.isPending}
                    onClick={() => commentMutation.mutate()}
                  >
                    Post comment
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                Choose a proposal to open it here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
