# Known Gaps And Next Steps

## Current Gaps

## Not Production-Ready Yet

- Payments are tracked only as manual/off-platform records
- Secrets are still local-development oriented
- Some domain errors should be mapped to cleaner `4xx` responses
- There is no CI/CD pipeline yet
- There is no deployment configuration yet
- There is no background worker separation yet
- There are no frontend tests yet

## Current Product Limitations

- Single-region assumptions
- English-only UI
- No native mobile apps
- Push notifications depend on browser/device subscription and platform support (for example iOS web constraints)
- No file uploads or driver document review workflow
- No admin audit UI even though audit records are stored
- No advanced dispatch heuristics beyond local radius, service-area state match, and nationwide fan-out

## Known Technical Footguns

- Local env vars must exist in `apps/api/.env` and `apps/web/.env`
- If Mapbox is missing, routing still works but uses fallback estimates
- If Twilio is missing, rider OTP still works but only through returned development codes
- Scheduled ride release depends on the API process staying alive

## Suggested Next Engineering Steps

## Backend

- Add domain-specific error classes and proper `4xx` mappings
- Add health and readiness endpoints
- Add integration tests for protected routes
- Move scheduled release logic into a dedicated worker or job runner
- Add refresh token or explicit token invalidation if needed

## Frontend

- Add Playwright end-to-end coverage
- Add React testing for critical forms and auth flows
- Improve admin ride detail tooling
- Add better optimistic updates and toast feedback
- Expose more driver operational actions in the UI

## Product

- Add payment processor integration if required
- Add driver onboarding workflow and document collection
- Add notifications for rider and driver updates
- Add multi-city configuration
- Add analytics and reporting dashboards

## Documentation Maintenance Rule

When the project changes, update:

- `docs/README.md` if the doc structure changes
- Setup docs if env or startup commands change
- API docs if endpoints or payloads change
- Database docs if the Prisma schema changes
