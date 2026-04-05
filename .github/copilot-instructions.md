# GitHub Copilot Instructions For RealDrive

## Product Boundaries

- RealDrive is a web-first ride dispatch platform
- Keep rider, driver, admin, and shared flows in the existing route structure
- Prefer extending existing pages, APIs, schemas, and workflows over adding parallel systems
- Do not invent placeholder modules, dead buttons, or fake data-only features when the real flow already exists

## Architecture Defaults

- Web app: `apps/web`
- API: `apps/api`
- Shared contracts: `shared/contracts.ts`
- Database schema: `apps/api/prisma/schema.prisma`

## Environment And Deployment Truth

- Current live web alias: `https://realdrive-web.vercel.app`
- Current live API host: `https://realdrive.onrender.com`
- Do not reintroduce `https://realdrive-api.onrender.com` or `https://realdrive.vercel.app`
- Keep production secrets out of tracked files
- Store API secrets in Render and browser-facing env vars in Vercel

## Workflow Expectations

- Feature requests use the existing issue report intake and `/request-feature`
- Bug reports use the existing issue report intake and `/report-bug`
- If you change environment, deployment, or user-facing workflows, update docs in the same branch
- Preserve role protection for `/driver`, `/admin`, and related pages

## Editing Guidance

- Prefer minimal changes
- Match existing TypeScript, React, Fastify, Prisma, and Tailwind patterns
- Validate affected packages when practical
- Avoid committing `.vercel/` or similar local tooling artifacts
