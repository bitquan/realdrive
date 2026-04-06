# Layered Dev Checklist

Use this checklist as the working execution board for daily development.

It is derived from:

- [04 Architecture](./04-architecture.md)
- [05 Frontend Guide](./05-frontend-guide.md)
- [08 Operations And Runbooks](./08-operations-and-runbooks.md)
- [09 Testing And Quality](./09-testing-and-quality.md)
- [10 Known Gaps And Next Steps](./10-known-gaps-and-next-steps.md)
- [13 Roadmap Baseline (25 Features)](./13-roadmap-baseline-25-features.md)
- [14 Roadmap Implementation Board](./14-roadmap-implementation-board.md)
- [15 Public Roadmap Feature Spec](./15-public-roadmap-feature-spec.md)
- [17 Contributor And Copilot Guide](./17-contributor-and-copilot-guide.md)

## How To Use

1. Pick one active layer at a time.
2. Keep related work inside that layer until the checkpoint is stable.
3. Update the linked source-of-truth docs in the same branch.
4. Move unfinished items forward explicitly instead of leaving them implied.

## Recommended Layer Order

1. Layer 0 — Docs And Release Truth
2. Layer 1 — Design And UX System
3. Layer 2 — Architecture And Data
4. Layer 3 — Rider And Public Flows
5. Layer 4 — Driver Layer
6. Layer 5 — Admin And Ops Layer
7. Layer 6 — Shared Product Layer
8. Layer 7 — Quality, QA, And DevOps
9. Layer 8 — Later / Deferred Strategy

## Layer 0 — Docs And Release Truth

Primary docs:

- [docs/README.md](./README.md)
- [11 Live Deployment](./11-live-deployment.md)
- [17 Contributor And Copilot Guide](./17-contributor-and-copilot-guide.md)

Checklist:

- [x] Treat `docs/` as source of truth for route, deployment, and workflow changes.
- [x] Keep current live hosts aligned with `https://realdrive-web.vercel.app` and `https://realdrive.onrender.com`.
- [x] Keep driver route truth aligned across docs.
- [ ] Add the same layered execution habit to future redesign trackers when rider or admin scope reopens.

## Layer 1 — Design And UX System

Primary docs:

- [05 Frontend Guide](./05-frontend-guide.md)
- [13 Roadmap Baseline (25 Features)](./13-roadmap-baseline-25-features.md)

Checklist:

- [x] Unified form patterns across rider, driver, and admin.
	- Added shared form primitives in [apps/web/src/components/ui/form-layout.tsx](../apps/web/src/components/ui/form-layout.tsx) and applied them in [apps/web/src/pages/admin-login-page.tsx](../apps/web/src/pages/admin-login-page.tsx), [apps/web/src/pages/driver-login-page.tsx](../apps/web/src/pages/driver-login-page.tsx), [apps/web/src/pages/request-feature-page.tsx](../apps/web/src/pages/request-feature-page.tsx), and [apps/web/src/pages/report-bug-page.tsx](../apps/web/src/pages/report-bug-page.tsx).
- [x] Standard empty states and skeleton states.
	- Added shared [apps/web/src/components/ui/empty-state.tsx](../apps/web/src/components/ui/empty-state.tsx) and [apps/web/src/components/ui/skeleton.tsx](../apps/web/src/components/ui/skeleton.tsx), then adopted them in [apps/web/src/pages/ride-details-page.tsx](../apps/web/src/pages/ride-details-page.tsx), [apps/web/src/pages/driver-ride-page.tsx](../apps/web/src/pages/driver-ride-page.tsx), and [apps/web/src/pages/admin-dispatch-page.tsx](../apps/web/src/pages/admin-dispatch-page.tsx).
- [x] Consistent action hierarchy across all role surfaces.
	- Standardized primary-submit and secondary-navigation action groups via shared form actions in [apps/web/src/components/ui/form-layout.tsx](../apps/web/src/components/ui/form-layout.tsx) and role pages under [apps/web/src/pages](../apps/web/src/pages).
