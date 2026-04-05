# Admin Features: Data Analytics & Pricing Management

This document explains the admin-specific features for monitoring site activity and managing pricing benchmarks.

## Overview

RealDrive provides two major admin features:

1. **Data Dashboard** - Real-time visitor analytics and activity metrics
2. **Pricing Manager** - Benchmark storage and auto-apply rate card management

## Part 1: Data Dashboard (`/admin/data`)

The Data Dashboard provides real-time visibility into platform usage and visitor activity.

### Accessing the Data Dashboard

1. Log in as admin at `/admin/login`
2. Navigate to **Admin** sidebar → **Data**
3. Or go directly to `/admin/data`

### Dashboard Metrics

The dashboard displays metrics for a configurable time window (15, 30, or 60 minutes).

#### Active Visitors (Local)
- **Definition**: Users with activity in the current window
- **Use**: Monitor real-time engagement
- **Example**: 5 active visitors in last 30 min

#### Visitors (24h)
- **Definition**: Unique visitors in past 24 hours
- **Use**: Track daily traffic trends
- **Example**: 87 visitors in last 24h

#### Heartbeats (24h)
- **Definition**: Total page navigation events in past 24 hours
- **Use**: Measure engagement depth (higher = more interaction)
- **Example**: 342 heartbeats = average ~3.9 actions/user

#### Top Pages (by visits)
- **Definition**: Which pages drove the most traffic
- **Use**: Identify popular features and drop-off points
- **Example**: 
  - `/` - 95 visits
  - `/drive-with-us` - 82 visits
  - `/admin/dashboard` - 34 visits

#### Recent Visitors (last window)
- **Definition**: Most recent sessions in the selected time window
- **Columns**:
  - Session ID - Unique identifier
  - User - Rider/driver/admin email (or "Anonymous")
  - Page - Last page visited
  - Heartbeats - Activity count in this session
- **Use**: Debug user journeys, spot stuck users

### How Tracking Works

**Session Creation**
- When the web app loads, [app-shell.tsx](../apps/web/src/components/layout/app-shell.tsx) generates a unique `sessionId` in local storage
- SessionId persists across page reloads for the same browser/device

**Heartbeat Events**
- Every time the pathname changes (route navigation), a `POST /public/analytics/heartbeat` event fires
- Heartbeat captures:
  - `sessionId` - Session identifier
  - `path` - Current page path
  - `referrer` - Page came from (where applicable)
  - `userAgent` - Browser/device info

**Database Storage**
- Each heartbeat upserts a `SiteVisit` record keyed by `sessionId`
- Updates timestamps and increments `heartbeatCount`
- Entries older than 24h are still queryable (see historical data in analytics)

### Interpreting the Metrics

**High Active Visitors, Low 24h Visitors**
→ Concentrated spike; good for event tracking

**Low Heartbeats Per Visit**
→ Users bouncing early; check landing page

**Top Pages are Signup Routes**
→ Good funnel awareness; monitor completion after

**Recent Visitors = Anonymous**
→ Users haven't logged in yet; normal for home/community pages

## Part 2: Pricing Manager (`/admin/pricing`)

The Pricing Manager allows admins to save competitor benchmarks and auto-apply undercut pricing.

### Architecture

RealDrive pricing has two layers:

```
User Request
  ↓
Pricing Rule (in PricingRule table)
  ↓
Returns quote to rider
```

The Pricing Manager controls the **Pricing Rule** records via the **PlatformRateBenchmark** snapshots.

### Accessing the Pricing Manager

1. Log in as admin at `/admin/login`
2. Navigate to **Admin** sidebar → **Pricing**
3. Or go directly to `/admin/pricing`

### How It Works

```
Admin enters Uber/Lyft rates
  ↓
Clicks "Save benchmark snapshot"
  ↓
Stores in PlatformRateBenchmark table
  ↓
Clicks "Auto-apply now from live feeds"
  ↓
Computes min(Uber, Lyft) - $0.05
  ↓
Updates PricingRule for that market
  ↓
Next rider gets new quotes
```

### Step-by-Step Guide

#### 1. Select Market

In the "Benchmark Market" dropdown, choose which market to manage:
- `DEFAULT` - Default rates (applies to any pickup location not explicitly mapped)
- `VA` - Virginia
- `NY` - New York
- Create new markets by entering a market key in the "Add Market Key" input

#### 2. Enter Competitor Rates

For each ride type (**Standard**, **SUV**, **XL**), enter:
- **Base Fare** - $ charged on pickup
- **Per Mile** - $ per mile traveled
- **Per Minute** - $ per minute (waiting/driving)
- **Multiplier** - Surge multiplier (typically 1.0)

Example for Uber Standard in DEFAULT:
```
Base Fare:  2.50
Per Mile:   1.20
Per Minute: 0.45
Multiplier: 1.0
```

Do the same for Lyft rates in the right column.

#### 3. Save Benchmark Snapshot

After entering both Uber and Lyft rates:
1. Click **"Save benchmark snapshot"**
2. UI shows loading state
3. On success: "Saved Uber/Lyft benchmarks for [market]"
4. Benchmark records now in database

#### 4. Auto-Apply Pricing

Once benchmarks are saved:
1. Click **"Auto-apply now from live feeds"**
2. System computes:
   - STANDARD: min($2.50 Uber, $2.75 Lyft) - $0.05 = $2.45 base
   - Similar for perMile, perMinute, multiplier
