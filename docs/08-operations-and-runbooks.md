# Operations And Runbooks

## Core Commands

Run from the repository root.

## Install

```bash
pnpm install
```

## Start Postgres

```bash
docker compose up -d
```

## Stop Postgres

```bash
docker compose down
```

## Start API And Web

```bash
pnpm dev
```

## Start Only API

```bash
pnpm dev:api
```

## Start Only Web

```bash
pnpm dev:web
```

## Prisma Commands

Generate client:

```bash
pnpm db:generate
```

Apply checked-in migrations:

```bash
pnpm --filter @realdrive/api exec prisma migrate deploy
```

Create a new development migration:

```bash
pnpm --filter @realdrive/api prisma:migrate
```

Seed demo data:

```bash
pnpm db:seed
```

## Build And Test

Build all packages:

```bash
pnpm build
```

Run all tests:

```bash
pnpm test
```

Run TypeScript checks:

```bash
pnpm lint
```

## Demo Data Runbook

Current seeded data includes:

- Platform rate cards for `DEFAULT`, `VA`, and `NY`
- Optional demo drivers only if `SEED_DEMO_DRIVERS=true`

If you need to reseed:

1. Reset the local DB
2. Run migrations
3. Run `pnpm db:seed`

## Quick API Smoke Checks

## Quote Endpoint

```bash
curl -X POST http://localhost:4000/quotes/ride \
  -H "Content-Type: application/json" \
  -d '{"pickupAddress":"123 Main St, Atlanta, GA","dropoffAddress":"Airport","rideType":"standard"}'
```

## Public Drivers

```bash
curl http://localhost:4000/public/drivers
```

## First Admin Setup

After a fresh reset:

- Open `/admin/setup`
- Create the first admin account
- Leave the driver bootstrap option on if you want the same account to act as admin and driver
- Use `/admin/login` after setup is complete

## Driver Onboarding Runbook

1. Have the driver apply at `/driver/signup`
2. Review the application at `/admin/drivers`
3. Approve the driver
4. The driver signs in at `/driver/login`
5. The driver sets availability and dispatch settings in `/driver`

## Platform Dues Runbook

- Each completed ride creates a due equal to `5%` of the driver subtotal
- Drivers see their dues and payment instructions in `/driver`
- Admins manage dues and payment instructions in `/admin/dues`
- If a due is overdue, the driver is blocked from new availability and new offers until the overdue due is cleared

## Community Runbook

- Approved drivers can use `/community` immediately
- Riders reach `/community` from the token link on `/track/:token`
- Riders stay read-only until they reach `51` completed rides
- Admin moderation for proposals/comments also lives through the same community endpoints and admin UI actions

## Rider OTP In Development

If Twilio is not configured:

- `POST /auth/otp/request` returns `devCode`
- Use that code with `POST /auth/otp/verify`

## Troubleshooting

## Web app loads but API calls fail

Check:

- API is running on `4000`
- `apps/web/.env` has `VITE_API_URL=http://localhost:4000`

## Prisma migrate works but seed fails

Check:

- `apps/api/.env` exists
- `DATABASE_URL` points to the running Docker Postgres container

## Docker container exists but app still fails

Check:

- `docker compose ps`
- Port `5434` is free
- Postgres container is healthy and running

## No SMS is being sent

Expected if:

- Twilio is not configured

Local behavior:

- Use the development OTP returned by the API

## Maps are using fallback coordinates

Expected if:

- `MAPBOX_TOKEN` is not set in `apps/api/.env`

## Recommended Next Operational Improvements

- Add health endpoints
- Add structured env validation on boot
- Add explicit background job process for scheduled ride release
- Add Dockerfiles for API and web
- Add CI workflows
