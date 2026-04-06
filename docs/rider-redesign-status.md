# Rider Redesign Status

## Layered reopen checklist

Use this block when rider redesign work reopens. Keep one layer in progress at a time.

- [ ] Layer 1 — Design And UX System
- [ ] Layer 2 — Architecture And Data
- [ ] Layer 3 — Rider And Public Flows
- [ ] Layer 7 — Quality, QA, And DevOps

Working rule:
- Mark exactly one layer as active (`[~]` in notes or explicit "in progress" text), then complete it before advancing.
- Sync changes with [docs/18-layered-dev-checklist.md](./18-layered-dev-checklist.md) in the same branch.

## Scope
- The rider redesign is now active as a dedicated checkpointed workstream.
- This document records the current rider baseline so the next rider phase can start from a concrete, accurate state.
- The rider scope is still centered on the existing booking and trip routes rather than a new parallel rider app.
- This work now includes the mock-inspired rider mobile design phase and its feature-planning documents.

## Final direction
- existing `/` route for booking
- dedicated `/rider/login` route for returning-rider access
- existing `/rider/rides` route for history
- existing `/rider/rides/:rideId` route for ride detail
- real booking and tracking flow only
- rider history and ride detail kept connected
- no fake rider dashboard or duplicate route tree

## Completed phases

### Baseline rider improvement — Address suggestions for booking
- summary
  - Added rider booking address suggestions so pickup and dropoff entry uses a stronger real-world booking flow.
- files
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/services/maps.ts](apps/api/src/services/maps.ts)
  - [apps/api/src/services/types.ts](apps/api/src/services/types.ts)
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - [apps/web/src/pages/home-page.tsx](apps/web/src/pages/home-page.tsx)
  - [shared/contracts.ts](shared/contracts.ts)
- what changed
  - Added address-suggestion support on the backend and exposed it through the web client.
  - Wired the rider booking page to use address suggestions during trip creation.
- verification summary
  - Historical commit already on `main`.
  - No dedicated rider redesign verification log exists in the current workstream.
- commit message
  - `feat(rider): add address suggestions for pickup/dropoff`
- short hash
  - `8738914`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Baseline rider/payment improvement — Enforce driver accepted payment methods
- summary
  - Ensured rider bookings respect the driver payment methods that are actually accepted.
- files
  - [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/lib/mappers.ts](apps/api/src/lib/mappers.ts)
  - [apps/api/src/lib/store.ts](apps/api/src/lib/store.ts)
  - [apps/api/src/services/ride-service.ts](apps/api/src/services/ride-service.ts)
  - [apps/api/src/tests/ride-service.test.ts](apps/api/src/tests/ride-service.test.ts)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
  - [shared/contracts.ts](shared/contracts.ts)
- what changed
  - Added data-model and service support for driver payment preferences.
  - Enforced those preferences in booking/ride handling so rider choices stay valid against real driver capabilities.
- verification summary
  - Historical commit already on `main`.
  - No dedicated rider redesign verification log exists in the current workstream.
- commit message
  - `feat(payments): enforce driver accepted payment methods for rider bookings`
- short hash
  - `1a70614`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Baseline rider/mobile fix — Remove horizontal overflow on rider ride view
- summary
  - Fixed a mobile presentation problem on the rider ride view.
- files
  - [apps/web/src/pages/home-page.tsx](apps/web/src/pages/home-page.tsx)
- what changed
  - Removed horizontal overflow affecting the rider mobile experience.
- verification summary
  - Historical commit already on `main`.
  - No dedicated rider redesign verification log exists in the current workstream.
- commit message
  - `fix(web-mobile): remove horizontal overflow on rider ride view`
- short hash
  - `d2f96cd`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Shared rider-facing workflow addition — Issue reporting entry points
- summary
  - Added shared bug-reporting and feature-request flows that also affect rider-visible experiences.
- files
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/config/env.ts](apps/api/src/config/env.ts)
  - [apps/api/src/lib/store.ts](apps/api/src/lib/store.ts)
  - [apps/api/src/services/issue-reports.ts](apps/api/src/services/issue-reports.ts)
  - [apps/api/src/services/types.ts](apps/api/src/services/types.ts)
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - [apps/web/src/pages/ride-details-page.tsx](apps/web/src/pages/ride-details-page.tsx)
  - [shared/contracts.ts](shared/contracts.ts)
- what changed
  - Added shared issue-report flows used across rider, driver, and admin experiences.
  - Exposed rider-side entry points through ride-related pages.
- verification summary
  - Historical commit already on `main`.
  - This was not a rider-only redesign checkpoint.
- commit message
  - `feat(issue-reporting): add rider/driver/admin reports with async GitHub sync`
- short hash
  - `cfc490c`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

## Commit timeline

| order | short hash | commit message | purpose | pushed to main? | production candidate? | production verified? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `8738914` | `feat(rider): add address suggestions for pickup/dropoff` | improve rider booking input quality | yes | yes | unknown |
| 2 | `1a70614` | `feat(payments): enforce driver accepted payment methods for rider bookings` | keep rider payment selection aligned with actual driver capabilities | yes | yes | unknown |
| 3 | `d2f96cd` | `fix(web-mobile): remove horizontal overflow on rider ride view` | fix rider mobile layout overflow | yes | yes | unknown |
| 4 | `cfc490c` | `feat(issue-reporting): add rider/driver/admin reports with async GitHub sync` | add rider-visible issue reporting entry points | yes | yes | unknown |

## Known pushed checkpoints from this work
- No dedicated rider redesign chain has been pushed yet.
- The commits above are rider-relevant baseline work already on `main`.

