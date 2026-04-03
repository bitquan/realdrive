# Local Setup

## What You Need Installed

Install these on your machine:

- Node.js 22+ or newer
- `pnpm`
- Docker Desktop
- Git

Optional but recommended:

- Postman or Insomnia for API checks
- TablePlus or pgAdmin for inspecting PostgreSQL

## What You Need To Set Up On Your Side

These are the only external services you may need to create accounts for:

- Docker Desktop
  Required for the local PostgreSQL database.
- Twilio Verify
  Optional for real SMS OTP. Not required for local development.
- Mapbox
  Optional for real geocoding, directions, and live map rendering. Not required for local development.

You can run the whole project locally without Twilio and Mapbox because the app has development fallbacks.

## First-Time Setup

From the project root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d
pnpm db:generate
pnpm --filter @realdrive/api exec prisma migrate deploy
pnpm db:seed
```

Then start the app:

```bash
pnpm dev
```

This starts:

- API on `http://localhost:4000`
- Web app on `http://localhost:5173`
- PostgreSQL on `localhost:5434`

## Recommended Default Settings

For the current multi-driver setup, set these in `apps/api/.env` before you run the app:

- `LAUNCH_MODE="marketplace"`
- `PUBLIC_BASE_URL="http://localhost:5173"` for local work, or your public tunnel/domain for live testing

Also set these if you want real Mapbox behavior:

- `MAPBOX_TOKEN` in `apps/api/.env`
- `VITE_MAPBOX_TOKEN` in `apps/web/.env`

## Daily Startup

If the project has already been set up:

```bash
docker compose up -d
pnpm dev
```

## Daily Shutdown

Stop the web and API processes in your terminal, then stop Postgres if you want:

```bash
docker compose down
```

## Database Reset

If you want a clean local database:

```bash
docker compose down -v
docker compose up -d
pnpm --filter @realdrive/api exec prisma migrate deploy
pnpm db:seed
```

Warning:

- `docker compose down -v` deletes the local Postgres volume and removes all data.

## Quick Smoke Check

Once the app is running:

1. Open `http://localhost:5173`
2. Book a guest ride from the public home page
3. Confirm you land on `/track/:token`
4. Open `/admin/setup` and create the first admin account
5. Open `/driver/signup` and create a driver account
6. Log in as admin and approve that driver from `/admin/drivers`
7. Log in at `/driver/login` and confirm the ride offer appears there

## Common Local Issues

## Docker daemon not running

Symptom:

- `docker compose up -d` fails

Fix:

- Open Docker Desktop and wait for it to finish starting

## Prisma cannot find `DATABASE_URL`

Symptom:

- Prisma commands fail with env errors

Fix:

- Make sure `apps/api/.env` exists
- Run Prisma commands from the workspace root using the included scripts

## API boots but maps are blank

Symptom:

- The app works, but no live map renders

Fix:

- Add `VITE_MAPBOX_TOKEN` to `apps/web/.env`
- Add `MAPBOX_TOKEN` to `apps/api/.env`

Without Mapbox, route estimates still work through fallback logic.
