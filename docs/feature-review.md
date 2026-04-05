# Feature Review System

Automated process for collecting, evaluating, and approving community feature requests for RealDrive.

---

## How It Works

```
User submits request (in-app OR GitHub Issue Form)
        ↓
  feature:request label applied
        ↓
  feature-triage.yml runs
        ↓
  GitHub Models API checks request against feature-policy.md
        ↓
  AI posts analysis comment + applies triage label
        ↓
  Owner reviews & decides
        ↓
  /approve <reason>  →  status:approved + roadmap sync
  /reject <reason>   →  status:rejected + issue closed
```

---

## Submitting Feature Requests

### In-app (recommended for community members)
1. Log in to the driver, rider, or admin dashboard
2. Navigate to **Product → Request a Feature** (Lightbulb icon in sidebar)
3. Fill out the form — it submits to the API which opens a GitHub issue

### GitHub Issue Form (for contributors)
Use the **Feature Request** issue template at:  
`https://github.com/bitquan/realdrive/issues/new?template=feature-request.yml`

---

## Triage Labels

| Label | Meaning |
|---|---|
| `feature:request` | Issue is a feature request — triggers AI triage |
| `triage:looks-good` | Aligned with policy, low abuse risk (alignment ≥ 7) |
| `triage:needs-review` | Moderate alignment or medium abuse risk — owner review needed |
| `triage:flagged` | Policy violation or high abuse risk detected |
| `status:approved` | Approved by owner, added to roadmap |
| `status:rejected` | Rejected — not aligned with platform direction |
| `roadmap:index` | Marks the public roadmap tracking issue (do not use manually) |

---

## Approving and Rejecting

Both comment commands and manual labels work.

### Slash commands (recommended — reason is recorded in roadmap)

```
/approve <reason>
/reject <reason>
```

**Examples:**
```
/approve This helps drivers plan their week without any privacy concerns.
/reject This adds surge pricing which contradicts our cooperative model.
```

- Only contributors with **write or admin** repository access can use these commands.
- A reason is **always required** — for flagged features, it's the override justification.
- The reason is written to the public roadmap.

### Label-based (quick, no reason recorded)

Apply `status:approved` or `status:rejected` directly on the issue.  
The bot will confirm and close (for rejected) but will prompt you to add a reason via `/approve <reason>`.

---

## Owner Override

If the AI flags a feature but you want to approve it anyway:

```
/approve <reason explaining strategic direction or why guardrail doesn't apply>
```

The override reason is visible to the community in the roadmap and issue history.  
This is intentional — overrides should be transparent.

---

## Public Roadmap

When a feature is approved, it's automatically added to the **📍 RealDrive Public Roadmap** issue  
(labeled `roadmap:index`, pinned to the repo).

The roadmap shows:
- Feature title + link to original request
- Platform area
- Approval date and reason

---

## Feature Policy

All guardrails are defined in [`docs/feature-policy.md`](feature-policy.md).

The AI uses this document as its system prompt — updating the policy file changes what gets flagged.

**Key guardrail categories:**
- Exploitation patterns (hidden fees, surge pricing, penalties)
- Surveillance & privacy violations
- Scope creep (crypto, social media, unrelated delivery)
- Cooperative integrity violations (investor rights, governance bypass)

---

## First-Time Setup

### 1. Create all required labels

```bash
GITHUB_TOKEN=<your-token> GITHUB_REPO=bitquan/realdrive pnpm ops:labels
```

Or source from your `.env` file:
```bash
source apps/api/.env && pnpm ops:labels
```

### 2. Verify workflows are enabled

Check that these workflows are active in the **Actions** tab:
- `Feature Triage` — runs on `feature:request` label
- `Feature Approve` — runs on `/approve` / `/reject` comments and approval labels

### 3. Test the flow

1. Create a test issue with the feature request template
2. Confirm AI triage comment appears within ~30 seconds
3. Comment `/approve testing the approval flow` and verify roadmap issue is created/updated

---

## Workflows

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/feature-triage.yml` | Issue labeled `feature:request` | Calls GitHub Models API, posts analysis, applies triage label |
| `.github/workflows/feature-approve.yml` | `/approve` or `/reject` comment; `status:approved` or `status:rejected` label | Applies status, comments, syncs roadmap, closes rejected issues |

---

## Troubleshooting

**AI triage comment not appearing:**
- Check workflow logs in Actions → Feature Triage
- The GitHub Models API requires `GITHUB_TOKEN` in the workflow — verify it's not restricted
- If the API fails, the bot falls back to `triage:needs-review` with a manual review note

**"/approve" command not working:**
- Verify you have write or admin access to the repo
- Check the exact command format: `/approve <reason>` (reason is required)

**Roadmap issue not updating:**
- Check Actions → Feature Approve logs
- The workflow needs `issues: write` permission — verify the workflow permissions block