## Files changed across the project
- [apps/web/src/pages/home-page.tsx](apps/web/src/pages/home-page.tsx)
  - Current rider booking surface.
- [apps/web/src/pages/ride-history-page.tsx](apps/web/src/pages/ride-history-page.tsx)
  - Rider trip-history queue for active, scheduled, and completed rides.
- [apps/web/src/pages/ride-details-page.tsx](apps/web/src/pages/ride-details-page.tsx)
  - Rider ride-detail surface with live trip context.
- [apps/web/src/pages/public-track-page.tsx](apps/web/src/pages/public-track-page.tsx)
  - Public live trip tracking route.
- [apps/web/src/components/ui/address-autocomplete-input.tsx](apps/web/src/components/ui/address-autocomplete-input.tsx)
  - Booking address input component tied to rider trip creation quality.
- [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - Shared web API client used by rider booking, history, and ride-detail flows.
- [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - Shared shell that rider routes currently inherit.
- [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - Route framing and shell metadata affecting rider pages.

## Production status

### Pushed to main
- `8738914` — `feat(rider): add address suggestions for pickup/dropoff`
- `1a70614` — `feat(payments): enforce driver accepted payment methods for rider bookings`
- `d2f96cd` — `fix(web-mobile): remove horizontal overflow on rider ride view`
- `cfc490c` — `feat(issue-reporting): add rider/driver/admin reports with async GitHub sync`

### Confirmed deployed
- unknown

### Still local only
- No rider-specific redesign checkpoint is currently tracked as local-only.

## What remains

### rider follow-up polish
- Define the actual rider redesign scope before changing layouts or workflows.
- Decide whether rider booking, rider history, or rider detail should be redesigned first.

### production verification
- Confirm the current production rider booking flow still works after the latest shared web fixes.
- Confirm rider history and rider detail still behave correctly in production.

### QA / smoke tests
- Run a focused rider smoke pass for booking, history, detail, and public tracking.

### later non-rider work
- Do not start rider redesign implementation until driver production verification is complete.

## Current reopened checkpoint

### rider access and rider queue refresh
- summary
  - Added the first rider redesign checkpoint by introducing a dedicated rider login route and a more polished rider trip queue surface.
- files
  - [apps/web/src/components/auth/auth-page-shell.tsx](apps/web/src/components/auth/auth-page-shell.tsx)
  - [apps/web/src/pages/rider-login-page.tsx](apps/web/src/pages/rider-login-page.tsx)
  - [apps/web/src/pages/ride-history-page.tsx](apps/web/src/pages/ride-history-page.tsx)
  - [apps/web/src/pages/home-page.tsx](apps/web/src/pages/home-page.tsx)
  - [apps/web/src/main.tsx](apps/web/src/main.tsx)
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
- what changed
  - Added a dedicated `/rider/login` rider entry that uses the existing OTP auth flow.
  - Kept guest booking primary on `/` while adding a clearer returning-rider sign-in CTA.
  - Refreshed rider history so signed-in riders land on a stronger rider-side queue instead of a bare list.
- verification summary
  - In progress in the current workstream.

### rider mock-shell design phase
- summary
  - Started the mock-inspired rider mobile design phase with a compact map-first rider shell, roadmap-backed feature tiles, and dedicated rider design documents.
- files
  - [apps/web/src/components/rider-home/rider-map-shell.tsx](apps/web/src/components/rider-home/rider-map-shell.tsx)
  - [apps/web/src/components/rider-home/rider-trip-map-shell.tsx](apps/web/src/components/rider-home/rider-trip-map-shell.tsx)
  - [apps/web/src/components/rider-home/rider-feature-catalog.ts](apps/web/src/components/rider-home/rider-feature-catalog.ts)
  - [apps/web/src/components/rider-home/rider-feature-grid.tsx](apps/web/src/components/rider-home/rider-feature-grid.tsx)
  - [apps/web/src/pages/home-page.tsx](apps/web/src/pages/home-page.tsx)
  - [apps/web/src/pages/ride-details-page.tsx](apps/web/src/pages/ride-details-page.tsx)
  - [apps/web/src/pages/public-track-page.tsx](apps/web/src/pages/public-track-page.tsx)
  - [docs/19-rider-mobile-design-spec.md](docs/19-rider-mobile-design-spec.md)
  - [docs/20-rider-feature-phase-plan.md](docs/20-rider-feature-phase-plan.md)
- what changed
  - Added a mock-style rider feature grid that mixes real routes with clearly marked coming-soon roadmap tiles.
  - Routed future rider tiles into the existing feature-intake flow instead of fake product behavior.
  - Documented the rider mobile design direction and created a per-feature plan for each visible rider tile.
  - Extended the compact trip-shell language into signed-in ride detail and public tracking on mobile.
- verification summary
  - Design phase implementation is active and should keep using the existing rider/public routes.

## Deferred / intentionally not included
- full rider visual parity across ride detail and public tracking has not shipped yet
- no rider route restructuring has been started yet
- no separate rider app or duplicate rider route tree has been introduced
- no backend rewrite beyond existing baseline rider features has been done for this redesign effort
- no admin or driver redesign work is counted here unless it directly affects rider behavior

## Risks / watch items
- Production state for current rider flows is not yet manually confirmed in this documentation pass.
- Rider baseline spans shared booking, tracking, and shell files, so later redesign work should stay checkpointed.
- Shared API client changes can affect rider flows even when the checkpoint is not rider-specific.

## Recommended next step after rider scope
- Continue the rider mock-shell rollout into ride detail and public tracking using the same compact map-shell language.
