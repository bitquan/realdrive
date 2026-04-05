# Backend API

## Backend Stack

- Fastify
- Prisma
- PostgreSQL
- Socket.IO
- Zod
- JWT

Main server files:

- `apps/api/src/index.ts`
- `apps/api/src/app.ts`

## Auth Rules

- Rider routes require rider JWT
- Driver routes require driver JWT
- Admin routes require admin JWT
- One session can now include multiple roles in `roles[]`, with `role` representing the current/default UI role
- Protected requests use `Authorization: Bearer <token>`

## HTTP Endpoints

## Public

### `POST /auth/otp/request`

Purpose:

- Request OTP for rider sign-in

Body:

```json
{
  "phone": "(555) 555-5555",
  "role": "rider"
}
```

Notes:

- In development mode, the response includes `devCode`

### `POST /auth/otp/verify`

Purpose:

- Verify rider OTP and return a JWT session

### `GET /admin/setup/status`

Purpose:

- Tell the frontend whether first-admin setup is still open

### `POST /admin/setup`

Purpose:

- Create or claim the first real admin account
- Optionally bootstrap the same user as an approved driver in one request

### `POST /driver/signup`

Purpose:

- Create a real pending driver account with email/password
- Requires a full 4-document upload packet in request body (`insurance`, `registration`, `background_check`, `mvr`)
- Persists files to configured `DRIVER_DOCUMENT_UPLOAD_DIR` and creates review records for admin workflow

### `POST /driver/auth/login`

Purpose:

- Log an approved driver in with email/password

### `POST /admin/auth/login`

Purpose:

- Admin login with email and password

### `POST /auth/logout`

Purpose:

- No server-side session invalidation right now
- Returns `{ "ok": true }`

### `POST /quotes/ride`

Purpose:

- Get a fare estimate before booking

Body:

```json
{
  "pickupAddress": "123 Main St, Atlanta, GA",
  "dropoffAddress": "Airport",
  "rideType": "standard"
}
```

Response fields:

- `estimatedMiles`
- `estimatedMinutes`
- `routeProvider`
- `estimatedSubtotal`
- `estimatedPlatformDue`
- `estimatedCustomerTotal`

### `GET /public/drivers`

Purpose:

- Get approved drivers for public roster display

### `POST /public/rides`

Purpose:

- Create a guest rider booking without OTP
- Persist referral attribution when `referredByCode` is provided
- Return a public tracking link and the rider's personal share link

### `GET /public/track/:token`

Purpose:

- Load one ride through its public tracking token
- Return the ride plus the rider's share info

### `POST /public/rider-leads`

Purpose:

- Save rider interest without creating a ride
- Create or update a lightweight rider profile so the rider still gets a referral link

### `GET /public/share/:referralCode`

Purpose:

- Resolve a referral code into the public rider destination URL
- Used by the QR/referral flow

## Authenticated Shared

### `GET /me`

Purpose:

- Return the current authenticated user

### `GET /me/share`

Purpose:

- Return the authenticated rider or driver's stable personal referral/share link

### `GET /me/notification-preferences`

Purpose:

- Return notification preference state and active push subscriptions for current user

### `PUT /me/notification-preferences`

Purpose:

- Update `pushEnabled` and `smsCriticalOnly` notification preferences

### `POST /me/push-subscriptions`

Purpose:

- Upsert current browser/device push subscription for current user

### `POST /me/push-subscriptions/unsubscribe`

Purpose:

- Remove one push subscription endpoint for current user

### `POST /me/notifications/test-push`

Purpose:

- Trigger a `manual_test` push notification for current user to validate setup

### `GET /me/notification-delivery-logs`

Purpose:

- Return notification delivery logs for current user

### `POST /me/roles/driver`

Purpose:

- Add a driver role and driver profile to an already authenticated rider/admin user

### `GET /rides/:id`

Purpose:

- Get one ride visible to rider, assigned driver, or admin

## Rider

### `POST /rides`

Purpose:

- Create an on-demand or scheduled ride

### `POST /rides/:id/cancel`

Purpose:

- Rider or admin cancels a ride

### `GET /rider/rides`

Purpose:

- Rider ride history list

## Driver

### `GET /driver/profile`

Purpose:

- Fetch the driver account profile

### `PATCH /driver/profile`

Purpose:

- Update driver basics and vehicle fields

### `GET /driver/dispatch-settings`

Purpose:

- Fetch driver dispatch modes and service-area settings

### `PUT /driver/dispatch-settings`

Purpose:

- Update driver local, service-area, and nationwide dispatch modes

### `GET /driver/rates`

Purpose:

- Fetch the driver pricing mode and custom rate card

### `PUT /driver/rates`

Purpose:

- Update the driver pricing mode and custom rates

### `GET /driver/dues`

Purpose:

- Fetch outstanding dues, due history, payout instructions, and the driver's suspended state

### `GET /driver/offers`