- [x] Mobile-first nav consistency, including notifications access.
	- Added explicit mobile notifications access in [apps/web/src/components/layout/app-shell.tsx](../apps/web/src/components/layout/app-shell.tsx) while preserving role-based bottom nav in [apps/web/src/lib/shell.ts](../apps/web/src/lib/shell.ts).
- [x] Global toasts and mutation confirmations.
	- Added [apps/web/src/providers/toast-provider.tsx](../apps/web/src/providers/toast-provider.tsx), wired it in [apps/web/src/providers/app-providers.tsx](../apps/web/src/providers/app-providers.tsx), and connected mutation success/error confirmations across rider, driver, admin, and issue-intake pages.
- [x] Ride timeline component shared across roles.
	- Added [apps/web/src/components/ride/ride-timeline.tsx](../apps/web/src/components/ride/ride-timeline.tsx), covered it with [apps/web/src/components/ride/ride-timeline.test.tsx](../apps/web/src/components/ride/ride-timeline.test.tsx), and embedded it in [apps/web/src/pages/ride-details-page.tsx](../apps/web/src/pages/ride-details-page.tsx), [apps/web/src/pages/driver-ride-page.tsx](../apps/web/src/pages/driver-ride-page.tsx), and [apps/web/src/pages/admin-dispatch-page.tsx](../apps/web/src/pages/admin-dispatch-page.tsx).

## Layer 2 — Architecture And Data

Primary docs:

- [04 Architecture](./04-architecture.md)
- [06 Backend API](./06-backend-api.md)
- [07 Database And Domain Model](./07-database-and-domain-model.md)
- [10 Known Gaps And Next Steps](./10-known-gaps-and-next-steps.md)

Checklist:

- [ ] Add domain-specific error classes and cleaner `4xx` mappings.
- [ ] Add `/readiness` alongside health coverage.
- [ ] Move remaining scheduled jobs out of the API process where practical.
- [ ] Add refresh-token or stronger session invalidation strategy.
- [ ] Expand audit logging exports and richer filtering.
- [ ] Tighten region, market, and service-rule modeling where current assumptions are too shallow.

## Layer 3 — Rider And Public Flows

Primary docs:

- [01 Project Overview](./01-project-overview.md)
- [05 Frontend Guide](./05-frontend-guide.md)
- [13 Roadmap Baseline (25 Features)](./13-roadmap-baseline-25-features.md)

Checklist:

- [x] Rider booking form UX refresh.
	- Refined guest-booking guidance and booking CTA hierarchy in [apps/web/src/pages/home-page.tsx](../apps/web/src/pages/home-page.tsx) to keep the rider form clearer and faster to complete.
- [x] Public tracking page v2 layout.
	- Upgraded public tracking with shared timeline, trust/status copy, and loading skeletons in [apps/web/src/pages/public-track-page.tsx](../apps/web/src/pages/public-track-page.tsx).
- [x] Rider cancellation reason capture.
	- Added rider cancellation reason selection and optional notes in [apps/web/src/pages/ride-details-page.tsx](../apps/web/src/pages/ride-details-page.tsx), wired through the existing cancel input contract.
- [x] Improve rider-side trust and status clarity during live rides.
	- Added status-specific trust/support messaging and timeline context in [apps/web/src/pages/ride-details-page.tsx](../apps/web/src/pages/ride-details-page.tsx) and [apps/web/src/pages/public-track-page.tsx](../apps/web/src/pages/public-track-page.tsx).
- [x] Keep guest rider flow as the primary acquisition path while improving conversion quality.
	- Reinforced no-login booking path and conversion-support messaging in [apps/web/src/pages/home-page.tsx](../apps/web/src/pages/home-page.tsx) while preserving rider lead/share conversion flow.

## Layer 4 — Driver Layer

Primary docs:

- [05 Frontend Guide](./05-frontend-guide.md)
- [09 Testing And Quality](./09-testing-and-quality.md)
- [driver-redesign-status.md](./driver-redesign-status.md)

