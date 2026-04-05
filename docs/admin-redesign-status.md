# Admin Redesign Status

## Scope
- A dedicated admin redesign has not been started as a new checkpointed workstream in the same way as the driver redesign.
- This document records the current admin baseline, major existing admin milestones, and what remains before any admin redesign begins.
- The admin experience currently lives on the existing `/admin` route family and related tools.
- This work stops at admin scope planning/status for now.

## Final direction
- existing `/admin` route family
- ride-first dispatch workspace
- overview plus focused admin work areas
- drivers, dues, pricing, data, audit, and share tools remain in the same route tree
- no parallel admin app
- future admin redesign should extend the real workflows already in production

## Completed phases

### Baseline admin foundation — Completed-trip dues and collector flows
- summary
  - Added dues batching, collector flows, and related admin/driver operational foundations.
- files
  - [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/config/env.ts](apps/api/src/config/env.ts)
  - [apps/api/src/lib/driver-document-storage.ts](apps/api/src/lib/driver-document-storage.ts)
  - [apps/api/src/lib/mappers.ts](apps/api/src/lib/mappers.ts)
  - [apps/api/src/lib/store.ts](apps/api/src/lib/store.ts)
  - [apps/api/src/services/types.ts](apps/api/src/services/types.ts)
  - [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
- what changed
  - Added admin-visible flows for dues batching and collector operations.
  - Added supporting backend and shared web plumbing for these real admin workflows.
- verification summary
  - Historical commit already on `main`.
  - No dedicated admin redesign verification log exists in the current workstream.
- commit message
  - `Add completed-trip dues batching and collector admin flows`
- short hash
  - `ff39efc`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Baseline admin shell — Trusted admin team flow and ambient shell
- summary
  - Established a broader admin shell baseline with trusted admin team flow and ambient shell framing.
- files
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/lib/store.ts](apps/api/src/lib/store.ts)
  - [apps/api/src/services/types.ts](apps/api/src/services/types.ts)
  - [apps/web/src/components/layout/ambient-shell-map.tsx](apps/web/src/components/layout/ambient-shell-map.tsx)
  - [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - [apps/web/src/main.tsx](apps/web/src/main.tsx)
  - [apps/web/src/pages/admin-dashboard-page.tsx](apps/web/src/pages/admin-dashboard-page.tsx)
  - [apps/web/src/pages/admin-help-page.tsx](apps/web/src/pages/admin-help-page.tsx)
  - [apps/web/src/pages/admin-invite-accept-page.tsx](apps/web/src/pages/admin-invite-accept-page.tsx)
  - [apps/web/src/pages/admin-share-page.tsx](apps/web/src/pages/admin-share-page.tsx)
- what changed
  - Added team/admin invite flow support.
  - Established admin shell framing used across multiple admin routes.
- verification summary
  - Historical commit already on `main`.
  - This is baseline admin platform work, not a new redesign checkpoint.
- commit message
  - `Add trusted admin team flow and ambient map shell`
- short hash
  - `10c669b`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Baseline admin dispatch — Dispatch workspace and payment sync
- summary
  - Added the current admin dispatch workspace and related payment-sync/admin route wiring.
- files
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - [apps/web/src/lib/utils.ts](apps/web/src/lib/utils.ts)
  - [apps/web/src/main.tsx](apps/web/src/main.tsx)
  - [apps/web/src/pages/admin-dashboard-page.tsx](apps/web/src/pages/admin-dashboard-page.tsx)
  - [apps/web/src/pages/admin-dispatch-page.tsx](apps/web/src/pages/admin-dispatch-page.tsx)
  - [apps/web/src/pages/admin-drivers-page.tsx](apps/web/src/pages/admin-drivers-page.tsx)
  - [apps/web/src/pages/admin-dues-page.tsx](apps/web/src/pages/admin-dues-page.tsx)
  - [apps/web/src/pages/admin-team-page.tsx](apps/web/src/pages/admin-team-page.tsx)
  - [apps/web/src/pages/driver-dashboard-page.tsx](apps/web/src/pages/driver-dashboard-page.tsx)
  - [apps/web/src/pages/driver-ride-page.tsx](apps/web/src/pages/driver-ride-page.tsx)
  - [apps/web/src/pages/public-track-page.tsx](apps/web/src/pages/public-track-page.tsx)
  - [apps/web/src/pages/ride-details-page.tsx](apps/web/src/pages/ride-details-page.tsx)
- what changed
  - Added the main admin dispatch workspace and connected it to surrounding route surfaces.
  - Touched related pages where dispatch and ride visibility intersect.
- verification summary
  - Historical commit already on `main`.
  - No dedicated admin redesign verification log exists in the current workstream.
- commit message
  - `Add admin dispatch workspace and payment sync`
- short hash
  - `da499ca`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Baseline admin operations — Audit logs, pricing, dispatch scoring, and tests
- summary
  - Expanded the admin surface with audit, pricing, dispatch scoring, and baseline web testing support.
- files
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/lib/store.ts](apps/api/src/lib/store.ts)
  - [apps/api/src/services/types.ts](apps/api/src/services/types.ts)
  - [apps/api/src/tests/ride-service.test.ts](apps/api/src/tests/ride-service.test.ts)
  - [apps/web/package.json](apps/web/package.json)
  - [apps/web/src/components/ui/button.test.tsx](apps/web/src/components/ui/button.test.tsx)
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - [apps/web/src/main.tsx](apps/web/src/main.tsx)
  - [apps/web/src/pages/admin-audit-page.tsx](apps/web/src/pages/admin-audit-page.tsx)
  - [apps/web/src/pages/admin-pricing-page.tsx](apps/web/src/pages/admin-pricing-page.tsx)
  - [apps/web/src/test/setup.ts](apps/web/src/test/setup.ts)
