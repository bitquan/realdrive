# RealDrive Docs

This folder is the project handbook for RealDrive.

## Source Of Truth Rules

- Treat this docs folder as the operating source of truth for product direction, environment truth, deployment truth, and workflow truth.
- If code and docs disagree, do not leave them split across branches or checkpoints; update the relevant docs in the same branch as the code change.
- Update docs before or alongside pushes to `main`, not as a later cleanup task.
- Use the focused status trackers when a workstream is being checkpointed:
  - [Driver Redesign Status](./driver-redesign-status.md)
  - [Admin Redesign Status](./admin-redesign-status.md)
- Keep route truth in [05 Frontend Guide](./05-frontend-guide.md), deployment truth in [11 Live Deployment](./11-live-deployment.md), and contributor process truth in [17 Contributor And Copilot Guide](./17-contributor-and-copilot-guide.md).

## Documentation Update Order

When behavior changes, review docs in this order:

1. Product/route docs
  - [01 Project Overview](./01-project-overview.md)
  - [05 Frontend Guide](./05-frontend-guide.md)
2. Environment/deployment docs
  - [03 Environment And Services](./03-environment-and-services.md)
  - [11 Live Deployment](./11-live-deployment.md)
3. Workflow/runbook docs
  - [08 Operations And Runbooks](./08-operations-and-runbooks.md)
  - [09 Testing And Quality](./09-testing-and-quality.md)
  - [17 Contributor And Copilot Guide](./17-contributor-and-copilot-guide.md)
4. Active workstream tracker docs
  - [Driver Redesign Status](./driver-redesign-status.md)
  - [Admin Redesign Status](./admin-redesign-status.md)

## Start Here

1. Read [Project Overview](./01-project-overview.md)
2. Follow [Local Setup](./02-local-setup.md)
3. Fill in values from [Environment And Services](./03-environment-and-services.md)
4. Use [Operations Runbook](./08-operations-and-runbooks.md) for day-to-day commands

## Document Map

- [01 Project Overview](./01-project-overview.md)
  Summary of the product, roles, stack, and current scope.
- [02 Local Setup](./02-local-setup.md)
  Everything you need on your machine and the exact commands to get running.
- [03 Environment And Services](./03-environment-and-services.md)
  Required env vars, optional providers, and what you need to set up on your side.
- [04 Architecture](./04-architecture.md)
  How the frontend, backend, database, shared contracts, and realtime pieces fit together.
- [05 Frontend Guide](./05-frontend-guide.md)
  Frontend routes, state flow, auth handling, and UI structure.
- [06 Backend API](./06-backend-api.md)
  HTTP endpoints, auth model, websocket events, and request/response expectations.
- [07 Database And Domain Model](./07-database-and-domain-model.md)
  Prisma schema, ride lifecycle, pricing, and core entities.
- [08 Operations And Runbooks](./08-operations-and-runbooks.md)
  Migrations, seeding, local run commands, smoke checks, and troubleshooting.
- [09 Testing And Quality](./09-testing-and-quality.md)
  Current tests, verification commands, and recommended next coverage.
- [10 Known Gaps And Next Steps](./10-known-gaps-and-next-steps.md)
  Current limitations, non-production defaults, and recommended next implementation steps.
- [11 Live Deployment](./11-live-deployment.md)
  Render + Vercel deployment flow, required env vars, and post-deploy checks.
- [12 Push Notifications Playbook](./12-push-notifications-playbook.md)
  End-to-end how-to for setup, testing tutorials, troubleshooting, and operator checks.
- [13 Roadmap Baseline (25 Features)](./13-roadmap-baseline-25-features.md)
  Planning baseline for 25+ upcoming features, phased roadmap, UI upgrades, and deferred gaps.
- [14 Roadmap Implementation Board](./14-roadmap-implementation-board.md)
  Track owners, sprints, readiness, and issue links for all 26 roadmap features.
- [15 Public Roadmap Feature Spec](./15-public-roadmap-feature-spec.md)
  Feature #26 specification: public-facing roadmap page with upvoting, requirements, API design, and rollout plan.
- [17 Contributor And Copilot Guide](./17-contributor-and-copilot-guide.md)
  Clear repo instructions for contributors, GitHub workflows, secrets handling, deployment truth, and GitHub Copilot usage.
- [18 Layered Dev Checklist](./18-layered-dev-checklist.md)
  Layered execution checklist for daily development across design, architecture, rider, driver, admin, shared, and release work.
- [Driver Redesign Status](./driver-redesign-status.md)
  Checkpoint tracker for the current shipped driver map-shell work on Home, Rides, and Inbox.
