# Push Notifications Playbook

This guide is the practical handbook for setting up, testing, and troubleshooting push notifications in RealDrive.

## What The System Does

RealDrive notification policy is:

- Push-first for ride updates
- SMS only as critical fallback when push is unavailable or fails
- Per-user preferences for push and SMS fallback behavior
- Delivery logs stored per user for audit and debugging

Key surfaces:

- User settings page: `/notifications`
- API push config: `GET /public/push/config`
- API user prefs/subscriptions:
  - `GET /me/notification-preferences`
  - `PUT /me/notification-preferences`
  - `POST /me/push-subscriptions`
  - `POST /me/push-subscriptions/unsubscribe`
  - `POST /me/notifications/test-push`
  - `GET /me/notification-delivery-logs`

## Required Environment Variables

In `apps/api/.env`:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT` (recommended format: `mailto:team@yourdomain.com`)

For SMS fallback in production:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## How To: Generate VAPID Keys

From repo root:

```bash
pnpm --filter @realdrive/api exec web-push generate-vapid-keys
```

Copy output values into `apps/api/.env`, then restart API.

## Tutorial 1: First-Time Local Setup

1. Start API + web (`pnpm dev`).
2. Log into the app with a real user account.
3. Open `/notifications`.
4. Click **Enable push on this browser**.
5. Accept browser notification permission.
6. Confirm the page shows at least one active device subscription.

Expected success signals:

- Permission is `granted`.
- Subscription count is `>= 1`.
- No `no_active_subscription` error in delivery logs.

## Tutorial 2: Validate Open-App and Closed-App Behavior

1. In `/notifications`, click **Send test push**.
2. Check behavior while app tab is open.
3. Background or close app and click **Send test push** again.
4. Open `/notifications` delivery log and confirm push result entries.

Notes:

- Some browsers suppress intrusive heads-up banners while tab is focused; notification center logs still confirm delivery.
- On iOS web push, users typically need Safari + Add to Home Screen context.

## Tutorial 3: Validate Ride Lifecycle Pushes

Trigger status transitions from rider/driver/admin flows and confirm push log entries for:

- `new_job`
- `accepted`
- `en_route`
- `arrived`
- `in_progress`
- `completed`
- `canceled`

Also verify fallback behavior:

- If push succeeds, SMS fallback should not be required.
- If push fails or no subscription exists, SMS sends for critical events according to preference.

## Troubleshooting Matrix

## Symptom: `no_active_subscription`

Cause:

- User has push enabled but no active browser/device subscription row.

Fix:

1. Open `/notifications`.
2. Re-enable push on this browser.
3. Confirm permission is granted.
4. Re-run **Send test push**.

## Symptom: `400` on `POST /me/notifications/test-push`

Cause:

- Invalid request body or stale frontend build.

Fix:

1. Hard refresh web app.
2. Ensure latest frontend deploy is live.
3. Retry from `/notifications`.

## Symptom: Push failed with endpoint error (`404` / `410`)

Cause:

- Stale subscription endpoint from old browser/app state.

Fix:

1. Disable push on browser.
2. Enable push again (creates fresh subscription).
3. Re-test.

## Symptom: Push never arrives on mobile

Cause:

- Browser/device permission or platform constraints.

Fix:

1. Verify OS-level notification permission.
2. Verify browser-level site permission.
3. On iOS, use Safari installed to Home Screen.
4. Re-run test push and inspect delivery logs.

## Operator Checklist (Quick)

Before pilot/live windows:

1. Confirm `GET /public/push/config` returns `enabled: true`.
2. Verify at least one active subscription for test user.
3. Run one `manual_test` push from `/notifications`.
4. Run one real ride status transition and check logs.
5. Confirm fallback SMS only appears when push fails/unavailable.

## Related Docs

- [03 Environment And Services](./03-environment-and-services.md)
- [06 Backend API](./06-backend-api.md)
- [08 Operations And Runbooks](./08-operations-and-runbooks.md)
- [09 Testing And Quality](./09-testing-and-quality.md)
- [11 Live Deployment](./11-live-deployment.md)