Checklist:

- [x] Run focused production smoke tests for `/driver`, `/driver/inbox`, and `/driver/rides/:rideId`.
	- Verified against the live web and API on 2026-04-06 with production smoke identities and targeted test rides.
- [x] Confirm production `Accept` and `Decline` succeed end to end.
	- Live smoke flow confirmed both actions against targeted production test rides.
- [x] Confirm production `Recenter` works on stand-by and active maps.
	- Live smoke flow confirmed `Recenter map` on both `/driver` stand-by and `/driver/rides/:rideId`.
- [x] Improve offer expiration UX and countdown clarity.
	- Added urgency states, expired-action handling, and clearer timer copy in [apps/web/src/components/driver-home/DriverLiveOfferCard.tsx](../apps/web/src/components/driver-home/DriverLiveOfferCard.tsx) and [apps/web/src/components/driver-home/DriverOfferInbox.tsx](../apps/web/src/components/driver-home/DriverOfferInbox.tsx).
- [x] Build driver onboarding checklist UI.
	- Added [apps/web/src/components/driver-home/DriverOnboardingChecklist.tsx](../apps/web/src/components/driver-home/DriverOnboardingChecklist.tsx) and surfaced it in [apps/web/src/pages/driver-dashboard-page.tsx](../apps/web/src/pages/driver-dashboard-page.tsx).
- [x] Add driver cancellation reason capture.
	- Added driver-side cancellation reasons in [apps/web/src/pages/driver-ride-page.tsx](../apps/web/src/pages/driver-ride-page.tsx) with API support in [apps/api/src/app.ts](../apps/api/src/app.ts) and [apps/api/src/services/ride-service.ts](../apps/api/src/services/ride-service.ts).
- [x] Reopen driver polish only if smoke tests expose real issues.
	- Live smoke did not expose a driver-shell regression that requires reopening broader polish work.

## Layer 5 — Admin And Ops Layer

Primary docs:

- [01 Project Overview](./01-project-overview.md)
- [05 Frontend Guide](./05-frontend-guide.md)
- [10 Known Gaps And Next Steps](./10-known-gaps-and-next-steps.md)
- [13 Roadmap Baseline (25 Features)](./13-roadmap-baseline-25-features.md)

Checklist:

- [x] Admin dashboard KPI cards v2.
	- Expanded [apps/web/src/pages/admin-dashboard-page.tsx](../apps/web/src/pages/admin-dashboard-page.tsx) with driver-review, feature-triage, moderation, dues, and scheduled-release KPIs.
- [x] Driver review workflow upgrades.
	- Added review-priority sorting and filter chips in [apps/web/src/pages/admin-drivers-page.tsx](../apps/web/src/pages/admin-drivers-page.tsx).
- [x] Dispatch queue prioritization controls.
	- Added queue priority modes and priority messaging in [apps/web/src/pages/admin-dispatch-page.tsx](../apps/web/src/pages/admin-dispatch-page.tsx).
- [x] Scheduled rides operations panel.
	- Added scheduled-release buckets and quick-open scheduled ride controls in [apps/web/src/pages/admin-dispatch-page.tsx](../apps/web/src/pages/admin-dispatch-page.tsx).
- [x] Dues collection workflow hardening.
	- Added reconciliation and batch-save validation warnings in [apps/web/src/pages/admin-dues-page.tsx](../apps/web/src/pages/admin-dues-page.tsx).
- [x] Payout instructions UX upgrade.
	- Added a driver-facing payout preview in [apps/web/src/pages/admin-dues-page.tsx](../apps/web/src/pages/admin-dues-page.tsx).
- [x] Community moderation queue improvements.
	- Admin moderation now loads hidden proposals/comments and queue filters in [apps/web/src/pages/community-page.tsx](../apps/web/src/pages/community-page.tsx).
- [x] Feature request triage dashboard.
	- Added [apps/web/src/pages/admin-feature-requests-page.tsx](../apps/web/src/pages/admin-feature-requests-page.tsx) with API support in [apps/api/src/app.ts](../apps/api/src/app.ts).

