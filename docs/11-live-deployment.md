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
   - In Render dashboard, edit the `realdrive-api` service
   - Add all variables from [API Environment Variables](#api-environment-variables) below

5. **Deploy**
   - Click **Deploy** to start build
   - Monitor logs in Render dashboard
   - API becomes available at `https://realdrive-api.onrender.com` (or custom domain)

### Auto-Redeploy

- Every git push to `main` triggers automatic redeploy
- Migrations run before API starts
- Seed does NOT run on deploy (only on account setup)

## API Environment Variables

Add these to Render dashboard for the `realdrive-api` service.

### Required Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://...` | From Render PostgreSQL |
| `JWT_SECRET` | Random 32+ chars | Use `openssl rand -hex 32` |
| `PUBLIC_BASE_URL` | `https://realdrive.app` | Your production domain |
| `CLIENT_ORIGIN` | `https://realdrive.app` | Same as Vercel web URL |

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
   - `VITE_API_URL` = Your Render API URL (e.g., `https://realdrive-api.onrender.com`)
   - `VITE_MAPBOX_TOKEN` = (optional) Mapbox token

5. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys automatically
   - URL provided (e.g., `https://realdrive.vercel.app`)

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
| `VITE_API_URL` | `https://realdrive-api.onrender.com` | **Required** - Points to Render API |
| `VITE_MAPBOX_TOKEN` | (mapbox token) | Optional - For live maps |

## Smoke Tests

After deploy completes:

```bash
# 1. Web loads
curl https://realdrive.vercel.app/

# 2. API health check
curl https://realdrive-api.onrender.com/health

# 3. After deploy, create admin at /admin/setup
# Open https://realdrive.vercel.app/admin/setup

# 4. Test ride quote
curl -X POST https://realdrive-api.onrender.com/quotes/ride \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddress": "123 Main St, Atlanta, GA",
    "dropoffAddress": "Hartsfield-Jackson Airport",
    "rideType": "standard"
  }'

# 5. Public drivers list
curl https://realdrive-api.onrender.com/public/drivers
```

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
- Verify API is running: `curl https://realdrive-api.onrender.com/health`

### CORS errors

- Ensure `CLIENT_ORIGIN` in Render matches web domain (including protocol)
- Check browser console for exact error
- Verify API has CORS middleware enabled

## Secrets Management

**DO NOT** commit secrets to git. Always use:

1. **Render dashboard** for API environment variables
2. **Vercel dashboard** for web environment variables
3. Rotate `JWT_SECRET` every 6 months
4. Never share screenshots containing secrets or token values

Use `openssl rand -hex 32` to generate secure random secrets.

## Database Backups

Render PostgreSQL includes:

- **14-day automatic backups**
- **Point-in-time recovery** (last 7 days)
- Manual backups via `pg_dump`:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
```

## Monitoring

### Render Logs

- **Build logs**: Render → Services → realdrive-api → Logs (Build)
- **Runtime logs**: Render → Services → realdrive-api → Logs (Runtime)
- **Metrics**: Render → Services → realdrive-api → Metrics (CPU, memory, disk)

### Vercel Logs

- **Build logs**: Vercel → Deployments → [deployment] → Logs
- **Runtime logs**: Vercel → Functions → Logs
- **Analytics**: Vercel → Analytics (performance, Core Web Vitals)

### Common Issues

Check these endpoints for health:

```bash
# API health
curl https://realdrive-api.onrender.com/health

# Database connectivity
curl https://realdrive-api.onrender.com/admin/setup  # Should not 500
```

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
