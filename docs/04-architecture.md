# Architecture

## High-Level Architecture

RealDrive is a monorepo with a shared contract layer.

```text
apps/web  --->  apps/api  --->  PostgreSQL
    |             |
    |             +--> Twilio Verify (optional)
    |             +--> Mapbox Geocoding/Directions (optional)
    |
    +-----------> Socket.IO realtime events
```

## Main Packages

## `apps/web`

Responsibilities:

- Render rider, driver, and admin UI
- Store auth session in local storage
- Call API endpoints
- Subscribe to realtime ride updates
- Render live map when Mapbox is configured

## `apps/api`

Responsibilities:

- Handle authentication
- Validate requests with shared Zod schemas
- Persist users, rides, pricing, offers, and location pings
- Dispatch rides to nearby drivers
- Broadcast ride events over Socket.IO
- Run scheduled ride release logic every minute

## `shared`

Responsibilities:

- Define domain contracts
- Share runtime validation shapes
- Keep frontend and backend types aligned

Main file:

- `shared/contracts.ts`

## Request Flow

## Rider Booking

1. Rider verifies phone
2. Rider requests quote
3. Rider submits a ride
4. API geocodes and estimates route
5. API calculates fare
6. API creates ride
7. API finds nearby available drivers within 10 miles
8. API creates pending offers with a 2 minute expiry
9. API emits `ride.offer` to matching drivers

## Driver Acceptance

1. Driver fetches offers or receives realtime event
2. Driver accepts
3. API claims the ride transactionally
4. Remaining pending offers expire
5. API emits ride status updates to rider and driver

## Scheduled Ride Release

1. Ride is created with status `scheduled`
2. Background interval runs once per minute
3. Any scheduled ride within 30 minutes of pickup is dispatched

## Realtime Model

Socket.IO rooms:

- `user:{userId}`
- `role:{role}`
- `ride:{rideId}`

Current event names:

- `ride.offer`
- `ride.status.changed`
- `ride.location.updated`
- `driver.availability.changed`

## Auth Model

## Rider and Driver

- Riders authenticate by phone OTP when enabled
- Drivers authenticate by email/password after approval
- Receive JWT from the API
- JWT is stored in browser local storage

## Admin

- Authenticate by email/password
- Receive JWT from the API

## Persistence Model

The system persists:

- Users
- Rider profiles
- Driver profiles
- Vehicles
- Rides
- Ride offers
- Driver location pings
- Pricing rules
- Audit logs

## Current Boundaries

The app currently does not include:

- In-app payment processing
- Native mobile apps
- Multi-region dispatch rules
- Surge pricing
- External background worker infrastructure
- Separate staging/production deployment manifests
