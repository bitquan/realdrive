# Project Overview

## What RealDrive Is

RealDrive is a web-first ride dispatch MVP with three product surfaces:

- Rider
- Driver
- Admin

The current implementation supports:

- Guest rider booking and optional rider OTP sign-in
- One-time first-admin setup
- Optional admin-plus-driver bootstrap in that same first-admin flow
- Real driver signup with admin approval
- Route-based fare estimation
- Driver offer dispatch
- Driver trip acceptance and status progression
- Admin login, ride operations, driver management, and market-rate pricing configuration
- One community board with proposals, yes/no voting, and flat comments
- Platform dues equal to `5%` of the driver subtotal on completed rides
- PostgreSQL persistence
- Socket.IO realtime ride updates

## Current Product Model

RealDrive is intentionally built as an MVP for local ride operations, but it now supports approved multi-driver dispatch across local, service-area, or nationwide modes.

Important current behaviors:

- Payments are tracked in-app but collected outside the app
- Riders see one all-in total while driver/admin views still show subtotal and platform due
- Platform dues are paid manually and become overdue after 48 hours
- Driver dispatch is first-accept-wins
- Scheduled rides are released into dispatch within 30 minutes of pickup
- Driver onboarding is admin-approved
- Rider authentication can use phone OTP
- Driver authentication uses email/password after admin approval
- Admin authentication uses email and password
- One user account can hold multiple roles, so the first admin can also be a driver

## Tech Stack

## Workspace

- Root workspace: `pnpm` monorepo
- Shared contracts: `shared/contracts.ts`

## Frontend

- React 19
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Socket.IO client
- Mapbox rendering via `react-map-gl`

## Backend

- Fastify
- Prisma
- PostgreSQL
- Socket.IO
- Zod
- JWT auth

## Important Directories

- `apps/web`
  Frontend application.
- `apps/api`
  API server, Prisma schema, seed script, tests.
- `shared`
  Shared validation schemas and TypeScript contracts.
- `docs`
  Project documentation.

## Current User Roles

## Rider

- Requests rides
- Views quote
- Tracks active ride
- Sees ride history
- Cancels own ride

## Driver

- Signs up with email/password and waits for approval
- Signs in with email/password after approval
- Sets availability
- Works from a mobile-first map shell on `/driver`
- Uses `/driver/inbox` for dedicated inbox triage when needed
- Uses `/driver/rides/:rideId` as the dedicated active-trip route
- Sees outstanding and overdue platform dues plus manual payment instructions
- Receives ride offers
- Accepts or declines offers
- Updates ride status
- Shares live location during active rides
- Can create community proposals, vote, and comment immediately once approved

## Admin

- Signs in by email/password
- Sees all rides
- Cancels rides
- Marks payments collected
- Approves drivers
- Changes driver availability
- Updates pricing rules
- Configures payout instructions for platform dues
- Marks dues paid or waived
- Moderates community proposals and comments

## Local Startup Notes

- After a fresh reset, create the first admin at `/admin/setup`
- The admin setup page can also create your initial approved driver profile in the same account
- Drivers sign up at `/driver/signup` and remain pending until approval
- If Twilio is not configured, rider OTP requests return a development code from the API
- If Mapbox is not configured, routing falls back to deterministic demo coordinates and estimated distances