## Layer 6 — Shared Product Layer

Primary docs:

- [05 Frontend Guide](./05-frontend-guide.md)
- [12 Push Notifications Playbook](./12-push-notifications-playbook.md)
- [15 Public Roadmap Feature Spec](./15-public-roadmap-feature-spec.md)

Checklist:

- [ ] Notification center polish.
- [ ] Improve shared realtime event visibility and status continuity.
- [ ] Expand push flows beyond baseline ride events where product value is clear.
- [ ] Build the public roadmap page in app.
- [ ] Keep feature request and bug intake tied to existing real workflows.

## Layer 7 — Quality, QA, And DevOps

Primary docs:

- [08 Operations And Runbooks](./08-operations-and-runbooks.md)
- [09 Testing And Quality](./09-testing-and-quality.md)
- [11 Live Deployment](./11-live-deployment.md)

Checklist:

- [x] Expand Playwright from screenshots into interactive core journeys.
	- First checkpoint completed with the mobile driver continuity flow in [apps/web/tests/playwright/driver-mobile-flow.spec.ts](../apps/web/tests/playwright/driver-mobile-flow.spec.ts).
- [x] Expand frontend component coverage beyond baseline tests.
	- Added driver offer component tests in [apps/web/src/components/driver-home/driver-offer-components.test.tsx](../apps/web/src/components/driver-home/driver-offer-components.test.tsx).
- [x] Add backend integration coverage for protected routes and pricing logic.
	- Added route integration tests in [apps/api/src/tests/app-routes.test.ts](../apps/api/src/tests/app-routes.test.ts).
- [x] Harden CI/CD with required checks, release gates, and promotion rules.
	- CI now ends on a single `Quality Gate` job after API tests, web tests, and typecheck/build checks pass.
- [x] Add preview or safer pre-release verification paths.
	- Pull requests now upload a `web-dist-*` build artifact for safer pre-merge review.
- [x] Add monitoring and performance tooling.
	- Added latency-aware health thresholds in [scripts/ops/health-check.mjs](../scripts/ops/health-check.mjs), bundle reporting in [scripts/ops/web-bundle-check.mjs](../scripts/ops/web-bundle-check.mjs), and CI bundle artifacts in [.github/workflows/ci.yml](../.github/workflows/ci.yml).
- [x] Add backup/restore and disaster-recovery runbooks.
	- Expanded recovery guidance in [docs/08-operations-and-runbooks.md](./08-operations-and-runbooks.md) and [docs/11-live-deployment.md](./11-live-deployment.md).
- [x] Add secret rotation and stronger operational hygiene.
	- Documented ops secret handling in [docs/03-environment-and-services.md](./03-environment-and-services.md), [docs/17-contributor-and-copilot-guide.md](./17-contributor-and-copilot-guide.md), and [docs/11-live-deployment.md](./11-live-deployment.md).

## Layer 8 — Later / Deferred Strategy

Primary docs:

- [10 Known Gaps And Next Steps](./10-known-gaps-and-next-steps.md)
- [13 Roadmap Baseline (25 Features)](./13-roadmap-baseline-25-features.md)

Checklist:

- [ ] Share/referral analytics panel.
- [ ] Service-area map editor.
- [ ] Surge and market condition indicators.
- [ ] Automated anomaly alerts.
- [ ] Native iOS/Android apps.
- [ ] Fully automated payments integration.
- [ ] Multi-language localization framework.

## Suggested Current Working Stack

Use this default order unless priorities change:

1. Layer 7 — Quality, QA, And DevOps
2. Layer 4 — Driver Layer
3. Layer 5 — Admin And Ops Layer
4. Layer 1 — Design And UX System
5. Layer 3 — Rider And Public Flows

Reasoning:

- docs show production verification and interactive test depth are still weak
- driver shell is shipped but still needs focused production confirmation
- admin and shared ops workflows have several `Now` and `Next` backlog items ready for structured work
