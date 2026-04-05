# Testing And Quality

## Current Verification Commands

From the repo root:

```bash
pnpm lint
pnpm test
pnpm build
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
- No frontend tests have been added yet

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
- View pending offers
- Accept an offer
- Update dispatch settings
- Switch between platform and custom pricing
- Move ride from `accepted` to `completed`
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
- Frontend component and route tests
- Full end-to-end browser tests with Playwright

## Quality Risks To Watch

- Frontend has no automated coverage yet
- Scheduled dispatch currently runs inside the API process
- Fallback routing can hide map provider issues if not monitored
- The web build still produces a large Mapbox-related chunk, so code-splitting may be worth doing later
