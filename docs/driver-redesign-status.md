# Driver Redesign Status

## Scope
- The driver redesign was aimed at turning the driver experience into a focused driver-first workflow instead of an adapted admin/ops surface.
- The work stayed on the existing `/driver` and `/driver/rides/:rideId` routes and focused on map-first dispatch, active-trip continuity, and production-safe fixes needed to ship that direction.
- Work stops at driver scope for now.

## Final product direction
- Map First Dispatch
- existing /driver route
- map-first driver home
- Live / Inbox toggle
- active ride near the top
- lower-priority tools collapsed/lower
- ride screen aligned with driver home

## Completed phases

### Phase 1.1 — Map-first home cleanup
- goal
  - Establish the map-first driver home direction and align the shared shell around driver context.
- files touched
  - [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
  - [apps/web/src/pages/driver-ride-page.tsx](apps/web/src/pages/driver-ride-page.tsx)
- what changed
  - Reframed driver shell behavior.
  - Shifted the dashboard toward a map-first work surface.
  - Set the base direction for the ride page and driver navigation.
- verification summary
  - Verified locally during the scoped driver checkpoint flow before commit.
  - Later checkpoints built successfully on top of this phase.
- commit message
  - `feat(driver): finalize phase 1.1 map-first home cleanup`
- short hash
  - `e587192`
- pushed to main or not
  - pushed to `main`
- production status
  - pushed, not production-confirmed

### Phase 2 checkpoint 1 — Extract home work-surface modules
- goal
  - Break the driver home into focused modules so later driver changes can stay checkpointed and isolated.
- files touched
  - [apps/web/src/components/driver-home/DriverActiveRideCard.tsx](apps/web/src/components/driver-home/DriverActiveRideCard.tsx)
  - [apps/web/src/components/driver-home/DriverEarningsMini.tsx](apps/web/src/components/driver-home/DriverEarningsMini.tsx)
  - [apps/web/src/components/driver-home/DriverLiveOfferCard.tsx](apps/web/src/components/driver-home/DriverLiveOfferCard.tsx)
  - [apps/web/src/components/driver-home/DriverOfferInbox.tsx](apps/web/src/components/driver-home/DriverOfferInbox.tsx)
  - [apps/web/src/components/driver-home/DriverStatusBar.tsx](apps/web/src/components/driver-home/DriverStatusBar.tsx)
  - [apps/web/src/components/driver-home/DriverToolsSection.tsx](apps/web/src/components/driver-home/DriverToolsSection.tsx)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
- what changed
  - Split the dashboard into focused home/work-surface components.
  - Reduced driver-dashboard page complexity.
- verification summary
  - Verified locally before commit.
  - No later regression from this extraction was found during build and route verification.
- commit message
  - `refactor(driver): extract home work-surface modules`
- short hash
  - `e3cd5b7`
- pushed to main or not
  - pushed to `main`
- production status
  - pushed, not production-confirmed

### Phase 2 checkpoint 2 — Localize home map helpers
- goal
  - Keep driver-home helper logic close to the driver-home components using it.
- files touched
  - [apps/web/src/components/driver-home/DriverActiveRideCard.tsx](apps/web/src/components/driver-home/DriverActiveRideCard.tsx)
  - [apps/web/src/components/driver-home/DriverLiveOfferCard.tsx](apps/web/src/components/driver-home/DriverLiveOfferCard.tsx)
  - [apps/web/src/components/driver-home/DriverMapSurface.tsx](apps/web/src/components/driver-home/DriverMapSurface.tsx)
  - [apps/web/src/components/driver-home/DriverOfferInbox.tsx](apps/web/src/components/driver-home/DriverOfferInbox.tsx)
  - [apps/web/src/components/driver-home/driver-home.utils.ts](apps/web/src/components/driver-home/driver-home.utils.ts)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
- what changed
  - Localized helper logic for pricing, countdowns, and map-related driver-home behavior.
  - Reduced cross-file coupling in the driver work surface.
- verification summary
  - Verified locally before commit.
  - Later mobile/desktop route checks succeeded on top of this checkpoint.
- commit message
  - `refactor(driver): localize home map helpers`
- short hash
  - `88f1049`
- pushed to main or not
  - pushed to `main`
- production status
  - pushed, not production-confirmed

### Route/runtime fix — restore driver ride route verification
- goal
  - Stop `/driver/rides/:rideId` from collapsing back to `/driver` during auth bootstrap.
- files touched
  - [apps/web/src/providers/auth-provider.tsx](apps/web/src/providers/auth-provider.tsx)
- what changed
  - Initialized stored auth synchronously.
  - Preserved the stored active role when refreshing auth state.
- verification summary
  - Verified locally by direct route load and by continuity from driver home.
  - Confirmed the ride route stayed on `/driver/rides/:rideId`.
- commit message
  - `fix(driver): restore driver ride route verification`
- short hash
  - `18d71bf`
- pushed to main or not
  - pushed to `main`
- production status
  - pushed, not production-confirmed

### Ride page visual alignment
- goal
  - Make the ride page feel like the active-trip continuation of the new driver home.
- files touched
  - [apps/web/src/pages/driver-ride-page.tsx](apps/web/src/pages/driver-ride-page.tsx)
- what changed
  - Added the `Trip in motion` hero.
  - Added stage-aware support copy and clearer next-action treatment.
  - Rebuilt the page around `Driver route map` and `Trip cockpit`.
  - Updated mobile trip actions to match the new flow language.
- verification summary
  - Verified locally on mobile and desktop.
  - Confirmed route continuity, visible ride markers, and successful status CTA responses.
- commit message
  - `style(driver): align ride screen with driver home`
- short hash
  - `fa991ab`
- pushed to main or not
  - pushed to `main`
- production status
  - pushed, not production-confirmed

### Build/deploy cleanup
- goal
  - Fix TypeScript build errors that blocked deployment after the driver chain was pushed.
- files touched
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
- what changed
  - Removed unused mobile-nav and driver-dashboard symbols.
- verification summary
  - Verified locally with editor diagnostics and a successful `pnpm --filter @realdrive/web build`.
- commit message
  - `fix(web): clear unused driver build symbols`
- short hash
  - `15e34b8`
- pushed to main or not
  - pushed to `main`
- production status
  - pushed, not production-confirmed

### Offer action request fix
- goal
  - Stop body-less driver offer actions from failing with `400 Bad Request`.
- files touched
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
- what changed
  - Updated `apiFetch()` so `Content-Type: application/json` is only sent when a request body exists.
- verification summary
  - Reproduced the failure locally.
  - Verified `/driver/offers/:rideId/decline` returned `200` after the fix.
  - Verified `pnpm --filter @realdrive/web build` still passed.
- commit message
  - `fix(web): stop empty-json offer actions`
- short hash
  - `554d065`
- pushed to main or not
  - pushed to `main`
- production status
  - pushed, not production-confirmed

### Docs/status tracking
- goal
  - Capture the driver redesign state in a reusable handoff and connect it to the rider/admin tracker docs.
- files touched
  - [docs/driver-redesign-status.md](docs/driver-redesign-status.md)
  - [docs/rider-redesign-status.md](docs/rider-redesign-status.md)
  - [docs/admin-redesign-status.md](docs/admin-redesign-status.md)
- what changed
  - Added the initial driver redesign tracker.
  - Added companion rider/admin tracker docs so driver status sits in a wider redesign context.
- verification summary
  - Verified locally by inspecting git history, pushed state, and current documentation contents.
  - This documentation checkpoint has not been pushed yet.
- commit message
  - `docs(driver): add redesign status tracker`
  - `docs(status): add rider and admin redesign trackers`
- short hash
  - `6f23302`
  - `8cf8bc5`
- pushed to main or not
  - local only
- production status
  - not pushed, not production-confirmed

## Commit timeline

| order | short hash | commit message | purpose | verified? | pushed to main? | production candidate? | production confirmed? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `e587192` | `feat(driver): finalize phase 1.1 map-first home cleanup` | establish map-first driver home direction | yes | yes | yes | no |
| 2 | `e3cd5b7` | `refactor(driver): extract home work-surface modules` | extract driver home into focused modules | yes | yes | yes | no |
| 3 | `88f1049` | `refactor(driver): localize home map helpers` | localize driver-home helper logic | yes | yes | yes | no |
| 4 | `18d71bf` | `fix(driver): restore driver ride route verification` | fix ride-route auth/bootstrap collapse | yes | yes | yes | no |
| 5 | `fa991ab` | `style(driver): align ride screen with driver home` | align ride page with driver home direction | yes | yes | yes | no |
| 6 | `15e34b8` | `fix(web): clear unused driver build symbols` | clear deployment-blocking build issues | yes | yes | yes | no |
| 7 | `554d065` | `fix(web): stop empty-json offer actions` | fix `400` errors on offer actions | yes | yes | yes | no |
| 8 | `6f23302` | `docs(driver): add redesign status tracker` | add driver redesign tracker doc | yes | no | no | no |
| 9 | `8cf8bc5` | `docs(status): add rider and admin redesign trackers` | add cross-scope redesign tracker docs | yes | no | no | no |

## Important files and what they do
- [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
  - Main driver home page and primary map-first dispatch surface.
- [apps/web/src/pages/driver-ride-page.tsx](apps/web/src/pages/driver-ride-page.tsx)
  - Active-trip ride screen and trip action flow.
- [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - Shared shell framing and mobile navigation container used by driver routes.
- [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - Shell frame metadata, route matching, and mobile-nav behavior for driver pages.
- [apps/web/src/providers/auth-provider.tsx](apps/web/src/providers/auth-provider.tsx)
  - Auth/session bootstrap logic that fixed driver ride-route continuity.
- [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - Shared web API client used by driver actions including offer accept/decline and ride status updates.
- [apps/web/src/components/driver-home/DriverStatusBar.tsx](apps/web/src/components/driver-home/DriverStatusBar.tsx)
  - Driver status and availability control strip.
- [apps/web/src/components/driver-home/DriverLiveOfferCard.tsx](apps/web/src/components/driver-home/DriverLiveOfferCard.tsx)
  - Primary live-offer CTA card for accept/decline actions.
- [apps/web/src/components/driver-home/DriverOfferInbox.tsx](apps/web/src/components/driver-home/DriverOfferInbox.tsx)
  - Pending-offer queue behind the Inbox tab.
- [apps/web/src/components/driver-home/DriverActiveRideCard.tsx](apps/web/src/components/driver-home/DriverActiveRideCard.tsx)
  - Near-top active-ride summary used on the driver home surface.
- [apps/web/src/components/driver-home/DriverEarningsMini.tsx](apps/web/src/components/driver-home/DriverEarningsMini.tsx)
  - Compact projected-earnings summary for the work rail.
- [apps/web/src/components/driver-home/DriverToolsSection.tsx](apps/web/src/components/driver-home/DriverToolsSection.tsx)
  - Lower-priority/collapsible tools area.
- [apps/web/src/components/driver-home/DriverMapSurface.tsx](apps/web/src/components/driver-home/DriverMapSurface.tsx)
  - Map-first driver home surface tied to offer or active-ride context.
- [apps/web/src/components/driver-home/driver-home.utils.ts](apps/web/src/components/driver-home/driver-home.utils.ts)
  - Driver-home helper logic for ride pricing, countdowns, and dispatch summaries.

## Deployment status

### Verified local checkpoints
- `e587192` — phase 1.1 map-first home cleanup
- `e3cd5b7` — extract home work-surface modules
- `88f1049` — localize home map helpers
- `18d71bf` — restore driver ride route verification
- `fa991ab` — align ride screen with driver home
- `15e34b8` — clear unused driver build symbols
- `554d065` — stop empty-json offer actions
- `6f23302` — driver redesign tracker docs
- `8cf8bc5` — rider/admin tracker docs

### Pushed to main
- `e587192`
- `e3cd5b7`
- `88f1049`
- `18d71bf`
- `fa991ab`
- `15e34b8`
- `554d065`

### Production confirmed
- none

### Unknown / still needs confirmation
- Whether production is fully serving `554d065`
- Production smoke-test status for `/driver`
- Production smoke-test status for `/driver/rides/:rideId`
- Production smoke-test status for driver `Accept`
- Production smoke-test status for driver `Decline`
- Local-only docs checkpoints `6f23302` and `8cf8bc5` are not pushed yet

## What remains

### production verification / smoke tests
- Confirm the deployed app is actually serving commit `554d065`.
- Run a focused production smoke pass on `/driver`.
- Run a focused production smoke pass on `/driver/rides/:rideId`.
- Confirm production `Accept` and `Decline` both succeed end to end.

### driver follow-up polish
- Only address driver polish items if production smoke testing exposes real issues.

### QA / cleanup
- Push or intentionally hold the local-only documentation commits.
- Keep future driver work split into small checkpoints if driver scope reopens.

### later non-driver work
- Choose rider or admin as the next active redesign scope only after driver production verification is complete.

## Deferred / intentionally not included
- rider redesign
- admin redesign
- large backend rewrites beyond minimal driver fixes
- broad route restructuring
- schema/contract overhauls unless actually completed
- new parallel driver route trees or a separate driver app shell

## Risks / watch items
- Production confirmation is still manual and currently unknown.
- The most recent live driver fixes were verified locally, not production-confirmed.
- Offer-action verification used controlled test rides; production should still be checked carefully.
- Local-only handoff docs are ahead of `origin/main` and not yet shareable through production branch history.

## Recommended next step after driver scope
- Confirm production is serving `554d065`, then run one focused production smoke test for `/driver`, `Accept`, `Decline`, and `/driver/rides/:rideId` before starting rider or admin redesign work.
