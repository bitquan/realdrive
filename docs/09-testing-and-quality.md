# Testing And Quality

## Current Verification Commands

From the repo root:

```bash
pnpm lint
pnpm test
pnpm build
pnpm screenshots
```

## Current Automated Tests

Backend tests live in:

- `apps/api/src/tests/pricing.test.ts`
- `apps/api/src/tests/ride-service.test.ts`

Current coverage includes:

- Fare calculation
- Platform due calculation
- Ride transition rules
- Scheduled ride release behavior
- First-accept-wins dispatch protection

## Current Frontend Test State

Current status:

- Frontend test runner is configured
- Baseline React Testing Library + jsdom setup is in place
- Current web test file: `apps/web/src/components/ui/button.test.tsx`
- Playwright screenshot coverage is configured for major stable public screens, shared feedback screens, and admin/driver dashboards

## Manual QA Checklist

## Rider

- Request OTP
- Verify OTP
- Generate quote
- Book ride now
- Book scheduled ride
- View ride history
- Open ride detail page
- Cancel ride before completion
- Confirm public tracking page shows community entry link
- Confirm all-in pricing appears instead of a separate fee line
- Confirm rider community access is read-only before `51` completed rides

## Driver

- Sign up with email/password
- Approve driver from admin
- Verify approved driver can log in
- Toggle availability
- Verify `/driver` uses the map-first shell on mobile
- Verify stand-by state uses the real map when Mapbox is configured
- View pending offers
- Verify `/driver/inbox` opens as a dedicated inbox shell route
- Verify inbox rows stay visible and only expand/collapse details
- Accept an offer
- Verify route map can pan freely and `Recenter` returns to the active route
- Update dispatch settings
- Switch between platform and custom pricing
- Move ride from `accepted` to `completed`
- Verify `/driver/rides/:rideId` keeps route, markers, and trip controls visible above the mobile sheet
- Verify active ride list updates
- Verify dues appear after a completed ride
- Verify overdue dues block going available and block new work cleanly
- Verify driver community board can create proposals, vote, and comment

## Admin

- Sign in
- Complete first-admin setup if the DB is fresh
- Verify admin setup can also create the first driver profile in the same account
- Verify one account can switch between admin and driver
- View rides
- Mark payment collected
- Cancel a ride
- Approve/reject drivers
- Change platform market rates
- Configure payout instructions in `/admin/dues`
- Mark a due paid or waived
- Moderate a proposal or comment in the community board

## Realtime

- Rider sees status updates after driver actions
- Driver sees offer updates
- Ride detail view refreshes when ride state changes

## Notifications (Push + Fallback)

- Open `/notifications` as an authenticated user
- Enable push on current browser/device
- Run **Send test push** and confirm `manual_test` entry in delivery logs
- Verify push behavior with app open and app backgrounded/closed
- Trigger ride status updates and confirm push logs for:
	- `new_job`
	- `accepted`
	- `en_route`
	- `arrived`
	- `in_progress`
	- `completed`
	- `canceled`
- Confirm SMS fallback only appears for critical events when push is unavailable or fails

Detailed walkthrough:

- [Push Notifications Playbook](./12-push-notifications-playbook.md)

## Recommended Next Tests

- Integration tests for Fastify route handlers
- Database-backed tests for Prisma store behavior
- WebSocket event tests
- Frontend component and route tests (expand from baseline)
- Expand Playwright from screenshot coverage into interactive trip and map-heavy flows

## Quality Risks To Watch

- Frontend coverage is still very light (one baseline component test)
- Scheduled dispatch currently runs inside the API process
- Fallback routing can hide map provider issues if not monitored
- The web build still produces a large Mapbox-related chunk, so code-splitting may be worth doing later
