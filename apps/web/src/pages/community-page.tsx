import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDateTime, roleLabel, userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function CommunityPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [proposalForm, setProposalForm] = useState({
    title: "",
    body: ""
  });
  const [commentBody, setCommentBody] = useState("");

  const boardQuery = useQuery({
    queryKey: ["community-board"],
    queryFn: () => api.listCommunityProposals(token!),
    enabled: Boolean(token)
  });

  useEffect(() => {
    const proposals = boardQuery.data?.proposals ?? [];
    if (!proposals.length) {
      setSelectedProposalId("");
      return;
    }

    const stillExists = proposals.some((proposal) => proposal.id === selectedProposalId);
    if (!selectedProposalId || !stillExists) {
      setSelectedProposalId(proposals[0].id);
    }
  }, [boardQuery.data?.proposals, selectedProposalId]);

  const commentsQuery = useQuery({
    queryKey: ["community-comments", selectedProposalId],
    queryFn: () => api.getCommunityComments(selectedProposalId, token!),
    enabled: Boolean(token) && Boolean(selectedProposalId)
  });

  const createProposalMutation = useMutation({
    mutationFn: () => api.createCommunityProposal(proposalForm, token!),
    onSuccess: (proposal) => {
      setProposalForm({ title: "", body: "" });
      setSelectedProposalId(proposal.id);
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
    }
  });

  const voteMutation = useMutation({
    mutationFn: (choice: "yes" | "no") => api.voteOnCommunityProposal(selectedProposalId, { choice }, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: () => api.createCommunityComment(selectedProposalId, { body: commentBody }, token!),
    onSuccess: () => {
      setCommentBody("");
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
    }
  });

  const updateProposalMutation = useMutation({
    mutationFn: (input: { pinned?: boolean; closed?: boolean; hidden?: boolean }) =>
      api.updateCommunityProposal(selectedProposalId, input, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-board"] });
      void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.updateCommunityComment(commentId, { hidden: true }, token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] })
  });

  const proposals = boardQuery.data?.proposals ?? [];
  const eligibility = boardQuery.data?.eligibility;
  const selectedProposal =
    commentsQuery.data?.proposal ?? proposals.find((proposal) => proposal.id === selectedProposalId) ?? null;
  const comments = commentsQuery.data?.comments ?? [];
  const canModerate = userHasRole(user, "admin");

  const summary = useMemo(() => {
    if (!eligibility) {
      return "Loading community access...";
    }

    if (eligibility.reason) {
      return eligibility.reason;
    }

    return "You can read, post, vote, and comment on community proposals.";
  }, [eligibility]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-brand-ink/10 bg-white/90 p-6 shadow-soft md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">RealDrive community board</h1>
            <p className="mt-3 text-sm leading-6 text-brand-ink/60 md:text-base">
              One board, simple yes-or-no voting, flat comments, and a clear path for drivers and experienced riders to
              guide what gets built next.
            </p>
          </div>
          <div className="rounded-4xl border border-brand-ink/10 bg-brand-sand/40 p-4 text-sm">
            <p className="font-semibold">{user ? `${user.name} · ${roleLabel(user.role)}` : "Community access"}</p>
            <p className="mt-2 text-brand-ink/60">{summary}</p>
          </div>
        </div>
      </section>

      <Card>
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
                <textarea
                  id="proposalBody"
                  className="min-h-32 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-ink/35"
                  value={proposalForm.body}
                  onChange={(event) => setProposalForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Explain the problem, why it matters, and what should happen next."
                />
              </div>
              {createProposalMutation.error ? <p className="text-sm text-red-600">{createProposalMutation.error.message}</p> : null}
              <Button
                disabled={createProposalMutation.isPending || proposalForm.title.length < 4 || proposalForm.body.length < 10}
                onClick={() => createProposalMutation.mutate()}
              >
                Post proposal
              </Button>
            </>
          ) : (
            <div className="rounded-4xl border border-brand-ink/10 bg-brand-sand/35 p-4 text-sm text-brand-ink/60">
              {summary}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Open proposals</CardTitle>
            <CardDescription>Select a proposal to vote, comment, or moderate it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {proposals.map((proposal) => (
              <button
                key={proposal.id}
                type="button"
                onClick={() => setSelectedProposalId(proposal.id)}
                className={`w-full rounded-4xl border p-4 text-left transition ${
                  proposal.id === selectedProposalId
                    ? "border-brand-ink bg-brand-sand/45"
                    : "border-brand-ink/10 bg-white hover:bg-brand-sand/25"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{proposal.title}</p>
                  {proposal.pinned ? <Badge>pinned</Badge> : null}
                  {proposal.closed ? <Badge>closed</Badge> : null}
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-brand-ink/60">{proposal.body}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-brand-ink/40">
                  {proposal.author.name} · {proposal.yesVotes} yes · {proposal.noVotes} no · {proposal.commentCount} comments
                </p>
              </button>
            ))}
            {!proposals.length ? (
              <div className="rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55">
                No proposals yet. The first approved driver or eligible rider can start the board.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
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
                <div className="rounded-4xl border border-brand-ink/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedProposal.pinned ? <Badge>pinned</Badge> : null}
                    {selectedProposal.closed ? <Badge>closed</Badge> : null}
                    {selectedProposal.viewerVote ? <Badge>you voted {selectedProposal.viewerVote}</Badge> : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink/70">{selectedProposal.body}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-brand-ink/10 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/40">Yes votes</p>
                      <p className="mt-1 font-semibold">{selectedProposal.yesVotes}</p>
                    </div>
                    <div className="rounded-3xl border border-brand-ink/10 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/40">No votes</p>
                      <p className="mt-1 font-semibold">{selectedProposal.noVotes}</p>
                    </div>
                    <div className="rounded-3xl border border-brand-ink/10 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/40">Comments</p>
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
                        onClick={() => updateProposalMutation.mutate({ hidden: true })}
                      >
                        Hide proposal
                      </Button>
                    </>
                  ) : null}
                </div>
                {!eligibility?.canVote && eligibility?.reason ? (
                  <p className="text-sm text-brand-ink/55">{eligibility.reason}</p>
                ) : null}
                {voteMutation.error ? <p className="text-sm text-red-600">{voteMutation.error.message}</p> : null}
                {updateProposalMutation.error ? <p className="text-sm text-red-600">{updateProposalMutation.error.message}</p> : null}

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">Comments</p>
                    {selectedProposal.closed ? <Badge>comments locked</Badge> : null}
                  </div>
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-4xl border border-brand-ink/10 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold">{comment.author.name}</p>
                          <p className="text-sm text-brand-ink/45">
                            {roleLabel(comment.author.role)} · {formatDateTime(comment.createdAt)}
                          </p>
                        </div>
                        {canModerate ? (
                          <Button variant="ghost" onClick={() => updateCommentMutation.mutate(comment.id)}>
                            Hide
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink/70">{comment.body}</p>
                    </div>
                  ))}
                  {!comments.length ? (
                    <div className="rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55">
                      No comments yet on this proposal.
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="communityComment">Add a comment</Label>
                  <textarea
                    id="communityComment"
                    className="min-h-28 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-ink/35"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Keep it simple and focused on what should improve next."
                    disabled={!eligibility?.canComment || selectedProposal.closed}
                  />
                  {!eligibility?.canComment && eligibility?.reason ? (
                    <p className="text-sm text-brand-ink/55">{eligibility.reason}</p>
                  ) : null}
                  {selectedProposal.closed ? (
                    <p className="text-sm text-brand-ink/55">Comments are closed on this proposal.</p>
                  ) : null}
                  {commentMutation.error ? <p className="text-sm text-red-600">{commentMutation.error.message}</p> : null}
                  <Button
                    disabled={!eligibility?.canComment || selectedProposal.closed || commentBody.trim().length < 1 || commentMutation.isPending}
                    onClick={() => commentMutation.mutate()}
                  >
                    Post comment
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55">
                Choose a proposal to open it here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
