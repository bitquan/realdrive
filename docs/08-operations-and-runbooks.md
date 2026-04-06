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

## Start Auto-Pricing Worker (Optional)

Use a separate process for benchmark auto-apply scheduling.

Required env vars in `apps/api/.env`:

- `PLATFORM_RATE_AUTO_APPLY_ENABLED="true"`
- `PLATFORM_RATE_AUTO_APPLY_RUNNER="worker"`

Run worker:

```bash
pnpm dev:auto-pricing-worker
```

Notes:

- When runner is `worker`, API manual auto-apply endpoint still works.
- The API process will skip its internal scheduler to avoid double-runs.

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

Build only the web app:

```bash
pnpm --filter @realdrive/web build
```

Run Playwright screenshot coverage:

```bash
pnpm screenshots
```

## Documentation Audit Runbook

Run this audit before pushing product behavior changes:

1. Check changed files:

```bash
git status --short
```

2. If route, environment, deployment, or workflow behavior changed, review and update:

- `README.md`
- `docs/README.md`
- `docs/05-frontend-guide.md`
- `docs/08-operations-and-runbooks.md`
- `docs/11-live-deployment.md`
- `docs/17-contributor-and-copilot-guide.md`
- active workstream tracker docs such as `docs/driver-redesign-status.md`

3. Re-run the affected package build:

```bash
pnpm --filter @realdrive/web build
pnpm --filter @realdrive/api test
```

4. Push only after docs and code agree.

## CI Pipeline

GitHub Actions workflow: `.github/workflows/ci.yml`

Screenshot artifact workflow: `.github/workflows/playwright-screenshots.yml`

Runs on `push` and `pull_request` to `main`:

- Install dependencies
- Run API tests
- Run web tests
- Run typecheck/build validation
- Publish a pull-request web build artifact for safer manual review
- Finish on one `Quality Gate` job that can be used as the required merge check

## Demo Data Runbook

Current seeded data includes:

- Platform rate cards for `DEFAULT`, `VA`, and `NY`
- Optional demo drivers only if `SEED_DEMO_DRIVERS=true`

If you need to reseed:

1. Reset the local DB
2. Run migrations
3. Run `pnpm db:seed`

## Quick API Smoke Checks

## Local health check

```bash
curl http://localhost:4000/health
```

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
6. For mobile verification, check the real driver routes in sequence: `/driver`, `/driver/inbox`, `/driver/rides/:rideId`

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

## Product Feedback Runbook

- Signed-in users submit feature ideas from `/request-feature`
- Signed-in users submit bug reports from `/report-bug`
- Bug reports do not require an error code; the form captures summary, actual behavior, expected behavior, and reproduction steps
- Backend issue intake routes through `POST /issues/report`

## Screenshot Runbook

- Playwright captures major stable public and authenticated screens first
- Current coverage includes public entry pages, shared feedback forms, and admin/driver dashboards
- Results are written to `apps/web/test-results` and `apps/web/playwright-report`
- CI uploads screenshot artifacts from `.github/workflows/playwright-screenshots.yml`

## Rider OTP In Development

If Twilio is not configured:

- `POST /auth/otp/request` returns `devCode`
- Use that code with `POST /auth/otp/verify`

## Troubleshooting

## Web app loads but API calls fail

Check:

- API is running on `4000`
- `apps/web/.env` has `VITE_API_URL=http://localhost:4000`

For production checks, confirm the web app uses `https://realdrive.onrender.com`, not `https://realdrive-api.onrender.com`

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

## Vercel redeploy picks the wrong project

Check:

- The intended web project is `realdrive-web`
- The intended production alias is `https://realdrive-web.vercel.app`
- Local `.vercel/` folders are temporary and should not be committed

## Playwright auth setup fails

Check:

- The Playwright API server is reachable on `http://127.0.0.1:4005`
- PostgreSQL is running and migrations are applied
- If your local DB already has a different admin account, set `PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD` before running screenshots

## Push Notifications Runbook

Quick path:

1. Confirm API push config:

```bash
curl http://localhost:4000/public/push/config
```

2. In the web app, open `/notifications`.
3. Click **Enable push on this browser**.
4. Click **Send test push**.
5. Confirm delivery logs populate under `/notifications`.

If push does not show, check:

- Browser permission is granted
- User has at least one active push subscription
- API has VAPID env vars configured

For full setup/tutorial/troubleshooting coverage:

- [Push Notifications Playbook](./12-push-notifications-playbook.md)

## Maps are using fallback coordinates

Expected if:

- `MAPBOX_TOKEN` is not set in `apps/api/.env`

## Recommended Next Operational Improvements

- Add health endpoints
- Add structured env validation on boot
- Add explicit background job process for scheduled ride release
- Add Dockerfiles for API and web
- Add CI workflows
