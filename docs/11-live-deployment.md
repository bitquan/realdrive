# Live Deployment

This project can be deployed with:

- Managed PostgreSQL (Neon, Supabase, Railway, or Render Postgres)
- Render for `apps/api`
- Vercel for `apps/web`

## Before You Deploy

1. Push this repo to GitHub.
2. Create a hosted PostgreSQL database.
3. Keep your local `.env` files as the source of truth for values.

## API Deployment (Render)

This repo includes [`render.yaml`](../render.yaml), so you can deploy with Render Blueprint.

### Steps

1. In Render, choose **New +** -> **Blueprint**.
2. Connect your GitHub repo.
3. Select this repository and create the `realdrive-api` service.
4. Fill all `sync: false` env vars.
5. Trigger deploy.

### Required API Env Vars

- `DATABASE_URL`
- `JWT_SECRET`
- `PUBLIC_BASE_URL` (set this to your Vercel domain)
- `CLIENT_ORIGIN` (set this to your Vercel domain)

### Optional API Env Vars

- `MAPBOX_TOKEN`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID` (must be a `VA...` value)
- `OWNER_DRIVER_USER_ID`
- `OWNER_DRIVER_PHONE`

`LAUNCH_MODE` defaults to `marketplace`.

## Web Deployment (Vercel)

This repo includes [`apps/web/vercel.json`](../apps/web/vercel.json) for Vite + SPA rewrites.

### Steps

1. In Vercel, choose **Add New...** -> **Project**.
2. Import this GitHub repo.
3. Set **Root Directory** to `apps/web`.
4. Add env vars.
5. Deploy.

### Required Web Env Vars

- `VITE_API_URL` = your Render API URL (for example `https://realdrive-api.onrender.com`)

### Optional Web Env Vars

- `VITE_MAPBOX_TOKEN`

## Database Migration On Deploy

Render build command runs:

`pnpm --filter @realdrive/api exec prisma migrate deploy`

So checked-in Prisma migrations apply automatically on each deploy.

## Post-Deploy Smoke Test

1. Open web URL and verify `/` loads.
2. Open `/admin/setup` and create the first admin.
3. Complete one rider quote + booking.
4. Verify tracking page `/track/:token` loads.
5. Verify driver signup/login flow.

## Security Notes

- Rotate any secret that was shared in chat or screenshots.
- Do not use local placeholder credentials in production.
- Use strong random values for `JWT_SECRET`.
