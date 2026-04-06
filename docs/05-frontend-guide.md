# Frontend Guide

## Frontend Stack

- React
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Socket.IO client
- `react-map-gl`

## Entry Point

Main entry:

- `apps/web/src/main.tsx`

Providers:

- `apps/web/src/providers/app-providers.tsx`
- `apps/web/src/providers/auth-provider.tsx`

## Route Map

## Public And Rider

- `/`
  Public rideshare-style landing page with booking-first flow, live quote preview, and secondary rider share capture
- `/track/:token`
  Public live ride tracking page with driver, payment, and community/share follow-up modules
- `/community/join/:token`
  Rider community-access exchange page from the public tracking flow
- `/drive-with-us`
  Public driver signup alias
- `/driver/signup`
  Public driver signup form
- `/share/:referralCode`
  Referral redirect route that sends traffic back to the rider flow
- `/community`
  Shared authenticated community board for drivers, admins, and eligible riders
- `/notifications`
  Shared authenticated notification center for push setup, preference toggles, test push, and delivery logs
- `/rider/rides`
  Rider history
- `/rider/rides/:rideId`
  Rider ride details

## Driver

- `/driver/login`
  Driver email/password login
- `/driver`
  Driver mobile-first map-shell home and desktop driver dashboard
- `/driver/inbox`
  Dedicated mobile inbox shell route with the same driver map surface and compact offer triage over the live map
- `/driver/rides/:rideId`
  Driver active ride screen / trip cockpit

## Admin

- `/admin/login`
  Admin login
- `/admin/setup`
  One-time first-admin setup with optional admin-plus-driver bootstrap
- `/admin`
  Admin dashboard
- `/admin/dispatch`
  Ride-first dispatch workspace with the live queue plus a test lab for creating labeled test jobs and watching rider/driver split-screen flow state
- `/admin/drivers`
  Driver management
- `/admin/dues`
  Dues management and payout instruction settings
- `/admin/pricing`
  Pricing management
- `/admin/share`
  Stable business QR code page

## Auth Handling

Auth state lives in:

- Browser local storage
- React context via `AuthProvider`

Current behavior:

- Session token and user are stored after login
- `GET /me` is used to validate stored sessions on app load
- One account can hold multiple roles and switch between them from the app shell
- Rider community token links exchange into a normal authenticated rider session
- Role-protected routes redirect to the correct home route

## Data Fetching

TanStack Query is used for:

- Public drivers
- Public rider lead capture
- Public driver signup
- Public tracking lookup
- Referral/share lookup
- Ride quote
- Rider rides
- Ride detail
- Driver offers
- Driver active rides
- Driver dues
- Admin rides
- Admin test ride creation
- Admin leads
- Admin drivers
- Admin dues
- Admin platform rates
- Community proposals and proposal comments

## Realtime Usage

The frontend subscribes to Socket.IO for:

- Ride status changes
- Ride location updates
- Driver ride offers

Current behavior:

- Ride detail screens join `ride:{rideId}` rooms
- Driver dashboard listens for `ride.offer`
- Driver and rider dashboards invalidate dues or ride state after live status changes

## UI Structure

The current UI primitives live in:

- `apps/web/src/components/ui`

Layout wrapper:

- `apps/web/src/components/layout/app-shell.tsx`

Map component:

- `apps/web/src/components/maps/live-map.tsx`

Driver shell components:

- `apps/web/src/components/driver-home/DriverMapSurface.tsx`
- `apps/web/src/components/driver-home/DriverLiveOfferCard.tsx`
- `apps/web/src/components/driver-home/DriverOfferInbox.tsx`
- `apps/web/src/components/driver-home/DriverActiveRideCard.tsx`

## Current Driver Shell Truth

- Mobile driver experience is map-first, not card-first.
- `/driver` is the main driver work surface.
- `/driver` keeps the map as the base shell and swaps mobile states between stand by, live offer, inbox-on-home, and active ride continuity.
- `/driver/inbox` is a dedicated inbox route for the same driver product, not a separate admin-style page.
- `/driver/rides/:rideId` is the dedicated active-trip route.
- The driver shell keeps real offer queries, active-ride queries, accept/decline mutations, socket invalidation, and ride continuity on the real route tree.
- Mobile maps now support free pan plus an explicit recenter control.
- Mobile route maps request road-following geometry from Mapbox Directions and fit the visible route above the bottom sheet.
- Mobile stand-by state uses a real Mapbox map when a token is configured instead of relying only on the fallback grid.

Current public UX direction:

- Hybrid rideshare-first funnel (fast booking first, community/referral second)
- Guest rider flow remains primary acquisition path
- Driver/admin controls stay available as secondary operational surfaces

## Current Frontend Limitations

- Native dropdown primitives were replaced with simple HTML selects for now
- The live map requires Mapbox to be configured
- The community board is intentionally simple: one board, yes/no voting, and flat comments only
- The driver status progression screen works, but the current UI does not yet expose every operational action from the API
- Mobile driver shell verification is still mostly manual and route-specific; interactive end-to-end coverage for map pan/recenter and trip continuity should expand
- Frontend automated coverage is still light, but Playwright screenshot coverage now exists for major stable screens and dashboards

## Recommended Frontend Conventions

When extending the frontend:

- Keep domain types in `shared/contracts.ts`
- Put API calls in `apps/web/src/lib/api.ts`
- Put shared utilities in `apps/web/src/lib`
- Keep pages in `apps/web/src/pages`
- Prefer query invalidation after mutations rather than manually mutating deep cache shapes
