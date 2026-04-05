# Environment And Services

## Official Signup Pages And Pricing

Pricing in this section was verified from official vendor pages on April 3, 2026.

## What You Actually Need For This Project

For local development only:

- Docker Desktop

Optional for a more realistic setup:

- Twilio Verify for real rider SMS OTP
- Mapbox for real geocoding, directions, and web maps
- Web Push VAPID keys for browser and mobile web push notifications

You do not need to pay for Twilio or Mapbox to run this project locally because the app has fallbacks.

## Docker Desktop

Signup / download:

- https://www.docker.com/products/docker-desktop/
- Pricing: https://www.docker.com/pricing/

Current pricing summary:

- Personal: `$0`
- Pro: `$11/user/month` on monthly billing or `$9/user/month` on annual billing
- Team: `$16/user/month` on monthly billing or `$15/user/month` on annual billing
- Business: `$24/user/month`

Important license note:

- Docker says Docker Desktop is free for personal use, education, non-commercial open source, and small businesses with fewer than 250 employees and less than $10 million in annual revenue

Project guidance:

- For most solo local development on this project, Docker Desktop will likely be `$0`

## Twilio Verify

Signup:

- https://www.twilio.com/try-twilio
- Pricing overview: https://www.twilio.com/en-us/pricing/current-rates
- Verify pricing: https://www.twilio.com/en-us/verify/pricing
- Free trial guide: https://www.twilio.com/docs/messaging/guides/how-to-use-your-free-trial-account

Current pricing summary for this project:

- Twilio Verify base fee: `$0.05` per successful verification
- US SMS fee for Verify: `$0.0083` per SMS

Project guidance:

- For the current rider OTP flow in this app, US SMS verification is roughly `$0.0583` per successful verification before any taxes or non-US pricing differences
- Twilio offers a free trial, and Twilio says you can sign up without a credit card
- If you do not configure Twilio, the API returns a development rider OTP code instead

## Mapbox

Signup:

- https://account.mapbox.com/auth/signup
- Pricing: https://www.mapbox.com/pricing

Current pricing summary most relevant to this project:

- Temporary Geocoding API: free up to `100,000` requests per month, then `$0.75` per `1,000` requests for `100,001-500,000`
- Directions API: free up to `100,000` requests per month, then `$2.00` per `1,000` requests for `100,001-500,000`
- Mapbox GL JS map loads for web: free up to `50,000` map loads per month, then `$5.00` per `1,000` loads for `50,001-100,000`

Project guidance:

- This project uses Mapbox in three ways:
  `MAPBOX_TOKEN` in the API for geocoding and directions
  `VITE_MAPBOX_TOKEN` in the web app for live map rendering
- If you leave Mapbox unconfigured, the app still works with fallback route estimates and a fallback map card

## Environment File Locations

The project loads env vars from package directories, not only the root.

Use these files:

- `apps/api/.env`
- `apps/web/.env`

For hosted environments, use platform dashboards instead of tracked files:

- Render dashboard for API values
- Vercel project env vars for web values

Templates are provided here:

- `apps/api/.env.example`
- `apps/web/.env.example`

## API Environment Variables

Defined in `apps/api/.env`.

## Required For Local Development

- `DATABASE_URL`
  PostgreSQL connection string.
- `JWT_SECRET`
  JWT signing secret for API auth.

## Optional

- `LAUNCH_MODE`
  Set to `marketplace` for normal multi-driver behavior, or `solo_driver` when you want to restrict dispatch to one owner driver.
- `OWNER_DRIVER_USER_ID`
  Optional explicit owner-driver id for solo-driver dispatch filtering.
- `OWNER_DRIVER_PHONE`
  Simpler solo-driver setting if you want to lock dispatch to one approved driver by phone number.
- `PUBLIC_BASE_URL`
  Canonical public web URL used for tracking links and referral/share links when you are not relying on request origin.
- `MAPBOX_TOKEN`
  Enables real geocoding and directions in the API.
  Keep this in Render env vars for production instead of committing it.
- `TWILIO_ACCOUNT_SID`
  Enables real rider OTP delivery.
- `TWILIO_AUTH_TOKEN`
  Twilio auth credential.
- `TWILIO_VERIFY_SERVICE_SID`
  Twilio Verify service id.
