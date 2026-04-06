# Contributor And Copilot Guide

Use this guide when you change product behavior, environment configuration, deployment settings, or GitHub automation in RealDrive.

## Repo Truth

- Monorepo root contains shared scripts and docs
- Web app lives in `apps/web`
- API lives in `apps/api`
- Shared contracts live in `shared/contracts.ts`
- Prisma schema lives in `apps/api/prisma/schema.prisma`

## Current Production Truth

Use these values unless the deployment setup is intentionally changed:

- Web alias: `https://realdrive-web.vercel.app`
- API host: `https://realdrive.onrender.com`
- Vercel project: `bitquans-projects/realdrive-web`

Do not use these stale hosts in docs, code, or env values:

- `https://realdrive-api.onrender.com`
- `https://realdrive.vercel.app`

## Local Development Rules

1. Start from [02 Local Setup](./02-local-setup.md)
2. Keep local API env in `apps/api/.env`
3. Keep local web env in `apps/web/.env`
4. Run Prisma commands from the repo root using existing scripts when possible
5. Validate affected packages before pushing

Recommended validation commands:

```bash
pnpm --filter @realdrive/web build
pnpm --filter @realdrive/api test
pnpm --filter @realdrive/web test
```

## Secrets And Environment Rules

- Never commit secrets, private keys, or provider tokens
- Keep API secrets in Render env vars
- Keep Vite browser env vars in Vercel env vars
- Treat `apps/web/.env.production` as non-secret default config only
- If GitHub push protection blocks a push, remove the secret from the file and commit history before pushing again

## Documentation Update Checklist

When behavior changes, update docs in the same branch:

- `README.md` for root quick-start or route changes
- `docs/README.md` when source-of-truth process or document ownership changes
- `docs/02-local-setup.md` for startup or env changes
- `docs/03-environment-and-services.md` for provider/env changes
- `docs/05-frontend-guide.md` for route and shell behavior changes
- `docs/08-operations-and-runbooks.md` for runbooks and smoke tests
- `docs/09-testing-and-quality.md` for QA expectations
- `docs/11-live-deployment.md` for Render/Vercel changes
- workstream tracker docs such as `docs/driver-redesign-status.md` when checkpointed product direction changes

## Docs-First Discipline

- Do not treat docs as an afterthought.
- For RealDrive, docs should be updated before or alongside the push that changes behavior.
- If a route, shell behavior, deployment target, or operator workflow changes, the branch is not done until the matching docs are current.
- Prefer one canonical doc per truth area:
	- route and UI truth → `docs/05-frontend-guide.md`
	- runbook truth → `docs/08-operations-and-runbooks.md`
	- QA truth → `docs/09-testing-and-quality.md`
	- deployment truth → `docs/11-live-deployment.md`
	- checkpoint truth → tracker docs like `docs/driver-redesign-status.md`

## GitHub Workflow Guidance

Current GitHub automation includes:

- `.github/workflows/ci.yml`
- `.github/workflows/ops-health-check.yml`
- `.github/workflows/ops-daily-digest.yml`
- `.github/workflows/feature-triage.yml`
- `.github/workflows/feature-approve.yml`

Use the right intake path:

- In-app feature ideas: `/request-feature`
- In-app bug reports: `/report-bug`
- GitHub feature intake: `.github/ISSUE_TEMPLATE/feature-request.yml`
- Roadmap intake: `.github/ISSUE_TEMPLATE/roadmap-feature.yml`

If you change the feature request process, also review:

- `docs/feature-policy.md`
- `docs/feature-review.md`

## GitHub Copilot Guidance

When using GitHub Copilot in this repo:

- Prefer updating existing flows instead of creating duplicate ones
- Reuse the shared issue intake route `POST /issues/report` for feature and bug reporting UI
- Preserve route-first product structure; avoid inventing dead pages or fake modules
- Keep public routes public and role-protected routes protected
- Update docs whenever deployment, env, or user-facing flows change
- Never suggest committing secrets into `.env.production` or any tracked file

Repo-specific Copilot instructions also live in `.github/copilot-instructions.md`.

## Before You Push

Run through this short checklist:

1. `git status` is clean except intended files
2. Relevant tests or builds passed
3. Docs were updated if behavior changed
4. No secrets were added
5. Production hostnames still point to the correct live services
