# Roadmap Baseline: 25 Planned Features

This document is the baseline planning sheet for product and engineering.

Scope intent:

- Define the next 25 planned features
- Separate near-term commitments from later upgrades
- Capture UI improvements and known gaps we are not doing now

Status key:

- `Now` = actively prioritized for near implementation
- `Next` = next wave after current priorities
- `Later` = desired but not scheduled yet
- `Deferred` = intentionally not doing right now

## Roadmap Phases

- **Phase A (Now):** Stabilize rider/driver/admin core UX and reliability
- **Phase B (Next):** Improve operator tooling, trust/safety, and business workflows
- **Phase C (Later):** Advanced optimization, automation, and growth tooling
- **Deferred track:** Important but explicitly out of current build scope

## Baseline Feature List (25)

| # | Feature | Area | Why It Matters | Status | Target Phase |
|---|---|---|---|---|---|
| 1 | Rider booking form UX refresh | UI / Rider | Faster booking with clearer input states and validation | Now | A |
| 2 | Driver dashboard layout cleanup | UI / Driver | Better readability for offers, active rides, and dues | Now | A |
| 3 | Admin dashboard KPI cards v2 | UI / Admin | Faster operational visibility for rides, dues, drivers | Next | B |
| 4 | Notification center polish | UI / Shared | Clearer push status, test actions, and log readability | Now | A |
| 5 | Global toasts + action confirmations | UI / Shared | Reduce user confusion after mutations | Now | A |
| 6 | Ride timeline component (all roles) | UI / Shared | Standardized status history and event visibility | Next | B |
| 7 | Driver onboarding checklist UI | Driver Ops | Better completion rate for signup and approval readiness | Next | B |
| 8 | Admin driver review workflow upgrades | Admin Ops | Faster approvals, fewer mistakes, clearer audit trail | Next | B |
| 9 | Dispatch queue prioritization controls | Dispatch | Better matching controls during high-volume windows | Next | B |
| 10 | Offer expiration UX + countdown clarity | Dispatch / Driver | Improve offer response quality and reduce misses | Now | A |
| 11 | Scheduled rides operations panel | Admin / Dispatch | Better handling of future rides and release timing | Next | B |
| 12 | Rider cancellation reason capture | Rider / Analytics | Better diagnostics for service quality and churn | Next | B |
| 13 | Driver cancellation reason capture | Driver / Analytics | Better supply-side quality insights | Next | B |
| 14 | Dues collection workflow hardening | Admin / Finance | Cleaner reconciliation and reduced overdue risk | Now | A |
| 15 | Payout instructions UX upgrade | Admin / Driver | Fewer payment support issues | Now | A |
| 16 | Community moderation queue improvements | Community / Admin | Keep community quality healthy at scale | Next | B |
| 17 | Feature request triage dashboard | Product / Admin | Faster review of incoming feature requests | Next | B |
| 18 | Public tracking page v2 layout | Rider / Public | Clearer status + trust signals during active rides | Now | A |
| 19 | Share/referral analytics panel | Growth / Admin | Measure referral and campaign effectiveness | Later | C |
| 20 | Service-area map editor | Driver / Admin | Better geographic dispatch control | Later | C |
| 21 | Surge/market condition indicators | Pricing / Rider | Improved transparency and pricing context | Later | C |
| 22 | Automated anomaly alerts (ops) | Reliability / Admin | Earlier detection of system or dispatch issues | Later | C |
| 23 | Native iOS/Android apps | Platform | Better mobile UX and retention | Deferred | Deferred |
| 24 | Fully automated payments integration | Finance | Real-time collection and settlement | Deferred | Deferred |
| 25 | Multi-language localization framework | Platform / UX | Broader audience support | Deferred | Deferred |

## UI Design Upgrade Backlog

High-priority UI/UX upgrades to treat as design baselines:

1. Unified form patterns (errors, helper text, loading, success)
2. Standard table/list interactions for admin pages
3. Consistent action hierarchy across rider/driver/admin pages
4. Reusable timeline/event chips for ride lifecycle
5. Empty-state and skeleton loading standards
6. Mobile-first nav consistency including notifications access

## Known Gaps We Are Not Doing Right Now (Explicit)

These are intentionally out-of-scope for current execution windows:

- Native mobile apps (React Native/Swift/Kotlin)
- Full payments processor integration and payout rails
- Enterprise RBAC + SSO stack
- Full BI warehouse/reporting pipeline
- Multi-region infrastructure rollout
- Multi-language localization system

## Execution Notes

- This document is planning baseline, not release promise.
- Prioritize features with direct rider/driver/admin operational impact first.
- Each feature should get:
  - acceptance criteria
  - owner
  - estimate
  - dependency list
  - rollout/risk notes

## Suggested Next Step

Create one follow-up implementation board that maps each `Now` and `Next` item to:

- issue ticket
- owner
- sprint target
- readiness status (`spec`, `design`, `build`, `qa`, `done`)