- `TWILIO_FROM_NUMBER`
  Twilio sender used for SMS fallback notifications.
- `WEB_PUSH_VAPID_PUBLIC_KEY`
  Public VAPID key used by browser subscriptions.
- `WEB_PUSH_VAPID_PRIVATE_KEY`
  Private VAPID key used by the API to sign push messages.
- `WEB_PUSH_VAPID_SUBJECT`
  Contact subject for VAPID, usually `mailto:team@yourdomain.com`.
- `CLIENT_ORIGIN`
  Frontend origin for local/dev CORS expectations.
- `PORT`
  API port. Defaults to `4000`.
- `HOST`
  API host. Defaults to `0.0.0.0`.

## Web Environment Variables

Defined in `apps/web/.env`.

- `VITE_API_URL`
  API base URL. Defaults to `http://localhost:4000`.
- `VITE_MAPBOX_TOKEN`
  Enables actual map rendering in the frontend.

Production note:

- The current live API host is `https://realdrive.onrender.com`
- `VITE_MAPBOX_TOKEN` is browser-visible by design, but it should still be stored in Vercel env vars instead of tracked files

## Current Routing Defaults

The current public URLs are:

- `/`
  Guest rider booking plus email capture.
- `/track/:token`
  Public ride tracking link returned after guest booking.
- `/drive-with-us`
  Public driver signup alias.
- `/driver/signup`
  Public driver signup page.
- `/share/:referralCode`
  Referral redirect that points back to the public rider flow.

The main private URLs are:

- `/driver`
  Approved driver app.
- `/admin`
  Admin dashboard.
- `/admin/share`
  Stable business QR code page.
- `/request-feature`
  Shared signed-in feature intake page.
- `/report-bug`
  Shared signed-in bug intake page.

## Service Setup Checklist

## Docker Desktop

Needed for:

- PostgreSQL

Required actions:

- Install Docker Desktop
- Make sure the Docker daemon is running before `docker compose up -d`

## PostgreSQL

Provided locally by:

- `docker-compose.yml`

Default local credentials:

- Database: `realdrive`
- User: `realdrive`
- Password: `realdrive`
- Port: `5434`

## Twilio Verify

Needed only if you want:

- Real rider SMS OTP instead of development codes

Required setup:

1. Create a Twilio account
2. Create a Verify service
3. Copy credentials into `apps/api/.env`

Without Twilio:

- The API returns `devCode` for rider OTP requests
- Rider OTP still works for local development

## Mapbox

Needed only if you want:

- Real geocoding
- Real route distance and duration
- Frontend map rendering

Required setup:

1. Create a Mapbox account
2. Add the token to `apps/api/.env` as `MAPBOX_TOKEN`
3. Add the token to `apps/web/.env` as `VITE_MAPBOX_TOKEN`
4. For production, add `MAPBOX_TOKEN` in Render and `VITE_MAPBOX_TOKEN` in Vercel

Without Mapbox:

- API uses fallback coordinates and estimated route values
- Frontend shows a fallback map card instead of a live map

With Mapbox configured:

- Rider quote requests use live geocoding and directions
- Public tracking and driver ride views render real maps
- Tablet ad kiosk trip maps also render live route data when available
- This is the preferred setup for tomorrow’s pilot

## Web Push (VAPID)

Needed if you want:

- Browser/device push notifications from `/notifications`
- Push-first lifecycle alerts with SMS fallback

Required setup:

1. Generate VAPID keys:

```bash
pnpm --filter @realdrive/api exec web-push generate-vapid-keys
```

2. Copy keys into `apps/api/.env` as:
  - `WEB_PUSH_VAPID_PUBLIC_KEY`
  - `WEB_PUSH_VAPID_PRIVATE_KEY`
  - `WEB_PUSH_VAPID_SUBJECT`
3. Restart the API.

Without Web Push configured:

- Notification endpoints still work
- Push delivery logs record `server_push_not_configured`
- SMS fallback behavior still applies for critical events

## Recommended Secret Handling

For local development:

- Keep `.env` files uncommitted
- Use the provided `.env.example` files as templates

For staging or production later:

- Store secrets in the deployment platform
- Do not reuse the default local `JWT_SECRET`
- Create the first admin through `/admin/setup` instead of relying on seeded credentials