- what changed
  - Added audit and pricing admin capabilities.
  - Added testing and dispatch-related supporting changes.
- verification summary
  - Historical commit already on `main`.
  - This was platform expansion, not a dedicated redesign checkpoint.
- commit message
  - `feat(admin): add audit logs UI, market config APIs, dispatch scoring, and web test baseline`
- short hash
  - `b4a8c52`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Baseline admin analytics — Live activity data tab
- summary
  - Added admin live activity data plus related shell and SEO baseline work.
- files
  - [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/lib/store.ts](apps/api/src/lib/store.ts)
  - [apps/api/src/services/types.ts](apps/api/src/services/types.ts)
  - [apps/api/src/tests/ride-service.test.ts](apps/api/src/tests/ride-service.test.ts)
  - [apps/web/index.html](apps/web/index.html)
  - [apps/web/public/robots.txt](apps/web/public/robots.txt)
  - [apps/web/public/sitemap.xml](apps/web/public/sitemap.xml)
  - [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
- what changed
  - Added live activity data support and related shell/SEO wiring.
- verification summary
  - Historical commit already on `main`.
  - No dedicated admin redesign verification log exists in the current workstream.
- commit message
  - `feat(admin): add live activity data tab and baseline SEO`
- short hash
  - `43ba144`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

### Baseline admin dispatch follow-up — Dispatch test ride lab
- summary
  - Added admin-side test-ride tooling for dispatch validation.
- files
  - [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)
  - [apps/api/src/app.ts](apps/api/src/app.ts)
  - [apps/api/src/lib/mappers.ts](apps/api/src/lib/mappers.ts)
  - [apps/api/src/lib/store.ts](apps/api/src/lib/store.ts)
  - [apps/api/src/services/ride-service.ts](apps/api/src/services/ride-service.ts)
  - [apps/api/src/services/types.ts](apps/api/src/services/types.ts)
  - [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - [apps/web/src/pages/admin-dispatch-page.tsx](apps/web/src/pages/admin-dispatch-page.tsx)
  - [docs/05-frontend-guide.md](docs/05-frontend-guide.md)
  - [docs/06-backend-api.md](docs/06-backend-api.md)
  - [shared/contracts.ts](shared/contracts.ts)
- what changed
  - Added admin test-ride tooling used to create and validate dispatch scenarios.
- verification summary
  - Historical commit already on `main`.
  - This is useful for admin QA and dispatch operations, not a dedicated redesign checkpoint.
- commit message
  - `Add admin dispatch test ride lab`
- short hash
  - `1f7567a`
- pushed or not pushed
  - pushed
- production status
  - on `main`; live deployment confirmation unknown

## Commit timeline

| order | short hash | commit message | purpose | pushed to main? | production candidate? | production verified? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ff39efc` | `Add completed-trip dues batching and collector admin flows` | establish dues and collector operations baseline | yes | yes | unknown |
| 2 | `10c669b` | `Add trusted admin team flow and ambient map shell` | establish shell/team baseline across admin routes | yes | yes | unknown |
| 3 | `da499ca` | `Add admin dispatch workspace and payment sync` | add the current admin dispatch workspace | yes | yes | unknown |
| 4 | `b4a8c52` | `feat(admin): add audit logs UI, market config APIs, dispatch scoring, and web test baseline` | expand admin operations and test coverage baseline | yes | yes | unknown |
| 5 | `43ba144` | `feat(admin): add live activity data tab and baseline SEO` | add admin analytics/data baseline | yes | yes | unknown |
| 6 | `1f7567a` | `Add admin dispatch test ride lab` | add admin dispatch QA/test-ride tooling | yes | yes | unknown |

## Known pushed checkpoints from this work
- No dedicated admin redesign chain has been pushed yet.
- The commits above are admin-relevant baseline work already on `main`.

## Files changed across the project
- [apps/web/src/pages/admin-dashboard-page.tsx](apps/web/src/pages/admin-dashboard-page.tsx)
  - Main admin overview page.
- [apps/web/src/pages/admin-dispatch-page.tsx](apps/web/src/pages/admin-dispatch-page.tsx)
  - Dispatch workspace for ride monitoring and test-ride tooling.
- [apps/web/src/pages/admin-drivers-page.tsx](apps/web/src/pages/admin-drivers-page.tsx)
  - Driver operations/admin review surface.
- [apps/web/src/pages/admin-dues-page.tsx](apps/web/src/pages/admin-dues-page.tsx)
  - Dues management surface.
- [apps/web/src/pages/admin-pricing-page.tsx](apps/web/src/pages/admin-pricing-page.tsx)
  - Pricing configuration/admin controls.
- [apps/web/src/pages/admin-audit-page.tsx](apps/web/src/pages/admin-audit-page.tsx)
  - Audit log surface.
- [apps/web/src/pages/admin-data-page.tsx](apps/web/src/pages/admin-data-page.tsx)
  - Activity/data reporting page.
- [apps/web/src/pages/admin-share-page.tsx](apps/web/src/pages/admin-share-page.tsx)
  - Share-kit/admin asset management page.
- [apps/web/src/pages/admin-team-page.tsx](apps/web/src/pages/admin-team-page.tsx)
  - Team/admin access management page.
- [apps/web/src/components/layout/app-shell.tsx](apps/web/src/components/layout/app-shell.tsx)
  - Shared shell that frames admin routes.
- [apps/web/src/lib/shell.ts](apps/web/src/lib/shell.ts)
  - Route framing, navigation metadata, and shell behavior used by admin pages.
- [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)
  - Shared web API client used throughout admin surfaces.

## Production status

### Pushed to main
- `ff39efc` — `Add completed-trip dues batching and collector admin flows`
- `10c669b` — `Add trusted admin team flow and ambient map shell`
- `da499ca` — `Add admin dispatch workspace and payment sync`
- `b4a8c52` — `feat(admin): add audit logs UI, market config APIs, dispatch scoring, and web test baseline`
- `43ba144` — `feat(admin): add live activity data tab and baseline SEO`
- `1f7567a` — `Add admin dispatch test ride lab`

### Confirmed deployed
- unknown

### Still local only
- No admin-specific redesign checkpoint is currently tracked as local-only.

## What remains

### admin follow-up polish
- Define whether the next admin effort is a visual redesign, workflow simplification, or dispatch-only cleanup.
- Decide which admin surface should move first: overview, dispatch, drivers, dues, or pricing.

### production verification
- Confirm the current admin routes still behave correctly on production after the latest shared web fixes.
- Confirm admin dispatch and admin test-ride tooling behave correctly in production.

### QA / smoke tests
- Run a focused admin smoke pass for `/admin`, `/admin/dispatch`, `/admin/drivers`, and `/admin/dues`.

### later non-admin work
- Do not start admin redesign implementation until driver production verification is complete and rider/admin scope is explicitly selected.

## Deferred / intentionally not included
- no dedicated admin redesign checkpoint chain has started yet
- no parallel admin app has been created
- no broad backend rewrite beyond existing admin platform features is included here
- no contract/schema overhaul is counted as redesign unless it is part of a future scoped admin checkpoint
- no rider or driver redesign work is counted here except where shared shell or dispatch history intersects

## Risks / watch items
- Production deployment confirmation is still manual/unknown.
- Admin state spans many existing routes, so a future redesign should be broken into small checkpoints.
- Shared shell changes can affect admin behavior even when the checkpoint is scoped elsewhere.
- Admin dispatch/test-ride flows should be rechecked against the live deployment before new admin UI work starts.

## Recommended next step after admin scope
- Choose the first admin redesign checkpoint explicitly, with `admin dispatch` as the most natural candidate if admin becomes the next active scope.