3. Updates PricingRule records in database
4. Next rider gets the new quotes automatically

#### 5. View Applied Rates

Below the benchmarks, "Market Key" section shows your actual platform pricing:
```
DEFAULT Market

Standard
  Base Fare: 6
  Per Mile:  2.2
  Per Minute: 0.4
  Multiplier: 1
```

(These are the active pricing rules used for quotes)

### Scheduler (Optional)

If `PLATFORM_RATE_AUTO_APPLY_ENABLED=true` in environment variables:

- Scheduler runs automatically every `PLATFORM_RATE_AUTO_APPLY_MINUTES` (default: 60)
- Uses saved benchmarks from database
- No manual button click needed
- Errors logged to API logs

**To enable auto-scheduler in Render:**
- Set `PLATFORM_RATE_AUTO_APPLY_ENABLED=true`
- Restart the service

### Best Practices

**Update Frequency**
- Compare Uber/Lyft rates weekly or when you notice changes
- Update benchmarks in Admin Pricing → Save snapshot
- Auto-apply immediately or let scheduler run

**Undercut Amount**
- Default $0.05 undercut is aggressive but sustainable
- Adjust via `PLATFORM_RATE_UNDERCUT_AMOUNT` env var if needed
- Lower = more aggressive (attracts riders)
- Higher = more margin (attracts drivers)

**Market Strategy**
- Maintain separate benchmarks for different cities/states
- Higher benchmarks in demand areas (airports)
- Lower benchmarks in residential areas

**Testing**
- After auto-apply, request a quote and verify amount
- Check both rider app quote and admin logs for calculations

### Database Schema

**PlatformRateBenchmark** (benchmark snapshots)
```typescript
{
  id: string              // UUID
  provider: "UBER" | "LYFT"
  marketKey: string       // "DEFAULT", "VA", "NY", etc.
  rideType: "STANDARD" | "SUV" | "XL"
  baseFare: number        // e.g., 2.50
  perMile: number         // e.g., 1.20
  perMinute: number       // e.g., 0.45
  multiplier: number      // e.g., 1.0
  observedAt: Date        // When benchmark was recorded
}
```

**PricingRule** (active pricing for quotes)
```typescript
{
  id: string
  marketKey: string
  rideType: "STANDARD" | "SUV" | "XL"
  baseFare: number        // What riders actually see
  perMile: number
  perMinute: number
  multiplier: number
}
```

### Troubleshooting

**"Save benchmark snapshot" fails**
- Check benchmarks are filled in (no empty fields)
- Check both Uber and Lyft have values
- Verify admin token is valid (try re-login)

**"Auto-apply now" fails with "Save Uber and Lyft benchmark snapshots"**
- This means database has no saved benchmarks
- Go back and click "Save benchmark snapshot" first

**Rates don't update in quotes**
- Wait 1-2 seconds after auto-apply (UI has small delay)
- Refresh the rider app
- Check Admin Pricing page "Market Key" section for updated rates

**Scheduled auto-apply isn't running**
- Check `PLATFORM_RATE_AUTO_APPLY_ENABLED=true` in Render env vars
- Check benchmarks are saved in database (see admin pricing page)
- See API logs for scheduler errors

## Integration with Quote System

When a rider requests a quote:

1. Rider enters pickup/dropoff + ride type
2. API looks up `PricingRule` for the market
3. If market not found, falls back to `DEFAULT`
4. Computes: `baseFare + (miles * perMile) + (minutes * perMinute) * multiplier`
5. Returns quote to rider

The quote uses whatever `PricingRule` was set by the auto-apply system.

## API Endpoints (for developers)

### Get Benchmarks
```http
GET /admin/platform-rates/benchmarks?token=JWT
```

Returns:
```json
{
  "rules": [
    {
      "provider": "UBER",
      "marketKey": "DEFAULT",
      "rideType": "STANDARD",
      "baseFare": 2.5,
      "perMile": 1.2,
      "perMinute": 0.45,
      "multiplier": 1,
      "observedAt": "2026-04-05T03:10:58Z"
    },
    ...
  ]
}
```

### Save/Update Benchmarks
```http
PUT /admin/platform-rates/benchmarks?token=JWT
```

Body:
```json
{
  "rules": [
    {
      "provider": "UBER",
      "marketKey": "DEFAULT",
      "rideType": "STANDARD",
      "baseFare": 2.5,
      "perMile": 1.2,
      "perMinute": 0.45,
      "multiplier": 1
    },
    ...
  ]
}
```

### Get Auto-Apply Status
```http
GET /admin/platform-rates/auto-status?token=JWT
```

Returns:
```json
{
  "enabled": true,
  "interval": 60,
  "undercut": 0.05,
  "lastRun": "2026-04-05T20:00:00Z",
  "lastError": null,
  "benchmarkCount": 6
}
```

### Manual Trigger Auto-Apply
```http
POST /admin/platform-rates/auto-apply?token=JWT
```

Empty body or `{}`. Returns pricing rules that were applied.

## See Also

- [BENCHMARKS.md](../BENCHMARKS.md) - Quick reference for pricing values
- [11-live-deployment.md](./11-live-deployment.md) - Render environment variables
- [Database Schema](./07-database-and-domain-model.md) - Full Prisma schema
