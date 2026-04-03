import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
        queryFn: () => api.listCommunityProposals(token),
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
        queryFn: () => api.getCommunityComments(selectedProposalId, token),
        enabled: Boolean(token) && Boolean(selectedProposalId)
    });
    const createProposalMutation = useMutation({
        mutationFn: () => api.createCommunityProposal(proposalForm, token),
        onSuccess: (proposal) => {
            setProposalForm({ title: "", body: "" });
            setSelectedProposalId(proposal.id);
            void queryClient.invalidateQueries({ queryKey: ["community-board"] });
        }
    });
    const voteMutation = useMutation({
        mutationFn: (choice) => api.voteOnCommunityProposal(selectedProposalId, { choice }, token),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["community-board"] });
            void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
        }
    });
    const commentMutation = useMutation({
        mutationFn: () => api.createCommunityComment(selectedProposalId, { body: commentBody }, token),
        onSuccess: () => {
            setCommentBody("");
            void queryClient.invalidateQueries({ queryKey: ["community-board"] });
            void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
        }
    });
    const updateProposalMutation = useMutation({
        mutationFn: (input) => api.updateCommunityProposal(selectedProposalId, input, token),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["community-board"] });
            void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] });
        }
    });
    const updateCommentMutation = useMutation({
        mutationFn: (commentId) => api.updateCommunityComment(commentId, { hidden: true }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["community-comments", selectedProposalId] })
    });
    const proposals = boardQuery.data?.proposals ?? [];
    const eligibility = boardQuery.data?.eligibility;
    const selectedProposal = commentsQuery.data?.proposal ?? proposals.find((proposal) => proposal.id === selectedProposalId) ?? null;
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("section", { className: "rounded-[2rem] border border-brand-ink/10 bg-white/90 p-6 shadow-soft md:p-8", children: _jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { className: "max-w-3xl", children: [_jsx("h1", { className: "text-3xl font-extrabold tracking-tight md:text-4xl", children: "RealDrive community board" }), _jsx("p", { className: "mt-3 text-sm leading-6 text-brand-ink/60 md:text-base", children: "One board, simple yes-or-no voting, flat comments, and a clear path for drivers and experienced riders to guide what gets built next." })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 bg-brand-sand/40 p-4 text-sm", children: [_jsx("p", { className: "font-semibold", children: user ? `${user.name} · ${roleLabel(user.role)}` : "Community access" }), _jsx("p", { className: "mt-2 text-brand-ink/60", children: summary })] })] }) }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Start a proposal" }), _jsx(CardDescription, { children: "Drivers can post immediately. Riders unlock posting after 51 completed rides." })] }), _jsx(CardContent, { className: "space-y-4", children: eligibility?.canCreateProposal ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "proposalTitle", children: "Title" }), _jsx(Input, { id: "proposalTitle", value: proposalForm.title, onChange: (event) => setProposalForm((current) => ({ ...current, title: event.target.value })), placeholder: "Add live trip receipts to the rider page" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "proposalBody", children: "Details" }), _jsx("textarea", { id: "proposalBody", className: "min-h-32 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-ink/35", value: proposalForm.body, onChange: (event) => setProposalForm((current) => ({ ...current, body: event.target.value })), placeholder: "Explain the problem, why it matters, and what should happen next." })] }), createProposalMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: createProposalMutation.error.message }) : null, _jsx(Button, { disabled: createProposalMutation.isPending || proposalForm.title.length < 4 || proposalForm.body.length < 10, onClick: () => createProposalMutation.mutate(), children: "Post proposal" })] })) : (_jsx("div", { className: "rounded-4xl border border-brand-ink/10 bg-brand-sand/35 p-4 text-sm text-brand-ink/60", children: summary })) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[0.92fr_1.08fr]", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Open proposals" }), _jsx(CardDescription, { children: "Select a proposal to vote, comment, or moderate it." })] }), _jsxs(CardContent, { className: "space-y-4", children: [proposals.map((proposal) => (_jsxs("button", { type: "button", onClick: () => setSelectedProposalId(proposal.id), className: `w-full rounded-4xl border p-4 text-left transition ${proposal.id === selectedProposalId
                                            ? "border-brand-ink bg-brand-sand/45"
                                            : "border-brand-ink/10 bg-white hover:bg-brand-sand/25"}`, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("p", { className: "font-semibold", children: proposal.title }), proposal.pinned ? _jsx(Badge, { children: "pinned" }) : null, proposal.closed ? _jsx(Badge, { children: "closed" }) : null] }), _jsx("p", { className: "mt-2 line-clamp-3 text-sm text-brand-ink/60", children: proposal.body }), _jsxs("p", { className: "mt-3 text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: [proposal.author.name, " \u00B7 ", proposal.yesVotes, " yes \u00B7 ", proposal.noVotes, " no \u00B7 ", proposal.commentCount, " comments"] })] }, proposal.id))), !proposals.length ? (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "No proposals yet. The first approved driver or eligible rider can start the board." })) : null] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: selectedProposal?.title ?? "Proposal details" }), _jsx(CardDescription, { children: selectedProposal
                                            ? `Posted by ${selectedProposal.author.name} on ${formatDateTime(selectedProposal.createdAt)}`
                                            : "Choose a proposal from the list to open its comments and voting." })] }), _jsx(CardContent, { className: "space-y-6", children: selectedProposal ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [selectedProposal.pinned ? _jsx(Badge, { children: "pinned" }) : null, selectedProposal.closed ? _jsx(Badge, { children: "closed" }) : null, selectedProposal.viewerVote ? _jsxs(Badge, { children: ["you voted ", selectedProposal.viewerVote] }) : null] }), _jsx("p", { className: "mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink/70", children: selectedProposal.body }), _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-3xl border border-brand-ink/10 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Yes votes" }), _jsx("p", { className: "mt-1 font-semibold", children: selectedProposal.yesVotes })] }), _jsxs("div", { className: "rounded-3xl border border-brand-ink/10 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "No votes" }), _jsx("p", { className: "mt-1 font-semibold", children: selectedProposal.noVotes })] }), _jsxs("div", { className: "rounded-3xl border border-brand-ink/10 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Comments" }), _jsx("p", { className: "mt-1 font-semibold", children: selectedProposal.commentCount })] })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Button, { variant: selectedProposal.viewerVote === "yes" ? "default" : "outline", disabled: !eligibility?.canVote || selectedProposal.closed || voteMutation.isPending, onClick: () => voteMutation.mutate("yes"), children: "Vote yes" }), _jsx(Button, { variant: selectedProposal.viewerVote === "no" ? "default" : "outline", disabled: !eligibility?.canVote || selectedProposal.closed || voteMutation.isPending, onClick: () => voteMutation.mutate("no"), children: "Vote no" }), canModerate ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: () => updateProposalMutation.mutate({ pinned: !selectedProposal.pinned }), children: selectedProposal.pinned ? "Unpin" : "Pin" }), _jsx(Button, { variant: "outline", onClick: () => updateProposalMutation.mutate({ closed: !selectedProposal.closed }), children: selectedProposal.closed ? "Reopen" : "Close voting" }), _jsx(Button, { variant: "ghost", onClick: () => updateProposalMutation.mutate({ hidden: true }), children: "Hide proposal" })] })) : null] }), !eligibility?.canVote && eligibility?.reason ? (_jsx("p", { className: "text-sm text-brand-ink/55", children: eligibility.reason })) : null, voteMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: voteMutation.error.message }) : null, updateProposalMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: updateProposalMutation.error.message }) : null, _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("p", { className: "font-semibold", children: "Comments" }), selectedProposal.closed ? _jsx(Badge, { children: "comments locked" }) : null] }), comments.map((comment) => (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: comment.author.name }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: [roleLabel(comment.author.role), " \u00B7 ", formatDateTime(comment.createdAt)] })] }), canModerate ? (_jsx(Button, { variant: "ghost", onClick: () => updateCommentMutation.mutate(comment.id), children: "Hide" })) : null] }), _jsx("p", { className: "mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink/70", children: comment.body })] }, comment.id))), !comments.length ? (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "No comments yet on this proposal." })) : null] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { htmlFor: "communityComment", children: "Add a comment" }), _jsx("textarea", { id: "communityComment", className: "min-h-28 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-ink/35", value: commentBody, onChange: (event) => setCommentBody(event.target.value), placeholder: "Keep it simple and focused on what should improve next.", disabled: !eligibility?.canComment || selectedProposal.closed }), !eligibility?.canComment && eligibility?.reason ? (_jsx("p", { className: "text-sm text-brand-ink/55", children: eligibility.reason })) : null, selectedProposal.closed ? (_jsx("p", { className: "text-sm text-brand-ink/55", children: "Comments are closed on this proposal." })) : null, commentMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: commentMutation.error.message }) : null, _jsx(Button, { disabled: !eligibility?.canComment || selectedProposal.closed || commentBody.trim().length < 1 || commentMutation.isPending, onClick: () => commentMutation.mutate(), children: "Post comment" })] })] })) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "Choose a proposal to open it here." })) })] })] })] }));
}