Purpose:

- Fetch pending ride offers for the driver

### `POST /driver/offers/:rideId/accept`

Purpose:

- Accept a pending offer

### `POST /driver/offers/:rideId/decline`

Purpose:

- Decline a pending offer

### `POST /driver/location`

Purpose:

- Save a location ping for the assigned ride

### `POST /driver/rides/:id/status`

Purpose:

- Progress ride status through the driver workflow

Allowed progression:

- `accepted -> en_route`
- `en_route -> arrived`
- `arrived -> in_progress`
- `in_progress -> completed`

### `POST /driver/availability`

Purpose:

- Toggle driver availability

### `GET /driver/rides/active`

Purpose:

- Fetch driver rides in active statuses

## Admin

### `GET /admin/rides`

Purpose:

- Fetch all rides

### `GET /admin/leads`

Purpose:

- Fetch public rider leads and driver-interest submissions

### `GET /admin/dues`

Purpose:

- Fetch all dues, overdue-driver summaries, and current payout instructions

### `PATCH /admin/dues/:id`

Purpose:

- Mark a due `pending`, `paid`, or `waived`
- Store manual payment method and optional admin note

### `GET /admin/platform-payout-settings`

Purpose:

- Fetch manual platform due payment instructions shown to drivers

### `PUT /admin/platform-payout-settings`

Purpose:

- Update Cash App, Zelle, Jim, cash, and other due-payment instructions

### `PATCH /admin/rides/:id`

Purpose:

- Update status, payment status, fare override, or fallback miles

### `GET /admin/drivers`

Purpose:

- Fetch all drivers

### `GET /admin/driver-applications`

Purpose:

- Fetch pending driver applications

### `PATCH /admin/drivers/:id/approval`

Purpose:

- Approve or reject a driver account

### `PATCH /admin/drivers/:id/documents/:documentId`

Purpose:

- Approve or reject one uploaded driver onboarding document
- Record reviewer/admin note and update driver readiness state

### `GET /admin/drivers/:id/documents/:documentId/file`

Purpose:

- Stream one uploaded driver document file to admin reviewer

### `PATCH /admin/drivers/:id`

Purpose:

- Update driver basics, availability, dispatch settings, or pricing mode

### `GET /admin/platform-rates`

Purpose:

- Get platform market rate cards

### `GET /admin/markets`

Purpose:

- List configured market keys and pricing-rule counts

### `POST /admin/markets`

Purpose:

- Create a new market config and seed market pricing rules from `DEFAULT` (or provided source market)

### `PUT /admin/platform-rates`

Purpose:

- Update state-based platform market rates

### `GET /admin/platform-rates/benchmarks`

Purpose:

- Fetch saved Uber/Lyft benchmark snapshots used for auto-pricing

### `PUT /admin/platform-rates/benchmarks`

Purpose:

- Upsert Uber/Lyft benchmark snapshots for one or more markets

### `GET /admin/platform-rates/auto-status`

Purpose:

- Return auto-pricing status, runner mode (`api` or `worker`), benchmark counts, and last run/error state

### `POST /admin/platform-rates/auto-apply`

Purpose:

- Trigger immediate benchmark undercut pricing update manually

### `PUT /admin/pricing`

Purpose:

- Replace pricing rule values

### `POST /payments/checkout-link`

Purpose:

- Create Stripe hosted checkout session links for dues/ride-related payment collection
- Store audit logs for payment-link creation activity
- Requires driver or admin auth

### `GET /admin/audit-logs`

Purpose:

- Return searchable audit log rows (supports `limit`, `action`, and `entityType` query filters)

## Community

### `POST /community/access/exchange`

Purpose:

- Exchange a rider community-access token for an authenticated rider session

### `GET /community/proposals`

Purpose:

- Fetch the board plus the viewer's create/vote/comment eligibility

### `POST /community/proposals`

Purpose:

- Create a proposal when the viewer is eligible

### `POST /community/proposals/:id/vote`

Purpose:

- Cast or replace a yes/no vote on a proposal

### `GET /community/proposals/:id/comments`

Purpose:

- Fetch one proposal, its flat comments, and the viewer's eligibility

### `POST /community/proposals/:id/comments`

Purpose:

- Add a flat comment when the viewer is eligible and the proposal is open

### `PATCH /admin/community/proposals/:id`

Purpose:

- Pin, close, or hide a proposal

### `PATCH /admin/community/comments/:id`

Purpose:

- Hide a comment from the board

## WebSocket Events

Current server events:

- `ride.offer`
- `ride.status.changed`
- `ride.location.updated`
- `driver.availability.changed`

Client-initiated event:

- `ride.watch`
  Join the ride-specific room for updates

## Error Model

Validation failures return:

```json
{
  "message": "Validation error",
  "details": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

Current note:

- Validation failures are normalized
- Overdue-due availability and accept-offer blocks now return mapped `403` responses instead of generic `500`s
