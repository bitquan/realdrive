# Live Deployment Infrastructure

This document describes production deployment for RealDrive on Render and Vercel.

## Overview

RealDrive deployment architecture:

```
GitHub (source)
  ↓
Render (API + PostgreSQL)
  ↓
Vercel (web frontend)
```

## Production Database (Render PostgreSQL)

### Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create new **PostgreSQL** database
3. Select region (same as API for latency)
4. Copy connection string to `DATABASE_URL`

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

Example:
```
postgresql://realdrive_prod:***@dpg-xyz.render.com:5432/realdrive_prod?schema=public
```

### Migrations

Migrations run **automatically** on each Render API deploy:

```bash
# In render.yaml deploy command
pnpm --filter @realdrive/api exec prisma migrate deploy
```

No manual migration steps needed. Each new git push triggers deployment and runs pending migrations.

## API Deployment (Render)

### Prerequisites

- GitHub account with repo access
- Render account
- PostgreSQL database (see above)

### Deploy Steps

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create render.yaml** (already in repo)
   - File: `render.yaml` at project root
   - Defines API service, environment, and build/start commands

3. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **New +** → **Blueprint**
   - Connect GitHub account
   - Select `bitquan/realdrive` repo
   - Render auto-creates services from `render.yaml`

4. **Set Required Environment Variables**
   - In Render dashboard, edit the live API service
   - Add all variables from [API Environment Variables](#api-environment-variables) below

5. **Deploy**
   - Click **Deploy** to start build
   - Monitor logs in Render dashboard
   - API becomes available at `https://realdrive.onrender.com` (or custom domain)

### Auto-Redeploy

- Every git push to `main` triggers automatic redeploy
- Migrations run before API starts
- Seed does NOT run on deploy (only on account setup)

## API Environment Variables

Add these to the live Render API service.

### Required Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://...` | From Render PostgreSQL |
| `JWT_SECRET` | Random 32+ chars | Use `openssl rand -hex 32` |
| `PUBLIC_BASE_URL` | `https://realdrive-web.vercel.app` | Current live web URL unless you intentionally switch to a custom domain |
| `CLIENT_ORIGIN` | `https://realdrive-web.vercel.app` | Must match the live Vercel web URL |

### Pricing & Auto-Apply Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `PLATFORM_RATE_AUTO_APPLY_ENABLED` | `false` | Enable benchmark auto-apply scheduler |
| `PLATFORM_RATE_AUTO_APPLY_MINUTES` | `60` | How often to run auto-apply (minutes) |
| `PLATFORM_RATE_UNDERCUT_AMOUNT` | `0.05` | Amount to undercut competitor rates ($) |
| `PLATFORM_RATE_AUTO_APPLY_RUNNER` | `api` | `api` or `worker` (set `worker` for dedicated process) |

### Analytics & Configuration Variables

| Variable | Notes |
|----------|-------|
| `LAUNCH_MODE` | Set to `marketplace` for multi-driver mode |

### Third-Party Service Variables (Optional)

**Mapbox**
- `MAPBOX_TOKEN` - For geocoding and directions

**Twilio**
- `TWILIO_ACCOUNT_SID` - SMS provider
- `TWILIO_AUTH_TOKEN` - SMS auth
- `TWILIO_VERIFY_SERVICE_SID` - OTP service ID (must start with `VA`)
- `TWILIO_FROM_NUMBER` - SMS sender number or messaging service

**Stripe (Payment Integration Foundation)**
- `STRIPE_SECRET_KEY` - Stripe secret key (`sk_...`)
- `STRIPE_SUCCESS_URL` - Redirect after successful checkout
- `STRIPE_CANCEL_URL` - Redirect after cancelled checkout

**Web Push**
- `WEB_PUSH_VAPID_PUBLIC_KEY` - Browser push public key
- `WEB_PUSH_VAPID_PRIVATE_KEY` - Browser push private key
- `WEB_PUSH_VAPID_SUBJECT` - Browser push subject (email)

**Admin Bootstrap**
- `OWNER_DRIVER_USER_ID` - Initial admin user ID (optional)
- `OWNER_DRIVER_PHONE` - Initial admin phone (optional)

## Web Deployment (Vercel)

### Prerequisites

- Vercel account
- GitHub account

### Deploy Steps

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Click "Add New" → "Project"**
   - Select GitHub repo: `bitquan/realdrive`
   - Vercel auto-detects monorepo

3. **Configure Project**
   - **Root Directory**: `apps/web`
   - **Framework**: Vite
   - **Build Command**: `vite build` (auto-detected)
   - **Output Directory**: `dist`

4. **Add Environment Variables**
   - `VITE_API_URL` = Your Render API URL (current live value: `https://realdrive.onrender.com`)
   - `VITE_MAPBOX_TOKEN` = (optional) Mapbox token

5. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys automatically
   - URL provided (current stable alias: `https://realdrive-web.vercel.app`)

### Auto-Redeploy

- Every git push to `main` triggers auto-build and deploy
- No manual steps needed

### Custom Domain

To use your own domain:
1. In Vercel project settings → **Domains**
2. Add your domain (e.g., `realdrive.app`)
3. Follow DNS instructions
4. Update `CLIENT_ORIGIN` and `PUBLIC_BASE_URL` in Render accordingly

## Web Environment Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_API_URL` | `https://realdrive.onrender.com` | **Required** - Points to Render API |
| `VITE_MAPBOX_TOKEN` | (mapbox token) | Optional - For live maps |

Important:

- Do not commit `VITE_MAPBOX_TOKEN` into `apps/web/.env.production`
- Store it in the Vercel project env settings instead
- If `VITE_MAPBOX_TOKEN` is missing, production falls back to non-map placeholder behavior and route quality will not match the intended driver shell experience

## Smoke Tests

After deploy completes:

```bash
# 1. Web loads
curl https://realdrive-web.vercel.app/

# 2. API health check
curl https://realdrive.onrender.com/health

# 3. After deploy, create admin at /admin/setup
# Open https://realdrive-web.vercel.app/admin/setup

# 4. Test ride quote
curl -X POST https://realdrive.onrender.com/quotes/ride \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddress": "123 Main St, Atlanta, GA",
    "dropoffAddress": "Hartsfield-Jackson Airport",
    "rideType": "standard"
  }'

# 5. Public drivers list
curl https://realdrive.onrender.com/public/drivers
```

Driver production checks after deploy:

- Open `https://realdrive-web.vercel.app/driver`
- Confirm stand-by renders the real mobile map when Mapbox is configured
- Confirm `/driver/inbox` loads and keeps the map shell behind the inbox sheet
- Confirm `/driver/rides/:rideId` keeps pickup, dropoff, and route line in view above the sheet
- Confirm driver maps can pan freely and the recenter control restores the intended framing

## Current Production Truth

Use these values unless infrastructure is intentionally changed:

- Web project: `bitquans-projects/realdrive-web`
- Web alias: `https://realdrive-web.vercel.app`
- API host: `https://realdrive.onrender.com`

Avoid these stale values:

- `https://realdrive-api.onrender.com`
- `https://realdrive.vercel.app`

## Troubleshooting

### API won't start

- Check `DATABASE_URL` is correct and database exists
- Check `JWT_SECRET` is set (not empty)
- View Render logs: Dashboard → Services → realdrive-api → Logs

### Migrations failing

- Check `DATABASE_URL` connectivity
- Check Prisma schema is valid (`pnpm db:validate`)
- Manual fix: Connect via `psql` and check migration history table

### Web can't reach API

- Check `VITE_API_URL` in Vercel environment
- Check `CLIENT_ORIGIN` in Render matches Vercel URL exactly
- Verify API is running: `curl https://realdrive.onrender.com/health`

### CORS errors

- Ensure `CLIENT_ORIGIN` in Render matches web domain (including protocol)
- Check browser console for exact error
- Verify API has CORS middleware enabled

### Push blocked by secret scanning

- Remove the secret from the committed file and local commit history first
- Re-store API secrets in Render and web-facing env vars in Vercel
- Re-push only after the secret is no longer present in the branch history

## Secrets Management

**DO NOT** commit secrets to git. Always use:

1. **Render dashboard** for API environment variables
2. **Vercel dashboard** for web environment variables
3. **GitHub Actions secrets** for ops workflow variables and automation tokens
4. Rotate `JWT_SECRET` every 6 months
5. Rotate provider credentials immediately after staff, ownership, or scope changes
6. Never share screenshots containing secrets or token values

Use `openssl rand -hex 32` to generate secure random secrets.

Operational rotation sequence:

1. Generate a replacement secret.
2. Save it in the platform dashboard first.
3. Redeploy the affected service.
4. Confirm login and protected routes still work.
5. Revoke the previous secret.

## Database Backups

Render PostgreSQL includes:

- **14-day automatic backups**
- **Point-in-time recovery** (last 7 days)
- Manual backups via `pg_dump`:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
```

Backup guidance:

- Take a manual backup before risky schema changes, bulk admin imports, or cleanup scripts.
- Store backups in an approved encrypted location outside the repo.
- Practice restoring into a non-production database before relying on a backup.

Restore drill:

```bash
psql "$TARGET_DATABASE_URL" < backup-YYYYMMDD.sql
```

After restore, verify:

- `https://realdrive.onrender.com/health`
- admin setup page does not 500
- quote requests still succeed
- driver and admin login paths still work

## Monitoring

### Render Logs

- **Build logs**: Render → Services → live API service → Logs (Build)
- **Runtime logs**: Render → Services → live API service → Logs (Runtime)
- **Metrics**: Render → Services → live API service → Metrics (CPU, memory, disk)

### Vercel Logs

- **Build logs**: Vercel → Deployments → [deployment] → Logs
- **Runtime logs**: Vercel → Functions → Logs
- **Analytics**: Vercel → Analytics (performance, Core Web Vitals)

### Common Issues

Check these endpoints for health:

```bash
# API health
curl https://realdrive.onrender.com/health

# Database connectivity
curl https://realdrive.onrender.com/admin/setup  # Should not 500
```

Scheduled monitoring and performance checks:

- `.github/workflows/ops-health-check.yml` runs production health verification on a schedule.
- `scripts/ops/health-check.mjs` can fail on non-2xx responses and latency breaches when `OPS_MAX_LATENCY_MS` is set.
- `.github/workflows/ops-daily-digest.yml` creates a daily operations digest issue.
- `.github/workflows/ci.yml` publishes a web bundle report artifact for pull requests.

Bundle review flow:

```bash
pnpm --filter @realdrive/web build
pnpm ops:bundle
cat apps/web/dist/bundle-report.json
```

If response time or bundle size regresses, pause merge or deploy until the change is explained.

## Scheduled Tasks

### Platform Rate Auto-Apply

If `PLATFORM_RATE_AUTO_APPLY_ENABLED=true`, a scheduler runs every `PLATFORM_RATE_AUTO_APPLY_MINUTES`:

- Loads saved benchmark snapshots from database
- Computes min(Uber, Lyft) - $0.05 for all rate fields
- Applies new platform pricing rules
- Requires manual benchmark snapshots in Admin Pricing
- See [Admin Pricing & Benchmarks](./16-admin-pricing-benchmarks.md) for details

Runner mode behavior:

- `PLATFORM_RATE_AUTO_APPLY_RUNNER=api` (default): scheduler runs in API service
- `PLATFORM_RATE_AUTO_APPLY_RUNNER=worker`: scheduler runs in dedicated worker process only

For worker mode on Render, add a second Background Worker service using command:

```bash
pnpm --filter @realdrive/api dev:worker:auto-pricing
```

## Payment Integration Foundation

The API exposes Stripe checkout-session creation endpoint:

- `POST /payments/checkout-link` (driver/admin auth)

Purpose:

- Generate Stripe hosted checkout links for dues or ride-related payments
- Record audit logs for checkout-link creation events

Current scope:

- Checkout-link generation is integrated
- Full webhook settlement reconciliation remains a next step

## Scaling Recommendations

| Metric | Action |
|--------|--------|
| API CPU > 70% persistent | Upgrade to **Standard** instance on Render |
| Database connections > 90 | Add connection pooling (via PgBouncer) |
| Web traffic spike | Vercel auto-scales (no action needed) |
| Storage > 10GB | Render PostgreSQL auto-scales (may increase cost) |

## Cost Estimation (April 2026)

| Service | Tier | Monthly Cost |
|---------|------|-----|
| Render API | Starter | $7 |
| Render PostgreSQL | Standard | $15 |
| Vercel Web | Hobby | $0 |
| **Estimated Total** | | **$22** |

Exact costs vary by traffic volume, data storage, and bandwidth usage. Monitor Render and Vercel cost dashboards.
