# Rider Feature Phase Plan

This document is the rider-feature planning catalog for the current redesign phase.

Every rider tile visible in the mobile shell must have a plan entry here.

## Status key

- `live` — already works in the web app now
- `design` — visible in shell as roadmap-backed `Coming soon`
- `build-later` — approved for future implementation but not active now

## Feature catalog

| Feature | Status | Phase | Current route touchpoints | Delivery direction |
|---|---|---|---|---|
| Ride booking | live | Live now | `/` | Keep guest booking primary, continue polishing shell and conversion UX |
| Rider trips | live | Live now | `/rider/rides`, `/rider/rides/:rideId` | Keep as rider home anchor and compact map-shell primary surface |
| Community access | live | Live now | `/community`, `/community/join/:token` | Keep real access path and restyle into rider shell language |
| Notifications / alerts | live | Live now | `/notifications` | Keep shared live route, expose as rider shell tile |
| Reserve flow | design | Phase 2 | `/`, `/rider/rides` | Add a dedicated scheduled-trip entry flow instead of burying it inside the form only |
| Saved places | design | Phase 2 | `/`, `/rider/rides` | Add reusable shortcuts for home, work, and frequent destinations |
| Rider receipts hub | design | Phase 3 | `/rider/rides`, `/rider/rides/:rideId` | Add a trip totals and receipt-focused rider history module |
| Rider safety toolkit | design | Phase 3 | `/rider/rides/:rideId`, `/track/:token` | Add support, trust, and rider-safe trip assistance shortcuts |

## Per-feature notes

### Ride booking
- phase: Live now
- why it exists
  - This is the primary rider acquisition path and must remain real and prominent.
- current implementation
  - Booking lives on `/` with live quote, payment selection, and public tracking handoff.
- next design work
  - Move toward a more map-first, mock-inspired launch surface without removing the real booking form.

### Rider trips
- phase: Live now
- why it exists
  - This is the signed-in rider home and should become the main compact map shell.
- current implementation
  - Trip queue and ride detail already exist.
- next design work
  - Keep compact cards, primary ride emphasis, and recent-trip rows over the map.

### Community access
- phase: Live now
- why it exists
  - Cooperative governance is part of the product and should remain visible in rider planning.
- current implementation
  - Real community route exists with eligibility logic.
- next design work
  - Keep it visually lightweight in the rider shell and route directly to the live flow.

### Notifications / alerts
- phase: Live now
- why it exists
  - Riders need notification and delivery visibility for trip continuity.
- current implementation
  - Shared notification route already exists.
- next design work
  - Present it as an app-style rider shortcut without duplicating the underlying route.

### Reserve flow
- phase: Phase 2
- why it matters
  - The booking form already supports scheduled pickups, but the mock suggests a clearer dedicated reserve path.
- current design-phase behavior
  - Show as `Coming soon · Phase 2` in the rider shell.
- target implementation
  - Introduce a distinct reserve entry and scheduled-trip review flow tied to the existing booking engine.
- acceptance direction
  - Riders can clearly choose now vs later from the shell without adding a fake secondary booking system.

### Saved places
- phase: Phase 2
- why it matters
  - Quick home/work shortcuts reduce typing and make the shell feel closer to the mock.
- current design-phase behavior
  - Show as `Coming soon · Phase 2` in the rider shell.
- target implementation
  - Store rider-approved favorite destinations and surface them as quick-select tiles.
- acceptance direction
  - Shortcuts prefill booking inputs without inventing a separate routing engine.

### Rider receipts hub
- phase: Phase 3
- why it matters
  - Riders need a cleaner way to review totals and trip records beyond the current queue.
- current design-phase behavior
  - Show as `Coming soon · Phase 3` in the rider shell.
- target implementation
  - Add receipt-first trip summaries and filters inside rider history.
- acceptance direction
  - Riders can review totals, payment method, and completed trip context without leaving the rider flow.

### Rider safety toolkit
- phase: Phase 3
- why it matters
  - Trust and support should be easier to reach during active trips.
- current design-phase behavior
  - Show as `Coming soon · Phase 3` in the rider shell.
- target implementation
  - Add compact rider help, contact, and trip-assistance shortcuts for live rides and public tracking.
- acceptance direction
  - Support-oriented actions remain real, route-backed, and do not expose unsafe or fake controls.

## Roadmap behavior rule

During the design phase:
- live tiles open live routes
- future tiles do not fake behavior
- signed-in users go to `/request-feature`
- signed-out users go to `/rider/login`

## Update rule

If a rider tile is added, removed, or re-phased in code, update this document in the same branch.
