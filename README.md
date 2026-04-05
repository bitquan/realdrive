# RealDrive

[![Ops Health Check](https://github.com/bitquan/realdrive/actions/workflows/ops-health-check.yml/badge.svg)](https://github.com/bitquan/realdrive/actions/workflows/ops-health-check.yml)
[![Ops Daily Digest](https://github.com/bitquan/realdrive/actions/workflows/ops-daily-digest.yml/badge.svg)](https://github.com/bitquan/realdrive/actions/workflows/ops-daily-digest.yml)

RealDrive is a web-first ride dispatch MVP with separate rider, driver, and admin surfaces. The current implementation supports guest rider booking, first-admin setup, real driver signup with admin approval, state-aware dispatch, referral QR codes, multi-role admin/driver accounts, a simple community board, and 5% platform dues on completed trips.

Project docs live in [`docs/README.md`](./docs/README.md).

## Stack

- `apps/web`: React, Vite, React Router, TanStack Query, Tailwind
- `apps/api`: Fastify, Prisma, PostgreSQL, Socket.IO
- `shared`: shared contracts and domain types

## Quick Start

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Copy `apps/web/.env.example` to `apps/web/.env`.
3. Start PostgreSQL with `docker compose up -d`.
4. Install dependencies with `pnpm install`.
5. Generate Prisma client with `pnpm db:generate`.
6. Apply the schema with `pnpm --filter @realdrive/api exec prisma migrate deploy`.
7. Seed demo data with `pnpm db:seed`.
8. Start the apps with `pnpm dev`.

## Marketplace Defaults

- Public rider landing page: `/`
- Public ride tracking page: `/track/:token`
- Public driver signup page: `/driver/signup`
- Public referral redirect page: `/share/:referralCode`
- Public rider community join page: `/community/join/:token`
- Authenticated community board: `/community`
- Private driver app: `/driver`
- Private admin app: `/admin`

For the default multi-driver setup, use these in `apps/api/.env`:

- `LAUNCH_MODE="marketplace"`
- `PUBLIC_BASE_URL="http://localhost:5173"` or your public tunnel/domain

If you want to temporarily lock the system down to one driver for a pilot, switch `LAUNCH_MODE` to `solo_driver` and set either `OWNER_DRIVER_PHONE` or `OWNER_DRIVER_USER_ID`.

If `MAPBOX_TOKEN` and `VITE_MAPBOX_TOKEN` are configured, the rider quote flow and maps use live Mapbox routing/rendering. If `TWILIO_*` is left empty, rider OTP stays in development mode and the public rider flow still works without SMS.

## First Admin Setup

After a fresh reset:

- Open `/admin/setup`
- Create the first admin account with your real email/password
- Leave `Also create my driver profile` turned on if you want the same account to switch between admin and driver
- After that, `/admin/setup` is closed and admins use `/admin/login`

Drivers now sign up normally at `/driver/signup`, stay `pending` until approved, and then log in at `/driver/login`.

## Platform Dues And Community

- Riders see one all-in total. The driver subtotal stays intact, and the app tracks a `5%` platform due separately.
- Completed rides create a driver due record that is payable manually with Cash App, Zelle, Jim, cash, or another method configured by admin.
- Drivers with overdue dues are blocked from new availability and new offers until the overdue items are cleared.
- Approved drivers can create proposals, vote, and comment in the built-in community board right away.
- Riders can enter the community board from their tracking link, but posting and voting unlock after `51` completed rides.

## Notes

- Mapbox integrations automatically fall back to deterministic demo coordinates when a token is not configured.
- Rider OTP uses Twilio Verify when credentials exist; otherwise it runs in development mode with generated in-memory codes.
- Driver auth uses email/password, not OTP.
- The API and Vite app load environment variables from their own package directories, so the app-level `.env` files are the source of truth for local development.
- Business QR codes are available in the admin UI at `/admin/share`.

## Notifications Quick Start

1. Configure API env vars for push in `apps/api/.env`:
	- `WEB_PUSH_VAPID_PUBLIC_KEY`
	- `WEB_PUSH_VAPID_PRIVATE_KEY`
	- `WEB_PUSH_VAPID_SUBJECT`
2. Restart API (`pnpm dev:api` or full `pnpm dev`).
3. Log in and open `/notifications`.
4. Click **Enable push on this browser** and allow permission.
5. Click **Send test push**.
6. Verify delivery entries in the notification delivery log.

For full setup, troubleshooting, and ride-lifecycle test tutorials, use [docs/12-push-notifications-playbook.md](./docs/12-push-notifications-playbook.md).
