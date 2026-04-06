# Rider Mobile Design Spec

## Purpose

This document is the source of truth for the current rider redesign phase.

The goal is to make the rider experience feel like a modern ride-hailing mobile app while staying inside the existing RealDrive web routes and real product flows.

This is a design-first phase:
- real rider features stay live
- future rider features can appear visually in the shell
- future rider features must stay clearly marked as `Coming soon`
- future rider features must route into the existing feature-intake workflow instead of pretending to work

## Product guardrails

- Keep the existing web route tree:
  - `/`
  - `/rider/login`
  - `/rider/rides`
  - `/rider/rides/:rideId`
  - `/track/:token`
- Do not create a parallel rider app.
- Keep guest booking primary on `/`.
- Do not add fake data modules or dead buttons.
- If a future feature is visible in the rider shell, it must be phase-labeled and tied to roadmap / feature intake.

## Target visual direction

The rider app should feel closer to a polished ride-hailing mobile product:
- map-first shell
- compact stacked cards and chips
- short, glanceable copy
- fewer long vertical sections
- clear primary action hierarchy
- live trip state always close to the map
- roadmap-backed future modules shown as muted tiles

## Route-by-route design direction

### `/` public booking home

Target role:
- guest-first rider entry
- fast booking start
- design-phase showcase for the future rider shell

Required visual behavior:
- compact top hero
- strong primary CTA for booking
- rider shell promo banner
- rider feature grid using real and roadmap-backed future tiles
- existing full booking form remains the real booking engine for now

### `/rider/login`

Target role:
- rider OTP sign-in
- visual continuity with the rider shell
- simple mobile-first form

Required visual behavior:
- compact auth steps
- rider-side branding
- no admin/driver visual leakage

### `/rider/rides`

Target role:
- signed-in rider home
- map-first shell
- compact live trip and recent trip states

Required visual behavior:
- mobile map shell owns the page
- bottom sheet uses compressed cards
- rider roadmap grid sits inside the shell
- desktop can remain more expanded until a later parity pass

### `/rider/rides/:rideId`

Target role:
- live rider trip screen
- highest-value rider follow-up surface

Required visual behavior:
- same shell language as rider home
- map first
- compact action cards
- payment, status, and support context in shorter modules

### `/track/:token`

Target role:
- public trip tracking
- guest-safe map shell version of ride detail

Required visual behavior:
- same mobile language as signed-in rider trip detail
- fewer stacked sections
- trust/status clarity near the map

## Design-phase tile policy

Visible future rider tiles are allowed only when all of the following are true:
- tile is clearly marked `Coming soon`
- tile includes a roadmap phase label
- tile routes to live feature intake when the user is signed in
- tile routes to rider access when the user is signed out
- tile does not simulate unavailable product behavior

## Current feature buckets

### Live now
- Ride booking
- Rider trips
- Community access
- Notifications / alerts

### Phase 2 targets
- Reserve flow
- Saved places

### Phase 3 targets
- Rider receipts hub
- Rider safety toolkit

## Implementation sequence

### Phase A — shell design system
- shared rider feature catalog
- shared rider roadmap tile grid
- public home shell promo + feature grid
- signed-in rider map shell with roadmap tiles

### Phase B — rider route parity
- rider login visual alignment
- ride detail map-shell redesign
- public track redesign

Current checkpoint note:
- `/rider/rides/:rideId` and `/track/:token` now use the same compact mobile trip-shell language while desktop keeps the more expanded panel layout.

### Phase C — feature-by-feature buildout
- build each roadmap tile into a real flow one at a time
- move each feature from `Coming soon` to real only after implementation + QA + docs

## Documentation rules

Every rider feature shown in the shell must also exist in:
- [docs/20-rider-feature-phase-plan.md](./20-rider-feature-phase-plan.md)
- [docs/rider-redesign-status.md](./rider-redesign-status.md)
- [docs/18-layered-dev-checklist.md](./18-layered-dev-checklist.md)

If code and docs drift, update docs in the same branch.
