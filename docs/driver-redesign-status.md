# Driver Redesign Status

## Scope
- The driver redesign focused on making the driver experience feel like a dedicated driver product instead of a reused ops/admin surface.
- The target was a map-first dispatch flow on the existing driver routes, centered on /driver and /driver/rides/:rideId.
- The work covered driver home structure, driver ride continuity, ride-screen alignment, and two production fixes needed to keep the shipped flow working.
- This work stops at driver scope for now.

## Final direction
- Map First Dispatch
- existing /driver route
- map-first driver home
- Live / Inbox toggle
- active ride near the top
- lower-priority tools collapsed/lower
- ride screen aligned with driver home

## Completed phases

### Phase 1.1 — Map-first home cleanup
- summary
  - Reworked the driver home surface toward a map-first layout and aligned the shell around driver context instead of the older ops/dashboard feel.
- files
  - [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
  - [apps/web/src/pages/driver-ride-page.tsx](apps/web/src/pages/driver-ride-page.tsx)
- what changed
  - Updated driver shell framing and mobile nav handling.
  - Restructured the main driver dashboard toward a map-first work surface.
  - Began aligning the ride page and shell behavior with the driver-first direction.
- verification
  - Verified locally during the driver redesign sequence before commit.
  - Later commits depended on this checkpoint and were successfully built and pushed.
- commit
  - `feat(driver): finalize phase 1.1 map-first home cleanup`
  - `e587192`
- deployment state
  - pushed: yes
  - production status: on `main`; live deployment confirmation unknown

### Phase 2 checkpoint 1 — Extract home work-surface modules
- summary
  - Extracted the driver home into dedicated modules so the driver dashboard could be iterated safely in small checkpoints.
- files
  - [apps/web/src/components/driver-home/DriverActiveRideCard.tsx](apps/web/src/components/driver-home/DriverActiveRideCard.tsx)
  - [apps/web/src/components/driver-home/DriverEarningsMini.tsx](apps/web/src/components/driver-home/DriverEarningsMini.tsx)
  - [apps/web/src/components/driver-home/DriverLiveOfferCard.tsx](apps/web/src/components/driver-home/DriverLiveOfferCard.tsx)
  - [apps/web/src/components/driver-home/DriverOfferInbox.tsx](apps/web/src/components/driver-home/DriverOfferInbox.tsx)
  - [apps/web/src/components/driver-home/DriverStatusBar.tsx](apps/web/src/components/driver-home/DriverStatusBar.tsx)
  - [apps/web/src/components/driver-home/DriverToolsSection.tsx](apps/web/src/components/driver-home/DriverToolsSection.tsx)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
- what changed
  - Split the large driver dashboard into focused components for status, live offer, inbox, active ride, earnings, and lower-priority tools.
  - Reduced coupling inside the main page so follow-up driver changes could stay scoped.
- verification
  - Verified locally before commit as part of the incremental refactor chain.
  - No later regression was introduced by this extraction in subsequent build and route verification work.
- commit
  - `refactor(driver): extract home work-surface modules`
  - `e3cd5b7`
- deployment state
  - pushed: yes
  - production status: on `main`; live deployment confirmation unknown

### Phase 2 checkpoint 2 — Localize home map helpers
- summary
  - Moved remaining driver-home map helpers into driver-specific files so home behavior was easier to reason about and maintain.
- files
  - [apps/web/src/components/driver-home/DriverActiveRideCard.tsx](apps/web/src/components/driver-home/DriverActiveRideCard.tsx)
  - [apps/web/src/components/driver-home/DriverLiveOfferCard.tsx](apps/web/src/components/driver-home/DriverLiveOfferCard.tsx)
  - [apps/web/src/components/driver-home/DriverMapSurface.tsx](apps/web/src/components/driver-home/DriverMapSurface.tsx)
  - [apps/web/src/components/driver-home/DriverOfferInbox.tsx](apps/web/src/components/driver-home/DriverOfferInbox.tsx)
  - [apps/web/src/components/driver-home/driver-home.utils.ts](apps/web/src/components/driver-home/driver-home.utils.ts)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
- what changed
  - Localized helper logic for pricing, countdown, and map-related dashboard behavior.
  - Reduced cross-file driver-home dependencies.
- verification
  - Verified locally before commit in the checkpoint workflow.
  - Later driver verification ran successfully against the extracted/localized home flow.
- commit
  - `refactor(driver): localize home map helpers`
  - `88f1049`
- deployment state
  - pushed: yes
  - production status: on `main`; live deployment confirmation unknown

### Route/runtime fix — ride route verification
- summary
  - Fixed the auth bootstrap timing bug that caused /driver/rides/:rideId to collapse back to /driver during protected-route bootstrap.
- files
  - [apps/web/src/providers/auth-provider.tsx](apps/web/src/providers/auth-provider.tsx)
- what changed
  - Initialized stored auth synchronously in `AuthProvider` so protected driver routes did not briefly render as unauthenticated.
  - Preserved stored role when refreshing `/me` during startup.
- verification
  - Verified locally by loading real driver ride routes directly and through the driver home continuity path.
  - Confirmed the dedicated ride route stayed on `/driver/rides/:rideId` instead of redirecting away.
- commit
  - `fix(driver): restore driver ride route verification`
  - `18d71bf`
- deployment state
  - pushed: yes
  - production status: on `main`; live deployment confirmation unknown

### Ride page visual alignment
- summary
  - Restyled the active ride screen so it feels like the active-trip continuation of the new driver home.
- files
  - [apps/web/src/pages/driver-ride-page.tsx](apps/web/src/pages/driver-ride-page.tsx)
- what changed
  - Added the `Trip in motion` hero treatment.
  - Added stage-specific support copy and stronger next-action emphasis.
  - Replaced the older panel structure with a map-first `Driver route map` and `Trip cockpit` side rail.
  - Updated mobile bottom actions to match the new trip flow language.
- verification
  - Verified locally with mobile and desktop route checks.
  - Confirmed `Trip in motion`, `Trip cockpit`, and `Driver route map` rendered.
  - Confirmed route continuity and status CTA success during verification.
- commit
  - `style(driver): align ride screen with driver home`
  - `fa991ab`
- deployment state
  - pushed: yes
  - production status: on `main`; live deployment confirmation unknown

### Build/deploy cleanup
- summary
  - Fixed TypeScript build failures that blocked Vercel after the driver redesign chain was pushed.
- files
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
- what changed
  - Removed unused `driverItem` in the mobile nav helper.
  - Removed unused `Ride` and `DataField` imports in the driver dashboard page.
- verification
  - Verified locally with a successful `pnpm --filter @realdrive/web build`.
  - Confirmed editor diagnostics were clear in the touched files.
- commit
  - `fix(web): clear unused driver build symbols`
  - `15e34b8`
- deployment state
  - pushed: yes
  - production status: on `main`; live deployment confirmation unknown

### Offer action request fix
- summary
  - Fixed driver offer action requests so body-less `POST` calls no longer fail with `400 Bad Request` due to an empty JSON content type.
- files
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
- what changed
  - Updated `apiFetch()` so it only sends `Content-Type: application/json` when a request body exists.
  - This specifically fixed driver offer decline requests and also protects other body-less offer actions.
- verification
  - Reproduced the error locally.
  - Verified `/driver/offers/:rideId/decline` returned `200` after the fix.
  - Verified `pnpm --filter @realdrive/web build` still passed.
- commit
  - `fix(web): stop empty-json offer actions`
  - `554d065`
- deployment state
  - pushed: yes
  - production status: on `main`; live deployment confirmation unknown

## Commit timeline

| order | short hash | commit message | purpose | pushed to main? | production candidate? | production verified? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `e587192` | `feat(driver): finalize phase 1.1 map-first home cleanup` | establish the map-first driver home direction and shell alignment | yes | yes | unknown |
| 2 | `e3cd5b7` | `refactor(driver): extract home work-surface modules` | split driver home into focused work-surface components | yes | yes | unknown |
| 3 | `88f1049` | `refactor(driver): localize home map helpers` | move remaining home helper logic into driver-local files | yes | yes | unknown |
| 4 | `18d71bf` | `fix(driver): restore driver ride route verification` | stop `/driver/rides/:rideId` from collapsing during auth bootstrap | yes | yes | unknown |
| 5 | `fa991ab` | `style(driver): align ride screen with driver home` | align the ride screen with the redesigned driver home | yes | yes | unknown |
| 6 | `15e34b8` | `fix(web): clear unused driver build symbols` | fix Vercel TypeScript build blockers introduced by the pushed chain | yes | yes | unknown |
| 7 | `554d065` | `fix(web): stop empty-json offer actions` | fix production `400` errors on body-less driver offer actions | yes | yes | unknown |

## Known pushed checkpoints from this work
- `15e34b8` — `fix(web): clear unused driver build symbols`
- `554d065` — `fix(web): stop empty-json offer actions`

## Files changed across the project
- [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
  - Main driver home page; received the map-first layout, live/inbox organization, active ride placement, and later build-cleanup import fixes.
- [apps/web/src/pages/driver-ride-page.tsx](apps/web/src/pages/driver-ride-page.tsx)
  - Active trip page; aligned visually with the new driver home and kept live trip actions prominent.
- [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - Shared app shell; part of the driver shell framing updates and mobile experience alignment.
- [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - Shell route/frame metadata and mobile nav behavior; updated for driver context and later cleaned up for build success.
- [apps/web/src/providers/auth-provider.tsx](apps/web/src/providers/auth-provider.tsx)
  - Auth bootstrap and stored session handling; fixed the ride-route redirect regression.
- [apps/web/src/components/driver-home/DriverStatusBar.tsx](apps/web/src/components/driver-home/DriverStatusBar.tsx)
  - Top-level driver availability/status control surface.
- [apps/web/src/components/driver-home/DriverLiveOfferCard.tsx](apps/web/src/components/driver-home/DriverLiveOfferCard.tsx)
  - Live offer presentation and accept/decline CTA surface.
- [apps/web/src/components/driver-home/DriverOfferInbox.tsx](apps/web/src/components/driver-home/DriverOfferInbox.tsx)
  - Pending offer list used by the Live / Inbox driver flow.
- [apps/web/src/components/driver-home/DriverActiveRideCard.tsx](apps/web/src/components/driver-home/DriverActiveRideCard.tsx)
  - Active ride summary card kept near the top of the driver dashboard.
- [apps/web/src/components/driver-home/DriverEarningsMini.tsx](apps/web/src/components/driver-home/DriverEarningsMini.tsx)
  - Compact projected-earnings summary for the driver work rail.
- [apps/web/src/components/driver-home/DriverToolsSection.tsx](apps/web/src/components/driver-home/DriverToolsSection.tsx)
  - Collapsible/lower-priority tools container used to push secondary controls below the core dispatch surface.
- [apps/web/src/components/driver-home/DriverMapSurface.tsx](apps/web/src/components/driver-home/DriverMapSurface.tsx)
  - Driver home map surface, tied to active ride or live offer context.
- [apps/web/src/components/driver-home/driver-home.utils.ts](apps/web/src/components/driver-home/driver-home.utils.ts)
  - Driver-home helper logic for dispatch summary, offer countdowns, and ride pricing.
- [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - Shared web API client; fixed to avoid sending JSON content type on body-less offer actions.

## Production status

### Pushed to main
- `e587192` — `feat(driver): finalize phase 1.1 map-first home cleanup`
- `e3cd5b7` — `refactor(driver): extract home work-surface modules`
- `88f1049` — `refactor(driver): localize home map helpers`
- `18d71bf` — `fix(driver): restore driver ride route verification`
- `fa991ab` — `style(driver): align ride screen with driver home`
- `15e34b8` — `fix(web): clear unused driver build symbols`
- `554d065` — `fix(web): stop empty-json offer actions`

### Confirmed deployed
- unknown

### Still local only
- none currently identified in the driver redesign chain

## What remains

### driver follow-up polish
- Minor driver UX polish is still open only if production smoke testing finds issues.

### production verification
- Confirm the live deployment is actually serving commit `554d065`.
- Manually verify `/driver` on production.
- Manually verify `/driver/rides/:rideId` on production.
- Manually verify driver `Accept` and `Decline` on production.

### QA / smoke tests
- Run a production smoke pass with a real or controlled test offer lifecycle.
- Recheck driver auth bootstrap and direct ride-route entry on the deployed app.

### later non-driver work
- Decide the next non-driver scope only after production driver verification is complete.

## Deferred / intentionally not included
- rider redesign
- admin redesign beyond minimal shell alignment already touched for shared structure
- backend rewrites beyond minimal fixes needed to restore driver runtime behavior
- contract/schema overhauls
- broader route restructuring outside the existing driver routes
- new parallel driver routes or a new driver-only app shell architecture

## Risks / watch items
- Production deployment confirmation is still manual/unknown.
- Driver route continuity should be rechecked on the deployed app, not only locally.
- Offer action behavior was verified locally after the request-header fix, but still needs production confirmation.
- Some verification used admin-created test rides; production smoke testing should use the deployed environment carefully.

## Recommended next step after driver scope
- Confirm production is serving `554d065`, then run one focused production smoke test of `/driver`, `Accept`, `Decline`, and `/driver/rides/:rideId` before starting any non-driver work.
