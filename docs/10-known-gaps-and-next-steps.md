# Known Gaps And Next Steps

## Recently Completed (April 2026)

✅ **Admin Data Dashboard** - Real-time visitor analytics and activity tracking
✅ **Pricing Benchmarks** - Database storage for Uber/Lyft rate snapshots
✅ **Auto-Apply Scheduler** - Automatic or manual rate undercut application
✅ **SEO Baseline** - Meta tags, robots.txt, sitemap.xml for search visibility
✅ **Deployment Documentation** - Comprehensive Render/Vercel setup guide
✅ **Driver Document Upload Flow** - End-to-end upload, storage, admin review, and file retrieval
✅ **CI Baseline** - GitHub Actions runs API tests and type/build checks on push/PR
✅ **Background Worker Option** - Auto-pricing scheduler can run in dedicated worker process
✅ **Payment Integration Foundation** - Stripe checkout-link endpoint with audit logging
✅ **Frontend Test Baseline** - Vitest + React Testing Library configured for `apps/web`
✅ **Admin Audit Log UI** - `/admin/audit` page with searchable logs
✅ **Multi-city Market Config** - API-backed market creation from admin pricing
✅ **Dispatch Heuristics Baseline** - Driver ranking now includes mode, distance, rating, and location freshness

See:
- [Admin Pricing & Benchmarks Documentation](./16-admin-pricing-benchmarks.md)
- [Live Deployment Infrastructure](./11-live-deployment.md)
- [BENCHMARKS.md](../BENCHMARKS.md) reference guide

## Current Gaps

### Not Production-Ready Yet

- Payments are still partially manual (Stripe checkout link exists, but webhook settlement automation is not complete)
- Secrets are loaded from environment (use secret managers in heavily-regulated contexts)
- Some domain errors could map to cleaner `4xx` responses
- CI does not yet gate production deploys with required status checks and environment promotion rules
- Worker infrastructure exists for auto-pricing, but other scheduled jobs still run in API process
- Frontend test coverage is still minimal (baseline exists but core journeys are not covered yet)

### Current Product Limitations

- Single-region assumptions (markets are pre-defined in database, not auto-detected)
- English-only UI
- No native mobile apps
- Push notifications depend on browser/device subscription and platform support (iOS web constraints)
- Dispatch heuristics are still basic scoring (no demand prediction, surge balancing, or ETA optimization)
- Benchmark snapshots are manual entry only (no API scraping; requires human input to Admin Pricing)

### Known Technical Footguns

- Local env vars must exist in `apps/api/.env` and `apps/web/.env` before running
- If Mapbox is missing, routing still works but uses fallback estimates
- If Twilio is missing, rider OTP still works but only returns development codes
- Scheduled ride release depends on the API process staying alive
- Auto-apply scheduler depends on saved benchmarks (no external feed URLs)
- Admin Data Dashboard heartbeat tracking requires page navigation (not ideal for SPA)

## Suggested Next Engineering Steps

### Backend

- **Error Handling**: Add domain-specific error classes and proper `4xx` response mappings
- **Health Checks**: Add `/health` and `/readiness` endpoints for load balancers
- **Integration Tests**: Add Vitest/Playwright coverage for protected routes and pricing logic
- **Background Jobs**: Move remaining schedulers to standalone workers (auto-pricing already supports worker mode)
- **Audit Logging**: Add export/download and richer filters in admin audit UI
- **Token Management**: Add refresh token strategy and invalidation for security tokens

### Frontend

- **E2E Tests**: Add Playwright tests for critical user flows (signup, ride booking, admin setup)
- **Component Tests**: Expand React Testing Library coverage beyond baseline setup
- **Admin Tools**: Improve ride detail tooling and driver management workflows
- **UX Improvements**: Better optimistic updates, toast confirmations, error feedback
- **Analytics**: Add heat maps, user journey tracking, A/B testing capabilities
- **Performance**: Code-split large chunks (Mapbox bundle is 492 KB gzip)

### Product

- **Payments**: Integrate Stripe or Square for rider/driver settlement
- **Driver Onboarding**: Complete workflow with document upload, background check, approval flow
- **Push Notifications**: Expand rider notifications for ride status, driver messages, promotions
- **Multi-City**: Expand from market key config to full region operations (hours, service rules, dispatch weighting)
- **Reporting**: Add admin dashboards for revenue, utilization, driver/rider metrics
- **API Keys**: Support third-party integrations that use RealDrive as a backend-as-a-service

### Devops

- **CI/CD Hardening**: Add required checks, preview environments, and release gates (build/test CI already exists)
- **Database Migrations**: Add rollback strategy and automated test migrations
- **Monitoring**: Add APM (e.g., Datadog, New Relic) for performance tracking
- **Secrets Rotation**: Implement automatic secret rotation for API keys, JWT secret
- **Disaster Recovery**: Document and test backup/restore procedures
- **Cost Optimization**: Monitor and optimize database queries, bundle sizes, and infrastructure

## Documentation Maintenance Rule

When you change code, update these docs:

- `docs/README.md` if the doc structure changes
- `docs/02-local-setup.md` if env or startup commands change
- `docs/03-environment-and-services.md` if third-party service needs change
- `docs/04-architecture.md` if component responsibilities change
- `docs/06-backend-api.md` if endpoints or payloads change
- `docs/07-database-and-domain-model.md` if Prisma schema changes
- `docs/08-operations-and-runbooks.md` if deployment or operational procedures change
- `docs/11-live-deployment.md` if Render/Vercel config or env vars change
- `docs/16-admin-pricing-benchmarks.md` if pricing logic or admin UI changes
- `BENCHMARKS.md` when competitor rates change (reference guide for admins)
